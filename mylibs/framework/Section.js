import Container from "./Container";
import Box from "./Box";
import Brush from "./Brush";
import PropertyMetadata from "./PropertyMetadata";
import {Overflow, Types} from "./Defs";
import {isRectInRect, calculateRectIntersectionArea} from "math/math";

export default class Section extends Container {
    trackDeleted(parent, index, mode) {
        super.trackDeleted(parent, index, mode);
        Section.spitContent(this);
        this.parent.remove(this);
    }

    static suckContent(root){
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
                    bestSection.add(element);
                    element.setProps(newLocalRect);
                }
            }

            if (sections.length){
                Array.prototype.push.apply(queue, sections);
            }
        }
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
        var queue = [element];
        var parent = element.parent;
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
                    newLocalRect.width = element.width;
                    newLocalRect.height = element.height;
                    parent.add(element);
                    element.setProps(newLocalRect);
                }
            }

            if (sections.length){
                Array.prototype.push.apply(queue, sections);
            }
        }
    }

    prepareProps(changes, mode){
        super.prepareProps(changes, mode);
        if (changes.fill){
            if (Brush.equals(changes.fill, Brush.None)){
                changes.dashPattern = [5, 5];
            }
            else{
                changes.dashPattern = null;
            }
        }
    }

    get fill(){
        if (this._isSectionToolActive()){
            return this.props.highlightFill;
        }
        return super.fill;
    }

    set fill(value){
        return super.fill = (value);
    }

    get stroke(){
        if (this._isSectionToolActive()){
            return this.props.highlightStroke;
        }
        return super.stroke;
    }

    set stroke(value){
        return super.stroke = (value);
    }

    canSelect(){
        return this._isSectionToolActive();
    }
    canDrag(){
        return false;
    }
    canRotate(){
        return false;
    }

    modifyContextBeforeDrawChildren(context) {
        context.beginPath();
        context.rectPath(0, 0, this.width, this.height);
        context.clip();
    }

    _isSectionToolActive(){
        return false;//Workspace.controller.currentTool === "sectionTool";
    }


}
Section.prototype.t = Types.Section;;
Section.prototype.runtimeProps = {selectFromLayersPanel:true};
Section.prototype.multiselectTransparent = true;
Section.prototype.canMultiselectChildren = true;

PropertyMetadata.registerForType(Section, {
    margin: {
        defaultValue: Box.create(10, 10, 10, 10)
    },
    overflow: {
        defaultValue: Overflow.ExpandVertical
    },
    dashPattern: {
        defaultValue: [5, 5]
    },
    stroke: {
        defaultValue: Brush.createFromCssColor("lightgray")
    },
    highlightStroke: {
        defaultValue: Brush.createFromCssColor("black")
    },
    highlightFill: {
        defaultValue: Brush.createFromCssColor("rgba(0, 0, 255, .2)")
    }
});