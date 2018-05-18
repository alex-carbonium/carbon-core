import * as core from "carbon-core";
import { AutoDisposable } from "../../../AutoDisposable";
import { ICoordinate } from "carbon-geometry";
import Point from "../../../math/point";
import { RuntimeProxy } from "../RuntimeProxy";
import { DragConstraint } from "carbon-runtime";
import { EventData } from "../EventData";

class Draggable implements core.IProxySource, core.IDisposable {
    private _enabled: boolean = false;
    private _disposables = new AutoDisposable();
    private _startPosition: ICoordinate;
    private _constraint: DragConstraint;

    public horizontal: boolean = true;
    public vertical: boolean = true;
    public onDragging: any = null;
    public onBeginDrag: any = null;
    public onEndDrag: any = null;
    public isDragging = false;

    proxyDefinition(): { props: string[]; rprops: string[]; methods: string[]; mixins: string[]; } {
        return {
            props: ["enabled", "constraint", "horizontal", "vertical", "onDragging", "onBeginDrag", "onEndDrag"],
            rprops: [],
            methods: ["onDragging", "onBeginDrag", "onEndDrag"],
            mixins: []
        }
    }

    constructor(private element: core.IUIElement) {

    }

    get constraint(): DragConstraint {
        return this._constraint;
    }

    set constraint(value: DragConstraint) {
        this._constraint = value;
    }

    get enabled() {
        return this._enabled;
    }

    _applyConstraint() {
        let c = this.constraint;
        if (!c) {
            return;
        }
        let bbox = this.element.getBoundingBox();
        switch (c.type) {
            case "box":
                if (bbox.x < c.left) {
                    this.element.x = c.left;
                } else if (c.right < (bbox.x + bbox.width)) {
                    this.element.x = c.right - bbox.width;
                }
                if (bbox.y < c.top) {
                    this.element.y = c.top;
                } else if (c.bottom < (bbox.y + bbox.height)) {
                    this.element.y = c.bottom - bbox.height;
                }
                break;
            case "parent":
                let pbox = this.element.parent.getBoundingBox();
                if (bbox.x < 0) {
                    this.element.x = 0;
                } else if (pbox.width < (bbox.x + bbox.width)) {
                    this.element.x = pbox.width - bbox.width;
                }
                if (bbox.y < 0) {
                    this.element.y = 0;
                } else if (pbox.height < (bbox.y + bbox.height)) {
                    this.element.y = pbox.height - bbox.height;
                }
                break;
        }
    }

    _onmousedown = (e) => {
        this._startPosition = { x: e.x, y: e.y };
    }

    _onmousemove = (e) => {
        if (this._startPosition && !this.isDragging) {
            this.isDragging = true;
            if (this.onBeginDrag) {
                this.onBeginDrag({
                    target: this.element.runtimeProxy()// RuntimeProxy.wrap(this.element)
                });
            }
        }

        if (this.isDragging) {
            let dx = e.x - this._startPosition.x;
            let dy = e.y - this._startPosition.y;
            if (!this.horizontal) {
                dx = 0;
            }
            if (!this.vertical) {
                dy = 0;
            }

            let event = new EventData({
                dx: dx,
                dy: dy,
                target: this.element.runtimeProxy()
            });

            if (this.onDragging) {
                this.onDragging(event);
                dx = event.dx;
                dy = event.dy;
            }

            if (!event.isDefaultPrevented()) {
                let point = Point.allocate(dx, dy);
                this.element.applyTranslation(point, true);
                point.free();
            }

            this._applyConstraint();
        }
    }

    _onmouseup = (e) => {
        if (this._startPosition) {
            this.element.clearSavedLayoutProps();

            if (this.isDragging && this.onEndDrag) {
                this.onEndDrag({
                    target: this.element.runtimeProxy()
                });
            }

            this.isDragging = false;
            delete this._startPosition;
        }
    }

    set enabled(value: boolean) {
        this._enabled = value;
        if (this._enabled) {
            this._disposables.add(
                this.element.registerEventHandler("mousedown", this._onmousedown)
            );
            this._disposables.add(
                this.element.registerEventHandler("panstart", this._onmousedown)
            );
            var parent = this.element.parent;
            // TODO: bind to public API objects (availiable in the editor) i.e to artboard instead
            // this._disposables.add(
            //     PreviewModel.current.controller.mousemoveEvent.bind(this._onmousemove)
            // );

            // this._disposables.add(
            //     PreviewModel.current.controller.panMoveEvent.bind(this._onmousemove)
            // );

            // this._disposables.add(
            //     PreviewModel.current.controller.mouseupEvent.bind(this._onmouseup)
            // );

            // this._disposables.add(
            //     PreviewModel.current.controller.panEndEvent.bind(this._onmouseup)
            // );
        } else {
            this._disposables.dispose();
        }
    }

    dispose() {
        this._disposables.dispose();
    }
}

export class DraggableMixin implements core.IRuntimeMixin, core.IDisposable {
    public static type: string = "draggable";
    private _draggable: Draggable;
    constructor(private element: core.IUIElement) {
    }

    set(target: any, name: PropertyKey, value: any) {
        return false;
    }

    get(target: any, name: PropertyKey): any {
        if (name === "draggable") {
            return this.draggable;
        }

        return;
    }

    has(target: any, name: PropertyKey): boolean {
        if (name === "draggable") {
            return true;
        }

        return false;
    }

    dispose() {
        if (this._draggable) {
            this._draggable.dispose();
        }
    }

    public get draggable() {
        if (!this._draggable) {
            this._draggable = new Draggable(this.element);
        }
        return this._draggable;
    }
}