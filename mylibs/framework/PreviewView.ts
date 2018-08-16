import ViewBase from "./ViewBase";
import EventHelper from "./EventHelper";
import Cursor from "./Cursor";
import {IContext, ContextType, RenderFlags, RenderEnvironment, IDisposable} from "carbon-core";
import Invalidate from "./Invalidate";

export default class PreviewView extends ViewBase {
    private attachedDisposables:IDisposable[] = [];

    constructor(app) {
        super(app);

        this.displayClickSpots = EventHelper.createEvent();
    }

    prototyping(){
        return false;
    }

    setupRendering(contexts, requestRedrawCallback, cancelRedrawCallback, renderingScheduledCallback) {
        super.setupRendering.apply(this, arguments);
        this.attachedDisposables.push(Invalidate.requestedViewRedraw.bind(this, this.requestRedraw));
        this.attachedDisposables.push(Cursor.changed.bind(this, this.updateCursor));
    }

    detach() {
        this.attachedDisposables.forEach(d=>d.dispose());
        this.attachedDisposables.length = 0;
    }

    _getEnv(layer: any, final: boolean) {
        let env: RenderEnvironment = super._getEnv(layer, final);

        if (env) {
            env.flags &= ~RenderFlags.CheckViewport;
            env.flags |= RenderFlags.Preview;
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
