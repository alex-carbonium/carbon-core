declare module "carbon-api" {
    import { IEvent, LoginProvider } from "carbon-basics";

    export interface ILogger {
        fatal(message: string, error?: Error): void;
    }

    export type ConnectionState =
        {type: "notStarted"} |
        {type: "connecting"} |
        {type: "connected"} |
        {type: "goingIdle"} |
        {type: "shuttingDown"} |
        {type: "stopped", idle: boolean} |
        {type: "waiting", timeout: number};

    export interface IBackend {
        addUrlPath(...pathes: string[]): string;

        isLoggedIn(): boolean;
        isGuest(): boolean;

        encodeUriData(data: any): string;

        sessionId: string;

        connectionStateChanged: IEvent<ConnectionState>;
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

    export {LoginProvider} from "carbon-basics";
}

declare function assertNever(t: never);

declare interface Promise<T>{
    finally<U>(handler: () => U): Promise<T>;
    cancel(): void;
}