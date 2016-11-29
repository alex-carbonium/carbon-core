﻿import Container from "framework/Container";
import math from "math/math";
import Matrix from "math/matrix";
import PropertyMetadata from "framework/PropertyMetadata";
import EventHelper from "framework/EventHelper";
import {Types} from "./Defs";

var clearChangedAreas = function (context) {
    var fillStyle = this.fillStyle();
    if (false && fillStyle) {
        context.strokeStyle = fillStyle;
        context.fillStyle = fillStyle;
        if (false && this._invalidateAreas.length > 0) {  // TODO: fix it
            each(this._invalidateAreas, function (rect) {
                context.fillRect(rect.x - 1, rect.y - 1, rect.width + 2, rect.height + 2);
            });
        } else {
            context.fillRect(0, 0, this.width(), this.height());
        }
    } else {
        if (false && this._invalidateAreas.length > 0) {
            each(this._invalidateAreas, function (rect) {
                context.clearRect(rect.x - 1, rect.y - 1, rect.width + 2, rect.height + 2);
            });
        } else {
            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        }
    }

};

var addInvalidateRect = function (newRect) {

    var that = this;
    var overlapped = false;
    each(this._invalidateAreas, function (rect, idx) {
        if (rect === newRect) {
            overlapped = true;
            return false;
        }
        if (math.areRectsIntersect(newRect, rect)) {
            that._invalidateAreas.splice(idx, 1);
            overlapped = true;
            addInvalidateRect.call(that, math.combineRects(rect, newRect));
            return false;
        }
    });

    if (!overlapped) {
        // TODO: remove offsets when all controls will be drown inside bounding box
        newRect.x -= 50;
        newRect.y -= 50;
        newRect.width += 100;
        newRect.height += 100;
        this._invalidateAreas.push(newRect);
    }
};

class Layer extends Container {

    constructor() {
        super();

        this.ondraw = EventHelper.createEvent();
        this._invalidateAreas = [];
        this.canSelect(false);
        this.canDrag(false);

        this._hitFirstElements = [];
        this.layerIndex = 0;
    }

    registerHitFirstElement(element) {
        this._hitFirstElements.push(element);
    }

    unregisterHitFirstElement(element) {
        removeElement(this._hitFirstElements, element);
    }

    scale() {
        return 1;
    }

    scrollX() {
        return 0;
    }

    scrollY() {
        return 0;
    }

    hitTransparent(value) {
        if (value !== undefined) {
            this._hitTransparent = value;
        }
        return this._hitTransparent;
    }

    canAccept() {
        return true;
    }

    clearContext(context) {
        clearChangedAreas.call(this, context);
    }

    fillStyle(value) {
        if (value !== undefined) {
            this._fillStyle = value;
        }

        return this._fillStyle;
    }

    globalViewMatrix() {
        return Matrix.Identity;
    }

    globalViewMatrixInverted() {
        return Matrix.Identity;
    }

    primitiveRoot() {
        return null;
    }

    drawSelf(context, w, h, environment) {
        if (this.invalidateRequired) {
            super.drawSelf.apply(this, arguments);
            this.ondraw.raise(context, environment);
            this.invalidateRequired = false;
            this._invalidateAreas = [];
        }
    }

    invalidate(all, rect) {
        this.invalidateRequired = true;
        if (false && rect) {
            addInvalidateRect.call(this, rect);
        }
        var view = this._view;
        if (view) {
            if (all) {
                view.invalidate(undefined, rect);
            }
            else {
                view.requestRedraw();
            }
        }
    }

    isInvalidateRequired() {
        return this.invalidateRequired;
    }

    hitTest() {
        return true;
    }

    hitElement(/*Point*/position, scale, predicate) {
        for (var i = 0; i < this._hitFirstElements.length; ++i) {
            var element = this._hitFirstElements[i].hitElement(position, scale, predicate);
            if (element) {
                return element;
            }
        }
        return super.hitElement.apply(this, arguments);
    }

    getSnapPoints() {
        return null;
    }

    renderToContext(context, environment) {
        super.drawSelf.call(this, context, environment);
    }

    getEditableProperties() {
        return [];
    }
}

export default  Layer;