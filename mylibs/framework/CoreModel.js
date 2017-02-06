// -------------------- basics

export interface IRect{
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface IPoint{
    x: number;
    y: number;    
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

export interface IInteractionEventData extends IEventData{
    interactiveElement: IComposite;
}

export interface IEvent<T>{
    raise(data: T): void;
    bind(callback: (data: T) => void): IDisposable;
    bind(owner: any, callback: (data: T) => void): IDisposable;    
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

    hitTest(point: IPoint, scale: number, includeMargin: boolean): boolean;
    hitTestGlobalRect(rect: IRect, directSelection: boolean): boolean;
}

export interface IContainer extends IUIElement{
    children: IUIElement[];
}

export interface IGroupContainer extends IUIElement{    
    wrapSingleChild(): boolean;
    translateChildren(): boolean;
}

export interface IComposite extends IUIElement{
    elements: IUIElement[];
}

export interface ILayer extends IContainer{    
}

export interface IApp extends IDataNode{
    currentTool: number;    
    onBuildMenu: IEvent<{a: number}>;

    shortcutManager: IShortcutManager;
}

export interface IView{
    viewContainerElement: HTMLElement;

    scale(): number;
}

export interface IController{
    draggingEvent: IEvent<IInteractionEventData>;
    resizingEvent: IEvent<IInteractionEventData>;
    rotatingEvent: IEvent<IInteractionEventData>;
    startDrawingEvent: IEvent<IEventData>;
    
    actionManager: IActionManager;

    updateCursor(eventData: IMouseEventData): void;
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