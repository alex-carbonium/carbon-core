import { IUIElement } from "carbon-model";
import { IDataProvider, IDataProviderConfig, IApp } from "carbon-core";

export default class DataProvider implements IDataProvider  {
    constructor(public id, public name) {
    }

    fetch(fields, rowCount){
    }
    getConfig(): IDataProviderConfig{
        return null;
    }
    createElement(app: IApp, field: string, templateId?: string): IUIElement{
        return null;
    }
}