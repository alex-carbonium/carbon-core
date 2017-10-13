import EventHelper from "./framework/EventHelper";
import {IView, IController, IEnvironment, IEvent2} from "carbon-core";
import ShortcutManager from "./ui/ShortcutManager";
import UserSettings from "./UserSettings";

class Environment implements IEnvironment {
    attached: IEvent2<IView, IController>;
    detaching: IEvent2<IView, IController>;
    view: IView;
    controller: IController;
    shortcutManager = new ShortcutManager();
    settings = UserSettings;

    loaded: Promise<void>;
    resolveLoaded: () => void;

    constructor(){
        this.detaching = EventHelper.createEvent2<IView, IController>();
        this.attached = EventHelper.createEvent2<IView, IController>();
        this.loaded = new Promise<void>(resolve => this.resolveLoaded = resolve);
    }

    set(view: IView, controller: IController){
        if (!this.view){
            this.resolveLoaded();
        }
        else {
            this.detaching.raise(this.view, this.controller);
        }
        this.view = view;
        this.controller = controller;
        this.attached.raise(view, controller);
    }

    dispose() {
        if (this.view) {
            this.view.dispose();
        }
    }
}

export default new Environment();