// -------------------- basics

export interface IRect{
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ICoordinate{
    x: number;
    y: number;
}

export interface IPoint extends ICoordinate{
    getDistance(fromPoint: IPoint): number;
    getDirectedAngle(fromPoint: IPoint): number;
}

export interface IContext{
    font: string;
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    globalAlpha: number;

    translate(x: number, y: number): void;
    rotate(radians: number): void;

    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    beginPath(): void;
    closePath(): void;

    fillRect(x: number, y: number, width: number, height: number): void;
    fillText(text: string, x: number, y: number): void;
    stroke(): void;

    save(): void;
    restore() :void;
}

export interface IEventData{
    handled: boolean;
}

export interface IMouseEventData extends IEventData{
    x: number;
    y: number;
    isDragging: boolean;
    cursor: string;
}

export interface ITransformationEventData extends IEventData{
    transformationElement: ITransformationElement;
}

export interface IEvent<T>{
    raise(data: T): void;
    bind(callback: (data: T) => void): IDisposable;
    bind(owner: any, callback: (data: T) => void): IDisposable;
}

export interface IEvent2<T1, T2>{
    raise(data1: T1, data2: T2): void;
    bind(callback: (data1: T1, data2: T2) => void): IDisposable;
    bind(owner: any, callback: (data1: T1, data2: T2) => void): IDisposable;
}

export interface IKeyboardState{
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
}

export interface IDisposable{
    dispose(): void;
}

// -------------------- element model

export interface IDataNode{
}

export interface IUIElement extends IDataNode{
    shouldApplyViewMatrix(): boolean;

    getBoundingBox(): IRect;
    getBoundingBoxGlobal(): IRect;

    hitTest(point: IPoint, scale: number, boundaryRectOnly: boolean): boolean;
    hitTestGlobalRect(rect: IRect, directSelection: boolean): boolean;

    showResizeHint(): boolean;
}

export interface IContainer extends IUIElement{
    children: IUIElement[];
}

export interface IGroupContainer extends IContainer{
    wrapSingleChild(): boolean;
    translateChildren(): boolean;
}

export interface IComposite extends IUIElement{
    elements: IUIElement[];

    allHaveSameParent(): boolean;
}

export interface ITransformationElement extends IComposite, IGroupContainer{
}

export interface ILayer extends IContainer{
}

export interface IApp extends IDataNode{
    currentTool: string;
    currentToolChanged: IEvent<string>;

    onBuildMenu: IEvent<{a: number}>;

    shortcutManager: IShortcutManager;

    saveWorkspaceState(): void;
    restoreWorkspaceState(): void;
}

export interface IView{
    viewContainerElement: HTMLElement;

    scale(value?: number): number;
    scrollX(value?: number): number;
    scrollY(value?: number): number;
}

export interface IPage{
    saveWorkspaceState(): any;
    restoreWorkspaceState(data: any): void;
}

export interface IController{
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

export interface IActionManager{
    invoke(action: string): void;
}

export interface IShortcutManager{
    mapDefaultScheme(): void;
    mapScheme(scheme: IShortcut[]): void;

    getActionHotkey(actionName: string): string;
    getActionHotkeyDisplayLabel(actionName: string): string;
}
// -------------------- props

export interface IDataNodeProps{
    [key: string]: any;
    id: string;
}

export interface IUIElementProps extends IDataNodeProps{
    visible: boolean;
}

export interface IGuide{
    id: string;
    pos: number;
}

export interface IArtboardProps extends IUIElementProps{
    guidesX: IGuide[];
    guidesY: IGuide[];
}

// -------------------- shortcuts

export interface IShortcut{
    key: string;
    action: string;
    options?: {
        type?: string,
        repeatable?: boolean
    };
}