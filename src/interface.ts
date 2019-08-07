import { ConfigBuilder, Config } from "./lib/config";
import { Injectable, Type } from "./injector";

export interface Bot {
  (ctx: BotContext): void;
  configParameters?: (cb: ConfigBuilder) => ConfigBuilder;
  id: string;
}

export function createBot(
  fields: { [K in keyof Bot]: Bot[K] extends Function ? never : Bot[K] },
  func: (ctx: BotContext) => void
): Bot {
  const target = func as any;
  for (const k in fields) {
    target[k] = (fields as any)[k];
  }
  return target;
}

export interface BotContext {
  require<T>(target: Type<T>): T;
}
