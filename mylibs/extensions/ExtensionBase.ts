import Environment from "environment";
import {IApp, IView, IController} from "carbon-core";

export default class ExtensionBase {
    [name: string]: any;
    app: IApp;
    view: IView;
    controller: IController;

    constructor(app, view, controller){
        this._subscriptions = [];
        this.attach(app, view, controller);
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