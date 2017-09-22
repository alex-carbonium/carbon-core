import RepeatContainer from "framework/repeater/RepeatContainer";
import Selection from "framework/SelectionModel";
import GroupContainer from "framework/GroupContainer";
import Symbol from "../framework/Symbol";
import CompoundPath from "framework/CompoundPath";
import Environment from "environment";
import Path from "framework/Path";
import CoreIntl from "../CoreIntl";
import { ContextBarPosition, IActionManager, IView, IApp, ElementState } from "carbon-core";
import InteractiveContainer from "../framework/InteractiveContainer";
import { RepeaterActions } from "../framework/repeater/RepeaterActions";

function findItemsToSelect(app, eventData) {
    let items = []

    let elements = app.activePage.hitElements(eventData, Environment.view.scale())

    return items.map(itemSelector)
};

function itemSelector(e){
    return {
        name: e.displayName(),
        callback: function (e) {
            Selection.makeSelection([e])
        }
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
    static build(app: IApp, context, menu) {
        let selectComposite = context.selectComposite
        let selection = selectComposite.elements
        let actionManager = app.actionManager

        if (selection && selection.length && !selection[0].contextBarAllowed()) {
            return
        }

        let items = menu.items

        let editingPath = selection.length === 1 && selection[0] instanceof Path && selection[0].mode() === ElementState.Edit

        if(editingPath  && !context.eventData) {
            items.push({
                name: "@action.done",
                contextBar: ContextBarPosition.Left | ContextBarPosition.Only,
                actionId: "cancel"
            })
            return
        }

        if(Environment.view.isolationLayer.isActive && !context.eventData) {
            items.push({
                name: "@action.exitisolation",
                contextBar: ContextBarPosition.Left | ContextBarPosition.Only,
                actionId: "exitIsolation"
            })
        }

        if (context.eventData) {
            let itemsToSelect = findItemsToSelect(app, context.eventData)
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
            callback: function () {
                //showClipboardDialog();
            },
            disabled: !(selection && selection.length > 0)
        })

        items.push({
            name: "@cut",
            icon: "ico-small-cut",
            contextBar: ContextBarPosition.None,
            callback: function () {
                //showClipboardDialog();
            },
            disabled: !(selection && selection.length > 0)
        })

        items.push({
            name: "@paste",
            icon: "ico-small-paste",
            contextBar: ContextBarPosition.None,
            callback: function () {
                //showClipboardDialog();
            }
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
            name: "@grouping",
            contextBar: ContextBarPosition.Right,
            items: [
                {
                    name: "@group",
                    icon: "group",
                    actionId: "groupElements",
                    disabled: !selection || selection.length <= 1
                },
                {
                    name: "@group.vstack",
                    icon: "group",
                    actionId: "groupElementsVStack",
                    disabled: !selection || selection.length <= 1
                },
                {
                    name: "@group.hstack",
                    icon: "group",
                    actionId: "groupElementsHStack",
                    disabled: !selection || selection.length <= 1
                },
                {
                    name: "@group.canvas",
                    icon: "group",
                    actionId: "groupElementsCanvas",
                    disabled: !selection || selection.length <= 1
                },
                {
                    name: "@ungroup",
                    icon: "ungroup",
                    actionId: "ungroupElements",
                    disabled: !selection || selection.length !== 1 || !(selection[0] instanceof InteractiveContainer)
                },
                {
                    name: "@group.mask",
                    icon: "mask",
                    actionId: "groupWithMask",
                    disabled: !selection || selection.length < 2 || (typeof selection[0].drawPath !== 'function')
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
                    disabled: !selection || !selection.length
                },
                {
                    name: "@send.to.back",
                    icon: "ico-small-send-to-background",
                    actionId: "sendToBack",
                    disabled: !selection || !selection.length
                },
                {
                    name: "@bring.forward",
                    icon: "ico-small-move-upper",
                    actionId: "bringForward",
                    disabled: !selection || !selection.length
                },
                {
                    name: "@send.backward",
                    icon: "ico-small-move-lower",
                    actionId: "sendBackward",
                    disabled: !selection || !selection.length
                }
            ]
        })
    }
}