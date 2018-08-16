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
    import { RenderEnvironment } from "carbon-rendering";

    import { IAnimationOptions, IView, IController } from "carbon-core";

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
        runtimeProxy():object;

        primitiveRoot(): IPrimitiveRoot & IUIElement;

        draw(context, environment: RenderEnvironment);
        drawSelf(context, w, h, environment: RenderEnvironment);
        //TODO: think how not to expose this on UIElement
        sourceId(value?: string): string;

        runtimeProps: any;

        isDescendantOrSame(other: IUIElement): boolean;
        select(multi: boolean, view:IView, controller:IController): void;
        unselect(): void;

        hitVisible(): boolean;
        hitTransparent(): boolean;

        canBeAccepted(container: IContainer): boolean;
        canDrag(value?: boolean): boolean;

        clearSavedLayoutProps();
        resetGlobalViewCache();

        contextBarAllowed(): boolean;

        expandRectWithBorder(box: IRect): IRect;
    }

    export interface IUIElementProps extends IDataNodeProps {
        br: IRect;
        m: IMatrix;
    }

    export interface IContainer{
        globalMatrixToLocal(m: any): any;
        getElementById(id:string):IUIElement|IContainer|null;
        autoGrow(dw:number, dh:number, mode?:ChangeMode, sourceElement?:IUIElement);
    }

    export interface IText {
        resetAdapter(): void;
    }

    interface IModel {
        createElement(size?: ISize, props?: Partial<IUIElementProps>): IUIElement;
    }

    interface IFileElement {
        registerImageLink(image: IImage);
    }
}

declare module "carbon-app"{
    import { IUIElement, IPrimitiveRoot, IContainer, IUIElementProps } from 'carbon-model';
    import { IContext, RenderEnvironment } from "carbon-rendering";
    import { IEvent, ViewState, IPrimitive, IConstructor } from "carbon-basics";
    import { ISize, IRect, ICoordinate } from "carbon-geometry";

    export interface IPage<TProps extends IPageProps = IPageProps> extends ILayer<IPageProps> {
        incrementVersion();
    }

    export interface IApp extends IPrimitiveRoot{
        offlineModel: any;
        modelSyncProxy: any;
        defaultShapeSettings: any;
        changedLocally: IEvent<IPrimitive[]>;
        state: any;
        disposed: boolean;

        isInOfflineMode(): boolean;
        isNew(): boolean;
        isSaved(): boolean;
        syncBroken(): boolean;

        mapElementsToLayerMask();

        raiseLoaded();
        clear();
        isEmpty(): boolean;
        
        allowSelection(allow?: boolean);
    }

    export const AppClass: IConstructor<IApp>;

    export interface IView{
        gridContext: IContext;
        interactionLayer: any;
        scaleMatrix: any;
        context: any;
        updateViewportSize(size:ISize);

        focused(value?: boolean): boolean;
        requestRedraw():void;

        activateLayer(layerType: LayerType, silent?: boolean);
        deactivateLayer(layerType: LayerType, silent?: boolean);

        dropElement(element:IUIElement): void;

        prototyping(value?:boolean): boolean;

        zoomOutStep():void;
        zoomInStep():void;

        getScaleToFitRect(rect:IRect, marginFactor?:number):number;
        scrollToPoint(point:ICoordinate):void;

        setup(params: any);
        attachToDOM(contexts: IContext[], container, redrawCallback, cancelCallback, scheduledCallback);
        detach();

        updateViewportSize(size: ISize);

        applyGuideFont(context: IContext): void;
    }

    export interface IController{
        isInlineEditMode?: boolean;
        inlineEditor?: any;

        selectByClick(event);
        repeatLastMouseMove();
        wrapEvent(data);
    }

    export interface IActionManager{
        subscribeToActionStart(action, cb);
    }

    export const MirroringController: any;
    export const Layer: any;
    export const ArtboardPage: any;
    export const MirroringView: any;
    export const ArtboardProxyPage: any;
    export const RelayoutQueue: any;

    //TODO: move to UI
    export const RepeaterActions: any;
    export const SymbolActions: any;

    //TODO: remove
    export const BasePlatform: any;
    
    export interface IFontManagerConstructor {
        new (app): IFontManager;
    }
    export const OpenTypeFontManager: IFontManagerConstructor;
}

declare module "carbon-model"{
    import { IRectData, IAnimationOptions } from "carbon-core";

    export interface IArtboardProps extends IContainerProps {
        hitTestBox: IRectData | null;
    }

    export interface IArtboard{
        allowArtboardSelection(value?): boolean;
        readonly stateAnimations:{[from:string]:{[to:string]:{[prop:string]:IAnimationOptions}}};
        incrementVersion();
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

declare module "carbon-api" {
    interface CarbonGlobals {
        appInsights?: Microsoft.ApplicationInsights.IAppInsights;
    }
}

declare module "hsluv" {
    export function hsluvToRgb(hsl:number[]):number[];
    export function rgbToHsluv(rgb:number[]):number[];
}

declare module "*.w" {
    class W extends Worker {
        constructor();
    }
    export = W;
}