import CommandManager from "../framework/commands/CommandManager";
import ChangeZOrder from "../commands/ChangeZOrder";
import Delete from "../commands/Delete";
import Move from "../commands/Move";
import Workspace from "../Workspace";
import Invalidate from "../framework/Invalidate";
import FontHelper from "../framework/FontHelper";
import Brush from "../framework/Brush";
import Matrix from "math/matrix";

import clipboard from "../framework/Clipboard";
import PropertyTracker from "../framework/PropertyTracker";
import Duplicate from "../commands/Duplicate";
import ConvertToPath from "../commands/ConvertToPath";
import Isolate from "../commands/Isolate";
import { align } from "../framework/Aligner";
import CombinePaths from "../commands/CombinePaths";
import GroupContainer from "../framework/GroupContainer";
import InteractiveContainer from "../framework/InteractiveContainer";
import Selection from "../framework/SelectionModel";
import EventHelper from "../framework/EventHelper";
import { IActionManager, IAction, IApp, IUIElement, IEvent, IContainer, IIsolatable, IShortcutManager, ISelection, IView, IController } from "carbon-core";
import { ArrangeStrategies, DropPositioning } from "../framework/Defs";
import Rect from "../math/rect";
import CoreIntl from "../CoreIntl";
import { ResolvedPromise } from "../framework/ObjectPool";
import { TextAlignCommand } from "../commands/TextAlign";
import Path from "../framework/Path";
import CompoundPath from "../framework/CompoundPath";
import Artboard from "../framework/Artboard";

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

export default class ActionManager implements IActionManager {
    app: IApp;
    private _actions: {
        [key: string]: IAction
    };

    private _actionsWithConditions: {
        [key: string]: IAction
    }

    private view: IView;
    private controller: IController;

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

    notifyActionCompleted(actionName: string, result?: any, ret?: any, arg?: any) {
        this.actionPerformed.raise(actionName/*, result, ret*/);
        let event = this._events[actionName];
        if (event) {
            event.raise(actionName, result, ret, arg);
        }
    }


    registerAction(name: string, description: string, category: string, callback: (selection?: any, arg?: any) => void, condition?: (selection: ISelection) => boolean): IAction {
        let action: IAction = {
            id: name,
            name: description,
            callback: callback,
            condition: condition
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

    attach(view: IView, controller: IController) {
        this.view = view;
        this.controller = controller;
    }

    detach() {
        this.view = null;
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
        }, selection => {
            return selection.elements.length && !selection.elements.some(x => x instanceof Artboard)
        });
        this.registerAction("sendToBack", "@send to back", "Layering", function () {
            ChangeZOrder.run(that.app, Selection.getSelection(), "back");
        }, selection => {
            return selection.elements.length && !selection.elements.some(x => x instanceof Artboard)
        });
        this.registerAction("bringForward", "@bring forward", "Layering", function () {
            ChangeZOrder.run(that.app, Selection.getSelection(), "forward");
        }, selection => {
            return selection.elements.length && !selection.elements.some(x => x instanceof Artboard)
        });
        this.registerAction("sendBackward", "@send backward", "Layering", function () {
            ChangeZOrder.run(that.app, Selection.getSelection(), "backward");
        }, selection => {
            return selection.elements.length && !selection.elements.some(x => x instanceof Artboard)
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
        }, selection => canDoPathOperations(selection.elements));

        this.registerAction("pathSubtract", "@path.join", "Combine Paths", function () {
            CombinePaths.run("xor", Selection.getSelection());
        }, selection => canDoPathOperations(selection.elements));

        this.registerAction("pathIntersect", "@path.intersect", "Combine Paths", function () {
            CombinePaths.run("intersect", Selection.getSelection());
        }, selection => canDoPathOperations(selection.elements));

        this.registerAction("pathDifference", "@path.difference", "Combine Paths", function () {
            CombinePaths.run("difference", Selection.getSelection());
        }, selection => canDoPathOperations(selection.elements));

        this.registerAction("alignLeft", "Align left", "Align", function () {
            align("left", Selection.getSelection());
        }, selection => !!selection.elements.length);
        this.registerAction("alignRight", "Align right", "Align", function () {
            align("right", Selection.getSelection());
        }, selection => !!selection.elements.length);
        this.registerAction("alignTop", "Align top", "Align", function () {
            align("top", Selection.getSelection());
        }, selection => !!selection.elements.length);
        this.registerAction("alignBottom", "Align bottom", "Align", function () {
            align("bottom", Selection.getSelection());
        }, selection => !!selection.elements.length);
        this.registerAction("alignMiddle", "Align middle", "Align", function () {
            align("middle", Selection.getSelection());
        }, selection => !!selection.elements.length);
        this.registerAction("alignCenter", "Align center", "Align", function () {
            align("center", Selection.getSelection());
        }, selection => !!selection.elements.length);
        this.registerAction("distributeHorizontally", "Distribute horizontally", "Distribute", function () {
            align("distributeHorizontally", Selection.getSelection());
        }, selection => !!selection.elements.length);
        this.registerAction("distributeVertically", "Distribute vertically", "Distribute", function () {
            align("distributeVertically", Selection.getSelection());
        }, selection => !!selection.elements.length);

        this.registerAction("lock", "Lock", "Lock", function () {
            Selection.lock();
        }, selection => !!selection.elements.length);

        this.registerAction("unlock", "Unlock", "Lock", function () {
            Selection.unlock();
        }, selection => !!selection.elements.length);

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
                let fill = e.fill;
                let stroke = e.stroke;
                e.fill = (stroke);
                e.stroke = (fill);
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
            if (!that.view) {
                return;
            }

            that.view.zoomOutStep();
        });

        this.registerAction("zoomIn", "Zoom in", "Zoom", function () {
            if (!that.view) {
                return;
            }

            that.view.zoomInStep();
        });

        this.registerAction("zoom100", "1:1", "Zoom", function () {
            if (!that.view) {
                return;
            }

            that.view.zoom(1);
        });

        this.registerAction("zoom", "zoom", "Zoom", function (selection, value) {
            if (!that.view) {
                return;
            }

            that.view.zoom(value);
        });

        this.registerAction("zoom8:1", "8:1", "Zoom", function () {
            if (!that.view) {
                return;
            }

            that.view.zoom(8);
        });

        this.registerAction("zoom4:1", "4:1", "Zoom", function () {
            if (!that.view) {
                return;
            }

            that.view.zoom(4);
        });

        this.registerAction("zoom2:1", "2:1", "Zoom", function () {
            if (!that.view) {
                return;
            }

            that.view.zoom(2);
        });

        this.registerAction("zoom1:2", "1:2", "Zoom", function () {
            if (!that.view) {
                return;
            }

            that.view.zoom(0.5);
        });

        this.registerAction("zoom1:4", "1:4", "Zoom", function () {
            if (!that.view) {
                return;
            }

            that.view.zoom(0.25);
        });

        this.registerAction("zoomFit", "Zoom to fit", "Zoom", function () {
            if (!that.view) {
                return;
            }

            that.view.zoomToFit();
        });

        this.registerAction("zoomSelection", "Zoom selection", "Zoom", function () {
            if (!that.view) {
                return;
            }

            let element = Selection.selectedElement() as IUIElement;
            element = element || (that.app.activePage.getActiveArtboard() as IUIElement);
            that.view.ensureScale([element]);
            that.view.ensureCentered([element]);
        });

        this.registerAction("pageCenter", "Page center", "Zoom", function () {
            if (!that.view) {
                return;
            }

            that.view.scrollToCenter();
        });

        this.registerAction("refreshZoom", "", "Zoom", function () {
        });


        this.registerAction("newPage", "New page", "Navigation", function (options) {
            that.app.addNewPage(options);
        });

        this.registerAction("undo", "Undo", "Project actions", function () {
            if (!that.controller) {
                return;
            }
            if (that.controller.isInlineEditMode) {
                that.controller.inlineEditor.undo();
            }
            else {
                CommandManager.undoPrevious();
            }
        });

        this.registerAction("redo", "Redo", "Project actions", function () {
            if (!that.controller) {
                return;
            }

            if (that.controller.isInlineEditMode) {
                that.controller.inlineEditor.redo();
            }
            else {
                CommandManager.redoNext();
            }
        });

        this.registerAction("undoViewport", "Undo viewport position", "Project actions", function () {

        });

        this.registerAction("redoViewport", "Redo viewport position", "Project actions", function () {

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
        }, selection => canConvertToPath(selection.elements));

        this.registerAction("pathFlatten", "Flatten path", "Path", function () {
            let elements = Selection.getSelection();
            for (let i = 0; i < elements.length; ++i) {
                elements[i].flatten();
            }
        }, selection => canFlattenPath(selection.elements));

        this.registerAction("cancel", "Cancel", "", function () {
        });

        this.registerAction("exitisolation", "Exit isolation", "", function () {
        });

        this.registerAction("changeViewState", "system", "", function (selection, { newState, silent }) {
            if (!that.view) {
                return;
            }

            that.view.changeViewState(newState, silent);
        });
        this.registerAction("ensureVisibleRect", "system", "", function (selection, rect) {
            if (!that.view) {
                return;
            }

            that.view.ensureVisibleRect(rect);
        });
        this.registerAction("fitToViewportIfNeeded", "system", "", function (selection, { element, origin, mode }) {
            if (!that.view) {
                return;
            }

            that.view.fitToViewportIfNeeded(element, origin, mode);
        });
        this.registerAction("highlightTarget", "system", "", function (selection, target) {
            if (!that.view) {
                return;
            }
            that.view._highlightTarget = target;
            Invalidate.requestInteractionOnly();

        });
        this.registerAction("ensureScaleAndCentered", "system", "", function (selection, target) {
            if (!that.view) {
                return;
            }

            that.view.ensureScale(target);
            that.view.ensureCentered(target);
        });
        this.registerAction("resetCurrentTool", "system", "", function (selection, target) {
            if (!that.controller) {
                return;
            }

            that.controller.resetCurrentTool();
        });

        this.registerAction("onArtboardChanged", "system", "", function (selection, data) {
            if (!that.controller) {
                return;
            }
            that.controller.onArtboardChanged.raise(data.newArtboard, data.oldArtboard);
        });

        this.registerAction("restoreWorkspaceState", "system", "", function (selection, target) {
            if (!that.view) {
                return;
            }

            try {
                var data = localStorage.getItem("workspace:" + this.id);
                if (!data) {
                    return;
                }

                var state = JSON.parse(data);
                if (!state) {
                    return;
                }

                var page = that.app.pages.find(x => x.id === state.pageId);
                if (page) {
                    that.app.setActivePage(page);
                }

                that.view.scale(state.scale);
                that.view.scrollX = (state.scrollX);
                that.view.scrollY = (state.scrollY);

                if (page && state.pageState) {
                    page.restoreWorkspaceState(state.pageState);
                }

                if (state.selection.length) {
                    var elements = that.app.activePage.findAllNodesDepthFirst<IUIElement>(x => state.selection.indexOf(x.id) !== -1);
                    if (elements.length) {
                        Selection.makeSelection(elements);
                    }
                }
            }
            catch (e) {
                //ignore
            }
            finally {
                this._lastRelayoutView = that.view.viewState;
            }
        });

        this.registerAction("saveWorkspaceState", "system", "", function () {
            if (!that.view) {
                return;
            }

            var state = {
                scale: that.view.scale(),
                scrollX: that.view.scrollX,
                scrollY: that.view.scrollY,
                pageId: that.app.activePage.id,
                pageState: that.app.activePage.saveWorkspaceState(),
                selection: Selection.selectedElements().map(x => x.id)
            };
            localStorage.setItem("workspace:" + this.id, JSON.stringify(state));
        });

        this.registerAction("toggleFrame", "@toggleFrame", "", function () {
            that.app.showFrames(!that.app.showFrames());
        });

        this.registerAction("enter", "Enter", "", function () {
        });

        this.registerAction("copy", "", "", function () {
            clipboard.onCopy();
        }, selection => selection && selection.elements.length > 0);

        this.registerAction("paste", "", "", function () {
            clipboard.onPaste();
        });

        this.registerAction("cut", "", "", function () {
            clipboard.onCut();
        }, selection => selection && selection.elements.length > 0);

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

    isEnabled(actionName: string, selection: ISelection) {
        var action = this._actions[actionName];
        if (!action) {
            return false;
        }

        if (!action.condition) {
            return true;
        }

        return action.condition(selection);
    }

    invoke(actionName: string, actionArg?: any): Promise<void> {
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
                        this.notifyActionCompleted(actionName, false, e, actionArg);
                        throw e;
                    });
            }
            else {
                this.notifyActionCompleted(actionName, true, null, actionArg);
            }

            Invalidate.request();

            return res || ResolvedPromise;
        }
        catch (e) {
            Workspace.reportFatalErrorAndRethrow(e);
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
            return null;
        }

        let hotkey = this.shortcutManager.getActionHotkey(actionId);
        let label = CoreIntl.label(action.name);
        if (hotkey) {
            label += " (" + hotkey + ")";
        }
        return label;
    }
}