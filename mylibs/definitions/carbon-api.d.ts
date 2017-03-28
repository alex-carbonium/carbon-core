declare module "carbon-api" {
    import { IEvent } from "carbon-basics";

    export interface ILogger{
        fatal(message: string, error?: Error): void;
    }

    export interface IBackend{
        ensureLoggedIn(renewToken?: boolean): Promise<void>;
        getUserId(): string;
        addUrlPath(...pathes: string[]): string;

        loginNeeded: IEvent<boolean>;
        requestStarted: IEvent<string>;
        requestEnded: IEvent<string>;

        cdnEndpoint: string;
    }

    export interface IAccountProxy{
        resolveCompanyId(companyName: string): Promise<{companyId: string}>;
    }

    export var logger: ILogger;
    export var backend: IBackend;
    export var AccountProxy: IAccountProxy;
}