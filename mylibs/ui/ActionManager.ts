import Command from "../framework/commands/Command";
import CommandManager from "../framework/commands/CommandManager";
import ChangeZOrder from "../commands/ChangeZOrder";
import Delete from "../commands/Delete";
import Move from "../commands/Move";
import Environment from "../environment";
import Invalidate from "../framework/Invalidate";
import FontHelper from "../framework/FontHelper";
import Brush from "../framework/Brush";
import Matrix from "math/matrix";

import clipboard from "../framework/Clipboard";
import PropertyTracker from "../framework/PropertyTracker";
import Duplicate from "../commands/Duplicate";
// import ChangeColumnType from "../commands/ChangeColumnType";
import ConvertToPath from "../commands/ConvertToPath";
// import DeleteCellGroup from "../commands/DeleteCellGroup";
import Group from "../commands/Group";
import Isolate from "../commands/Isolate";
import { align } from "../framework/Aligner";
// import InsertColumn from "../commands/InsertColumn";
// import InsertRow from "../commands/InsertRow";
// import ResizeColumn from "../commands/ResizeColumn";
// import ResizeRow from "../commands/ResizeRow";
import platform from "../platform/Platform";
import CombinePaths from "../commands/CombinePaths";
import GroupContainer from "../framework/GroupContainer";
import InteractiveContainer from "../framework/InteractiveContainer";
import GroupInRepeater from "../framework/repeater/GroupInRepeater";
import UngroupRepeater from "../framework/repeater/UngroupRepeater";
import Selection from "../framework/SelectionModel";
import EventHelper from "../framework/EventHelper";
import { IActionManager, IAction, IApp, IUIElement, IEvent, IContainer, IIsolatable } from "carbon-core";
import { ArrangeStrategies, DropPositioning } from "../framework/Defs";

const debug = require("DebugUtil")("carb:actionManager");

function formatActionDescription(action) {
    Object.defineProperty(action, "shortcut", {
        get: function () {
            return this.app.shortcutManager.getActionHotkeyDisplayLabel(this.name);
        }
    });

    // Object.defineProperty(action, "fullDescription", {
    //     get: function () {
    //         if (this.shortcut) {
    //             return this.description + " (" + this.shortcut + ")";
    //         }
    //         return this.description;
    //     }
    // })
}

let actionStartProps;
function startRepeatableAction(oldPropsSelector) {
    PropertyTracker.suspend();
    actionStartProps = Selection.selectComposite().map(x => oldPropsSelector(x));
    Selection.hideFrame();
}
function endRepeatableAction() {
    let flushNeeded = PropertyTracker.resume();
    if (flushNeeded) {
        setTimeout(() => {
            PropertyTracker.flush();
        }, 0);
    }
    return actionStartProps;
}

export default class ActionManager implements IActionManager {
    app: IApp;
    private _actions: {
        [key: string]: IAction
    };

    private _actionsWithConditions: {
        [key: string]: IAction
    }

    private _events: any[];
    private _actionStartEvents: any[];
    public actionPerformed: IEvent<any>;
    private _visibleActionsConfig: any;

    constructor(app: IApp) {
        this._actions = {};
        this._events = [];
        this._actionStartEvents = [];
        this._actionsWithConditions = {};
        this.actionPerformed = EventHelper.createEvent();
        this.app = app;
    }

    notifyActionStart(actionName, e) {
        let event = this._actionStartEvents[actionName];
        if (event) {
            event.raise(actionName, e);
        }
    }

    notifyActionCompleted(actionName: string, result?: any, ret?: any) {
        this.actionPerformed.raise(actionName/*, result, ret*/);
        let event = this._events[actionName];
        if (event) {
            event.raise(actionName, result, ret);
        }
    }


    registerAction(name: string, description: string, category: string, callback: (option?: any) => void): IAction {
        let action: IAction = {
            id: name,
            name: description,
            callback: callback
        };

        return this.registerActionInstance(action);
    }

    registerActionInstance(action: IAction): IAction {
        this._actions[action.id] = action;
        if (action.condition) {
            this._actionsWithConditions[action.id] = action;
        }

        formatActionDescription.call(this, action);

        return action;
    }

    registerActions() {
        let that = this;
        let selectionMade = function () {
            let selection = Selection.getSelection();
            return selection && selection.length > 0;
        };
        let moving = null;

        this.registerActionInstance({
            id: "delete",
            name: "@delete",
            callback: selection => Delete.run(selection.elements),
            condition: selection => !!selection.elements.length
        });

        this.registerActionInstance({
            id: "duplicate",
            name: "@duplicate",
            callback: selection => Duplicate.run(selection.elements),
            condition: selection => !!selection.elements.length
        });

        this.registerAction("bringToFront", "@bring to front", "Layering", function () {
            ChangeZOrder.run(Selection.getSelection(), "front");
        });
        this.registerAction("sendToBack", "@send to back", "Layering", function () {
            ChangeZOrder.run(Selection.getSelection(), "back");
        });
        this.registerAction("bringForward", "@bring forward", "Layering", function () {
            ChangeZOrder.run(Selection.getSelection(), "forward");
        });
        this.registerAction("sendBackward", "@send backward", "Layering", function () {
            ChangeZOrder.run(Selection.getSelection(), "backward");
        });

        this.registerAction("moveLeft", "Left", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "l");
        });
        this.registerAction("moveRight", "Right", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "r");
        });
        this.registerAction("moveUp", "Up", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "u");
        });
        this.registerAction("moveDown", "Down", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "d");
        });
        this.registerAction("moveLeft10", "Left 10 pixels", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "l", 10);
        });
        this.registerAction("moveRight10", "Right 10 pixels", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "r", 10);
        });
        this.registerAction("moveUp10", "Up 10 pixels", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "u", 10);
        });
        this.registerAction("moveDown10", "Down 10 pixels", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "d", 10);
        });

        this.registerAction("moveLeft.1", "Left .1 pixels", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "l", .1);
        });
        this.registerAction("moveRight.1", "Right .1 pixels", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "r", .1);
        });
        this.registerAction("moveUp.1", "Up .1 pixels", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "u", .1);
        });
        this.registerAction("moveDown.1", "Down .1 pixels", "Positioning", function () {
            if (!moving) {
                startRepeatableAction(x => x.viewMatrix());
            }
            moving = true;
            Move.run(Selection.selectedElements(), "d", .1);
        });

        this.registerAction("moveFinished", "Move finished", "Positioning", function () {
            moving = false;
            let oldProps = endRepeatableAction();
            Selection.selectedElements().forEach((x, i) =>
                x.trackSetProps(x.selectProps(["m"]), { m: oldProps[i] }));
        });

        this.registerAction("pathUnion", "@path.union", "Combine Paths", function () {
            CombinePaths.run("union", Selection.getSelection());
        });

        this.registerAction("pathSubtract", "@path.join", "Combine Paths", function () {
            CombinePaths.run("xor", Selection.getSelection());
        });

        this.registerAction("pathIntersect", "@path.intersect", "Combine Paths", function () {
            CombinePaths.run("intersect", Selection.getSelection());
        });

        this.registerAction("pathDifference", "@path.difference", "Combine Paths", function () {
            CombinePaths.run("difference", Selection.getSelection());
        });

        this.registerAction("alignLeft", "Align left", "Align", function () {
            align("left", Selection.getSelection());
        });
        this.registerAction("alignRight", "Align right", "Align", function () {
            align("right", Selection.getSelection());
        });
        this.registerAction("alignTop", "Align top", "Align", function () {
            align("top", Selection.getSelection());
        });
        this.registerAction("alignBottom", "Align bottom", "Align", function () {
            align("bottom", Selection.getSelection());
        });
        this.registerAction("alignMiddle", "Align middle", "Align", function () {
            align("middle", Selection.getSelection());
        });
        this.registerAction("alignCenter", "Align center", "Align", function () {
            align("center", Selection.getSelection());
        });
        this.registerAction("distributeHorizontally", "Distribute horizontally", "Distribute", function () {
            align("distributeHorizontally", Selection.getSelection());
        });
        this.registerAction("distributeVertically", "Distribute vertically", "Distribute", function () {
            align("distributeVertically", Selection.getSelection());
        });

        this.registerAction("groupElements", "Group elements", "Group", function () {
            Group.run(Selection.getSelection(), GroupContainer);
        });

        this.registerAction("groupElementsVStack", "Group elements", "Group", function () {
            var b = Selection.selectedElement().getBoundingBox();
            Group.run(Selection.getSelection(), InteractiveContainer, {
                arrangeStrategy: ArrangeStrategies.VerticalStack,
                dropPositioning: DropPositioning.Vertical,
                m: Matrix.create().translate(b.x, b.y)
            });
        });

        this.registerAction("groupElementsHStack", "Group elements", "Group", function () {
            var b = Selection.selectedElement().getBoundingBox();
            Group.run(Selection.getSelection(), InteractiveContainer, {
                arrangeStrategy: ArrangeStrategies.HorizontalStack,
                dropPositioning: DropPositioning.Horizontal,
                m: Matrix.create().translate(b.x, b.y)
            });
        });

        this.registerAction("groupElementsCanvas", "Group elements", "Group", function () {
            Group.run(Selection.getSelection(), InteractiveContainer);
        });

        this.registerAction("isolateSelection", "Isolate selection", "Isolation", function () {
            Isolate.run(Selection.getSelection() as IIsolatable[]);
        });

        this.registerAction("ungroupElements", "Ungroup elements", "Ungroup", function () {
            let elements = Selection.elements as IContainer[];
            let children = [];
            elements.forEach(e => {
                children = children.concat(e.children);
                e.flatten();
            });
            Selection.makeSelection(children);

        });

        this.registerAction("groupInRepeater", "Repeate grid", "Repeater", function () {
            return GroupInRepeater.run(Selection.getSelection());
        });

        this.registerAction("ungroupRepeater", "Ungroup grid", "Repeater", function () {
            return UngroupRepeater.run(Selection.getSelection());
        });

        this.registerAction("lock", "Lock", "Lock", function () {
            Selection.lock();
        });

        this.registerAction("unlock", "Unlock", "Lock", function () {
            Selection.unlock();
        });

        this.registerAction("unlockAllOnArtboard", "Unlock all on page", "Lock", function () {
            let artboard = that.app.activePage.getActiveArtboard();
            let selection = [];
            artboard.applyVisitor(function (e) {
                if (e.locked()) {
                    e.locked(false);
                    selection.push(e);
                }
            });
            Selection.makeSelection(selection);
        });

        this.registerAction("swapColors", "Swap Colors", "Colors", function () {
            let selection = Selection.selectedElement() as IUIElement;
            if (!selection) {
                return null;
            }

            selection.each((e: IUIElement) => {
                let fill = e.fill();
                let stroke = e.stroke();
                e.fill(stroke);
                e.stroke(fill);
            })
        });


        this.registerAction("fontIncreaseSize", "Font increase size", "Font", function () {
            FontHelper.changeFontSize(Selection.selectedElements(), true, 1);
        });

        this.registerAction("fontIncreaseSize1", "Font increase size by 1 pt", "Font", function () {
            FontHelper.changeFontSize(Selection.selectedElements(), false, 1);
        });

        this.registerAction("fontDecreaseSize", "Font decrease size", "Font", function () {
            FontHelper.changeFontSize(Selection.selectedElements(), true, -1);
        });

        this.registerAction("fontDecreaseSize1", "Font decrease size by 1 pt", "Font", function () {
            FontHelper.changeFontSize(Selection.selectedElements(), false, -1);
        });

        this.registerAction("fontBold", "Font bold", "Font", function () {
            return FontHelper.toggleFontProperty(that.app, Selection.selectedElements(), "weight");
        });

        this.registerAction("fontItalic", "Font italic", "Font", function () {
            return FontHelper.toggleFontProperty(that.app, Selection.selectedElements(), "style");
        });

        this.registerAction("fontUnderline", "Font underline", "Font", function () {
            return FontHelper.toggleFontProperty(that.app, Selection.selectedElements(), "underline");
        });

        this.registerAction("selectAll", "Select all elements", "View", function () {
            Selection.selectAll();
        });

        this.registerAction("clearSelection", "Unselect all elements", "View", function () {
            Selection.clearSelection();
        });

        this.registerAction("zoomOut", "Zoom out", "Zoom", function () {
            Environment.view.zoomOutStep();
        });

        this.registerAction("zoomIn", "Zoom in", "Zoom", function () {
            Environment.view.zoomInStep();
        });

        this.registerAction("zoom100", "1:1", "Zoom", function () {
            Environment.view.zoom(1);

        });

        this.registerAction("zoom8:1", "8:1", "Zoom", function () {
            Environment.view.zoom(8);
        });

        this.registerAction("zoom4:1", "4:1", "Zoom", function () {
            Environment.view.zoom(4);
        });

        this.registerAction("zoom2:1", "2:1", "Zoom", function () {
            Environment.view.zoom(2);
        });

        this.registerAction("zoom1:2", "1:2", "Zoom", function () {
            Environment.view.zoom(0.5);
        });

        this.registerAction("zoom1:4", "1:4", "Zoom", function () {
            Environment.view.zoom(0.25);
        });

        this.registerAction("zoomFit", "Zoom to fit", "Zoom", function () {
            Environment.view.zoomToFit();
        });

        this.registerAction("zoomSelection", "Zoom selection", "Zoom", function () {
            let element = Selection.selectedElement() as IUIElement;
            element = element || (that.app.activePage.getActiveArtboard() as IUIElement);
            Environment.view.ensureScale(element);
            Environment.view.ensureVisible(element);
        });

        this.registerAction("pageCenter", "Page center", "Zoom", function () {
            Environment.view.scrollToCenter();
        });

        this.registerAction("refreshZoom", "", "Zoom", function () {
        });


        this.registerAction("newPage", "New page", "Navigation", function (options) {
            that.app.addNewPage(options);
        });

        this.registerAction("undo", "Undo", "Project actions", function () {
            CommandManager.undoPrevious();
        });

        this.registerAction("redo", "Redo", "Project actions", function () {
            CommandManager.redoNext();
        });

        // this.registerAction("newPagePortrait", "New portrait page", "New page", function () {
        //     that.app.project.addNewPage("portrait");
        // });

        // this.registerAction("newPageLandscape", "New landscape page", "New page", function () {
        //     that.app.project.addNewPage("landscape");
        // });

        this.registerAction("save", "Save", "Project actions", function () {
            if (that.app.serverless()) {
                return that.app.offlineModel.saveBackup(that.app);
            }
            return that.app.modelSyncProxy.change();
        });

        this.registerAction("transparentColor", "", "", function () {
        });

        this.registerAction("saveBackup", "Save backup", "Project actions", function () {
            return that.app.offlineModel.saveBackup(that.app);
        });

        this.registerAction("convertToPath", "Convert to Path", "Path", function () {
            return ConvertToPath.run(Selection.getSelection());
        });

        this.registerAction("pathFlatten", "Flatten path", "Path", function () {
            let elements = Selection.getSelection();
            for (let i = 0; i < elements.length; ++i) {
                elements[i].flatten();
            }
        });

        this.registerAction("groupWithMask", "Create mask", "Group", function () {
            let selection = Selection.getSelection();
            if (typeof selection[0].drawPath === 'function') {
                let group = Group.run(selection, GroupContainer);
                group.children[0].setProps({ clipMask: true });
            }
        });

        this.registerAction("cancel", "Cancel", "", function () {
        });

        this.registerAction("exitisolation", "Exit isolation", "", function () {
        });

        this.registerAction("toggleFrame", "@toggleFrame", "", function () {
            that.app.showFrames(!that.app.showFrames());
        });


        // this.registerAction("showNavigationPane", "Expand pane", "Navigation pane", function () {
        //     that.app.viewModel.navigationModel.expandAndFocusOnSearch();
        // });

        this.registerAction("enter", "Enter", "", function () {
        });
    }
    iterate(callback) {
        for (let name in this._actions) {
            callback(this._actions[name]);
        }
    }
    invokeAsync(actionName: string, callback?: (success: boolean, result?: any) => void): void {
        setTimeout(() => this.invoke(actionName, callback), 100);
    }

    invoke(actionName: string, callback?: (success: boolean, result?: any) => void): void {
        debug("Invoking %s", actionName);
        let that = this;
        let action = this._actions[actionName];

        if (!action) {
            throw "Unknown action " + actionName;
        }

        if (action.condition && !action.condition(Selection)) {
            return;
        }

        let e = { handled: false };
        this.notifyActionStart(actionName, e);
        if (e.handled) {
            return;
        }

        let res = action.callback(Selection);

        if (res) {
            if (res.then) {
                res.then(res => {
                    this.notifyActionCompleted(actionName, true, res);
                    if (callback) {
                        callback(true, res);
                    }
                });
                res.catch(e => {
                    this.notifyActionCompleted(actionName, false, e);
                    if (callback) {
                        callback(false, e);
                    }
                });
            }
        }
        else {
            this.notifyActionCompleted(actionName, true);
        }

        Invalidate.request();
    }
    getAction(name) {
        return this._actions[name];
    }
    hasAction(name) {
        return this._actions.hasOwnProperty(name);
    }
    getActionFullDescription(name, translate) {
        let action = this._actions[name];
        let shortcut = this.app.shortcutManager.getActionHotkeyDisplayLabel(name);

        if (shortcut) {
            if (translate) {
                return translate(action.name) + " (" + shortcut + ")";
            }
        }

        if (translate) {
            return translate(action.name);

        }

        return action.name;
    }
    getActionDescription(name) {
        let action = this._actions[name];
        if (action) {
            return action.name;
        }
    }
    subscribe(action, handler) {
        let event = this._events[action];
        if (!event) {
            event = EventHelper.createEvent();
            this._events[action] = event;
        }
        return event.bind.apply(event, Array.prototype.slice.call(arguments, 1));
    }

    unsubscribe(action, handler) {
        let event = this._events[action];
        if (event) {
            event.unbind.apply(event, Array.prototype.slice.call(arguments, 1));
        }
    }

    subscribeToActionStart(action, handler) {
        let event = this._actionStartEvents[action];
        if (!event) {
            event = EventHelper.createEvent();
            this._actionStartEvents[action] = event;
        }
        return event.bind.apply(event, Array.prototype.slice.call(arguments, 1));
    }
    showActions(config) {
        this._visibleActionsConfig = config;
    }
    getVisibleActionsConfig() {
        return this._visibleActionsConfig;
    }
}