import { IUIElement, IRuntimeMixin, IProxySource, IDisposable } from "carbon-core";
import { AutoDisposable } from "../../../AutoDisposable";
import { ICoordinate } from "carbon-geometry";
import Point from "../../../math/point";
import Environment from "environment";
import { RuntimeProxy } from "../RuntimeProxy";

class Draggable implements IProxySource, IDisposable {
    private _enabled: boolean = false;
    private _disposables = new AutoDisposable();
    private _startPosition: ICoordinate;

    public horizontal:boolean = true;
    public vertical:boolean = true;
    public ondragging:any = null;
    public onbegindrag:any = null;
    public onenddrag:any = null;
    public isDragging = false;

    proxyDefinition(): { props: string[]; rprops: string[]; methods: string[]; mixins: string[]; } {
        return {
            props: ["enabled", "horizontal", "vertical", "ondragging", "onbegindrag", "onenddrag"],
            rprops: [],
            methods: ["ondragging", "onbegindrag", "onenddrag"],
            mixins: []
        }
    }

    constructor(private element: IUIElement) {

    }

    get enabled() {
        return this._enabled;
    }

    _onmousedown = (e) => {
        this._startPosition = { x: e.x, y: e.y };
    }

    _onmousemove = (e) => {
        if(this._startPosition && !this.isDragging) {
            this.isDragging = true;
            if(this.onbegindrag) {
                this.onbegindrag({
                    target:RuntimeProxy.wrap(this.element)
                });
            }
        }

        if (this.isDragging) {
            let dx = e.x - this._startPosition.x;
            let dy = e.y - this._startPosition.y;
            if(!this.horizontal){
                dx = 0;
            }
            if(!this.vertical){
                dy = 0;
            }
            if(this.ondragging) {
                let event = {
                    dx:dx,
                    dy:dy,
                    target:RuntimeProxy.wrap(this.element)
                }
                this.ondragging(event);
                dx = event.dx;
                dy = event.dy;
            }

            let point = Point.allocate(dx, dy);
            this.element.applyTranslation(point, true);
            point.free();
        }
    }

    _onmouseup = (e) => {
        if (this._startPosition) {
            this.element.clearSavedLayoutProps();

            if(this.isDragging && this.onenddrag) {
                this.onenddrag({
                    target:RuntimeProxy.wrap(this.element)
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
                this.element.registerEventHandler("onmousedown", this._onmousedown)
            );

            this._disposables.add(
                Environment.controller.mousemoveEvent.bind(this._onmousemove)
            );

            this._disposables.add(
                Environment.controller.mouseupEvent.bind(this._onmouseup)
            );
        } else {
            this._disposables.dispose();
        }
    }

    dispose() {
        this._disposables.dispose();
    }
}

export class DraggableMixin implements IRuntimeMixin, IDisposable {
    public static type: string = "draggable";
    private _draggable: Draggable;
    constructor(private element: IUIElement) {
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