import Invalidate from "framework/Invalidate";
import domUtil from "utils/dom";

export default class TouchHelper
{
    constructor(view){
        this.view = view;
    }

    onpanstart(event) {
        this._scrollX = this.view.scrollX;
        this._scrollY = this.view.scrollY;
    }

    onpanmove(event) {
        this.view.scrollX = (this._scrollX - event.event.deltaX);
        this.view.scrollY = (this._scrollY - event.event.deltaY);
        Invalidate.request();
    }

    onpanend(event) {
        delete this._scrollX;
        delete this._scrollY;
    }

    onpinchmove(event) {
        this.view.scale(this._oldScale * event.event.scale);
        event.event.preventDefault();

        var dx = event.event.center.x - this._centerX;
        var dy = event.event.center.y - this._centerY;

        var center = domUtil.touchCenter(event.event.center);
        var x = (center.x + this._scrollX - dx) / this._oldScale;
        var y = (center.y + this._scrollY - dy) / this._oldScale;

        var scroll = App.Current.activePage.pointToScroll({x: x, y: y}, {width: center.x * 2, height: center.y * 2});

        this.view.scrollX = (scroll.scrollX);
        this.view.scrollY = (scroll.scrollY);

        Invalidate.request();
    }

    onpinchstart(event) {
        if (this._oldScale === undefined) {
            this._oldScale = this.view.scale();
            this._centerX = event.event.center.x;
            this._centerY = event.event.center.y;
            this._scrollX = this.view.scrollX;
            this._scrollY = this.view.scrollY;
        }
    }

    onpinchend(event) {
        delete this._oldScale;
    }

}