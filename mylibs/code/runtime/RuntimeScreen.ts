import * as core from "carbon-core";
import { RuntimeContext } from "./RuntimeContext";
import { AutoDisposable } from "../../AutoDisposable";
import { Event } from "./Event";

const EdgeProximity = 80;
export class RuntimeScreen implements core.IProxySource {
    private disposables = new AutoDisposable();
    private _edgeSwipeStart = new Event()
    private _edgeSwipeEnd = new Event()
    private _edgeSwipe = new Event()

    proxyDefinition(): { props: string[]; rprops: string[]; methods: string[]; mixins: string[]; } {
        return {
            props: ["onEdgeSwipeStart", "onEdgeSwipe", "onEdgeSwipeEnd"],
            rprops: ["width", "height"],
            methods: [],
            mixins: []
        }
    }
    constructor(private artboard: core.IArtboard) {
        this._bindEvents();
    }

    set onEdgeSwipeStart(callback) {
        this.disposables.add(this._edgeSwipeStart.registerHandler(callback));
    }
    set onEdgeSwipe(callback) {
        this.disposables.add(this._edgeSwipe.registerHandler(callback));
    }
    set onEdgeSwipeEnd(callback) {
        this.disposables.add(this._edgeSwipeEnd.registerHandler(callback));
    }

    _bindEvents() {
        // TODO: bind to public API objects (availiable in the editor) i.e to artboard instead
        this.artboard.registerEventHandler("panStartEvent", this.onPanStart.bind(this));
        this.artboard.registerEventHandler("panEndEvent", this.onPanEnd.bind(this));
        this.artboard.registerEventHandler("panMoveEvent", this.onPanMove.bind(this));
        // this.disposables.add(PreviewModel.current.controller.panStartEvent.bindHighPriority(this, this.onPanStart))
        // this.disposables.add(PreviewModel.current.controller.panEndEvent.bindHighPriority(this, this.onPanEnd))
        // this.disposables.add(PreviewModel.current.controller.panMoveEvent.bindHighPriority(this, this.onPanMove))
    }

    _moving = false;
    _edge = 0;
    _width = 0;
    _height = 0;

    onPanStart(event: core.IPointerEventData) {
        let artboard = this.artboard;
        if (!artboard) {
            return;
        }

        let size = artboard.screenSize();
        let moving = false;
        if (event.x < EdgeProximity && event.direction === 4) {
            moving = true;
            this._edge = core.ScreenEdge.Left;
        } else if (event.y < EdgeProximity && event.direction === 16) {
            moving = true;
            this._edge = core.ScreenEdge.Top;
        } else if ((event.x > size.width - EdgeProximity) && event.direction === 2) {
            moving = true;
            this._edge = core.ScreenEdge.Right;
        } else if ((event.y > size.height - EdgeProximity) && event.direction === 8) {
            moving = true;
            this._edge = core.ScreenEdge.Bottom;
        }

        if (moving) {
            this._width = size.width;
            this._height = size.height;

            let e = this._prepareEvent(event);

            this._edgeSwipeStart.raise(e)
            if (e._stopPropagation) {
                this._moving = moving;
                event.handled = true;
            }
        }
    }

    _prepareEvent(event) {
        let distance = 0;
        if (this._edge === core.ScreenEdge.Left) {
            distance = event.x;
        } else if (this._edge === core.ScreenEdge.Top) {
            distance = event.y;
        } else if (this._edge === core.ScreenEdge.Right) {
            distance = this._width - event.x;
        } else if (this._edge === core.ScreenEdge.Bottom) {
            distance = this._height - event.y;
        }

        let e = core.PreviewModel.current.controller.wrapEvent({ edge: this._edge, distance: distance, event: event });

        return e;
    }

    onPanEnd(event) {
        if (this._moving) {
            var e = this._prepareEvent(event);
            this._edgeSwipeEnd.raise(e)
            this._moving = false;
        }
    }

    onPanMove(event) {
        if (this._moving) {
            var e = this._prepareEvent(event);
            this._edgeSwipe.raise(e)
        }
    }

    get width() {
        return this.artboard.screenSize().width;
    }

    get height() {
        return this.artboard.screenSize().height;
    }

    dispose() {
        this.artboard = null;
        this.disposables.dispose();
    }
}