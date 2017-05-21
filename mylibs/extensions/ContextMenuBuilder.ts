import RepeatContainer from "framework/repeater/RepeatContainer";
import Selection from "framework/SelectionModel";
import GroupContainer from "framework/GroupContainer";
import ArtboardTemplateControl from "../framework/ArtboardTemplateControl";
import CompoundPath from "ui/common/CompoundPath";
import Environment from "environment";
import Path from "ui/common/Path";
import CoreIntl from "../CoreIntl";
import { ContextBarPosition, IActionManager, IView, IApp } from "carbon-core";

function findItemsToSelect(app, eventData) {
    var items = [];

    var elements = app.activePage.hitElements(eventData, Environment.view.scale());

    return items.map(itemSelector);
};

function itemSelector(e){
    return {
        name: e.displayName(),
        callback: function (e) {
            Selection.makeSelection([e]);
        }
    }
}


function canDoPathOperations(selection) {
    if (selection.length < 2) {
        return false;
    }

    for (var i = 0; i < selection.length; ++i) {
        var e = selection[i];
        if (!(e instanceof Path) && !(e instanceof CompoundPath) && (typeof e.convertToPath !== "function")) {
            return false;
        }
    }
    return true;
}

function canFlattenPath(selection) {
    if (selection.length != 1) {
        return false;
    }

    var e = selection[0];
    return (e instanceof CompoundPath);
}

function canConvertToPath(selection) {
    if (selection.length < 1) {
        return false;
    }

    for (var i = 0; i < selection.length; ++i) {
        var e = selection[i];
        if (!e.canConvertToPath()) {
            return false;
        }
    }
    return true;
}

export default class ContextMenuBuilder {
    static build(app: IApp, context, menu) {
        var selectComposite = context.selectComposite;
        var selection = selectComposite.elements;
        var actionManager = app.actionManager;

        if (selection && selection.length && !selection[0].contextBarAllowed()) {
            return;
        }

        var items = menu.items;

        var editingPath = selection.length === 1 && selection[0] instanceof Path && selection[0].mode() === 'edit';

        if(editingPath  && !context.eventData) {
            items.push({
                name: "@action.done",
                contextBar: ContextBarPosition.Left | ContextBarPosition.Only,
                callback: () => {
                    actionManager.invoke("cancel");
                }
            });
            return;
        }

        if(Environment.view.isolationLayer.isActive && !context.eventData) {
            items.push({
                name: "@action.exitisolation",
                contextBar: ContextBarPosition.Left | ContextBarPosition.Only,
                callback: () => {
                    actionManager.invoke("cancel");
                }
            });
        }

        if (selection.length) {
            if (selection.length === 1 && selection[0] instanceof RepeatContainer) {
                items.push({
                    name: "@repeater.ungroup",
                    icon: "ungroup-grid",
                    contextBar: ContextBarPosition.Left,
                    callback: () => {
                        actionManager.invoke("ungroupRepeater");
                    }
                });
            } else {
                items.push({
                    name: "@repeater.group",
                    icon: "ico--repeater",
                    contextBar: ContextBarPosition.Left,
                    callback: () => {
                        actionManager.invoke("groupInRepeater");
                    }
                });
            }
            items.push('-');
        }


        if (context.eventData) {
            var itemsToSelect = findItemsToSelect(app, context.eventData);
            if (itemsToSelect.length) {
                items.push({
                    name: "Select",
                    contextBar: ContextBarPosition.None,
                    items: itemsToSelect
                });
                items.push('-');
            }
        }

        items.push({
            name: "Copy",
            icon: "copy",
            contextBar: ContextBarPosition.None,
            callback: function () {
                //showClipboardDialog();
            },
            disabled: !(selection && selection.length > 0)
        });

        items.push({
            name: "Cut",
            icon: "cut",
            contextBar: ContextBarPosition.None,
            callback: function () {
                //showClipboardDialog();
            },
            disabled: !(selection && selection.length > 0)
        });

        items.push({
            name: "Paste",
            icon: "paste",
            contextBar: ContextBarPosition.None,
            callback: function () {
                //showClipboardDialog();
            }
        });

        items.push({
            name: "Duplicate",
            icon: "duplicate",
            contextBar: ContextBarPosition.None,
            callback: () => {
                actionManager.invoke("duplicate");
            },
            disabled: !(selection && selection.length > 0)
        });

        items.push('-');
        items.push({
            name: "Delete",
            icon: "delete",
            contextBar: ContextBarPosition.None,
            callback: () => {
                actionManager.invoke("delete");
            },
            disabled: !(selection && selection.length > 0)
        });

        items.push('-');
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
                    callback: () => {
                        actionManager.invoke("alignTop");
                    },
                    disabled: !selection.length
                },
                {
                    name: "@align.middle",
                    row: 0,
                    icon: "ico-small-align-middles",
                    callback: () => {
                        actionManager.invoke("alignMiddle");
                    },
                    disabled: !selection.length
                },
                {
                    name: "@align.bottom",
                    row: 0,
                    icon: "ico-small-align-bottoms",
                    callback: () => {
                        actionManager.invoke("alignBottom");
                    },
                    disabled: !selection.length
                },
                {
                    name: "@align.left",
                    row: 0,
                    icon: "ico-small-align-lefts",
                    callback: () => {
                        actionManager.invoke("alignLeft");
                    },
                    disabled: !selection.length
                },
                {
                    name: "@align.center",
                    row: 0,
                    icon: "ico-small-align-centers",
                    callback: () => {
                        actionManager.invoke("alignCenter");
                    },
                    disabled: !selection.length
                },
                {
                    name: "@align.right",
                    row: 0,
                    icon: "ico-small-align-rights",
                    callback: () => {
                        actionManager.invoke("alignRight");
                    },
                    disabled: !selection.length
                },
                {
                    name: "@distribute.vertically",
                    row: 1,
                    icon: "ico-small-distribute-centers",
                    callback: () => {
                        actionManager.invoke("distributeVertically");
                    },
                    disabled: !selection || selection.length <= 1
                },
                {
                    name: "@distribute.horizontally",
                    row: 1,
                    icon: "ico-small-distribute-middles",
                    callback: () => {
                        actionManager.invoke("distributeHorizontally");
                    },
                    disabled: !selection || selection.length <= 1
                }
            ]
        });

        items.push('-');

        items.push({
            name: "Grouping",
            contextBar: ContextBarPosition.Right,
            items: [
                {
                    name: "Group",
                    icon: "group",
                    callback: () => {
                        actionManager.invoke("groupElements");
                    },
                    disabled: !selection || selection.length <= 1
                },
                {
                    name: "Ungroup",
                    icon: "ungroup",
                    callback: () => {
                        actionManager.invoke("ungroupElements");
                    },
                    disabled: !selection || selection.length !== 1 || !(selection[0] instanceof GroupContainer)
                },
                {
                    name: "Mask",
                    icon: "mask",
                    callback: () => {
                        actionManager.invoke("groupWithMask");
                    },
                    disabled: !selection || selection.length < 2 || (typeof selection[0].drawPath !== 'function')
                }
            ]
        });
        items.push('-');
        items.push({
            name: "Path",
            contextBar: (canDoPathOperations(selection) || canFlattenPath(selection) || canConvertToPath(selection)) ? ContextBarPosition.Right : ContextBarPosition.None,
            items: [
                {
                    name: "Union",
                    icon: "pathUnion",
                    callback: () => {
                        actionManager.invoke("pathUnion");
                    },
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "Intersect",
                    icon: "pathIntersect",
                    callback: () => {
                        actionManager.invoke("pathIntersect");
                    },
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "Difference",
                    icon: "pathDifference",
                    callback: () => {
                        actionManager.invoke("pathDifference");
                    },
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "Subtract",
                    icon: "pathSubtract",
                    callback: () => {
                        actionManager.invoke("pathSubtract");
                    },
                    disabled: !canDoPathOperations(selection)
                },
                {
                    name: "Flatten",
                    icon: "pathFlatten",
                    callback: () => {
                        actionManager.invoke("pathFlatten");
                    },
                    disabled: !canFlattenPath(selection)
                },
                {
                    name: "Convert to path",
                    icon: "convertToPath",
                    callback: () => {
                        actionManager.invoke("convertToPath");
                    },
                    disabled: !canConvertToPath(selection)
                }
            ]
        });



        items.push({
            name: "Arrange",
            contextBar: ContextBarPosition.Right,
            items: [
                {
                    name: "Bring to Front",
                    icon: "ico-small-send-to-foreground",
                    callback: () => {
                        actionManager.invoke("bringToFront");
                    },
                    disabled: !selection || !selection.length
                },
                {
                    name: "Send to Back",
                    icon: "ico-small-send-to-background",
                    callback: () => {
                        actionManager.invoke("sendToBack");
                    },
                    disabled: !selection || !selection.length
                },
                {
                    name: "Bring Forward",
                    icon: "ico-small-move-upper",
                    callback: () => {
                        actionManager.invoke("bringForward");
                    },
                    disabled: !selection || !selection.length
                },
                {
                    name: "Send Backward",
                    icon: "ico-small-move-lower",
                    callback: () => {
                        actionManager.invoke("sendBackward");
                    },
                    disabled: !selection || !selection.length
                }
            ]
        });
    }
}