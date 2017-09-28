declare module "carbon-internal" {
    export interface IHub {
        invoke(method: string, ...args: any[]): Promise<string>;
    }
}

declare module "carbon-geometry"{
    export interface IPoint{
        roundMutableBy(factor: number): IPoint;
        roundToNearestHalf(factor: number): IPoint;
    }

    export interface IMatrix{
        transformPoint2(x: number, y: number, round?: boolean): IPoint;
        transformRect(rect: IRect): any;

        decompose(): any;
    }
}

declare module "carbon-model"{
    import { ChangeMode, Font } from "carbon-basics";
    import { IRect, IMatrix, ISize } from "carbon-geometry";

    export interface IDataNode {
        primitivePath():any;
    }

    export interface IUIElement {
        removing(): boolean;
        removed(mode: ChangeMode);

        systemType(): string;
        canSelect(): boolean;
        flatten?():void;

        mirrorClone():IUIElement;

        primitiveRoot(): IPrimitiveRoot;

        draw(context, environment);
        drawSelf(context, w, h, environment);
        //TODO: think how not to expose this on UIElement
        sourceId(value?: string): string;

        runtimeProps: any;

        applyVisitorTLR(callback:(e:IUIElement)=>boolean|void);
        opacity(value?:number):number;

        isDescendantOrSame(other: IUIElement): boolean;
        select(multi?: boolean): void;
        unselect(): void;

        hitVisible(): boolean;
        hitTransparent(): boolean;

        canDrag(value?: boolean): boolean;

        clearSavedLayoutProps();
        resetGlobalViewCache();

        contextBarAllowed(): boolean;
    }

    export interface IUIElementProps extends IDataNodeProps {
        br: IRect;
        m: IMatrix;
    }

    export interface IContainer{
        globalMatrixToLocal(m: any): any;
        getElementById(id:string):IUIElement|IContainer|null;
    }

    export interface IText {
        resetEngine(): void;
    }
}

declare module "carbon-app"{
    import { IUIElement, IPrimitiveRoot } from 'carbon-model';
    import { IContext } from "carbon-rendering";
    import { IEvent, ViewState, IPrimitive } from "carbon-basics";
    import { ISize } from "carbon-geometry";

    export interface IPage{
        nameProvider: any;

        findDropToPageData(x, y, element);

        incrementVersion();

        applyVisitorTLR(callback:(e:IUIElement)=>boolean|void);
    }

    export interface IApp extends IPrimitiveRoot{
        offlineModel: any;
        modelSyncProxy: any;
        defaultShapeSettings: any;
        deferredChange: IEvent<any>;
        relayoutFinished: IEvent<void>;
        changedLocally: IEvent<IPrimitive[]>;
        state: any;

        isInOfflineMode(): boolean;
        isNew(): boolean;
        isSaved(): boolean;
        syncBroken(): boolean;

        mapElementsToLayerMask();
    }

    export interface IView{
        gridContext: IContext;
        interactionLayer: any;
        scaleMatrix: any;
        context: any;


        focused(value?: boolean): boolean;

        activateLayer(layerType: LayerTypes, silent?: boolean);
        deactivateLayer(layerType: LayerTypes, silent?: boolean);

        dropToLayer(x:number, y:number, element:IUIElement):void;

        prototyping(value?:boolean): boolean;

        zoomOutStep():void;
        zoomInStep():void;

        setup(params: any);
        attachToDOM(contexts:IContext[], upperContext:IContext, isolationContext:IContext, container, redrawCallback, cancelCallback, scheduledCallback);
        detach();

        updateViewportSize(size: ISize);
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
    export const Layer: any;
    export const MirroringView: any;
}

declare module "carbon-model"{
    import { IRectData } from "carbon-core";

    export interface IArtboardProps extends IContainerProps {
        hitTestBox: IRectData | null;
    }

    export interface IArtboard{
        allowArtboardSelection(value?): boolean;
    }

    export interface IPrimitiveRoot {
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