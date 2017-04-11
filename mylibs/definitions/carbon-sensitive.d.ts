declare module "carbon-api"{
    export interface ILoginModel{
        email: string;
        password: string;
    }

    export interface ILoginResult{
        userId: string;
        companyName: string;
    }

    export interface IBackend{
        loginAsUser(model: ILoginModel): ResponsePromise<ILoginModel, ILoginResult>;

        ensureLoggedIn(renewToken?: boolean): Promise<void>;
        logout(): Promise<void>;

        getUserId(): string;
        getAuthorizationHeaders(): any;

        renewTokenCallback();

        cdnEndpoint: string;
        servicesEndpoint: string;

        accountProxy: IAccountProxy;
    }
}