declare module "carbon-app" {
    import { IDataNode, IPage, ITransformationEventData } from "carbon-model";
    import { IEvent, IEventData, IEvent2, IMouseEventData, IKeyboardState } from "carbon-basics";

    export interface IApp extends IDataNode {
        isLoaded: boolean;
        activePage: IPage;

        currentTool: string;
        currentToolChanged: IEvent<string>;

        onBuildMenu: IEvent<{ a: number }>;
        shortcutManager: IShortcutManager;
        actionManager: IActionManager;

        run(): void;
        unload(): void;
        serverless(value?: boolean): boolean;

        companyId(value?: string): string;

        saveWorkspaceState(): void;
        restoreWorkspaceState(): void;
    }

    export interface IView {
        viewContainerElement: HTMLElement;

        animationController: IAnimationController;

        scale(value?: number): number;
        scrollX(value?: number): number;
        scrollY(value?: number): number;
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

    export interface IAnimationController{
        registerAnimationGroup(group: any);
    }

    export interface IActionManager {
        invoke(action: string): void;
        subscribe(action: string, cb: (action: string, result: any) => void);

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

    export var app: IApp;
}