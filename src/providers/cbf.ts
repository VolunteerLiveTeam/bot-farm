import { Injectable } from "../injector";
import SlackWebProvider from "./slack-web";
import DiscordProvider from "./discord";
import SlackRTMProvider from "./slack-rtm";
import * as Discord from "discord.js";
import { Client } from "discord.js";
import { RTMClient } from "@slack/rtm-api";
import { WebClient, ChatPostMessageArguments } from "@slack/web-api";
import { Brain } from "./brain";
import { ListenerCallback } from "hubot";
import { EventEmitter } from "events";
import { create as createHTTP } from "scoped-http-client";
import Farmer from "./farmer";
import * as escapeRe from "escape-string-regexp";

/// <reference types="hubot" />

interface CBFOptions {
  id: string;
  providers: Array<"slack" | "discord">;
  slack?: {
    mode: "rtm";
    commands: Array<"slash" | "mention" | "prefix">;
    prefix?: string;
  };
  discord?: {
    prefix?: string;
  };
}

interface SlackMessage {
  subtype?: string;
  text: string;
  ts: string;
  channel: string;
  user: string;
}

interface CBFMessageCommon {
  text: string;
  matches: RegExpMatchArray;

  respond(message: string): Promise<{ msgId: string }>;
  startTyping(): Promise<void>;
  stopTyping(): Promise<void>;
}

interface CBFDiscordMessage {
  source: "discord";
  original: Discord.Message;
}

interface CBFSlackMessage {
  source: "slack";
  original: SlackMessage;

  respondComplex(args: ChatPostMessageArguments): Promise<{ msgId: string }>;
  react(reaction: string): Promise<void>;
  removeReaction(reaction: string): Promise<void>;
}

type CBFMessage = CBFMessageCommon & (CBFSlackMessage | CBFDiscordMessage);

interface ICBFContext {
  discord?: Client;
  slack?: {
    rtm: RTMClient;
    web: WebClient;
    self: NonNullable<SlackRTMProvider["_self"]>;
    team: NonNullable<SlackRTMProvider["_team"]>;
  };

  hear(
    what: string | RegExp,
    callback: (m: CBFMessage) => void | Promise<void>
  ): void;

  command(
    what: string | RegExp,
    callback: (m: CBFMessage) => void | Promise<void>
  ): void;

  hubotCompat(): Hubot.Robot<undefined>;
}

@Injectable()
export default class CBF {
  constructor(
    private rtm: SlackRTMProvider,
    private web: SlackWebProvider,
    private discord: DiscordProvider,
    private brain: Brain,
    private farmer: Farmer
  ) {}

  private createSlackCallbackMsgObject(
    evt: SlackMessage,
    match: RegExpMatchArray,
    rtm: RTMClient
  ): CBFMessageCommon & CBFSlackMessage {
    return {
      source: "slack",
      original: evt,
      text: evt.text,
      matches: match,
      startTyping: () => rtm.sendTyping(evt.channel),
      stopTyping: () => Promise.resolve(), // no-op in slack
      respond: text =>
        rtm.sendMessage(text, evt.channel).then(rez => ({ msgId: rez.ts })),
      respondComplex: args =>
        this.web.api.chat
          .postMessage(args)
          .then(resp => ({ msgId: (resp as any).ts })),
      react: reaction =>
        this.web.api.reactions
          .add({ name: reaction, channel: evt.channel, timestamp: evt.ts })
          .then(() => {}),
      removeReaction: reaction =>
        this.web.api.reactions
          .remove({ name: reaction, channel: evt.channel, timestamp: evt.ts })
          .then(() => {})
    };
  }

  private createDiscordCallbackMsgObject(
    evt: Discord.Message,
    match: RegExpMatchArray
  ): CBFMessageCommon & CBFDiscordMessage {
    return {
      source: "discord",
      original: evt,
      text: evt.content,
      matches: match,
      respond: text =>
        evt.channel
          .send(text)
          .then(rez => ({ msgId: (Array.isArray(rez) ? rez[0] : rez).id })),
      startTyping: () => Promise.resolve(evt.channel.startTyping()),
      stopTyping: () => Promise.resolve(evt.channel.stopTyping())
    };
  }

  private createContext(opts: {
    slack?: NonNullable<ICBFContext["slack"]>;
    discord?: Client;
    options: CBFOptions;
  }): ICBFContext {
    const brain = this.brain.create(opts.options.id);

    // TODO: this creates a new event handler for every listen call
    // which is wasteful; move to a single listener per {Slack, Discord}
    const listenFor = (
      args: RegExp,
      cb: (m: CBFMessage) => void,
      whence?: "slack" | "discord"
    ) => {
      if (opts.slack && (typeof whence === "undefined" || whence === "slack")) {
        const listener = (evt: SlackMessage) => {
          const match = evt.text.match(args);
          if (match) {
            cb(this.createSlackCallbackMsgObject(evt, match, opts.slack!.rtm));
          }
        };
        opts.slack.rtm.on("message", listener);
        this.farmer.onShutdown(opts.options.id, () =>
          opts.slack!.rtm.off("message", listener)
        );
      }
      if (
        opts.discord &&
        (typeof whence === "undefined" || whence === "slack")
      ) {
        const listener = (msg: Discord.Message) => {
          const match = msg.content.match(args);
          if (match) {
            cb(this.createDiscordCallbackMsgObject(msg, match));
          }
        };
        opts.discord.on("message", listener);
        this.farmer.onShutdown(opts.options.id, () =>
          opts.discord!.off("message", listener)
        );
      }
    };

    const context: ICBFContext = {
      discord: opts.discord,
      slack: opts.slack,
      hubotCompat: () => {
        return new (class CBFHubotCompat implements Hubot.Robot<undefined> {
          alias = "";
          name = "";
          adapter = undefined;

          http = createHTTP;

          brain = new (class extends EventEmitter
            implements Hubot.Brain<undefined> {
            set(key: string, value: any) {
              brain.set("hubot/" + key, JSON.stringify(value));
              return this;
            }
            get(key: string) {
              return JSON.parse(brain.get("hubot/" + key) || "");
            }
            remove(key: string) {
              brain.remove("hubot/" + key);
              return this;
            }
            save() {}
            close() {}
            setAutoSave() {}
            resetSaveInterval() {}
            mergeData(data: any) {
              const payload: { [K: string]: string } = {};
              Object.keys(data).forEach(key => {
                payload["hubot/" + key] = JSON.stringify(data["hubot/" + key]);
              });
              brain.merge(payload);
            }
            users(): any[] {
              throw new Error("not supported");
            }
            userForId(): any {
              throw new Error("not supported");
            }
            userForName(): any {
              throw new Error("not supported");
            }
            userForFuzzyName(): any {
              throw new Error("not supported");
            }
            userForRawFuzzyName(): any {
              throw new Error("not supported");
            }
          })();

          public hear(regex: RegExp, cb: ListenerCallback<this>): void;
          public hear(
            regex: RegExp,
            options: any,
            callback: ListenerCallback<this>
          ): void;
          public hear(
            regex: RegExp,
            optionsOrCallback: any,
            callbackMaybe?: ListenerCallback<this>
          ) {}

          public respond(regex: RegExp, cb: ListenerCallback<this>): void;
          public respond(
            regex: RegExp,
            options: any,
            callback: ListenerCallback<this>
          ): void;
          public respond(
            regex: RegExp,
            optionsOrCallback: any,
            callbackMaybe?: ListenerCallback<this>
          ) {}

          catchAll(callback: ListenerCallback<this>): void;
          catchAll(options: any, callback: ListenerCallback<this>): void;
          catchAll(optsOrCallback: any, callback?: ListenerCallback<this>) {}

          enter(callback: ListenerCallback<this>): void;
          enter(options: any, callback: ListenerCallback<this>): void;
          enter(optsOrCallback: any, callback?: ListenerCallback<this>) {}

          topic() {
            throw new Error("Not supported");
          }

          on(): this {
            throw new Error("not supported");
          }

          emit(): boolean {
            throw new Error("not supported");
          }
          loadFile() {
            throw new Error("not supported");
          }
          helpCommands(): string[] {
            throw new Error("not supported");
          }
        })();
      },
      hear: (wat, cb) => {
        if (!(wat instanceof RegExp)) {
          wat = new RegExp(wat, "i");
        }
        listenFor(wat, cb);
      },
      command: (wat, cb) => {
        let ex: RegExp;
        if (wat instanceof RegExp) {
          ex = wat;
        } else {
          ex = new RegExp(wat, "i");
        }
        if (opts.slack) {
          opts.options.slack!.commands.forEach(type => {
            if (type === "slash") return;
            let prefix;
            switch (type) {
              case "prefix":
                prefix = "^" + escapeRe(opts.options.slack!.prefix!);
                break;
              case "mention":
                prefix = `^<@${opts.slack!.self.id}>\\s`;
                break;
            }
            listenFor(new RegExp(prefix + ex.source, "i"), cb);
          });
        }
        if (opts.discord) {
          listenFor(
            new RegExp(
              escapeRe(opts.options.discord!.prefix!) + ex.source,
              "i"
            ),
            cb
          );
        }
      }
    };

    return context;
  }

  async create(options: CBFOptions) {
    let ctxOpts = { options } as any;
    if (options.providers.includes("slack")) {
      const rtm = await this.rtm.connect();
      ctxOpts.slack = {
        web: this.web.api,
        rtm: rtm.client
      };
    }
    if (options.providers.includes("discord")) {
      ctxOpts.discord = this.discord.client;
    }
    const ctx = this.createContext(ctxOpts);
    return ctx;
  }
}
