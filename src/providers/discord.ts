import * as Discord from "discord.js";
import { Injectable } from "../injector";
import { Config } from "../lib/config";

@Injectable()
export default class DiscordProvider {
  private _client: Discord.Client;

  constructor(private readonly config: Config) {
    this._client = new Discord.Client({});
    this._client.login(config.get("discord.token"));
  }

  public get client() {
    return this._client;
  }
}
