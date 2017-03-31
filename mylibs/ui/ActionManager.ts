import Command from "../framework/commands/Command";
import CommandManager from "../framework/commands/CommandManager";
import CompositeCommand from "../framework/commands/CompositeCommand";
import ChangeZOrder from "../commands/ChangeZOrder";
import Delete from "../commands/Delete";
import Move from "../commands/Move";
import Environment from "../environment";
import Invalidate from "../framework/Invalidate";
import FontHelper from "../framework/FontHelper";
import Brush from "../framework/Brush";
import ArrangeStrategy from "../framework/ArrangeStrategy";
import clipboard from "../framework/Clipboard";
import PropertyTracker from "../framework/PropertyTracker";
import Duplicate from "../commands/Duplicate";
// import ChangeColumnType from "../commands/ChangeColumnType";
import ConvertToPath from "../commands/ConvertToPath";
// import DeleteCellGroup from "../commands/DeleteCellGroup";
import Group from "../commands/Group";
import Isolate from "../commands/Isolate";
import SelectionToStencil from "../commands/SelectionToStencil";
import Ungroup from "../commands/Ungroup";
// import InsertColumn from "../commands/InsertColumn";
// import InsertRow from "../commands/InsertRow";
// import ResizeColumn from "../commands/ResizeColumn";
// import ResizeRow from "../commands/ResizeRow";
import platform from "../platform/Platform";
import CombinePaths from "../commands/CombinePaths";
import GroupContainer from "../framework/GroupContainer";
import GroupInRepeater from "../framework/repeater/GroupInRepeater";
import UngroupRepeater from "../framework/repeater/UngroupRepeater";
import {align} from "../framework/Aligner";
import Selection from "../framework/SelectionModel";
import EventHelper from "../framework/EventHelper";
import {IActionManager, IAction, IApp, IUIElement} from "carbon-core";


var debug = require("DebugUtil")("carb:actionManager");

var checkConditions = function () {
    for (var name in this._actions) {
        var action = this._actions[name];
        if (action.condition) {
            action.enabled(action.condition());
        }
    }
};

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

var actionStartProps;
function startRepeatableAction(oldPropsSelector) {
    PropertyTracker.suspend();
    actionStartProps = Selection.selectComposite().map(x => oldPropsSelector(x));
    Selection.hideFrame();
}
function endRepeatableAction() {
    var flushNeeded = PropertyTracker.resume();
    if (flushNeeded) {
        setTimeout(() => {
            PropertyTracker.flush();
        }, 0);
    }
    return actionStartProps;
}

class Action implements IAction
{
    condition:boolean;
    private _enabled:boolean = true;

    constructor(public category:string, public name:string, public description:string, public callback:(options?: any)=>any|void) {

    }

    setCondition (condition) {
        this.condition = condition;
        return this;
    }

    enabled(value?:boolean) {
        if(value !== undefined) {
            this._enabled = value;
        }

        return this._enabled;
    }

}

export default class ActionManager implements IActionManager {
    app: IApp;
    private _actions: {
        [key:string]:IAction
    };

    private _events: any[];
    private _categoryEvents: any[];
    private _actionStartEvents: any[];
    private actionPerformed: any;
    private _visibleActionsConfig: any;

    constructor(app: IApp) {
        this._actions = {};
        this._events = [];
        this._categoryEvents = [];
        this._actionStartEvents = [];
        this.actionPerformed = EventHelper.createEvent();
        this.app = app;

        Selection.onElementSelected.bind(this, checkConditions);
    }

    notifyActionStart(actionName, e) {
        var event = this._actionStartEvents[actionName];
        if (event) {
            event.raise(actionName, e);
        }
    }

    notifyActionCompleted(actionName:string, result?:any, ret?:any) {
        this.actionPerformed.raise(actionName, result, ret);
        var event = this._events[actionName];
        if (event) {
            event.raise(actionName, result, ret);
        }
        var action = this._actions[actionName];
        if (action && action.category) {
            event = this._categoryEvents[action.category];
            if (event) {
                event.raise(actionName, result, ret);
            }
        }
    }


    registerAction(name:string, description:string, category:string, callback:(option?:any)=>void):IAction {
        var action : IAction = new Action(category, name, description, callback );


        this._actions[name] = action;

        formatActionDescription.call(this, action);

        return action;
    }

    registerActions() {
        var that = this;
        var selectionMade = function () {
            var selection = Selection.getSelection();
            return selection && selection.length > 0;
        };
        var moving = null;

        // this.registerAction("copy", "@copy", "Editing", function () {
        //     return new AllCommands.Copy(Selection.getSelection());
        // }).setCondition(function () {
        //     return selectionMade();
        // });
        // this.registerAction("paste", "@paste", "Editing", function () {
        //     return new AllCommands.Paste(that.app.activePage);
        // }).setCondition(function () {
        //     return clipboard.hasValue();
        // });

        // this.registerAction("cut", "@cut", "Editing", function () {
        //     var deleteCommand;
        //     var selection = Selection.getSelection();
        //     if (selection.length === 1) {
        //         deleteCommand = selection[0].constructDeleteCommand();
        //     }
        //     else {
        //         deleteCommand = new CompositeCommand(selection.map(x => x.constructDeleteCommand()));
        //     }
        //     var copyCommand = new AllCommands.Copy(selection);
        //     return new CompositeCommand([copyCommand, deleteCommand]);
        // }).setCondition(function () {
        //     return selectionMade();
        // });

        this.registerAction("delete", "@delete", "Editing", function () {
            Delete.run(Selection.getSelection());
        }).setCondition(function () {
            return selectionMade();
        });

        this.registerAction("duplicate", "@duplicate", "Editing", function () {
            return Duplicate.run(Selection.getSelection());
        }).setCondition(function () {
            return selectionMade();
        });

        this.registerAction("bringToFront", "@bring to front", "Layering", function () {
            return new ChangeZOrder(Selection.getSelection(), "front");
        });
        this.registerAction("sendToBack", "@send to back", "Layering", function () {
            return new ChangeZOrder(Selection.getSelection(), "back");
        });
        this.registerAction("bringForward", "@bring forward", "Layering", function () {
            return new ChangeZOrder(Selection.getSelection(), "forward");
        });
        this.registerAction("sendBackward", "@send backward", "Layering", function () {
            return new ChangeZOrder(Selection.getSelection(), "backward");
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
            var oldProps = endRepeatableAction();
            Selection.selectedElements().forEach((x, i) =>
                x.trackSetProps(x.selectProps(["m"]), { m: oldProps[i] }));
        });

        this.registerAction("pathUnion", "@path.union", "Combine Paths", function () {
            return new CombinePaths("union", Selection.getSelection());
        });

        this.registerAction("pathSubtract", "@path.join", "Combine Paths", function () {
            return new CombinePaths("xor", Selection.getSelection());
        });

        this.registerAction("pathIntersect", "@path.intersect", "Combine Paths", function () {
            return new CombinePaths("intersect", Selection.getSelection());
        });

        this.registerAction("pathDifference", "@path.difference", "Combine Paths", function () {
            return new CombinePaths("difference", Selection.getSelection());
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

        this.registerAction("isolateSelection", "Isolate selection", "Isolation", function () {
            Isolate.run(Selection.getSelection());
        });

        this.registerAction("createStencilFromSelection", "Create stencil", "Group", function () {
            SelectionToStencil.run(Selection.getSelection());
        });

        this.registerAction("ungroupElements", "Ungroup elements", "Ungroup", function () {
            Ungroup.run(Selection.getSelection());
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
            var artboard = that.app.activePage.getActiveArtboard();
            var selection = [];
            artboard.applyVisitor(function (e) {
                if (e.locked()) {
                    e.locked(false);
                    selection.push(e);
                }
            });
            Selection.makeSelection(selection);
        });

        this.registerAction("swapColors", "Swap Colors", "Colors", function () {
            var selection = Selection.selectedElement() as IUIElement;
            if (!selection) {
                return null;
            }

            selection.each((e:IUIElement) => {
                var fill = e.fill();
                var stroke = e.stroke();
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
            Environment.view.zoom(Environment.view.scale() - 0.1);
        });

        this.registerAction("zoomIn", "Zoom in", "Zoom", function () {
            Environment.view.zoom(Environment.view.scale() + 0.1);
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
            var element = Selection.selectedElement() as IUIElement;
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
            if (that.app.serverless()){
                return that.app.offlineModel.saveBackup(that.app);
            }
            return that.app.modelSyncProxy.change();
        });

        this.registerAction("saveBackup", "Save backup", "Project actions", function () {
            return that.app.offlineModel.saveBackup(that.app);
        });

        // this.registerAction("forceSave", "Force save", "Debug", function () {
        //     new DesignerProxy().post("/api/projectData/save", {
        //         id: that.app.id(),
        //         name: that.app.name(),
        //         projectType: that.app.projectType(),
        //         folderId: sketch.params.folderId,
        //         data: JSON.stringify(that.app.toJSON())
        //     }).then(function () {
        //         alert("Successfully saved!");
        //     })
        // });

        this.registerAction("convertToPath", "Convert to Path", "Path", function () {
            return ConvertToPath.run(Selection.getSelection());
        });

        this.registerAction("pathFlatten", "Flatten path", "Path", function () {
            var elements = Selection.getSelection();
            for (var i = 0; i < elements.length; ++i) {
                elements[i].flatten();
            }
        });

        this.registerAction("groupWithMask", "Create mask", "Group", function () {
            var selection = Selection.getSelection();
            if (typeof selection[0].drawPath == 'function') {
                var group = Group.run(selection, GroupContainer);
                group.children[0].setProps({ clipMask: true });
            }
        });

       this.registerAction("cancel", "Cancel", "", function () {
        });

        this.registerAction("toggleFrame", "@toggleFrame", "", function () {
            that.app.showFrames(!that.app.showFrames());
        });


        // this.registerAction("showNavigationPane", "Expand pane", "Navigation pane", function () {
        //     that.app.viewModel.navigationModel.expandAndFocusOnSearch();
        // });

        this.registerAction("enter", "Enter", "", function () {
        });

        this.actionPerformed.bind(this, checkConditions);
        CommandManager.onCommandExecuted.bind(this, checkConditions);
        CommandManager.onCommandRolledBack.bind(this, checkConditions);

        checkConditions.call(this);
    }
    iterate(callback) {
        for (var name in this._actions) {
            callback(this._actions[name]);
        }
    }
    invokeAsync(actionName:string, callback?:(success:boolean, result?:any)=>void):void {
        setTimeout(() => this.invoke(actionName, callback), 100);
    }

    invoke(actionName:string, callback?:(success:boolean, result?:any)=>void):void {
        debug("Invoking %s", actionName);
        var that = this;
        var action = this._actions[actionName];

        if (!action) {
            throw "Unknown action " + actionName;
        }
        if (!action.enabled()) {
            return;
        }

        var e = { handled: false };
        this.notifyActionStart(actionName, e);
        if (e.handled) {
            return;
        }

        var cmd = action.callback();

        if (cmd) {
            if (cmd instanceof Command) {
                CommandManager.execute(cmd);
                this.notifyActionCompleted(actionName, true);
                if (callback) {
                    callback(true);
                }
            }
            else if (cmd.then) {
                cmd.then(res => {
                    this.notifyActionCompleted(actionName, true, res);
                    if (callback) {
                        callback(true, res);
                    }
                });
                cmd.catch(e => {
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
    getActionsInCategory(category) {
        var result = [];
        this.iterate(function (action) {
            if (action.category === category) {
                result.push(action);
            }
        });
        return result;
    }
    getAction(name) {
        return this._actions[name];
    }
    getActionFullDescription(name, translate) {
        var action = this._actions[name];
        var shortcut = this.app.shortcutManager.getActionHotkeyDisplayLabel(name);

        if (shortcut) {
            if (translate) {
                return translate(action.description) + " (" + shortcut + ")";
            }
        }

        if (translate) {
            return translate(action.description);
        }

        return action.description;
    }
    getActionDescription(name) {
        var action = this._actions[name];
        if (action) {
            return action.description;
        }
    }
    subscribe(action, handler) {
        var event = this._events[action];
        if (!event) {
            event = EventHelper.createEvent();
            this._events[action] = event;
        }
        return event.bind.apply(event, Array.prototype.slice.call(arguments, 1));
    }
    unsubscribe(action, handler) {
        var event = this._events[action];
        if (event) {
            event.unbind.apply(event, Array.prototype.slice.call(arguments, 1));
        }
    }

    subscribeToCategory(category, handler) {
        var event = this._categoryEvents[category];
        if (!event) {
            event = EventHelper.createEvent();
            this._categoryEvents[category] = event;
        }
        return event.bind.apply(event, Array.prototype.slice.call(arguments, 1));
    }

    unsubscribeFromCategory(category, handler) {
        var event = this._categoryEvents[category];
        if (event) {
            event.unbind.apply(event, Array.prototype.slice.call(arguments, 1));
        }
    }
    subscribeToActionStart(action, handler) {
        var event = this._actionStartEvents[action];
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