declare var DEBUG: boolean;

declare var require: {
    (path: string): any;
    <T>(path: string): T;
    (paths: string[], callback: (...modules: any[]) => void): void;
    ensure: (paths: string[], callback: (require: <T>(path: string) => T) => void, chunkName: string | null) => void;
};

//legacy
declare class AppCurrent {
    Current: any;
}
declare var App: AppCurrent;
declare function each(arr: any[], cb: (a: any) => boolean | void);

declare function extend(...objects: any[]): any;
declare function clone<T>(obj: T): T;
declare function map(objects: any[], func: (item: any) => any): any;
declare function _(value: string): string;
declare var NullContainer: any;