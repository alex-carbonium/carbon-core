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

        getAccessToken(): string;

        loginAsUser(model: ILoginModel): ResponsePromise<ILoginModel, ILoginResult>;
        loginExternal(provider: LoginProvider);
        externalCallback(): ResponsePromise<ILoginModel, ILoginResult>;

        ensureLoggedIn(renewToken?: boolean): Promise<void>;
        logout(): Promise<void>;

        getUserId(): string;
        getAuthorizationHeaders(): any;

        renewTokenCallback();

        startConnection();
        shutdownConnection();

        cdnEndpoint: string;
        servicesEndpoint: string;

        sessionId: string;

        connectionStateChanged: IEvent<ConnectionState>;
        accessTokenChanged: IEvent<string>;
        loginNeeded: IEvent<boolean>;
        requestStarted: IEvent<string>;
        requestEnded: IEvent<string>;

        accountProxy: IAccountProxy;
        shareProxy: IShareProxy;
        staticResourcesProxy: IStaticResourcesProxy;
        fileProxy: IFileProxy;
        fontsProxy: IFontsProxy;
        galleryProxy: IGalleryProxy;
        activityProxy: IActivityProxy;
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

    export interface IImagesResult {
        images: {
            url: string,
            thumbUrl: string,
            name: string,
            width: number,
            height: number,
            thumbWidth: number,
            thumbHeight: number
        }[];
    }
    export interface IFileProxy {
        images(companyId: string): Promise<IImagesResult>;
        uploadPublicImage(model: {content: string}): Promise<{url: string}>;
        uploadPublicFile(model: {content: string}): Promise<{url: string}>;
    }

    export interface IActivityProxy {
        subscribeForFeature(companyId, projectId, feature): Promise<void>;
    }

    export interface ILoginModel{
        email: string;
        password: string;
    }

    export interface ILoginResult{
        userId: string;
        companyName: string;
    }

    export interface IEmailValidationModel {
        email: string;
    }
    export interface IAccountOverview{
        hasAccount: boolean;
        info: IAccountInfo;
        hasPassword: boolean,
        enabledProviders: LoginProvider[]
    }
    export interface IAccountInfo {
        email: string;
        username: string;
    }
    export interface IChangePasswordModel{
        oldPassword: string;
        newPassword: string;
    }
    export interface IAddPasswordModel{
        newPassword: string;
    }

    export interface IForgotPasswordModel{
        email: string;
    }
    export interface IResetPasswordModel{
        token: string;
        newPassword: string;
    }

    export interface IAccountProxy {
        overview(): Promise<IAccountOverview>;

        updateAccountInfo(info: IAccountInfo): ResponsePromise<IAccountInfo, void>;
        addPassword(model: IAddPasswordModel): ResponsePromise<IAddPasswordModel, void>;
        changePassword(model: IChangePasswordModel): ResponsePromise<IChangePasswordModel, void>;

        forgotPassword(model: IForgotPasswordModel): ResponsePromise<IForgotPasswordModel, void>;
        resetPassword(model: IResetPasswordModel): ResponsePromise<IResetPasswordModel, void>;

        register(model: { username: string, email: string, password: string }): Promise<void>;

        resolveCompanyId(companyName: string): Promise<{ companyId: string }>;
        getCompanyName(): Promise<{ companyName: string }>;

        validateEmail(model: IEmailValidationModel): ResponsePromise<IEmailValidationModel, void>;
    }

    export interface IPaginatedResult<T> {
        pageData: T[];
        totalCount: number;
    }

    export const enum ResourceScope {
        Company,
        Public
    }
    export interface IValidatePageNameModel {
        name: string;
        scope: ResourceScope;
    }
    export interface IValidatePageNameResult {
        exists: boolean
    }
    export interface ISharedPage {
        name: string;
        description: string;
        tags: string;
        coverUrl: string;
    }
    export interface IPublishPageModel extends ISharedPage {
        pageData: string;
        scope: ResourceScope;
    }
    export interface IPublishPageResult extends ISharedPage {
        galleryId: string;
    }
    export interface ISharedPageSetup extends ISharedPage {
        scope: ResourceScope;
    }
    export interface ISharedResource extends ISharedPage {
        dataUrl: string;
        downloads?: number;
        authorId: string;
        authorName: string;
        authorAvatar?: string;
    }
    export interface IUseCodeResult {
        companyName: string;
        companyId: string;
        userId: string;
        projectId: number;
    }
    export interface IShareProxy {
        use(code: string): Promise<IUseCodeResult>;
        getPageSetup(pageId: string): Promise<ISharedPageSetup>;
        validatePageName(model: IValidatePageNameModel): ResponsePromise<IValidatePageNameModel, IValidatePageNameResult>;
        publishPage(model: IPublishPageModel): ResponsePromise<IPublishPageModel, IPublishPageResult>;

        resources(from: number, to: number, search?: string): Promise<IPaginatedResult<ISharedResource>>;
    }
    export interface IStaticResourcesProxy {
        staticResources(from: number, to: number, search?: string): Promise<IPaginatedResult<ISharedResource>>;
    }
    export interface IGalleryProxy {
        resources(from: number, to: number, search?: string): Promise<IPaginatedResult<ISharedResource>>;
    }

    export interface IFontsProxy{
        search(query: string, page: number): Promise<any>;
        system(page: number): Promise<any>;
    }

    export const logger: ILogger;
    export const backend: IBackend;
    export const DashboardProxy: IDashboardProxy;
    export const FileProxy: IFileProxy;

    export {LoginProvider} from "carbon-basics";

    export type CarbonGlobals = {
        coreScript: string;
        coreLoaded: boolean;
        coreCallback: () => void;
        resourceFile: string;
        backend?: IBackend;
    }
    export const globals: CarbonGlobals;

    export var util: {
        debounce(func: (...args: any[]) => any, ms: number): () => any;
        throttle(func: (...args: any[]) => any, ms: number): () => any;
        pushAll(target: any[], source: any[]);
    }
}

declare function assertNever(t: never);

declare interface Promise<T>{
    finally<U>(handler: () => U): Promise<T>;
    cancel(): void;
}