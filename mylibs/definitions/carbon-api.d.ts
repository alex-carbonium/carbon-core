declare module "carbon-api" {
    import { IEvent, LoginProvider } from "carbon-basics";

    export interface ILogger {
        trace(message: string): void;
        info(message: string): void;
        warn(message: string): void;
        error(message: string, error?: Error): void;
        fatal(message: string, error?: Error): void;

        trackPageView();
        trackEvent(name: string, properties?: object, metrics?: object);
        trackMetric(name: string, value: number): void;

        flush(): void;
    }

    export type ConnectionState =
        {type: "notStarted"} |
        {type: "connecting"} |
        {type: "connected", connectionTime: Date} |
        {type: "reconnecting"} |
        {type: "goingIdle"} |
        {type: "shuttingDown"} |
        {type: "stopped", idle: boolean} |
        {type: "waiting", timeout: number, startTime: Date};

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
        getUserName(): string;
        getUserAvatar(): string;
        getCompanyName() : string;
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
        projectProxy: IProjectProxy;
        shareProxy: IShareProxy;
        staticResourcesProxy: IStaticResourcesProxy;
        fileProxy: IFileProxy;
        fontsProxy: IFontsProxy;
        galleryProxy: IGalleryProxy;
        activityProxy: IActivityProxy;
        dataProxy: IDataProxy;
        dashboardProxy: IDashboardProxy;
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
        deleteProject(companyId:string, projectId:string): Promise<any>;
        duplicateProject(companyId:string, projectId:string): Promise<any>;
    }

    export interface IProjectProxy {
        getModel(companyId: string, modelId: string): Promise<{}>;
    }

    export type UserImage = {
        url: string,
        thumbUrl: string,
        name: string,
        width: number,
        height: number,
        thumbWidth: number,
        thumbHeight: number
    };
    export interface ImagesResult {
        images: UserImage[];
    }
    export interface IFileProxy {
        uploadUrl(model: {content: string, name: string}): Promise<UserImage>;
        images(companyId: string): Promise<ImagesResult>;
        uploadPublicImage(model: {content: string}): Promise<{url: string}>;
        uploadPublicFile(model: {content: string}): Promise<{url: string}>;
    }

    export interface IActivityProxy {
        subscribeForFeature(companyId, projectId, feature): Promise<void>;
        subscribeForBeta(email): Promise<void>;
    }

    export interface IDataProxy {
        generate(fields, rows): Promise<object[]>;
        discover(): Promise<any>;
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

    export interface IRecentProject
    {
        projectId:string;
        projectName:string;
        companyId:string;
        companyName:string;
    }

    export interface IAccountProxy {
        overview(): Promise<IAccountOverview>;
        recentProjects(): Promise<{projects:IRecentProject[]}>;

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
    export type Screenshot = {
        id: string;
        name: string;
        url: string;
    }
    export interface ISharedPage {
        name: string;
        description: string;
        tags: string;
        coverUrl: string;
        screenshots: Screenshot[];
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
        timesUsed: number;
        authorId: string;
        authorName: string;
        authorAvatar?: string;
        scope: ResourceScope;
    }
    export interface IUseCodeResult {
        companyName: string;
        companyId: string;
        userId: string;
        projectId: number;
    }
    export const enum ShareRole {
        ViewOnly,
        Comment,
        Edit
    }
    export type ShareCode = {
        code: string;
        role: ShareRole;
    }
    export type MirrorCode = {
        code: string;
    }
    export interface IShareProxy {
        getCodes(companyId: string, projectId: string) : Promise<{codes: ShareCode[]}>;
        addCode(companyId: string, projectId: string, role: ShareRole) : Promise<ShareCode>;
        deleteCode(companyId: string, projectId: string, code: string) : Promise<{}>;
        deleteAllCodes(companyId: string, projectId: string) : Promise<{}>;
        use(code: string): Promise<IUseCodeResult>;

        mirrorCode(companyId: string, projectId: string, enable: boolean): Promise<MirrorCode>;
        disableMirroring(companyId: string, projectId: string): Promise<{}>;

        getPageSetup(pageId: string): Promise<ISharedResource>;
        validatePageName(model: IValidatePageNameModel): ResponsePromise<IValidatePageNameModel, IValidatePageNameResult>;
        publishPage(model: IPublishPageModel): ResponsePromise<IPublishPageModel, IPublishPageResult>;

        resources(from: number, to: number, search?: string): Promise<IPaginatedResult<ISharedResource>>;
    }
    export interface IStaticResourcesProxy {
        staticResources(from: number, to: number, search?: string): Promise<IPaginatedResult<ISharedResource>>;
    }
    export interface IGalleryProxy {
        resources(from: number, to: number, search?: string): Promise<IPaginatedResult<ISharedResource>>;
        resource(id: string): Promise<ISharedResource>;
        trackPrivateResourceUsed(companyId: string, resourceId: string): Promise<void>;
        trackPublicResourceUsed(resourceId: string): Promise<void>;
    }

    export interface IFontsProxy{
        search(query: string, page: number): Promise<any>;
        system(page: number): Promise<any>;
    }

    export const logger: ILogger;
    export const backend: IBackend;
    export const FileProxy: IFileProxy;

    export {LoginProvider} from "carbon-basics";

    export interface CarbonGlobals {
        coreScript: string;
        coreLoaded: boolean;
        coreCallback: () => void;
        resourceFile: string;
        backend?: IBackend;
    }
    export const globals: CarbonGlobals;

    export const util: {
        createUUID(): string;
        debounce(func: (...args: any[]) => any, ms: number): () => any;
        throttle(func: (...args: any[]) => any, ms: number): () => any;
        pushAll(target: any[], source: any[]);
        imageDataPointToCssColor(data:{data:number[]}, index:number):string;
        deepEquals(a: object, b: object): boolean;
    }

    /**
     * Check more possible values at https://github.com/faisalman/ua-parser-js
     */
    export type DeviceType = "console" | "mobile" | "tablet" | "smarttv" | "wearable" | "embedded";
    export type DeviceOS = "Windows" | "Mac OS" | "Linux" | "iOS" | "Android";
    export type Browser = "Chrome" | "Chromium" | "Edge" | "IE" | "Mozilla" | "Firefox" | "Safari";
    export interface Platform {
        deviceType: DeviceType;
        deviceOS: DeviceOS;
        browser: {
            name: Browser;
            version: string;
            major: string;
        };
    }
    export const platform: Platform;

    export interface StartupParams {
        endpoints: {
            services: string;
            storage: string;
            cdn: string;
            file: string;
            error: string;
        };
        transport: "auto" | "nows";
        serveless: boolean;
        clearStorage: boolean;
        perf: boolean;
        realCdn: string;
    }
}

declare function assertNever(t: never);

declare interface Promise<T>{
    delay(ms: number): Promise<T>;
    finally<U>(handler: () => U): Promise<T>;
    cancel(): void;
}