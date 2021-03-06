declare var DEBUG: boolean;

declare var require: {
    (path: string): any;
    <T>(path: string): T;
    (paths: string[], callback: (...modules: any[]) => void): void;
    ensure: (paths: string[], callback: (require: <T>(path: string) => T) => void, chunkName: string | null) => void;
};

declare interface RequestInit{
    cors?: boolean;
}

//legacy
declare class AppCurrent {
    Current: any;
}
declare var App: AppCurrent;
declare function each(arr: any[], cb: (a: any) => boolean | void);

declare interface IReference<T> {
    value:T;
}

declare function extend(...objects: any[]): any;
declare function clone<T>(obj: T, deep?: boolean): T;
declare function makeRef<T>(obj?: T): IReference<T>;
declare function emptyObject<T>() : T;
declare function removeElement(arr, obj);
declare function map(objects: any[], func: (item: any) => any): any;