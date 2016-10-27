import Container from "./Container";
import Box from "./Box";
import Brush from "./Brush";
import PropertyMetadata from "./PropertyMetadata";
import {Overflow, ViewTool, Types} from "./Defs";
import Composite from "../framework/commands/CompositeCommand";
import ElementDelete from "../commands/ElementDelete";
import {isRectInRect, calculateRectIntersectionArea} from "math/math";
import app from "app";

export default class Section extends Container {
    constructDeleteCommand(){
        var commands = Section.spitContent(this);
        commands.push(new ElementDelete(this));
        return new Composite(commands);
    }

    static suckContent(root){
        var commands = [];
        var queue = [root];
        while (queue.length){
            var section = queue.pop();

            var items = section.children;
            var sections = [];
            var floating = [];

            for (let i = 0, l = items.length; i < l; ++i) {
                let element = items[i];
                if (element instanceof Section){
                    sections.push(element);
                }
                else {
                    floating.push(element);
                }
            }

            for (let i = 0, l = floating.length; i < l; ++i) {
                let element = floating[i];
                let elementRect = element.getBoundaryRectGlobal();
                let bestSection = null;
                let maxArea = 0;
                for (let j = 0, k = sections.length; j < k; ++j) {
                    let section = sections[j];
                    var bestMatch = Section.findInnermostContainer(section, elementRect);
                    if (bestMatch.area > maxArea){
                        bestSection = bestMatch.section;
                        maxArea = bestMatch.area;
                    }
                }
                if (bestSection){
                    var globalRect = element.getBoundaryRectGlobal();
                    var newLocalRect = bestSection.global2local(globalRect);
                    newLocalRect.width = elementRect.width;
                    newLocalRect.height = elementRect.height;
                    commands.push(element.constructMoveCommand(bestSection));
                    commands.push(element.constructPropsChangedCommand(newLocalRect));
                }
            }

            if (sections.length){
                Array.prototype.push.apply(queue, sections);
            }
        }

        return commands;
    }
    static findInnermostContainer(root, globalRect){
        var items = root.children;
        var maxArea = 0;
        var bestChild = null;
        for (let i = 0, l = items.length; i < l; ++i) {
            let element = items[i];
            if (element instanceof Section){
                var match = Section.findInnermostContainer(element, globalRect);
                if (match.area > maxArea){
                    bestChild = match.section;
                    maxArea = match.area;
                }
            }
        }

        if (bestChild){
            return {section: bestChild, area: maxArea};
        }

        var ownRect = root.getBoundaryRectGlobal();
        var ownArea = calculateRectIntersectionArea(globalRect, ownRect);
        return {section: root, area: ownArea};
    }
    static spitContent(element){
        var commands = [];
        var queue = [element];
        var parent = element.parent();
        while (queue.length){
            var section = queue.pop();

            var items = section.children;
            var sections = [];
            for (let i = 0, l = items.length; i < l; ++i) {
                let element = items[i];
                if (element instanceof Section){
                    sections.push(element);
                }
                else{
                    var globalRect = element.getBoundaryRectGlobal();
                    var newLocalRect = parent.global2local(globalRect);
                    newLocalRect.width = element.width();
                    newLocalRect.height = element.height();
                    commands.push(element.constructMoveCommand(parent));
                    commands.push(element.constructPropsChangedCommand(newLocalRect));
                }
            }

            if (sections.length){
                Array.prototype.push.apply(queue, sections);
            }
        }
        return commands;
    }

    prepareProps(changes){
        super.prepareProps(changes);
        if (changes.fill){
            if (Brush.equals(changes.fill, Brush.None)){
                changes.dashPattern = [5, 5];
            }
            else{
                changes.dashPattern = null;
            }
        }
    }

    fill(value){
        if (arguments.length === 0 && this._isSectionToolActive()){
            return this.props.highlightFill;
        }
        return super.fill(value);
    }
    stroke(value){
        if (arguments.length === 0 && this._isSectionToolActive()){
            return this.props.highlightStroke;
        }
        return super.stroke(value);
    }

    canSelect(){
        return this._isSectionToolActive();
    }
    canDrag(){
        return false;
    }

    modifyContextBeforeDrawChildren(context) {
        context.rectPath(0, 0, this.width(), this.height());
        context.clip();
    }

    _isSectionToolActive(){
        return app.currentTool === ViewTool.Section;
    }


}
Section.prototype.t = Types.Section;;

Section.prototype._angleEditable = false;
Section.prototype.selectFromLayersPanel = true;
Section.prototype.multiselectTransparent = true;
Section.prototype.canMultiselectChildren = true;

PropertyMetadata.registerForType(Section, {
    margin: {
        defaultValue: Box.create(10, 10, 10, 10)
    },
    overflow: {
        defaultValue: Overflow.ExpandVertical
    },
    enableGroupLocking: {
        defaultValue: false
    },
    dashPattern: {
        defaultValue: [5, 5]
    },
    stroke: {
        defaultValue: sketch.framework.Brush.createFromColor("lightgray")
    },
    highlightStroke: {
        defaultValue: sketch.framework.Brush.createFromColor("black")
    },
    highlightFill: {
        defaultValue: sketch.framework.Brush.createFromColor("rgba(0, 0, 255, .2)")
    }
});