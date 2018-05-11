import RepeatContainer from "framework/repeater/RepeatContainer";
import Selection from "framework/SelectionModel";
import GroupContainer from "framework/GroupContainer";
import Symbol from "../framework/Symbol";
import Artboard from "../framework/Artboard";
import CompoundPath from "framework/CompoundPath";
import Path from "framework/Path";
import CoreIntl from "../CoreIntl";
import { ContextBarPosition, IActionManager, IView, IApp, ElementState, IComposite } from "carbon-core";
import InteractiveContainer from "../framework/InteractiveContainer";
import { RepeaterActions } from "../framework/repeater/RepeaterActions";
import ImageContent from "../framework/ImageContent";
import ArtboardFrameControl from "../framework/ArtboardFrame";

function findItemsToSelect(app, view, eventData) {
    let elements = app.activePage.hitElements(eventData, view)
    return elements.map(itemSelector)
};

function itemSelector(e){
    return {
        label: e.displayName(),
        actionId: "selectElement",
        actionArg: e.id
    }
}


function canDoPathOperations(selection) {
    if (selection.length < 2) {
        return false
    }

    for (let i = 0; i < selection.length; ++i) {
        let e = selection[i]
        if (!(e instanceof Path) && !(e instanceof CompoundPath) && (typeof e.convertToPath !== "function")) {
            return false
        }
    }
    return true
}

function canFlattenPath(selection) {
    if (selection.length !== 1) {
        return false
    }

    let e = selection[0]
    return (e instanceof CompoundPath)
}

function canConvertToPath(selection) {
    if (selection.length < 1) {
        return false
    }

    for (let i = 0; i < selection.length; ++i) {
        let e = selection[i]
        if (!e.canConvertToPath()) {
            return false
        }
    }
    return true
}

export default class ContextMenuBuilder {
    static build(app: IApp, view:IView, context, menu) {
        let selectComposite = context.selectComposite as IComposite;
        let selection = selectComposite.elements;
        let actionManager = app.actionManager;

        if (selection && selection.length && !selection[0].contextBarAllowed()) {
            return
        }

        let items = menu.items

        let editingPath = selection.length === 1
            && (selection[0] instanceof Path
            || selection[0] instanceof ArtboardFrameControl)
            && selection[0].mode() === ElementState.Edit;
        let editingImage = selection.length === 1 && selection[0] instanceof ImageContent;

        if((editingPath || editingImage) && !context.eventData) {
            items.push({
                name: "@action.done",
                contextBar: ContextBarPosition.Left | ContextBarPosition.Only,
                actionId: "cancel"
            })
            return
        }

        if(view.isolationLayer.isActive && !context.eventData) {
            items.push({
                name: "@action.exitisolation",
                contextBar: ContextBarPosition.Left | ContextBarPosition.Only,
                actionId: "exitisolation"
            })
        }

        if (context.eventData) {
            let itemsToSelect = findItemsToSelect(app, view, context.eventData)
            if (itemsToSelect.length) {
                items.push({
                    name: "@select",
                    contextBar: ContextBarPosition.None,
                    items: itemsToSelect
                })
                items.push('-')
            }
        }

        items.push({
            name: "@copy",
            icon: "ico-small-copy",
            contextBar: ContextBarPosition.None,
            actionId: "copy",
            disabled: !(selection && selection.length > 0)
        })

        items.push({
            name: "@cut",
            icon: "ico-small-cut",
            contextBar: ContextBarPosition.None,
            actionId: "cut",
            disabled: !(selection && selection.length > 0)
        })

        items.push({
            name: "@paste",
            icon: "ico-small-paste",
            contextBar: ContextBarPosition.None,
            actionId: "paste"
        })

        items.push({
            name: "@duplicate",
            icon: "ico-small-duplicate",
            contextBar: ContextBarPosition.None,
            actionId: "duplicate",
            disabled: !(selection && selection.length > 0)
        })

        items.push('-')
        items.push({
            name: "@delete",
            icon: "ico-small-delete",
            contextBar: ContextBarPosition.None,
            actionId: "delete",
            disabled: !(selection && selection.length > 0)
        })

        items.push('-')
        items.push({
            name: "@menu.align",
            contextBar: ContextBarPosition.Right,
            rows: [
                "@menurow.align", "@menurow.distribute"/*, "@menu.spacing" */
            ],
            items: [
                {
                    name: "@align.top",
                    row: 0,
                    icon: "ico-small-align-tops",
                    actionId: "alignTop",
                    disabled: !selection.length
                },
                {
                    name: "@align.middle",
                    row: 0,
                    icon: "ico-small-align-middles",
                    actionId: "alignMiddle",
                    disabled: !selection.length
                },
                {
                    name: "@align.bottom",
                    row: 0,
                    icon: "ico-small-align-bottoms",
                    actionId: "alignBottom",
                    disabled: !selection.length
                },
                {
                    name: "@align.left",
                    row: 0,
                    icon: "ico-small-align-lefts",
                    actionId: "alignLeft",
                    disabled: !selection.length
                },
                {
                    name: "@align.center",
                    row: 0,
                    icon: "ico-small-align-centers",
                    actionId: "alignCenter",
                    disabled: !selection.length
                },
                {
                    name: "@align.right",
                    row: 0,
                    icon: "ico-small-align-rights",
                    actionId: "alignRight",
                    disabled: !selection.length
                },
                {
                    name: "@distribute.vertically",
                    row: 1,
                    icon: "ico-small-distribute-centers",
                    actionId: "distributeVertically",
                    disabled: !selection || selection.length <= 1
                },
                {
                    name: "@distribute.horizontally",
                    row: 1,
                    icon: "ico-small-distribute-middles",
                    actionId: "distributeHorizontally",
                    disabled: !selection || selection.length <= 1
                }
            ]
        })

        items.push('-')
        items.push({
            name: "@path",
            contextBar: (canDoPathOperations(selection) || canFlattenPath(selection) || canConvertToPath(selection)) ? ContextBarPosition.Right : ContextBarPosition.None,
            items: [
                {
                    name: "@union",
                    icon: "pathUnion",
                    actionId: "pathUnion",
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "@intersect",
                    icon: "pathIntersect",
                    actionId: "pathIntersect",
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "@difference",
                    icon: "pathDifference",
                    actionId: "pathDifference",
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "@subtract",
                    icon: "pathSubtract",
                    actionId: "pathSubtract",
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "@flatten",
                    icon: "pathFlatten",
                    actionId: "pathFlatten",
                    disabled: !canFlattenPath(selection)
                },
                {
                    name: "@convert.to.path",
                    icon: "convertToPath",
                    actionId: "convertToPath",
                    disabled: !canConvertToPath(selection)
                }
            ]
        })



        items.push({
            name: "@arrange",
            contextBar: ContextBarPosition.Right,
            items: [
                {
                    name: "@bring.to.front",
                    icon: "ico-small-send-to-foreground",
                    actionId: "bringToFront",
                    disabled: !selection.length || selection.some(x => x instanceof Artboard)
                },
                {
                    name: "@send.to.back",
                    icon: "ico-small-send-to-background",
                    actionId: "sendToBack",
                    disabled: !selection.length || selection.some(x => x instanceof Artboard)
                },
                {
                    name: "@bring.forward",
                    icon: "ico-small-move-upper",
                    actionId: "bringForward",
                    disabled: !selection.length || selection.some(x => x instanceof Artboard)
                },
                {
                    name: "@send.backward",
                    icon: "ico-small-move-lower",
                    actionId: "sendBackward",
                    disabled: !selection.length || selection.some(x => x instanceof Artboard)
                }
            ]
        })
    }
}