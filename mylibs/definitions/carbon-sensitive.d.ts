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
}