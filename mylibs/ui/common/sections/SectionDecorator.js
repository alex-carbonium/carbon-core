import Section from "framework/Section";
import Brush from "framework/Brush";
import {isPointInRect} from "math/math";
import {DockStyle, ArrangeStrategies, Overflow, HorizontalAlignment, VerticalAlignment} from "framework/Defs";
import Cursor from "framework/Cursor";

var handleWidth = 150;
var handleHeight = 40;
var outerMargin = 25;
var handleBox = {x: 0, y: 0, width: handleWidth, height: handleHeight};

var brush = Brush.createFromCssColor("green");
var HandleTypes = {
    InnerLeft: 1,
    InnerTop: 2,
    InnerRight: 3,
    InnerBottom: 4,
    OuterLeft: 5,
    OuterTop: 6,
    OuterRight: 7,
    OuterBottom: 8,
    Fill: 9
};
var Icons = {
    Arrow: 1,
    Fill: 2
};

class SectionDecorator {
    attach(element, scale){
        this.element = element;
        var baseMatrix = element.globalViewMatrix();

        var cx = element.width/2 + .5 | 0;
        var cy = element.height/2 + .5 | 0;

        var minSide = Math.min(this.element.width, this.element.height);
        var ratio = minSide/(handleWidth + handleHeight);
        var handleScale = 1;
        if (ratio < 2){
            handleScale = ratio/2;
        }
        if (scale > 1){
            handleScale /= scale;
        }

        baseMatrix = baseMatrix.clone().translate(cx, cy);
        if (handleScale !== 1){
            baseMatrix.scale(handleScale, handleScale);
        }

        var margin = outerMargin / handleScale;

        var w2 = handleWidth/2;
        var h2 = handleHeight/2;
        var handleSpace = w2 + 10;
        this._handles = [
            {
                type: HandleTypes.InnerLeft,
                matrix: baseMatrix.clone()
                    .translate(- handleSpace - w2 - h2, - h2)
                    .rotate(-90, w2, h2)
            },
            {
                type: HandleTypes.InnerTop,
                matrix: baseMatrix.clone()
                    .translate(-w2, - handleHeight - handleSpace)
            },
            {
                type: HandleTypes.InnerRight,
                matrix: baseMatrix.clone()
                    .translate(handleSpace - w2 + h2, - h2)
                    .rotate(90, w2, h2)
            },
            {
                type: HandleTypes.InnerBottom,
                matrix: baseMatrix.clone()
                    .translate(- w2, handleSpace)
                    .rotate(180, w2, h2)
            }
        ];

        var dockStyle = this.element.dockStyle();
        if (dockStyle === DockStyle.Left || dockStyle === DockStyle.Right){
            this._handles.push({
                type: HandleTypes.OuterLeft,
                matrix: baseMatrix.clone()
                    .translate(-cx/handleScale -margin -h2 - w2, -h2)
                    .rotate(-90, w2, h2)
            });
            this._handles.push({
                type: HandleTypes.OuterRight,
                matrix: baseMatrix.clone()
                    .translate(cx/handleScale + margin + h2 - w2, -h2)
                    .rotate(90, w2, h2)
            });
        }
        else if (dockStyle === DockStyle.Top || dockStyle === DockStyle.Bottom){
            this._handles.push({
                type: HandleTypes.OuterTop,
                matrix: baseMatrix.clone()
                    .translate(-w2, -cy/handleScale -handleHeight - margin)
            });
            this._handles.push({
                type: HandleTypes.OuterBottom,
                matrix: baseMatrix.clone()
                    .translate(-w2, cy/handleScale + margin)
                    .rotate(180, w2, h2)
            });
        }

        if (this._canAddFill(element)){
            this._handles.push({
                type: HandleTypes.Fill,
                icon: Icons.Fill,
                matrix: baseMatrix.clone()
                    .translate(-w2/2, -w2/2)
            });
        }

        for (var i = 0; i < this._handles.length; i++){
            var handle = this._handles[i];
            handle.matrixInverted = handle.matrix.clone().invert();
            if (!handle.icon){
                handle.icon = Icons.Arrow;
            }
        }
    }

    _canAddFill(element){
        var hasSections = false;
        var hasFill = false;

        var items = element.children;
        for (let i = 0, l = items.length; i < l; ++i) {
            let element = items[i];
            if (element instanceof Section){
                hasSections = true;
                if (element.dockStyle() === DockStyle.Fill){
                    hasFill = true;
                    break;
                }
            }
        }

        return hasSections && !hasFill;
    }

    updateCursor(event){
        var handle = this.hitHandle(event);
        if (handle){
            Cursor.setGlobalCursor("pointer", true);
        }
        else{
            Cursor.removeGlobalCursor(true);
        }
    }

    click(event){
        var handle = this.hitHandle(event);
        if (handle){
            this._addSection(handle);
            event.handled = true;
        }
    }

    hitHandle(event){
        for (var i = 0; i < this._handles.length; i++){
            var handle = this._handles[i];
            var point = handle.matrixInverted.transformPoint(event);
            if (isPointInRect(handleBox, point)){
                return handle;
            }
        }
        return null;
    }

    draw(context){
        context.save();
        for (var i = 0; i < this._handles.length; i++){
            context.save();
            var handle = this._handles[i];
            handle.matrix.applyToContext(context);

            context.beginPath();
            if (handle.icon === Icons.Arrow){
                context.moveTo(0, handleHeight);
                context.lineTo(handleWidth, handleHeight);
                context.lineTo(handleWidth/2, 0);
                context.closePath();
            }
            else {
                context.rect(0, 0, handleWidth/2, handleWidth/2);
            }

            Brush.fill(brush, context);
            context.restore();
        }

        context.restore();
    }

    _addSection(handle){
        var newSection = new Section();
        var parent = this.element;
        var index = undefined;

        switch (handle.type){
            case HandleTypes.OuterTop:
                parent = this.element.parent;
                index = parent.positionOf(this.element) - 1;
                newSection.setProps({
                    name: this.element.dockStyle() === DockStyle.Top ? "Top section" : "Bottom section",
                    dockStyle: this.element.dockStyle(),
                    horizontalAlignment: HorizontalAlignment.Stretch,
                    height: Math.min(100, parent.height/2 | 0)
                });
                break;
            case HandleTypes.InnerTop:
                newSection.setProps({
                    name: "Top section",
                    dockStyle: DockStyle.Top,
                    horizontalAlignment: HorizontalAlignment.Stretch,
                    height: Math.min(100, parent.height/2 | 0)
                });
                break;
            case HandleTypes.OuterBottom:
                parent = this.element.parent;
                index = parent.positionOf(this.element) + 1;
                newSection.setProps({
                    name: this.element.dockStyle() === DockStyle.Top ? "Top section" : "Bottom section",
                    dockStyle: this.element.dockStyle(),
                    horizontalAlignment: HorizontalAlignment.Stretch,
                    height: Math.min(100, parent.height/2 | 0)
                });
                break;
            case HandleTypes.InnerBottom:
                newSection.setProps({
                    name: "Bottom section",
                    dockStyle: DockStyle.Bottom,
                    horizontalAlignment: HorizontalAlignment.Stretch,
                    height: Math.min(100, parent.height/2 | 0)
                });
                break;
            case HandleTypes.OuterLeft:
                parent = this.element.parent;
                index = parent.positionOf(this.element) - 1;
                newSection.setProps({
                    name: this.element.dockStyle() === DockStyle.Left ? "Left section" : "Right section",
                    dockStyle: this.element.dockStyle(),
                    verticalAlignment: VerticalAlignment.Stretch,
                    width: Math.min(100, parent.width/2 | 0)
                });
                break;
            case HandleTypes.InnerLeft:
                newSection.setProps({
                    name: "Left section",
                    dockStyle: DockStyle.Left,
                    verticalAlignment: VerticalAlignment.Stretch,
                    width: Math.min(100, parent.width/2 | 0)
                });
                break;
            case HandleTypes.OuterRight:
                parent = this.element.parent;
                index = parent.positionOf(this.element) + 1;
                newSection.setProps({
                    name: this.element.dockStyle() === DockStyle.Left ? "Left section" : "Right section",
                    dockStyle: this.element.dockStyle(),
                    verticalAlignment: VerticalAlignment.Stretch,
                    width: Math.min(100, parent.width/2 | 0)
                });
                break;
            case HandleTypes.InnerRight:
                newSection.setProps({
                    name: "Right section",
                    dockStyle: DockStyle.Right,
                    verticalAlignment: VerticalAlignment.Stretch,
                    width: Math.min(100, parent.width/2 | 0)
                });
                break;
            case HandleTypes.Fill:
                var fill = new Section();
                fill.setProps({
                    name: "Fill section",
                    dockStyle: DockStyle.Fill
                });
                parent.add(fill);
                break;
        }

        if (index < 0){
            index = 0;
        }

        parent.insert(newSection, index);

        parent.setProps({
            arrangeStrategy: ArrangeStrategies.Dock,
            overflow: Overflow.ExpandVertical
        });
    }
}

SectionDecorator.prototype.t = "SectionDecorator";

export default SectionDecorator;