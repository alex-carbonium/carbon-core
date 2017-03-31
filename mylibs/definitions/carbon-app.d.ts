declare module "carbon-app" {
    import { ILayer, IDataNode, IPage, ITransformationEventData, IUIElement, IDataNodeProps, IUIElementProps, IPropsOwner, IArtboard } from "carbon-model";
    import { IEvent, IEventData, IEvent2, IMouseEventData, IKeyboardState, Brush } from "carbon-basics";
    import { IRect } from "carbon-geometry";

    export interface IFontMetadata{
        name: string;
        weight: number;
        style: number;
    }

    export interface IAppProps extends IDataNodeProps{
        customGuides: any;
    }
    export interface IApp extends IDataNode, IPropsOwner<IAppProps> {
        isLoaded: boolean;
        loaded: Promise<void>;

        logEvent: IEvent<any>;
        changed: IEvent<any>;
        restoredLocally: IEvent<void>;

        activePage: IPage;
        pageChanged: IEvent2<IPage, IPage>;
        pageAdded: IEvent<IPage>;
        pageRemoved: IEvent<IPage>;
        changeToolboxPage: IEvent<void>;
        
        pages: IPage[];
        addPage(page: IPage);
        addNewPage(): void;
        removePage(page: IPage);
        setActivePage(page: IPage);
        setActivePageById(id: string);

        activeStory: any;
        stories: any[];
        activeStoryChanged: IEvent<any>;
        setActiveStoryById(id);
       
        loadedLevel1: Promise<void>;        

        currentTool: string;
        currentToolChanged: IEvent<string>;

        onBuildMenu: any;
        shortcutManager: IShortcutManager;
        actionManager: IActionManager;

        modelSyncProxy: any;
        platform: any; //TODO: remove platform
        environment: IEnvironment;

        project: any;// TODO: remove project

        run(): void;
        unload(): void;
        serverless(value?: boolean): boolean;

        isDirty(): boolean;

        companyId(value?: string): string;

        saveWorkspaceState(): void;
        restoreWorkspaceState(): void;

        showFrames(value?: boolean): boolean;

        addNewPage(option?: any): void;

        relayout(): void;

        getFontMetadata(family: string): IFontMetadata;
        saveFontMetadata(metadata: IFontMetadata): void;
        loadFont(family: string, style: number, weight: number): Promise<void>;

        updateStyle(styleType, styleId, style);

        setMode(mode);
        modeChanged: IEvent<any>;

        getAllFrames(): any[];

        defaultFill(fill?: Brush, mode?: any): Brush;
        defaultStroke(stroke?: Brush, mode?: any): Brush;
        useRecentColor(color: Brush);
        recentColors(): string[];

        getAllTemplateResourceArtboards(): IArtboard[];

        setActivePageById(pageId:string);
        removePage(page:IPage, setNewActive?:boolean)
        addPage(page:IPage);
        setActivePage(page:IPage);


    }

    export interface IView {
        viewContainerElement: HTMLElement;
        page: IPage;
        animationController: IAnimationController;
        contextScale: number;

        scaleChanged: IEvent<number>;

        setActivePage(page: IPage);

        scale(value?: number): number;
        zoom(value? :number, norefresh?: boolean):void;
        zoomToFit(): void;
        scrollX(value?: number): number;
        scrollY(value?: number): number;

        ensureScale(element: IUIElement);
        ensureVisible(element: IUIElement);
        scrollToCenter(): void;

        getLayer(layerType:any) : ILayer;

        setActivePage(page: IPage);

        draw();
        invalidate();
    }

    export interface IController {
        draggingEvent: IEvent<ITransformationEventData>;
        startResizingEvent: IEvent<ITransformationEventData>;
        resizingEvent: IEvent<ITransformationEventData>;
        stopResizingEvent: IEvent<ITransformationEventData>;
        startRotatingEvent: IEvent<ITransformationEventData>;
        rotatingEvent: IEvent<ITransformationEventData>;
        stopRotatingEvent: IEvent<ITransformationEventData>;
        startDrawingEvent: IEvent<IEventData>;

        onArtboardChanged: IEvent2<IArtboard, IArtboard>;

        clickEvent: IEvent2<IMouseEventData, IKeyboardState>;
        dblclickEvent: IEvent2<IMouseEventData, IKeyboardState>;
        mousedownEvent: IEvent2<IMouseEventData, IKeyboardState>;
        mouseupEvent: IEvent2<IMouseEventData, IKeyboardState>;
        mousemoveEvent: IEvent2<IMouseEventData, IKeyboardState>;

        startDraggingEvent: IEvent2<IMouseEventData, IKeyboardState>;
        stopDraggingEvent: IEvent2<IMouseEventData, IKeyboardState>;

        interactionActive: boolean;

        actionManager: IActionManager;

        updateCursor(eventData: IMouseEventData): void;
        defaultCursor(): string;
        captureMouse(element: IUIElement): void;
        releaseMouse(element: IUIElement): void;
    }

    export interface IEnvironment {
        view: IView;
        controller: IController;
        detaching: IEvent2<IView, IController>;
        attached: IEvent2<IView, IController>;

        set(view: IView, controller: IController);
    }

    export interface IAction {
        name: string;
        category?: string;
        description?: string;
        setCondition?: (condition) => IAction;
        callback?: (options?: any) => any | void;
        enabled?: () => boolean;
        condition?: boolean;
    }

    export interface IAnimationController {
        registerAnimationGroup(group: any);
    }

    export interface IActionManager {
        invoke(action: string, callback?: (success: boolean, result?: any) => void): void | Promise<void>;
        subscribe(action: string, cb: (action: string, result: any) => void);
        registerAction(name: string, description: string, category: string, callback: (option?: any) => any): IAction;

        getActionFullDescription(name: string, translate?: (value: string) => string): string;
        getActionDescription(action: string): string;

        hasAction(action: string): boolean;
        getAction(action:string): IAction;
    }

    export interface IShortcutManager {
        mapDefaultScheme(): void;
        mapScheme(scheme: IShortcut[]): void;

        getActionHotkey(actionName: string): string;
        getActionHotkeyDisplayLabel(actionName: string): string;
    }

    export interface IShortcut {
        key: string;
        action: string;
        options?: {
            type?: string,
            repeatable?: boolean
        };
    }

    export interface IMirroringProxyPage extends IPage {
        resetVersion(): void;
    }

    export const enum LayerTypes{
        Content,
        Isolation,
        Interaction
    }

    export interface IInvalidate {
        requested:IEvent2<LayerTypes, IRect>;
        request(layer?, rect?);
        requestInteractionOnly(rect?);
    }

    export var app: IApp;
    export var ActionManager: IActionManager;
    export var Invalidate: IInvalidate;
}