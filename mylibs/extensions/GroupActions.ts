import CarbonExtension from "./CarbonExtesion";
import { IContributions, ContextBarPosition, IApp, ISelection, ChangeMode, IArtboardProps, ILayer, LayerType, IUIElement, IContainer, IRect, ArtboardType, IText, UIElementFlags, IArtboard, IGroupContainer } from "carbon-core";
import Constraints from "framework/Constraints";
import Symbol from "../framework/Symbol";
import Artboard from "../framework/Artboard";
import Text from "../framework/text/Text";
import GroupArrangeStrategy from "../framework/arrangeStrategy/GroupArrangeStrategy";
import Matrix from "../math/matrix";
import Rect from "../math/rect";
import Container from "../framework/Container";
import ImageContent from "../framework/ImageContent";
import { unionRect } from "../math/geometry";
import GroupContainer from "../framework/GroupContainer";
import InteractiveContainer from "../framework/InteractiveContainer";
import { ArrangeStrategies, DropPositioning } from "../framework/Defs";

export class GroupActions extends CarbonExtension {
    initialize(contributions: IContributions) {
        //TODO: add label registrations
        contributions.addActions([
            {
                id: "group",
                name: "@group",
                icon: "ico-small-group",
                callback: selection => this.group(selection, GroupContainer),
                condition: GroupActions.canGroup
            },
            {
                id: "ungroup",
                name: "@ungroup",
                icon: "ico-small-ungroup",
                callback: this.ungroup,
                condition: GroupActions.canUnGroup
            },
            {
                id: "group.mask",
                name: "@group.mask",
                callback: this.groupWithMask,
                condition: selection => selection.elements.length >= 2
            },
            {
                id: "group.hstack",
                name: "@group.hstack",
                callback: selection => this.group(selection, InteractiveContainer, {
                    arrangeStrategy: ArrangeStrategies.HorizontalStack,
                    dropPositioning: DropPositioning.Horizontal
                }, true),
                condition: GroupActions.canGroup
            },
            {
                id: "group.vstack",
                name: "@group.vstack",
                callback: selection => this.group(selection, InteractiveContainer, {
                    arrangeStrategy: ArrangeStrategies.VerticalStack,
                    dropPositioning: DropPositioning.Vertical
                }, true),
                condition: GroupActions.canGroup
            },
            {
                id: "group.canvas",
                name: "@group.canvas",
                callback: selection => this.group(selection, InteractiveContainer, undefined, true),
                condition: GroupActions.canGroup
            }
        ]);

        contributions.addContextMenuGroup(
            "@grouping",
            [
                "group",
                "group.mask",
                "group.vstack",
                "group.hstack",
                "group.canvas",
                "ungroup",
            ],
            ContextBarPosition.Right
        );

        contributions.addShortcuts([
            { key: "mod+g", action: "group" },
            { key: "mod+alt+m", action: "group.mask" },
            { key: "mod+shift+g", action: "ungroup" }
        ]);
    }

    static canGroup(selection: ISelection): boolean{
        return selection.elements.length && !selection.elements.some(x => x instanceof Artboard);
    }
    static canUnGroup(selection: ISelection): boolean{
        return selection.elements.length && selection.elements.every(x => x instanceof InteractiveContainer);
    }

    group(selection: ISelection, containerType, props?, setPosition?) {
        let elements = selection.elements;

        var sorted = elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        var element = elements[0];
        var parent = element.parent();
        var group = new containerType();
        let childrenTranslationMatrix = null;

        if (setPosition) {
            let box = sorted[0].getBoundingBox();
            for (let i = 0, l = sorted.length; i < l; ++i) {
                let element = sorted[i];
                box = unionRect(box, sorted[i].getBoundingBox());
            }
            props = props || {};
            props.br = new Rect(0, 0, box.width, box.height);
            props.m = Matrix.create().translate(box.x, box.y);
            childrenTranslationMatrix = props.m.inverted();
        }

        if (props) {
            group.prepareAndSetProps(props);
        }

        App.Current.activePage.nameProvider.assignNewName(group);
        parent.insert(group, parent.children.indexOf(sorted[sorted.length - 1]));

        for (let i = 0, l = sorted.length; i < l; ++i) {
            let element = sorted[i];
            group.insert(element, i);
            if (childrenTranslationMatrix) {
                element.applyTransform(childrenTranslationMatrix, false);
            }
        }

        group.performArrange();
        selection.makeSelection([group]);

        return group;
    }

    groupWithMask = (selection: ISelection) => {
        let group = this.group(selection, GroupContainer);
        group.children[0].setProps({ clipMask: true });
    }

    ungroup(selection: ISelection) {
        let elements = selection.elements as IContainer[];
        let children = [];
        elements.forEach(e => {
            children = children.concat(e.children);
            e.flatten();
        });
        selection.makeSelection(children);
    }
}