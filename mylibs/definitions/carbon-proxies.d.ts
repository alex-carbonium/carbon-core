declare module "carbon-proxies"{
    export interface IFontsProxy{
        search(query: string, page: number): Promise<any>;
        system(page: number): Promise<any>;
    }

    export var FontsProxy: IFontsProxy;
}