declare module "carbon-app" {
    import { IDataNode, IPage, ITransformationEventData, IUIElement } from "carbon-model";
    import { IEvent, IEventData, IEvent2, IMouseEventData, IKeyboardState } from "carbon-basics";

    export interface IApp extends IDataNode {
        isLoaded: boolean;
        activePage: IPage;

        currentTool: string;
        currentToolChanged: IEvent<string>;

        onBuildMenu: IEvent<{ a: number }>;
        shortcutManager: IShortcutManager;
        actionManager: IActionManager;

        offlineModel: any;
        modelSyncProxy:any;

        run(): void;
        unload(): void;
        serverless(value?: boolean): boolean;

        companyId(value?: string): string;

        saveWorkspaceState(): void;
        restoreWorkspaceState(): void;

        showFrames(value?: boolean): boolean;

        addNewPage(option?:any):void;
    }

    export interface IView {
        viewContainerElement: HTMLElement;

        scale(value?: number): number;
        zoom(value? :number):void;
        zoomToFit(): void;
        scrollX(value?: number): number;
        scrollY(value?: number): number;

        ensureScale(element:IUIElement);
        ensureVisible(element:IUIElement);
        scrollToCenter():void;
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

    export interface IAction
    {
        name:string;
        category?:string;
        description?:string;
        setCondition?:(condition)=>IAction;
        callback?:(options?: any)=>any|void;
        enabled?:()=>boolean;
        condition?:boolean;
    }

    export interface IActionManager {
        invoke(action: string): void;
        subscribe(action: string, cb: (action: string, result: any) => void);
        registerAction(name:string, description:string, category:string, callback:(option?:any  )=>any):IAction;
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

    export var app: IApp;
}