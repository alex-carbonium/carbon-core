import GroupContainer from "../GroupContainer";
import CompositeElement from "../CompositeElement";
import { ChangeMode, Types } from "../Defs";
import Phantom from "../Phantom";
import Brush from "../Brush";
import PropertyMetadata from "../PropertyMetadata";
import DefaultSettings from "../../DefaultSettings";
import Selection from "../SelectionModel";
import Environment from "../../environment";
import GlobalMatrixModifier from "../../framework/GlobalMatrixModifier";
import { IComposite } from "../CoreModel";

export default class InteractiveElement extends GroupContainer implements IComposite {
    constructor(element) {
        super();

        this._decorators = [];
        this._elements = [];

        var elements = element instanceof CompositeElement ? element.elements : [element];

        for (var i = 0; i < elements.length; i++) {
            var e = elements[i];
            this._hideDecorators(e);
            this.add(this.createClone(e));

            this._elements.push(e);
        }
        this._hideDecorators(element);

        this.performArrange();

        this.showOriginal(false);
    }

    _hideDecorators(e) {
        if (e.decorators) {
            e.decorators.forEach(x => {
                if (x.visible()) {
                    x.visible(false);
                    this._decorators.push(x);
                }
            });
        }
    }

    strokeBorder(context, w, h) {
        if (Brush.canApply(this.stroke())) {
            context.save();
            var scale = Environment.view.scale();
            context.scale(1 / scale, 1 / scale);
            context.beginPath();

            GlobalMatrixModifier.pushPrependScale();
            try {
                if (this.children.length === 1) {
                    this.children[0].drawBoundaryPath(context, false);
                }
                else {
                    this.drawBoundaryPath(context, false);
                }
                Brush.stroke(this.stroke(), context);
            }
            finally {
                GlobalMatrixModifier.pop();
            }

            context.restore();
        }
    }

    createClone(element) {
        return new Phantom(element, element.selectLayoutProps(true));
    }

    showOriginal(value) {
        this._elements.forEach(x => x.setProps({ visible: value }, ChangeMode.Self));
    }

    saveChanges() {
    }

    refreshSelection() {
        Selection.refreshSelection();
    }

    detach() {
        this.showOriginal(true);

        if (this._decorators) {
            this._decorators.forEach(x => x.visible(true));
            this._decorators = null;
        }

        this.parent().remove(this, ChangeMode.Self);
    }

    hitTest() {
        return false;
    }

    canDrag() {
        return false;
    }

    isTemporary() {
        return true;
    }

    get elements() {
        return this._elements;
    }
}

InteractiveElement.prototype.t = Types.InteractiveElement;

PropertyMetadata.registerForType(InteractiveElement, {
    stroke: {
        defaultValue: Brush.createFromColor(DefaultSettings.frame.stroke)
    }
});