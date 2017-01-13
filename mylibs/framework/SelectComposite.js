import DefaultFrameType from "decorators/DefaultFrameType";
import CompositeElement from "./CompositeElement";
import Environment from "environment";
import PropertyMetadata from "./PropertyMetadata";
import {Types} from "./Defs";
import ResizeDimension from "./ResizeDimension";
import ActiveFrame from "../decorators/ActiveFrame";

var SelectCompositeFrame = {
    hitPointIndex: function(frame, point){
        return DefaultFrameType.hitPointIndex(frame, point);
    },
    updateFromElement: function(frame){
        return DefaultFrameType.updateFromElement(frame);
    },

    capturePoint: function(frame, point, event){
        DefaultFrameType.capturePoint(frame, point, event);
    },
    movePoint: function(frame, point, event){
        return DefaultFrameType.movePoint(frame, point, event);
    },
    releasePoint: function(frame, point){
        DefaultFrameType.releasePoint(frame, point);
    },
    draw: function(frame, context){
        DefaultFrameType.draw(frame, context);

        var scale = Environment.view.scale();
        context.save();
        context.scale(1/scale, 1/scale);
        context.strokeStyle = '#22c1ff';
        context.lineWidth = 1;
        context.setLineDash([1, 1]);
        frame.element.each(function(e){
            context.save();
            var matrix = e.globalViewMatrix().prependedWithScale(scale, scale);
            e.drawBoundaryPath(context, matrix);
            context.stroke();
            context.restore();
        });
        context.restore();
    }
};

export default class SelectComposite extends CompositeElement{
    constructor(){
        super();
        this._selected = false;
        this._activeFrame = new ActiveFrame();
    }
    selected(value){
        if (arguments.length === 1){
            if (value === this._selected){
                return;
            }

            this._selected = value;
            var multiselect = this.count() > 1;

            if (value){
                if (!multiselect){
                    this.each(element =>{
                        element.addDecorator(this._activeFrame);
                        element.select(multiselect);
                    });
                } else{
                    this.addDecorator(this._activeFrame);
                    this.each(element => element.select(multiselect));
                }
            } else{
                this.removeDecorator(this._activeFrame);
                this.each(element =>{
                    element.unselect();
                    element.removeDecorator(this._activeFrame);
                });
            }
        }

        return this._selected;
    }
    selectionFrameType(){
        return SelectCompositeFrame;
    }
    resizeDimensions(){
        var parent = this.first().parent();
        var canResize = true;
        this.each(function(e){
            if (e.parent() !== parent){
                canResize = false;
                return false;
            }
        });
        return canResize ? ResizeDimension.Both : ResizeDimension.None;
    }
    add(element, multiSelect, refreshOnly){
        for (var i = this.elements.length - 1; i >= 0; --i){
            var e = this.elements[i];
            if (e.isDescendantOrSame(element) || element.isDescendantOrSame(e)){
                this.remove(e);
            }
        }
        if (!refreshOnly && this._selected){
            element.select(multiSelect);
        }
        super.add.apply(this, arguments);
    }
    remove(element, refreshOnly){
        if (!refreshOnly && this._selected){
            element.unselect();
        }
        super.remove.apply(this, arguments);
    }
    clear(refreshOnly){
        if (!refreshOnly && this._selected){
            this.each(x => x.unselect());
        }
        super.clear.apply(this, arguments);
    }
}

SelectComposite.prototype.t = Types.SelectComposite;

PropertyMetadata.registerForType(SelectComposite, {});
