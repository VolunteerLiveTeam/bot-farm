import { Injectable } from "../injector";
import { Config } from "../lib/config";
import { WebClient } from "@slack/web-api";

@Injectable()
export default class SlackWebProvider {
    private _web: WebClient;
    constructor(private readonly config: Config) {
        this._web = new WebClient(config.get("slack.token"));
    }

    public get api() {
        return this._web;
    }
}