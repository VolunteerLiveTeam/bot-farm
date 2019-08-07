import { Injectable } from "../injector";

interface BrainType {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

@Injectable()
export class Brain {
  create(_: string): BrainType {
    throw new Error(
      "Brain implementation not set! This is either a bug or a misconfiguration."
    );
  }
}

@Injectable()
export class InMemoryBrain extends Brain {
  create(prefix: string) {
    const space: { [K: string]: string } = {};
    return {
      get(key: string): string {
        return space[prefix + ":" + key];
      },
      set(key: string, value: string) {
        space[prefix + ":" + key] = value;
      }
    };
  }
}
