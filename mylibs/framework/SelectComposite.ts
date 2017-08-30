import DefaultFrameType from "decorators/DefaultFrameType";
import CompositeElement from "./CompositeElement";
import Environment from "environment";
import PropertyMetadata from "./PropertyMetadata";
import { Types } from "./Defs";
import ActiveFrame from "../decorators/ActiveFrame";
import GlobalMatrixModifier from "./GlobalMatrixModifier";
import { ISelectComposite } from "carbon-app";
import { ResizeDimension } from "carbon-core";

var SelectCompositeFrame = {
    hitPointIndex: function (frame, point) {
        return DefaultFrameType.hitPointIndex(frame, point);
    },
    updateFromElement: function (frame) {
        return DefaultFrameType.updateFromElement(frame);
    },

    capturePoint: function (frame, point, event) {
        DefaultFrameType.capturePoint(frame, point, event);
    },
    movePoint: function (frame, point, event) {
        return DefaultFrameType.movePoint(frame, point, event);
    },
    releasePoint: function (frame, point) {
        DefaultFrameType.releasePoint(frame, point);
    },
    draw: function (frame, context) {
        DefaultFrameType.draw(frame, context);

        var scale = Environment.view.scale();
        context.save();
        context.scale(1 / scale, 1 / scale);
        context.strokeStyle = '#22c1ff';
        context.lineWidth = 1;
        context.setLineDash([1, 1]);
        context.beginPath();

        GlobalMatrixModifier.pushPrependScale()
        try {
            frame.element.each(e => e.drawBoundaryPath(context));
        }
        finally {
            GlobalMatrixModifier.pop();
        }
        context.stroke();
        context.restore();
    }
};

export default class SelectComposite extends CompositeElement implements ISelectComposite {
    constructor() {
        super();
        this._selected = false;
        this._activeFrame = new ActiveFrame();
    }
    selected(value) {
        if (arguments.length === 1) {
            if (value === this._selected) {
                return;
            }

            this._selected = value;
            var multiselect = this.count() > 1;

            if (value) {
                //making visible just in case
                this._activeFrame.visible(true);
                if (!multiselect) {
                    this.each(element => {
                        element.addDecorator(this._activeFrame);
                        element.select(multiselect);
                    });
                } else {
                    this.addDecorator(this._activeFrame);
                    this.each(element => element.select(multiselect));
                }
            } else {
                this.removeDecorator(this._activeFrame);
                this.each(element => {
                    element.unselect();
                    element.removeDecorator(this._activeFrame);
                });
            }
        }

        return this._selected;
    }
    selectionFrameType(): any {
        return SelectCompositeFrame;
    }
    resizeDimensions() {
        var parent = this.first().parent();
        var canResize = true;
        this.each(function (e) {
            if (e.parent() !== parent) {
                canResize = false;
                return false;
            }
        });
        return canResize ? ResizeDimension.Both : ResizeDimension.None;
    }
    register(element, multiSelect?, refreshOnly?) {
        for (var i = this.elements.length - 1; i >= 0; --i) {
            var e = this.elements[i];
            if (e.isDescendantOrSame(element) || element.isDescendantOrSame(e)) {
                this.unregister(e);
            }
        }
        if (!refreshOnly && this._selected) {
            element.select(multiSelect);
        }
        super.register.apply(this, arguments);
    }
    unregister(element, refreshOnly?) {
        if (!refreshOnly && this._selected) {
            element.unselect();
        }
        super.unregister.apply(this, arguments);
    }
    unregisterAll(refreshOnly?) {
        if (!refreshOnly && this._selected) {
            this.each(x => x.unselect());
        }
        super.unregisterAll.apply(this, arguments);
    }

    mousemove() {
        if (!this._selected) {
            this.selected(true);
        }
    }

    previewDisplayProps(changes){
        this.restoreLastGoodTransformIfNeeded();
        var affectingLayout = super.previewDisplayProps(changes);
        if (affectingLayout){
            this.selected(false);
        }
        return affectingLayout;
    }

    updateDisplayProps(changes){
        var hadBadTransform = this.hasBadTransform();
        this.restoreLastGoodTransformIfNeeded();
        super.updateDisplayProps(changes);
        var hasBadTransform = this.hasBadTransform();

        if (hadBadTransform || hasBadTransform){
            this.selected(false);
            this.selected(true);
        }
    }
}

SelectComposite.prototype.t = Types.SelectComposite;

PropertyMetadata.registerForType(SelectComposite, {});
