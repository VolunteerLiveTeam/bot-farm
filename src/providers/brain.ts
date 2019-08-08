import { Injectable } from "../injector";

interface BrainType {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
  merge(data: { [K: string]: string }): void;
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
      },
      remove(key: string) {
        delete space[prefix + ":" + key];
      },
      merge(data: { [K: string]: string }) {
        Object.keys(data).forEach(key => {
          space[prefix + ":" + key] = data[key];
        });
      }
    };
  }
}
