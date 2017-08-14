import GroupContainer from "../GroupContainer";
import CompositeElement from "../CompositeElement";
import { Types } from "../Defs";
import Phantom from "../Phantom";
import Brush from "../Brush";
import PropertyMetadata from "../PropertyMetadata";
import UserSettings from "../../UserSettings";
import Selection from "../SelectionModel";
import Environment from "../../environment";
import GlobalMatrixModifier from "../../framework/GlobalMatrixModifier";
import { IComposite, IUIElement, ChangeMode } from "carbon-core";

export default class TransformationElement extends GroupContainer implements IComposite {
    constructor(element) {
        super();

        this._decorators = [];
        this._elements = [];

        var elements = element instanceof CompositeElement ? element.elements : [element];

        for (var i = 0; i < elements.length; i++) {
            var e = elements[i];
            this._saveDecorators(e);
            this.add(this.createClone(e));

            this.register(e);
        }
        this._saveDecorators(element);

        this.performArrange();

        this.showOriginal(false);
    }

    register(element: IUIElement){
        this._elements.push(element);
    }
    unregister(element: IUIElement){
        var i = this._elements.indexOf(element);
        if (i !== -1){
            this._elements.splice(i, 1);
        }
    }
    unregisterAll(){
        this._elements.length = 0;
    }

    _saveDecorators(e) {
        if (e.decorators) {
            e.decorators.forEach(x => {
                if (x.visible() && this._decorators.indexOf(x) === -1) {
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
                context.lineWidth = this.strokeWidth();
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

        if (this._decorators) {
            this._decorators.forEach(x => x.visible(value));
        }
    }

    saveChanges() {
    }

    refreshSelection() {
        Selection.refreshSelection();
    }

    detach() {
        this.showOriginal(true);

        this.parent().remove(this, ChangeMode.Self);
    }

    allHaveSameParent() {
        if (this._elements.length === 0){
            return false;
        }

        var result = true;
        var parent = this._elements[0].parent();
        for (let i = 1; i < this._elements.length; ++i){
            if (this._elements[i].parent() !== parent){
                result = false;
                break;
            }
        }

        return result;
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

    showResizeHint(){
        return this._elements.every(x => x.showResizeHint());
    }
}

TransformationElement.prototype.t = Types.TransformationElement;

PropertyMetadata.registerForType(TransformationElement, {
    stroke: {
        defaultValue: Brush.createFromColor(UserSettings.frame.stroke)
    }
});