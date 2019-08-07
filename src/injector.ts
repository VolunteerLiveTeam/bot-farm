import "reflect-metadata";

export interface Type<T> {
    new(...args: any[]): T;
}

export class Injector extends Map {
    constructor() {
        super();
    }

    public resolve<T>(target: Type<T>): T {
        const tokens = Reflect.getMetadata("design:paramtypes", target) || [];
        const injections = tokens.map((t: Type<any>) => this.resolve(t));

        const classInstance = this.get(target);
        if (classInstance) {
            return classInstance;
        }

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
    }
}

@Injectable()
class RedditWrapper {
    
}

@Injectable()
class ModmailBot {
    constructor(private readonly reddit: RedditWrapper) {}
}
