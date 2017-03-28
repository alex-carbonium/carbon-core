declare module "carbon-app" {
    import { IDataNode, IPage, ITransformationEventData, IUIElement } from "carbon-model";
    import { IEvent, IEventData, IEvent2, IMouseEventData, IKeyboardState } from "carbon-basics";

    export interface IAppProps {

    }

    export interface IApp extends IDataNode<IAppProps> {
        isLoaded: boolean;
        activePage: IPage;

        currentTool: string;
        currentToolChanged: IEvent<string>;

        onBuildMenu: IEvent<{ a: number }>;
        shortcutManager: IShortcutManager;
        actionManager: IActionManager;

        offlineModel: any;
        modelSyncProxy: any;
        platform: any; //TODO: remove platform
        environment: IEnvironment;

        types:{
            Page:IPage
        }

        run(): void;
        unload(): void;
        serverless(value?: boolean): boolean;

        companyId(value?: string): string;

        saveWorkspaceState(): void;
        restoreWorkspaceState(): void;

        showFrames(value?: boolean): boolean;

        addNewPage(option?: any): void;

        relayout(): void;
    }

    export interface IView {
        viewContainerElement: HTMLElement;
        page: IPage;
        animationController: IAnimationController;
        contextScale: number;

        scale(value?: number): number;
        zoom(value?: number): void;
        zoomToFit(): void;
        scrollX(value?: number): number;
        scrollY(value?: number): number;

        ensureScale(element: IUIElement<any>);
        ensureVisible(element: IUIElement<any>);
        scrollToCenter(): void;

        setActivePage(page: IPage);

        draw();
        invalidate();
    }

    export interface IController {
        draggingEvent: IEvent<ITransformationEventData>;
        resizingEvent: IEvent<ITransformationEventData>;
        rotatingEvent: IEvent<ITransformationEventData>;
        startDrawingEvent: IEvent<IEventData>;

        mousedownEvent: IEvent2<IMouseEventData, IKeyboardState>;
        mousemoveEvent: IEvent2<IMouseEventData, IKeyboardState>;

        interactionActive: boolean;

        actionManager: IActionManager;

        updateCursor(eventData: IMouseEventData): void;
        defaultCursor(): string;
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
        invoke(action: string, callback?: (success: boolean, result?: any) => void): void;
        subscribe(action: string, cb: (action: string, result: any) => void);
        registerAction(name: string, description: string, category: string, callback: (option?: any) => any): IAction;

        getActionFullDescription(name: string, translate?: (value: string) => string): string;
        getActionDescription(action: string): string;
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

    export var app: IApp;
}