import {IApp, IView, IController} from "carbon-core";

export default class ExtensionBase {
    view: IView;
    controller: IController;
    
    private _subscriptions: any[];

    constructor(public app: IApp){
        this._subscriptions = [];
    }

    attach(app, view, controller){
        this.app = app;
        this.view = view;
        this.controller = controller;
    }

    registerForDispose(event){
        this._subscriptions.push(event);
    }

    detach(){
        for(var i = 0; i<this._subscriptions.length; ++i){
            this._subscriptions[i].dispose();
        }
        this._subscriptions = [];
    }
}
