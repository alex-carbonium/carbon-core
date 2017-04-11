declare module "carbon-api" {
    import { IEvent } from "carbon-basics";

    export interface ILogger {
        fatal(message: string, error?: Error): void;
    }

    export interface IBackend {
        addUrlPath(...pathes: string[]): string;

        isLoggedIn(): boolean;
        isGuest(): boolean;

        loginNeeded: IEvent<boolean>;
        requestStarted: IEvent<string>;
        requestEnded: IEvent<string>;
    }

    export type Response<TModel, TResult> =
        {
            ok: true,
            result: TResult
        } |
        {
            ok: false,
            errors: {
                [P in keyof TModel]?: string;
            }
        };
    export type ResponsePromise<TModel, TResult> = Promise<Response<TModel, TResult>>;

    export interface IEmailValidationModel {
        email: string;
    }
    export interface IAccountProxy {
        register(model: { username: string, email: string, password: string }): Promise<void>;

        resolveCompanyId(companyName: string): Promise<{ companyId: string }>;
        getCompanyName(): Promise<{ companyName: string }>;

        validateEmail(model: IEmailValidationModel): ResponsePromise<IEmailValidationModel, void>;
    }

    export interface IDashboardProxy {
        dashboard(companyId: string): Promise<any>;
    }

    export interface IFileProxy {
        images(companyId: string): Promise<any>;
    }

    export const logger: ILogger;
    export const backend: IBackend;
    export const DashboardProxy: IDashboardProxy;
    export const FileProxy: IFileProxy;
}

declare function assertNever(t: never);