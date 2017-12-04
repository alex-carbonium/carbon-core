import { IUIElement, IRepeatContainer, UIElementFlags, IContributions, ContextBarPosition, ISelection } from "carbon-core";
import RepeatContainer from "./RepeatContainer";
import RepeatCell from "./RepeatCell";
import Selection from "framework/SelectionModel";
import { combineRects } from "math/math";
import Rect from "math/rect";
import Point from "../../math/point";
import GroupContainer from "../GroupContainer";
import Artboard from "../Artboard";
import CarbonExtension from "../../extensions/CarbonExtesion";
import Container from "../Container";
import ImageContent from "../ImageContent";

require("./RepeatArrangeStrategy");

export class RepeaterActions extends CarbonExtension {
    initialize(contributions: IContributions) {
        contributions.addActions([
            {
                id: "repeater.group",
                name: "@repeater.group",
                icon: "ico-repeater",
                callback: this.group,
                condition: selection => selection.elements.length && !RepeaterActions.isInRepeater(selection)
                    && !selection.elements.some(x => x instanceof Artboard || x instanceof RepeatContainer || x instanceof ImageContent)
            },
            {
                id: "repeater.ungroup",
                name: "@repeater.ungroup",
                icon: "ico-small-ungroup",
                callback: this.ungroup,
                condition: selection => selection.elements.length && selection.elements.every(x => x instanceof RepeatContainer)
            },
            {
                id: "repeater.hideOthers",
                name: "@repeater.hideOthers",
                callback: selection => this.toggleOthers(selection, false),
                condition: RepeaterActions.isInRepeater
            },
            {
                id: "repeater.showOthers",
                name: "@repeater.showOthers",
                callback: selection => this.toggleOthers(selection, true),
                condition: RepeaterActions.isInRepeater
            }
        ]);

        contributions.addContextMenuItem("repeater.group", ContextBarPosition.Left);
        contributions.addContextMenuItem("repeater.ungroup", ContextBarPosition.Left);

        contributions.addContextMenuGroup(
            "@repeater",
            [
                "repeater.hideOthers",
                "repeater.showOthers"
            ],
            ContextBarPosition.Left
        );

        contributions.addShortcuts({
            windows: [
                { key: "ctrl+alt+r", action: "repeater.group" }
            ],
            mac: [
                { key: "meta+alt+r", action: "repeater.group" }
            ],
        })
    }

    static isInRepeater = (selection: ISelection) => {
        return selection.elements.length && selection.elements.every(x => !!RepeatContainer.tryFindRepeaterParent(x));
    }

    group = (selection: ISelection) => {
        var elements = selection.elements;

        var sorted = elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        var element = elements[0];
        var parent = element.parent;
        var repeater = new RepeatContainer();

        // calculate position upfront, before parent.children collection changed.
        let insertIndex = parent.children.indexOf(sorted[sorted.length - 1]);

        var globalRect = element.getBoundingBox();
        var x1 = globalRect.x
            , y1 = globalRect.y
            , x2 = globalRect.width + x1
            , y2 = globalRect.height + y1;

        for (let i = 1, l = elements.length; i < l; ++i) {
            let element = elements[i];
            let globalRect = element.getBoundingBox();

            if (globalRect.x < x1) {x1 = globalRect.x;}
            if (globalRect.y < y1) {y1 = globalRect.y;}
            if (globalRect.x + globalRect.width > x2) {x2 = globalRect.x + globalRect.width;}
            if (globalRect.y + globalRect.height > y2) {y2 = globalRect.y + globalRect.height;}
        }

        var cell = new RepeatCell();
        var t = Point.allocate(-x1, -y1);
        for (let i = 0, l = elements.length; i < l; ++i) {
            let element = elements[i];
            element.applyTranslation(t);

            cell.add(element);
            element.resetGlobalViewCache();
        }
        t.free();
        cell.arrange({ newRect: Rect.Zero, oldRect: Rect.Zero });

        var pos = { x: x1, y: y1 };
        repeater.setProps({ width: x2 - x1, height: y2 - y1 });
        repeater.applyTranslation({ x: pos.x, y: pos.y });
        parent.insert(repeater, insertIndex);
        repeater.insert(cell, 0);

        Selection.makeSelection([repeater]);
    }

    ungroup = (selection: ISelection) => {
        var elements = selection.elements;

        let container = elements[0] as any as RepeatContainer;
        let parent = container.parent;
        let items = container.children;
        let index = container.index();
        let allChildren = [];
        let cols = container.cols;
        let rows = container.rows;

        for (let x = 0; x < rows; ++x) {
            for (let y = 0; y < cols; ++y) {
                let e = items[x * cols + y] as Container;
                if (e.children.length === 1) {
                    var gm = e.children[0].globalViewMatrix();
                    e = e.children[0].clone();
                    App.Current.activePage.nameProvider.assignNewName(e);
                } else {
                    var group = new GroupContainer();
                    App.Current.activePage.nameProvider.assignNewName(group);
                    group.setProps({ m: e.props.m, br: e.props.br });
                    e.children.forEach(c => {
                        var clone = c.clone();
                        App.Current.activePage.nameProvider.assignNewName(clone);
                        group.add(clone);
                    });
                    var gm = e.globalViewMatrix();
                    e = group;
                }

                parent.insert(e, index);
                e.setTransform(parent.globalViewMatrixInverted().appended(gm));
                allChildren.push(e);
            }
        }

        parent.remove(container);
        Selection.makeSelection(allChildren);
    }

    toggleOthers = (selection : ISelection, show: boolean) => {
        let elements = selection.elements;
        for (let i = 0; i < elements.length; ++i) {
            let element = elements[i];
            let repeater = RepeatContainer.tryFindRepeaterParent(element);
            let allRepeated = repeater.findRepeatedElements(element);
            for (let j = 0; j < allRepeated.length; ++j) {
                if (!selection.isElementSelected(allRepeated[j])) {
                    allRepeated[j].visible = (show);
                }
            }
        }
    }
}