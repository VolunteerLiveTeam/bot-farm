import * as Snoowrap from "snoowrap";
import { Injectable } from "../injector";
import { Config } from "../lib/config";

@Injectable()
export default class RedditProvider {
  private _snoo: Snoowrap;
  public constructor(private readonly config: Config) {
    this._snoo = new Snoowrap((config.getObject(
      "reddit"
    ) as unknown) as Snoowrap.SnoowrapOptions);
  }

  public get r() {
      return this._snoo;
  }
}
