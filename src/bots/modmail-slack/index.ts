import { BotContext, Bot, createBot } from "../../interface";
import { Config } from "../../lib/config";
import RedditProvider from "../../providers/reddit";
import SlackWebProvider from "../../providers/slack-web";
import CronProvider from "../../providers/cron";
import { Brain } from "../../providers/brain";
import ModmailConversation, {
  ModmailMessage
} from "snoowrap/dist/objects/ModmailConversation";
import { ChatPostMessageArguments } from "@slack/web-api";

const ID = "modmail-slack";

export default createBot(
  {
    id: ID,
    configParameters: cb =>
      cb.for(ID, c =>
        c
          .env("cron-interval", "MODMAIL_CRON_INTERVAL", "0 * * * * *")
          .env("channel", "MODMAIL_SLACK_CHANNEL", "auto-modmail")
      )
  },
  function(ctx: BotContext) {
    const config = ctx.require(Config).for(ID);
    const cron = ctx.require(CronProvider).for(ID);
    const { r } = ctx.require(RedditProvider);
    const { api: slack } = ctx.require(SlackWebProvider);
    const brain = ctx.require(Brain).create(ID);

    cron.schedule(config.get("cron-interval"), async () => {
      const convos = await r
        .getSubreddit("VolunteerLiveTeam")
        .getNewModmailConversations();
      const lastSeenStr =
        brain.get("modmail.lastTime") || "2099-12-31T00:00:00Z";
      const lastSeen = new Date(lastSeenStr).valueOf();
      const newConvos = convos.filter(
        x => new Date(x.lastUpdated).valueOf() > lastSeen
      );
      if (newConvos.length === 0) {
        console.log("Nothing to do.");
        return;
      }
      const convMsgs = await Promise.all(
        newConvos.map(
          conv =>
            new Promise<{
              conversation: ModmailConversation;
              messages: ModmailMessage[];
            }>(resolve => {
              r.getNewModmailConversation(conv.id).then(conv2 => {
                const messages = (conv2 as any).messages as ModmailMessage[];
                resolve({
                  conversation: conv2,
                  messages
                });
              });
            })
        )
      );
      const slackPayload: ChatPostMessageArguments = {
        channel: config.get("channel"),
        text: "New modmail!"
      };
      slackPayload.attachments = convMsgs.map(({ conversation, messages }) => {
        // Reverse order
        const latestMessage = messages.sort(
          (a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf()
        )[0];
        let color;
        if (conversation.isHighlighted) {
          color = "#ffb000";
        } else {
          // TODO use the proper enum
          switch (conversation.state) {
            case 0: // New
              color = "#03A9F4";
              break;
            case 1: // in progress
              color = "#388E3C";
              break;
            case 2: // archived
              color = "#949494";
              break;
          }
        }
        return {
          fallback: `Message from ${
            latestMessage.author.name
          } (https://mod.reddit.com/mail/all/${latestMessage.id})`,
          author_name: latestMessage.author.name,
          author_link: `https://reddit.com/u/${latestMessage.author.name}`,
          title: conversation.subject,
          title_link: `https://mod.reddit.com/mail/all/${latestMessage.id}`,
          text: latestMessage.bodyMarkdown,
          ts: (new Date(latestMessage.date).valueOf() / 1000).toString(10),
          color
        };
      });
      await slack.chat.postMessage(slackPayload);
      const latestConvo = convos.sort(
        (a, b) =>
          new Date(b.lastUpdated).valueOf() - new Date(a.lastUpdated).valueOf()
      )[0];
      brain.set("modmail.lastTime", latestConvo.lastUpdated.toString());
    });
  }
);
