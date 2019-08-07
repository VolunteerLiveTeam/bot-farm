import "reflect-metadata";

export interface Type<T> {
  new (...args: any[]): T;
}

export class Injector extends Map {
  private _scope: string | null = null;

  constructor() {
    super();
  }

  public set scope(val: string | null) {
    this._scope = val;
  }

  public resolve<T>(target: Type<T>): T {
    // Singletons, after all
    const classInstance = this.get(target);
    if (classInstance) {
      return classInstance;
    }

    const tokens = Reflect.getMetadata("design:paramtypes", target) || [];
    const injections = tokens.map((t: Type<any>) =>
      t === Injector ? this : this.resolve(t)
    );

    const newInstance = new target(...injections);
    this.set(target, newInstance);
    return newInstance;
  }
}

/**
 * Mark a class as injectable.
 * @param opts Reserved for future use
 */
export const Injectable = (opts?: unknown) => {
  return (type: Type<any>) => {
    // empty
  };
};
