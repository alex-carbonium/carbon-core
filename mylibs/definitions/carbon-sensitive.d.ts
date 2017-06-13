declare module "carbon-api" {
    import { IEvent, LoginProvider } from "carbon-basics";

    export interface ILoginModel{
        email: string;
        password: string;
    }

    export interface ILoginResult{
        userId: string;
        companyName: string;
    }

    export interface IBackend{
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

        accessTokenChanged: IEvent<string>;

        cdnEndpoint: string;
        servicesEndpoint: string;

        accountProxy: IAccountProxy;
        shareProxy: IShareProxy;
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

    export const enum PublishScope {
        Company,
        Public
    }
    export interface IValidatePageNameModel {
        name: string;
        scope: PublishScope;
    }
    export interface IValidatePageNameResult {
        exists: boolean
    }
    export interface IPublishPageModel {
        name: string;
        description: string;
        tags: string;
        pageData: string;
        coverUrl: string;
        scope: PublishScope;
    }
    export interface IPublishPageResult {
        galleryId: string;
    }
    export interface IUseCodeResult {
        companyName: string;
        companyId: string;
        userId: string;
        projectId: number;
    }
    export interface ISharedPageSetup {
        name: string;
        description: string;
        tags: string;
        coverUrl: string;
        scope: PublishScope;
    }
    export interface IShareProxy {
        use(code: string): Promise<IUseCodeResult>;
        getPageSetup(pageId: string): Promise<ISharedPageSetup>;
        validatePageName(model: IValidatePageNameModel): ResponsePromise<IValidatePageNameModel, IValidatePageNameResult>;
        publishPage(model: IPublishPageModel): ResponsePromise<IPublishPageModel, IPublishPageResult>;
    }
}