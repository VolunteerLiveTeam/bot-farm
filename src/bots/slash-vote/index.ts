import { createBot } from "../../interface";
import CBF from "../../providers/cbf";
import { Emoji, ReactionEmoji } from "discord.js";
import SlackWebProvider from "../../providers/slack-web";
import DiscordProvider from "../../providers/discord";
import { Config } from "../../lib/config";

const ID = "slash-vote";

type VoteMoji = { [key: string]: [[string, string | Emoji | ReactionEmoji], [string, string | Emoji | ReactionEmoji]] };

export default createBot({
    id: ID,
    configParameters: cb => cb.for("slash-vote", c => c.env("guild", "DISCORD_GUILD_ID"))
}, async ctx => {
    const cbf = await ctx.require(CBF).create({
        id: ID,
        providers: ["slack", "discord"],
        discord: {
            prefix: "$"
        },
        slack: {
            mode: "rtm",
            commands: ["prefix"],
            prefix: "$"
        }
    });

    const {api} = ctx.require(SlackWebProvider);
    const {client: discord} = ctx.require(DiscordProvider);
    const config = ctx.require(Config);

    const guild = discord.guilds.get("slash-vote.guild");
    if (typeof guild === "undefined") {
        throw new Error();
    }

    const emojis: VoteMoji = {
        arrows: [
            ["upvote", guild.emojis.get("610418134498803718")!],
            ["downvote", guild.emojis.get("610418120263335937")!]
        ]
    };

    const defaultEmoji = "arrows";

    cbf.command(/vote (.+)$/, async m => {
        // Slightly different semantics here:
        // for Slack, we create a new message and add the emoji to it
        // for Discord, we add the emoji directly to the original message
        const args = m.matches[1];
        let emoji;
        const customEmoji = args.match(/--emoji=([a-zA-z\-])/);
        if (customEmoji) {
            emoji = emojis[customEmoji[1]];
            if (!emoji) {
                m.respond(`I don't know of a VoteMoji ${customEmoji[1]}`);
                return;
            }
        } else {
            emoji = emojis[defaultEmoji];
        }

        if (m.source === "slack") {
            // remove arguments
            // "--emoji=foo --bar --baz text" => "text"
            const text = m.text.replace(/\s?--[a-zA-Z\-]+(?:=[a-zA-z\-]+)?\s?/, "");

            const user = await api.users.info({ user: m.original.user });

            const msg = await api.chat.postMessage({
                channel: m.original.channel,
                text,
                as_user: false,
                username: "R. " + (user as any).user.profile.display_name,
                icon_url: (user as any).user.profile.image_original
            });
            const mid = (msg as any).ts;

            await api.reactions.add({ channel: m.original.channel, timestamp: mid, name: emoji[0][0] });
            await api.reactions.add({ channel: m.original.channel, timestamp: mid, name: emoji[1][0] });

        } else if (m.source === "discord") {
            m.original.react(emoji[0][1]);
            m.original.react(emoji[1][1]);
        }
    });
});