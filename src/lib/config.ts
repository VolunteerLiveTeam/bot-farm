import * as fs from "fs";
import { get } from "lodash";
import { Injectable } from "../injector";
import * as dotenv from "dotenv";

dotenv.config();

abstract class ConfigSource {
  constructor() {}
  abstract get(): string;
}

type TEnvParams = { env: string; default?: string };
class EnvSource extends ConfigSource {
  constructor(private readonly params: TEnvParams) {
    super();
  }
  get() {
    const val = process.env[this.params.env];
    if (typeof val === "string") {
      return val;
    } else if (typeof this.params.default === "string") {
      return this.params.default;
    } else {
      throw new Error(
        `Env var ${this.params.env} not found and no default given`
      );
    }
  }
}

type TSecretParams = { key: string; default?: string };
class SecretSource extends ConfigSource {
  constructor(private readonly params: TSecretParams) {
    super();
  }
  get() {
    const envMaybe = process.env[this.params.key];
    if (typeof envMaybe === "string") {
      console.warn(
        `[config] WARN: secret ${this.params.key} is in env - probably bad!`
      );
      return envMaybe;
    }
    const path = process.env[this.params.key + "_FILE"];
    if (typeof path !== "string") {
      if (typeof this.params.default === "string") {
        console.debug(`[config] using default for secret ${this.params.key}`);
        return this.params.default;
      } else {
        throw new Error(`Secret ${this.params.key} not mounted`);
      }
    }
    return fs.readFileSync(path, { encoding: "utf-8" });
  }
}

type TConfData = { [K: string]: TConfData | ConfigSource };

export class ConfigBuilder {
  private data: TConfData = {};

  constructor() {}

  public build() {
    const rez = new Config(this.data);
    return rez;
  }

  public for(key: string, cb: (b: ConfigBuilder) => ConfigBuilder) {
    const rez = cb(new ConfigBuilder());
    this.data[key] = rez.data;
    return this;
  }

  public env(key: string): this;
  public env(key: string, envVar: string): this;
  public env(key: string, envVar: string, def: string): this;
  public env(key: string, envVar?: string, def?: string): this {
    if (typeof envVar === "string") {
      this.data[key] = new EnvSource({ env: envVar, default: def });
    } else {
      this.data[key] = new EnvSource({ env: key });
    }
    return this;
  }

  public secret(key: string): this;
  public secret(key: string, secretKey: string): this;
  public secret(key: string, secretKey: string, def: string): this;
  public secret(key: string, secretKey?: string, def?: string): this {
    if (typeof secretKey === "string") {
      this.data[key] = new SecretSource({ key: secretKey, default: def });
    } else {
      this.data[key] = new SecretSource({ key });
    }
    return this;
  }
}

@Injectable()
export class Config {
  constructor(private readonly _data: TConfData) {}

  public get(key: string): string {
    const field = get(this._data, key);
    if (!(field instanceof ConfigSource)) {
      throw new Error(
        `Tried to access nested config object as if it was a key (${key})`
      );
    }
    const rez = field.get();
    return rez;
  }

  public getObject(key: string) {
    const obj = get(this._data, key);
    if (typeof obj === "string") {
      throw new Error(`Called getObject on non-object type ${key}`);
    }
    const rez: { [K: string]: string } = {};
    Object.keys(obj).forEach(subkey => {
      rez[subkey] = this.get(key + "." + subkey);
    });
    return rez;
  }

  public for(id: string) {
    return {
      get: (key: string) => this.get(id + "." + key),
      getObject: (key: string) => this.getObject(id + "." + key)
    };
  }
}
