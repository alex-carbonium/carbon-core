import ViewBase from "./ViewBase";
import EventHelper from "framework/EventHelper";
import Cursor from "./Cursor";
import {IContext, ContextType, RenderFlags, RenderEnvironment} from "carbon-core";

export default class PreviewView extends ViewBase {
    constructor(app) {
        super(app);

        this.displayClickSpots = EventHelper.createEvent();
    }

    prototyping(){
        return false;
    }

    attachToDOM(contexts: IContext[], viewContainerElement, requestRedrawCallback, cancelRedrawCallback, renderingScheduledCallback) {
        this.viewContainerElement = viewContainerElement; // parent div element
        this.upperContext = contexts.find(x => x.type === ContextType.Interaction);
    }

    setup(deps) {
        super.setup(deps);
        this._cursorChangedToken = Cursor.changed.bind(this, this.updateCursor);
    }

    detach() {
        if (this._cursorChangedToken) {
            this._cursorChangedToken.dispose();
            this._cursorChangedToken = null;
        }

        // if (this._invalidateRequestedToken) {
        //     this._invalidateRequestedToken.dispose();
        //     this._invalidateRequestedToken = null;
        // }
    }

    _getEnv(layer: any, final: boolean) {
        let env: RenderEnvironment = super._getEnv(layer, final);

        if (env) {
            env.flags &= ~RenderFlags.CheckViewport;
        }

        return env;
    }

    updateCursor(value, oldValue) {
        if (this.viewContainerElement) {
            if (oldValue) {
                this.viewContainerElement.classList.remove("c-" + oldValue);
            }
            if (value) {
                this.viewContainerElement.classList.add("c-" + value);
            }
        }
    }
}
