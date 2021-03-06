﻿import Container from "./Container";
import Matrix from "../math/matrix";
import PropertyMetadata from "./PropertyMetadata";
import EventHelper from "./EventHelper";
import UIElement from "./UIElement";
import { Types } from "./Defs";
import { IContainer, IRect, LayerType, IView, ILayer, RenderEnvironment, RenderFlags, ChangeMode, IUIElement } from "carbon-core";
import Invalidate from "./Invalidate";

var clearChangedAreas = function (context) {
    // var fillStyle = this.fillStyle();
    // if (false && fillStyle) {
    //     context.strokeStyle = fillStyle;
    //     context.fillStyle = fillStyle;
    //     if (false && this._invalidateAreas.length > 0) {  // TODO: fix it
    //         each(this._invalidateAreas, function (rect) {
    //             context.fillRect(rect.x - 1, rect.y - 1, rect.width + 2, rect.height + 2);
    //         });
    //     } else {
    //         context.fillRect(0, 0, this.width, this.height);
    //     }
    // } else {
    //     if (false && this._invalidateAreas.length > 0) {
    //         each(this._invalidateAreas, function (rect) {
    //             context.clearRect(rect.x - 1, rect.y - 1, rect.width + 2, rect.height + 2);
    //         });
    //     } else {
    context.clear();
    //     }
    // }

};

var addInvalidateRect = function (newRect) {

    // var that = this;
    // var overlapped = false;
    // each(this._invalidateAreas, function (rect, idx) {
    //     if (rect === newRect) {
    //         overlapped = true;
    //         return false;
    //     }
    //     if (math.areRectsIntersect(newRect, rect)) {
    //         that._invalidateAreas.splice(idx, 1);
    //         overlapped = true;
    //         addInvalidateRect.call(that, math.combineRects(rect, newRect));
    //         return false;
    //     }
    // });

    // if (!overlapped) {
    //     // TODO: remove offsets when all controls will be drown inside bounding box
    //     newRect.x -= 50;
    //     newRect.y -= 50;
    //     newRect.width += 100;
    //     newRect.height += 100;
    //     this._invalidateAreas.push(newRect);
    // }
};

class Layer extends Container implements ILayer {
    type: LayerType;
    isActive: boolean;

    constructor() {
        super();

        this.ondraw = EventHelper.createEvent();
        this._invalidateAreas = [];
        this.canSelect(false);
        this.canDrag(false);

        this._hitFirstElements = [];
        this.layerRedrawMask = null;
    }

    registerHitFirstElement(element) {
        this._hitFirstElements.push(element);
    }

    unregisterHitFirstElement(element) {
        removeElement(this._hitFirstElements, element);
    }

    get scale() {
        return 1;
    }

    get scrollX() {
        return 0;
    }

    get scrollY() {
        return 0;
    }

    hitTransparent(value?: boolean) {
        if (value !== undefined) {
            this._hitTransparent = value;
        }
        return this._hitTransparent;
    }

    allowCaching() {
        return false;
    }

    canAccept(elements: UIElement[]) {
        return elements.every(x => x.canBeAccepted(this));
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

    // globalViewMatrix() {
    //     return Matrix.Identity;
    // }

    // globalViewMatrixInverted() {
    //     return Matrix.Identity;
    // }

    primitiveRoot() {
        return null;
    }

    /**
     * The layer global matrix must not be affected by global context modifier.
     */
    globalViewMatrix() {
        return this.props.m;
    }

    isInViewport(viewportRect) {
        return true;
    }

    draw(context, environment: RenderEnvironment) {
        context.layerRedrawMask = this.layerRedrawMask || 0xFFFF;
        super.draw(context, environment);
        this.invalidateRequired = false;
        //this._invalidateAreas = [];
        this.layerRedrawMask = null;
    }

    drawSelf(context, w, h, environment: RenderEnvironment) {
        if (this.invalidateRequired || (environment.flags & RenderFlags.Offscreen)) {
            super.drawSelf.apply(this, arguments);
            this.ondraw.raise(context, environment);
        }
    }

    invalidate(layerMask?) {
        this.invalidateRequired = true;

        if (layerMask !== undefined) {
            if (this.layerRedrawMask === null) {
                this.layerRedrawMask = layerMask;
            } else {
                this.layerRedrawMask = this.layerRedrawMask | (layerMask);
            }
        }

        Invalidate.requestViewRedraw();
    }

    isInvalidateRequired() {
        return this.invalidateRequired;
    }

    hitTest() {
        return true;
    }

    dropElement(element: IUIElement, mode?: ChangeMode) {
        element.setTransform(this.globalMatrixToLocal(element.globalViewMatrix()));
        this.add(element, mode);
    }

    getElementsInRect(rect) {
        var selection = [];

        this._collectDescendantsInRect(this, rect, selection);

        return selection;
    }

    _collectDescendantsInRect(container: IContainer, rect: IRect, selection) {
        for (var i = 0; i < container.children.length; i++) {
            var element = container.children[i];
            if (element.hitTestGlobalRect(rect)) {
                if (!element['multiselectTransparent']) {
                    selection.push(element);
                }
                else if (element instanceof Container) {
                    this._collectDescendantsInRect(element as IContainer, rect, selection);
                }
            }
        }
    }

    hitElement(position, view, predicate?, directSelection?):IUIElement {
        for (var i = 0; i < this._hitFirstElements.length; ++i) {
            var element = this._hitFirstElements[i].hitElement(position, view, predicate, directSelection);
            if (element) {
                return element;
            }
        }
        return super.hitElement.apply(this, arguments);
    }

    getSnapPoints() {
        return null;
    }

    renderToContext(context, environment: RenderEnvironment) {
        super.drawSelf.call(this, context, environment);
    }

    getEditableProperties() {
        return [];
    }

    activate() {
    }

    deactivate() {
    }

    canChangeNodeTree() {
        return false;
    }
}

export default Layer;