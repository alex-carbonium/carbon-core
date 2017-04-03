declare module "carbon-api" {
    import { IEvent } from "carbon-basics";

    export interface ILogger{
        fatal(message: string, error?: Error): void;
    }

    export interface IBackend{
        ensureLoggedIn(renewToken?: boolean): Promise<void>;
        logout(): Promise<void>;

        getUserId(): string;
        addUrlPath(...pathes: string[]): string;

        isLoggedIn(): boolean;
        isGuest(): boolean;

        loginNeeded: IEvent<boolean>;
        requestStarted: IEvent<string>;
        requestEnded: IEvent<string>;

        cdnEndpoint: string;
    }

    export interface IAccountProxy{
        resolveCompanyId(companyName: string): Promise<{companyId: string}>;
    }

    export interface IDashboardProxy{
        dashboard(companyId: string): Promise<any>;
    }

    export interface IFileProxy{
        images(companyId: string): Promise<any>;
    }

    export const logger: ILogger;
    export const backend: IBackend;
    export const AccountProxy: IAccountProxy;
    export const DashboardProxy: IDashboardProxy;
    export const FileProxy: IFileProxy;
}