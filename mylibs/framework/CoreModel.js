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
    x: number;
    y: number;
    handled: boolean;
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
}

export interface IContainer extends IUIElement{
    children: IUIElement[];
}

export interface IGroupContainer extends IUIElement{    
    wrapSingleChild(): boolean;
    translateChildren(): boolean;
}

export interface ILayer extends IContainer{    
}

export interface IApp extends IDataNode{
    onBuildMenu: IEvent<{a: number}>;
}

export interface IView{
    scale(): number;
}

export interface IController{}

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