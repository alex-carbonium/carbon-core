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

    export interface IAccountProxy {
        overview(): Promise<IAccountOverview>;

        updateAccountInfo(info: IAccountInfo): ResponsePromise<IAccountInfo, void>;
        addPassword(model: IAddPasswordModel): ResponsePromise<IAddPasswordModel, void>;
        changePassword(model: IChangePasswordModel): ResponsePromise<IChangePasswordModel, void>;

        register(model: { username: string, email: string, password: string }): Promise<void>;

        resolveCompanyId(companyName: string): Promise<{ companyId: string }>;
        getCompanyName(): Promise<{ companyName: string }>;

        validateEmail(model: IEmailValidationModel): ResponsePromise<IEmailValidationModel, void>;
    }
}