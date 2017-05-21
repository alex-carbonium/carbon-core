declare module "carbon-internal" {
    export interface IHub {
        invoke(method: string, ...args: any[]): Promise<string>;
    }
}

declare module "carbon-geometry"{
    export interface IPoint{
        roundMutableBy(factor: number): IPoint;
    }

    export interface IMatrix{
        transformPoint2(x: number, y: number, round?: boolean): IPoint;
        transformRect(rect: IRect): any;

        decompose(): any;
    }
}

declare module "carbon-model"{
    import { IRect, IMatrix } from "carbon-geometry";

    export interface IDataNode {
        primitivePath():any;
    }

    export interface IUIElement{
        systemType(): string;
        canSelect(): boolean;

        mirrorClone():IUIElement;

        runtimeProps: any;
    }

    export interface IUIElementProps extends IDataNodeProps {
        br: IRect;
        m: IMatrix;
    }

    export interface IContainer{
        globalMatrixToLocal(m: any): any;
        getElementById(id:string):IUIElement|IContainer|null;
    }
}

declare module "carbon-app"{
    import { IUIElement } from 'carbon-model';
    import { IContext } from "carbon-rendering";
    import { IEvent } from "carbon-basics";

    export interface IPage{
        nameProvider: any;

        findDropToPageData(x, y, element);
    }

    export interface IApp{
        offlineModel: any;
        modelSyncProxy: any;
        defaultShapeSettings: any;
        deferredChange: IEvent<any>;
        relayoutFinished: IEvent<void>;
        state: any;
        fontManager: any;

        isInOfflineMode(): boolean;
        isNew(): boolean;
        isSaved(): boolean;
        syncBroken(): boolean;

        viewportSize(): any;
        resetCurrentTool();
    }

    export interface IView{
        interactionLayer: any;
        scaleMatrix: any;
        context: any;

        registerForLayerDraw(layerType:number, element:{onLayerDraw:(layer: ILayer, context: IContext, environment: IEnvironment)=>void}, index?);
        unregisterForLayerDraw(layerType:number, element:any);

        activateLayer(layerType: LayerTypes, silent?: boolean);
        deactivateLayer(layerType: LayerTypes, silent?: boolean);

        dropToLayer(x:number, y:number, element:IUIElement):void;

        prototyping(value?:boolean): boolean;
        hitElementDirect(e?, cb?, includeInteractionLayer?: boolean);

        zoomOutStep():void;
        zoomInStep():void;
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
    export interface IArtboard{
        allowArtboardSelection(value?): boolean;
    }

    export interface IPrimitiveRoot{
        registerSetProps(element, props, oldProps, mode);
        registerPatchProps(element, patchType, propName, item, mode);
        registerDelete(parent, element, index, mode)
        registerInsert(parent, element, index, mode)
        registerChangePosition(parent, element, index, oldIndex, mode);
        isEditable(): boolean;
        isFinalRoot(): boolean;
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

        signinSilent(): Promise<void>;
        signinSilentCallback(): Promise<void>;

        events: {
            addUserLoaded(cb: (container: {access_token: string}) => void): void;
            addSilentRenewError(cb: (error: Error) => void): void;
        }
    }

    export = UserManager;
}

declare module "oidc-client/src/Log" {
    class Log {
        static logger: any;
        static level: number;

        static ERROR: number;
    }
    export = Log;
}