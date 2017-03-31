declare module "carbon-internal" {
    export interface IPersistentConnection {
        getModelSyncHub(): Promise<IHub>;
    }

    export interface IHub {
        invoke(method: string, ...args: any[]): Promise<any>;
    }
}

declare module "carbon-model"{
    export interface IUIElement{
        canSelect(): boolean;
    }

    export interface IContainer{
        globalMatrixToLocal(m: any): any;
    }
}

declare module "carbon-app"{
    import { IUIElement, ILayer } from 'carbon-model';
    import { IContext } from "carbon-rendering";

    export interface IApp{
        offlineModel: any;
        modelSyncProxy: any;

        viewportSize(): any;
    }

    export interface IView{
        interactionLayer: any;
        scaleMatrix: any;

        registerForLayerDraw(layerType:number, element:{onLayerDraw:(layer: ILayer, context: IContext)=>void});
        unregisterForLayerDraw(layerType:number, element:any);

        viewportRect(): any;
    }

    export interface IController{
        isInlineEditMode?: boolean;
        inlineEditor?: any;
    }

    export const MirroringController: any;
    export const Context: any;
    export const Layer: any;
    export const MirroringView: any;
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