// @flow

export interface IRect{
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface IDataNodeProps{
    [key: string]: any;
    id: string;
}

export interface IGroupContainer{    
    wrapSingleChild(): boolean;
    translateChildren(): boolean;
}