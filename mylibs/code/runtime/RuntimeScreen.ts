import { IProxySource, IArtboard, IPointerEventData, ScreenEdge } from "carbon-core";
import { RuntimeContext } from "./RuntimeContext";
import { AutoDisposable } from "../../AutoDisposable";
import Environment from "environment";
import { Event } from "code/runtime/Event";

const EdgeProximity = 20;
export class RuntimeScreen implements IProxySource {
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
    constructor(private artboard: IArtboard) {
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
        this.disposables.add(Environment.controller.panStartEvent.bindHighPriority(this, this.onPanStart))
        this.disposables.add(Environment.controller.panEndEvent.bindHighPriority(this, this.onPanEnd))
        this.disposables.add(Environment.controller.panMoveEvent.bindHighPriority(this, this.onPanMove))
    }

    _moving = false;
    _edge = 0;
    _width = 0;
    _height = 0;

    onPanStart(event: IPointerEventData) {
        let artboard = this.artboard;
        if (!artboard) {
            return;
        }

        let size = artboard.screenSize();
        let moving = false;
        if (event.x < EdgeProximity && event.direction === 4) {
            moving = true;
            this._edge = ScreenEdge.Left;
        } else if (event.y < EdgeProximity && event.direction === 16) {
            moving = true;
            this._edge = ScreenEdge.Top;
        } else if ((event.x > size.width - EdgeProximity) && event.direction === 2) {
            moving = true;
            this._edge = ScreenEdge.Right;
        } else if ((event.y > size.height - EdgeProximity) && event.direction === 8) {
            moving = true;
            this._edge = ScreenEdge.Bottom;
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
        if (this._edge === ScreenEdge.Left) {
            distance = event.x;
        } else if (this._edge === ScreenEdge.Top) {
            distance = event.y;
        } else if (this._edge === ScreenEdge.Right) {
            distance = this._width - event.x;
        } else if (this._edge === ScreenEdge.Bottom) {
            distance = this._height - event.y;
        }
        let e = Environment.controller.wrapEvent({ edge: this._edge, distance: distance, event: event });

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