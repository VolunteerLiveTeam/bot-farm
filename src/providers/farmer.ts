import { Injectable } from "../injector";
import StrictEmitter from "strict-event-emitter-types";
import { EventEmitter } from "events";

export interface FarmEvents {
  shutdown: void;
  botReload(id: string): void;
}

type Emitter = StrictEmitter<EventEmitter, FarmEvents>;

@Injectable()
export default class Farmer extends (EventEmitter as { new (): Emitter }) {
  constructor() {
    super();
  }
}
