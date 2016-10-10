var debug = require("DebugUtil")("carb:dragController");

export default class DragController{
    constructor(){
        this.onSearching = nop;
        this.onSearchCancelled = nop;
        this.onStarting = nop;
        this.onDragging = nop;
        this.onStopped = nop;
        this.onClicked = nop;

        this.isDragging = false;

        this._dragRequested = false;
        this._startDragPoint = null;
        this._lastDragPoint = null;
        this._tokens = [];
    }
    mouseDown(e){
        if (e.handled){
            this.onSearchCancelled(e);
            return;
        }
        if (this.onStarting(e) !== false){
            this._startDragPoint = {x: e.x, y: e.y};
            this._dragRequested = true;
        }
    }
    mouseMove(e){
        if (e.handled || e.isDragging){
            return;
        }
        if (this.isDragging){
            this.dragging(e);
            e.handled = true;
            return;
        }

        if (this._dragRequested && (e.x !== this._startDragPoint.x || e.y !== this._startDragPoint.y)){
            this.isDragging = true;
            this.dragging(e);
            e.handled = true;
        }
        else{
            this.onSearching(e);
        }
    }
    dragging(e){
        if (this._lastDragPoint === null){
            this._lastDragPoint = this._startDragPoint;
        }
        var dx = e.x - this._startDragPoint.x;
        var dy = e.y - this._startDragPoint.y;
        var ddx = e.x - this._lastDragPoint.x;
        var ddy = e.y - this._lastDragPoint.y;

        debug("dragging dx=%d dy=%d ddx=%d ddy=%d", dx, dy, ddx, ddy);
        this.onDragging(e, dx, dy, ddx, ddy);

        this._lastDragPoint = {x: e.x, y: e.y};
    }
    mouseUp(e){
        if (e.handled){
            return;
        }
        if (this.isDragging){
            if (e.x !== this._lastDragPoint.x || e.y !== this._lastDragPoint.y){
                this.dragging(e);
            }

            this._dragRequested = false;
            this._startDragPoint = null;
            this._lastDragPoint = null;
            this.isDragging = false;

            this.onStopped(e);
        }
    }
    click(e){
        if (e.handled){
            return;
        }
        this._startDragPoint = null;
        this._lastDragPoint = null;
        this._dragRequested = false;
        this.isDragging = false;

        this.onClicked(e);
    }
    bindToView(controller){
        var t = controller.mousedownEvent.bind(this, this.mouseDown);
        this._tokens.push(t);

        t = controller.mousemoveEvent.bind(this, this.mouseMove);
        this._tokens.push(t);

        t = controller.mouseupEvent.bind(this, this.mouseUp);
        this._tokens.push(t);

        t = controller.clickEvent.bind(this, this.click);
        this._tokens.push(t);
    }
    unbind(){
        for (let i = 0, l = this._tokens.length; i < l; ++i) {
            let token = this._tokens[i];
            token.dispose();
        }
        this._tokens = [];

        this.isDragging = false;

        this._dragRequested = false;
        this._startDragPoint = null;
        this._lastDragPoint = null;
    }
}

function nop(){
}