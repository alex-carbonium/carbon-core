declare module "carbon-api"{
    export interface IBackend{
        loginAsUser(username: string, password: string): Promise<void>;

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