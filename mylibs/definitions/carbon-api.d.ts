declare module "carbon-api"{
    import bluebird from "bluebird";

    export interface ILogger{
        fatal(message: string, error?: Error): void;
    }

    export interface IBackend{
        ensureLoggedIn(renewToken?: boolean): Promise<void>;
        getUserId(): string;
        addUrlPath(...pathes: string[]): string;
    }

    export type Promise<T> = bluebird<T>;

    export interface IAccountProxy{
        resolveCompanyId(companyName: string): Promise<{companyId: string}>;
    }

    export var logger: ILogger;
    export var backend: IBackend;
    export var AccountProxy: IAccountProxy;
}