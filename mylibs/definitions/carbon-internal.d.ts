declare module "carbon-internal" {
    export interface IPersistentConnection {
        getModelSyncHub(): Promise<IHub>;
    }

    export interface IHub {
        invoke(method: string, ...args: any[]): Promise<any>;
    }
}

declare module "carbon-app"{
    export interface IApp{
        offlineModel: any;
        modelSyncProxy: any;
    }
}

declare module "oidc-client/src/UserManager" {

    interface UserManagerOptions {
        authority: string;
        client_id: string;

        response_type: string;
        scope: string;

        silent_redirect_uri: string;
        automaticSilentRenew: boolean;
        silentRequestTimeout: number;
        monitorSession: boolean;
        filterProtocolClaims: boolean;
        loadUserInfo: boolean
    }

    class UserManager{
        constructor(options: UserManagerOptions);

        signinSilent(): Promise<{access_token: string}>;
        signinSilentCallback(): Promise<void>;

        events: {
            addSilentRenewError(cb: (error: Error) => void): void;
        }
    }

    export = UserManager;
}

declare module "oidc-client/src/Log" {
    class Log {
        static logger: any;
        static level: string;

        static ERROR: string;
    }
    export = Log;
}