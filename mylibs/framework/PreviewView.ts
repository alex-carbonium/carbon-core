import ViewBase from "./ViewBase";
import EventHelper from "framework/EventHelper";
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
        // this.isolationContext = contexts.find(x => x.type === ContextType.Isolation);

        // this.setupRendering(contexts, requestRedrawCallback, cancelRedrawCallback, renderingScheduledCallback);

        // this._cursorChangedToken = Cursor.changed.bind(this, this.updateCursor);
        // this._invalidateRequestedToken = Invalidate.requested.bind(this, this.invalidate);

        // if (this.interactionLayer) {
        //     this.interactionLayer.context = this.upperContext;
        // }
    }

    detach() {
        // if (this._cursorChangedToken) {
        //     this._cursorChangedToken.dispose();
        //     this._cursorChangedToken = null;
        // }

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
}
