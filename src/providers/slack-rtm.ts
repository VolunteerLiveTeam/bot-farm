import { Injectable } from "../injector";
import { Config } from "../lib/config";
import { RTMClient } from "@slack/rtm-api";
import { WebAPICallResult } from "@slack/web-api";

@Injectable()
export default class SlackRTMProvider {
  private _rtm: RTMClient;
  private _self: { id: string; name: string } | null = null;
  private _team: { id: string; name: string; domain: string } | null = null;
  constructor(private readonly config: Config) {
    this._rtm = new RTMClient(config.get("slack.token"));
  }

  public async connect() {
    const rez = await this._rtm.start();
    this._self = rez.self as any;
    this._team = rez.team as any;
    return {
      client: this._rtm,
      self: this._self!,
      team: this._team!
    };
  }
}
