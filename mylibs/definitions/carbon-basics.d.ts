declare module "carbon-basics"{
    export interface Dictionary{
        [key: string]: any;
    }

    export interface IDisposable {
        dispose(): void;
    }

    export interface IEventData {
        handled: boolean;
    }

    export interface IMouseEventData extends IEventData {
        x: number;
        y: number;
        isDragging: boolean;
        cursor: string;
    }

    export interface IEvent<T> {
        raise(data: T): void;
        bind(callback: (data: T) => void): IDisposable;
        bind(owner: any, callback: (data: T) => void): IDisposable;
        unbind(callback:(data: T) => void);
    }

    export interface IEvent2<T1, T2> {
        raise(data1: T1, data2: T2): void;
        bind(callback: (data1: T1, data2: T2) => void): IDisposable;
        bind(owner: any, callback: (data1: T1, data2: T2) => void): IDisposable;
    }

    export interface IKeyboardState {
        ctrl: boolean;
        shift: boolean;
        alt: boolean;
    }
}