declare module "carbon-internal" {
    export interface IPersistentConnection {
        getModelSyncHub(): Promise<IHub>;
    }

    export interface IHub {
        invoke(method: string, ...args: any[]): Promise<any>;
    }
}

declare module "carbon-model"{
    import { IRect } from "carbon-geometry";

    export interface IUIElement{
        canSelect(): boolean;

        getBoundaryRect(): IRect;

        runtimeProps: any;
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
        defaultShapeSettings: any;

        viewportSize(): any;
        resetCurrentTool();
    }

    export interface IView{
        interactionLayer: any;
        scaleMatrix: any;

        registerForLayerDraw(layerType:number, element:{onLayerDraw:(layer: ILayer, context: IContext)=>void}, index?);
        unregisterForLayerDraw(layerType:number, element:any);

        viewportRect(): any;

        prototyping(value?:boolean): boolean;
    }

    export interface IController{
        isInlineEditMode?: boolean;
        inlineEditor?: any;

        selectByClick(event);
        repeatLastMouseMove();
    }

    export interface IActionManager{
        subscribeToActionStart(action, cb);
    }

    export const MirroringController: any;
    export const Context: any;
    export const Layer: any;
    export const MirroringView: any;
}

declare module "carbon-model"{
    export interface IPage{
        nameProvider: any;

        dropToPage(x, y, element);
    }

    export interface IArtboard{
        allowArtboardSelection(value?): boolean;
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

declare function assertNever(t: never);