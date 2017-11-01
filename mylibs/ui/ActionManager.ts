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
import Selection from "../framework/SelectionModel";
import EventHelper from "../framework/EventHelper";
import { IActionManager, IAction, IApp, IUIElement, IEvent, IContainer, IIsolatable, IShortcutManager } from "carbon-core";
import { ArrangeStrategies, DropPositioning } from "../framework/Defs";
import Rect from "../math/rect";
import { viewStateStack } from "../framework/ViewStateStack";
import CoreIntl from "../CoreIntl";
import { ResolvedPromise } from "../framework/ObjectPool";
import { TextAlignCommand } from "../commands/TextAlign";

const debug = require("DebugUtil")("carb:actionManager");

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

    constructor(app: IApp, public shortcutManager: IShortcutManager) {
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


    registerAction(name: string, description: string, category: string, callback: (selection?: any, arg?: string) => void): IAction {
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
            ChangeZOrder.run(that.app, Selection.getSelection(), "front");
        });
        this.registerAction("sendToBack", "@send to back", "Layering", function () {
            ChangeZOrder.run(that.app, Selection.getSelection(), "back");
        });
        this.registerAction("bringForward", "@bring forward", "Layering", function () {
            ChangeZOrder.run(that.app, Selection.getSelection(), "forward");
        });
        this.registerAction("sendBackward", "@send backward", "Layering", function () {
            ChangeZOrder.run(that.app, Selection.getSelection(), "backward");
        });

        this.registerAction("textAlignLeft", "@text.alignLeft", "Text", function () {
            TextAlignCommand.run(that.app, Selection.getSelection(), "left");
        });
        this.registerAction("textAlignCenter", "@text.alignCenter", "Text", function () {
            TextAlignCommand.run(that.app, Selection.getSelection(), "center");
        });
        this.registerAction("textAlignRight", "@text.alignRight", "Text", function () {
            TextAlignCommand.run(that.app, Selection.getSelection(), "right");
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
            Environment.view.ensureScale([element]);
            Environment.view.ensureCentered([element]);
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
            if (Environment.controller.isInlineEditMode) {
                Environment.controller.inlineEditor.undo();
            }
            else {
                CommandManager.undoPrevious();
            }
        });

        this.registerAction("redo", "Redo", "Project actions", function () {
            if (Environment.controller.isInlineEditMode) {
                Environment.controller.inlineEditor.redo();
            }
            else {
                CommandManager.redoNext();
            }
        });

        this.registerAction("undoViewport", "Undo viewport position", "Project actions", function () {
            viewStateStack.undo();
        });

        this.registerAction("redoViewport", "Redo viewport position", "Project actions", function () {
            viewStateStack.redo();
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

        this.registerAction("cancel", "Cancel", "", function () {
        });

        this.registerAction("exitisolation", "Exit isolation", "", function () {
        });

        this.registerAction("toggleFrame", "@toggleFrame", "", function () {
            that.app.showFrames(!that.app.showFrames());
        });


        this.registerAction("enter", "Enter", "", function () {
        });

        this.registerAction("copy", "", "", function () {
            clipboard.onCopy();
        });
        this.registerAction("paste", "", "", function () {
            clipboard.onPaste();
        });
        this.registerAction("cut", "", "", function () {
            clipboard.onCut();
        });

        this.registerAction("selectElement", "", "", function (selection, id: string) {
            let element = that.app.activePage.findNodeByIdBreadthFirst(id);
            if (element) {
                Selection.makeSelection([element]);
            }
        });
    }
    iterate(callback) {
        for (let name in this._actions) {
            callback(this._actions[name]);
        }
    }

    invoke(actionName: string, actionArg?: string): Promise<void> {
        try {
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

            let res = action.callback(Selection, actionArg);

            if (res && res.then) {
                res = res.then(() => this.notifyActionCompleted(actionName, true, res))
                    .catch(e => {
                        this.notifyActionCompleted(actionName, false, e);
                        throw e;
                    });
            }
            else {
                this.notifyActionCompleted(actionName, true);
            }

            Invalidate.request();

            return res || ResolvedPromise;
        }
        catch (e) {
            Environment.reportFatalErrorAndRethrow(e);
        }
    }
    getAction(name) {
        return this._actions[name];
    }
    hasAction(name) {
        return this._actions.hasOwnProperty(name);
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

    getActionLabel(actionId: string) {
        let action = this.getAction(actionId);
        if (!action) {
            throw new Error("Unknown action " + actionId);
        }
        let hotkey = this.shortcutManager.getActionHotkey(actionId);
        let label = CoreIntl.label(action.name);
        if (hotkey) {
            label += " (" + hotkey + ")";
        }
        return label;
    }
}