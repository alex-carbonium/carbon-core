import DefaultFrameType from "decorators/DefaultFrameType";
import CompositeElement from "./CompositeElement";
import Environment from "environment";
import PropertyMetadata from "./PropertyMetadata";
import { Types } from "./Defs";
import ActiveFrame from "../decorators/ActiveFrame";
import GlobalMatrixModifier from "./GlobalMatrixModifier";
import { ISelectComposite } from "carbon-app";
import { ResizeDimension, IUIElement } from "carbon-core";
import Invalidate from "./Invalidate";

let debug = require("DebugUtil")("carb:selection");

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
    releasePoint: function (frame, point, event) {
        DefaultFrameType.releasePoint(frame, point, event);
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
    private _activeFrame = new ActiveFrame();
    private _activeFrameElement: IUIElement = null;
    private _activeFrameHiddenPermanently = false;

    displayName() {
        return "Select composite";
    }

    hideActiveFrame(permanent: boolean = false) {
        this._activeFrame.visible= (false);
        this._activeFrameHiddenPermanently = permanent;
    }

    showActiveFrame() {
        this._activeFrame.visible = (true);
        this._activeFrameHiddenPermanently = false;
    }

    selectionFrameType(): any {
        return SelectCompositeFrame;
    }
    resizeDimensions() {
        var parent = this.first().parent;
        var canResize = true;
        this.each(function (e) {
            if (e.parent !== parent) {
                canResize = false;
                return false;
            }
        });
        return canResize ? ResizeDimension.Both : ResizeDimension.None;
    }
    register(element: IUIElement) {
        if (!element.canSelect() && !element.runtimeProps.selectFromLayersPanel) {
            return;
        }

        let wasMultiSelection = this.children.length > 1;

        for (var i = this.children.length - 1; i >= 0; --i) {
            var e = this.children[i];
            if (e.isDescendantOrSame(element) || element.isDescendantOrSame(e)) {
                this.unregister(e);
            }
        }

        if (!wasMultiSelection && this.children.length === 1) {
            this.children[0].unselect();
            this.children[0].select(true);
            this.removeActiveFrame(this.children[0]);
        }

        super.register.apply(this, arguments);

        //making visible just in case
        this.showActiveFrame();

        let isMultiSelection = this.children.length > 1;
        element.select(isMultiSelection);

        if (isMultiSelection) {
            this.addActiveFrame(this);
        }
        else {
            this.addActiveFrame(element);
        }
    }

    unregister(element: IUIElement) {
        element.unselect();
        this.removeActiveFrame(element);

        super.unregister.apply(this, arguments);

        if (this.children.length <= 1) {
            this.removeActiveFrame(this);
            if (this.children.length === 1) {
                this.addActiveFrame(this.children[0]);
            }
        }
    }
    unregisterAll() {
        for (let i = 0; i < this.children.length; ++i){
            let element = this.children[i];
            element.unselect();
            this.removeActiveFrame(element);
        }

        super.unregisterAll.apply(this, arguments);

        this.removeActiveFrame(this);
    }

    private addActiveFrame(element: IUIElement) {
        if (this._activeFrameElement !== element) {
            if (this._activeFrameElement) {
                this.removeActiveFrame(this._activeFrameElement);
            }

            debug("+ active frame: %s", element.displayName());
            element.addDecorator(this._activeFrame);
            this._activeFrameElement = element;
        }
    }
    private removeActiveFrame(element: IUIElement) {
        if (this._activeFrameElement === element) {
            debug("- active frame: %s", element.displayName());
            this._activeFrameElement = null;
            element.removeDecorator(this._activeFrame);
        }
    }

    mousemove() {
        if (!this._activeFrame.visible && !this._activeFrameHiddenPermanently) {
            this.showActiveFrame();
            Invalidate.requestInteractionOnly();
        }
    }

    previewDisplayProps(changes){
        this.restoreLastGoodTransformIfNeeded();
        var affectingLayout = super.previewDisplayProps(changes);
        if (affectingLayout){
            this.hideActiveFrame();
        }
        return affectingLayout;
    }

    updateDisplayProps(changes){
        var hadBadTransform = this.hasBadTransform();
        this.restoreLastGoodTransformIfNeeded();
        super.updateDisplayProps(changes);
        var hasBadTransform = this.hasBadTransform();

        if (hadBadTransform || hasBadTransform){
            this.showActiveFrame();
        }
    }
}

SelectComposite.prototype.t = Types.SelectComposite;

PropertyMetadata.registerForType(SelectComposite, {});
