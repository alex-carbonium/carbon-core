import Command from "../framework/commands/Command";
import CompositeCommand from "../framework/commands/CompositeCommand";
import ChangeZOrder from "../commands/ChangeZOrder";
import Environment from "environment";
import Invalidate from "framework/Invalidate";
import FontHelper from "../framework/FontHelper";

define(function (require) {
    var clipboard = require("framework/Clipboard");
    var PropertyTracker = require("framework/PropertyTracker");
    var Duplicate = require("commands/Duplicate");
    var ChangeColumnType = require("commands/ChangeColumnType");
    var ConvertToPath = require("commands/ConvertToPath");
    var DeleteCellGroup = require("commands/DeleteCellGroup");
    var Group = require("commands/Group");
    var Ungroup = require("commands/Ungroup");
    var InsertColumn = require("commands/InsertColumn");
    var InsertRow = require("commands/InsertRow");
    var ResizeColumn = require("commands/ResizeColumn");
    var ResizeRow = require("commands/ResizeRow");
    var platform = require("platform/Platform");
    var CombinePaths = require("commands/CombinePaths");
    var AllCommands = require("commands/AllCommands");
    var debug = require("DebugUtil")("carb:actionManager");
    var GroupContainer = require("framework/GroupContainer");
    var GroupInRepeater = require("framework/repeater/GroupInRepeater");
    var Align = require("commands/Align");
    var Selection = require("framework/SelectionModel");

    var fwk = sketch.framework;
    var ui = sketch.ui;

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
                return platform.getActionShortcutDisplayLabel(this.name);
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
    function startRepeatableAction(oldPropsSelector){
        PropertyTracker.suspend();
        actionStartProps = Selection.selectComposite().map(x => oldPropsSelector(x));
    }
    function endRepeatableAction(){
        var flushNeeded = PropertyTracker.resume();
        if (flushNeeded){
            setTimeout(() => PropertyTracker.flush(), 0);
        }
        return actionStartProps;
    }


    var ActionManager = klass({
        notifyActionStart: function (actionName) {
            var event = this._actionStartEvents[actionName];
            if (event) {
                event.raise(actionName);
            }
        },
        notifyActionCompleted: function (actionName, result, ret) {
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
        },
        _constructor: function () {
            this._actions = {};
            this._events = [];
            this._categoryEvents = [];
            this._actionStartEvents = [];
            this.actionPerformed = fwk.EventHelper.createEvent();
        },
        registerAction: function (name, description, category, callback, image) {
            var action = {category: category, name: name, description: description, callback: callback, image: image};

            action.setCondition = function (condition) {
                action.condition = condition;
                return action;
            };
            //TODO: remove or fix without ko
            action.enabled = function () {
                return true
            };
            this._actions[name] = action;

            formatActionDescription.call(this, action);

            return action;
        },
        registerActions: function () {
            var that = this;
            var selectionMade = function () {
                var selection = Selection.getSelection();
                return selection && selection.length > 0;
            };
            var currentMove = null;

            this.registerAction("copy", "Copy", "Editing", function () {
                return new AllCommands.Copy(Selection.getSelection());
            }, "ui-copy").setCondition(function () {
                return selectionMade();
            });
            this.registerAction("paste", "Paste", "Editing", function () {
                return new AllCommands.Paste(that.app.activePage);
            }, "ui-paste").setCondition(function () {
                return clipboard.hasValue();
            });
            this.registerAction("cut", "Cut", "Editing", function () {
                var deleteCommand;
                var selection = Selection.getSelection();
                if (selection.length === 1) {
                    deleteCommand = selection[0].constructDeleteCommand();
                }
                else {
                    deleteCommand = new CompositeCommand(selection.map(x => x.constructDeleteCommand()));
                }
                var copyCommand = new AllCommands.Copy(selection);
                return new CompositeCommand([copyCommand, deleteCommand]);
            }, "ui-cut").setCondition(function () {
                return selectionMade();
            });
            this.registerAction("delete", "Delete", "Editing", function () {
                var selection = Selection.getSelection();
                if (selection[0].deleteCommandOverride) {
                    var ctor = selection[0].deleteCommandOverride();
                    return new ctor(that.app, that.app.activePage, selection);
                }
                if (selection.length === 1) {
                    return selection[0].constructDeleteCommand();
                }
                return new CompositeCommand(selection.map(x => x.constructDeleteCommand()));
            }, "ui-delete").setCondition(function () {
                return selectionMade();
            });

            this.registerAction("duplicateAndMoveRight", "duplicateAndMoveRight", "", function () {
                return Duplicate.createWithMove(Selection.getSelection(), "right");
            }, "ui-duplicate").setCondition(function () {
                return selectionMade();
            });

            this.registerAction("duplicateAndMoveLeft", "duplicateAndMoveLeft", "", function () {
                return Duplicate.createWithMove(Selection.getSelection(), "left");
            }, "ui-duplicate").setCondition(function () {
                return selectionMade();
            });

            this.registerAction("duplicateAndMoveUp", "duplicateAndMoveUp", "", function () {
                return Duplicate.createWithMove(Selection.getSelection(), "up");
            }, "ui-duplicate").setCondition(function () {
                return selectionMade();
            });

            this.registerAction("duplicateAndMoveDown", "duplicateAndMoveDown", "", function () {
                return Duplicate.createWithMove(Selection.getSelection(), "down");
            }, "ui-duplicate").setCondition(function () {
                return selectionMade();
            });

            this.registerAction("duplicate", "Duplicate", "Editing", function () {
                return Duplicate.create(Selection.getSelection(), true);
            }, "ui-duplicate").setCondition(function () {
                return selectionMade();
            });

            this.registerAction("bringToFront", "Bring to front", "Layering", function () {
                return new ChangeZOrder(Selection.getSelection(), "front");
            }, "ui-bring-to-front");
            this.registerAction("sendToBack", "Send to back", "Layering", function () {
                return new ChangeZOrder(Selection.getSelection(), "back");
            }, "ui-send-to-back");
            this.registerAction("bringForward", "Bring forward", "Layering", function () {
                return new ChangeZOrder(Selection.getSelection(), "forward");
            }, "ui-bring-forward");
            this.registerAction("sendBackward", "Send backward", "Layering", function () {
                return new ChangeZOrder(Selection.getSelection(), "backward");
            }, "ui-send-backward");

            this.registerAction("moveLeft", "Left", "Positioning", function () {
                if (!currentMove){
                    startRepeatableAction(x => x.position());
                }
                currentMove = currentMove || new AllCommands.Move(Selection.selectComposite());
                return currentMove.init("left");
            });
            this.registerAction("moveRight", "Right", "Positioning", function () {
                if (!currentMove){
                    startRepeatableAction(x => x.position());
                }
                currentMove = currentMove || new AllCommands.Move(Selection.selectComposite());
                return currentMove.init("right");
            });
            this.registerAction("moveUp", "Up", "Positioning", function () {
                if (!currentMove){
                    startRepeatableAction(x => x.position());
                }
                currentMove = currentMove || new AllCommands.Move(Selection.selectComposite());
                return currentMove.init("up");
            });
            this.registerAction("moveDown", "Down", "Positioning", function () {
                if (!currentMove){
                    startRepeatableAction(x => x.position());
                }
                currentMove = currentMove || new AllCommands.Move(Selection.selectComposite());
                return currentMove.init("down");
            });
            this.registerAction("moveLeft10", "Left 10 pixels", "Positioning", function () {
                if (!currentMove){
                    startRepeatableAction(x => x.position());
                }
                currentMove = currentMove || new AllCommands.Move(Selection.selectComposite());
                return currentMove.init("left", 10);
            });
            this.registerAction("moveRight10", "Right 10 pixels", "Positioning", function () {
                if (!currentMove){
                    startRepeatableAction(x => x.position());
                }
                currentMove = currentMove || new AllCommands.Move(Selection.selectComposite());
                return currentMove.init("right", 10)
            });
            this.registerAction("moveUp10", "Up 10 pixels", "Positioning", function () {
                if (!currentMove){
                    startRepeatableAction(x => x.position());
                }
                currentMove = currentMove || new AllCommands.Move(Selection.selectComposite());
                return currentMove.init("up", 10);
            });
            this.registerAction("moveDown10", "Down 10 pixels", "Positioning", function () {
                if (!currentMove){
                    startRepeatableAction(x => x.position());
                }
                currentMove = currentMove || new AllCommands.Move(Selection.selectComposite());
                return currentMove.init("down", 10);
            });

            this.registerAction("moveFinished", "Move finished", "Positioning", function () {
                currentMove = null;
                var oldProps = endRepeatableAction();
                var commands = Selection.selectComposite().map((x, i) => x.constructPropsChangedCommand(x.position(), oldProps[i]));
                return new CompositeCommand(commands);
            });

            this.registerAction("pathUnion", "Union", "Combine Paths", function () {
                return new CombinePaths("union", Selection.getSelection());
            });

            this.registerAction("pathSubtract", "Join", "Combine Paths", function () {
                return new CombinePaths("xor", Selection.getSelection());
            });

            this.registerAction("pathIntersect", "Intersect", "Combine Paths", function () {
                return new CombinePaths("intersect", Selection.getSelection());
            });

            this.registerAction("pathDifference", "Difference", "Combine Paths", function () {
                return new CombinePaths("difference", Selection.getSelection());
            });

            this.registerAction("alignLeft", "Align left", "Align", function () {
                return new Align("left", Selection.getSelection());
            }, "ui-align-left");
            this.registerAction("alignRight", "Align right", "Align", function () {
                return new Align("right", Selection.getSelection());
            }, "ui-align-right");
            this.registerAction("alignTop", "Align top", "Align", function () {
                return new Align("top", Selection.getSelection());
            }, "ui-align-top");
            this.registerAction("alignBottom", "Align bottom", "Align", function () {
                return new Align("bottom", Selection.getSelection());
            }, "ui-align-bottom");
            this.registerAction("alignMiddle", "Align middle", "Align", function () {
                return new Align("middle", Selection.getSelection());
            }, "ui-align-middle");
            this.registerAction("alignCenter", "Align center", "Align", function () {
                return new Align("center", Selection.getSelection());
            }, "ui-align-center");
            this.registerAction("distributeHorizontally", "Distribute horizontally", "Distribute", function () {
                return new Align("distributeHorizontally", Selection.getSelection());
            }, "ui-distribute_horiz");
            this.registerAction("distributeVertically", "Distribute vertically", "Distribute", function () {
                return new Align("distributeVertically", Selection.getSelection());
            }, "ui-distribute_vertic");

            this.registerAction("groupElements", "Group elements", "Group", function () {
                Group.run(Selection.getSelection(), GroupContainer);
            }, "ui-group");

            this.registerAction("ungroupElements", "Ungroup elements", "Ungroup", function () {
                Ungroup.run(Selection.getSelection());
            }, "ui-ungroup");

            this.registerAction("groupInRepeater", "Group elements", "Group", function () {
                return GroupInRepeater.run(Selection.getSelection());
            }, "ui-group");

            this.registerAction("lock", "Lock", "Lock", function () {
                var locks = [];
                each(Selection.getSelection(), function (e) {
                    if (!e.locked()) {
                        locks.push(e.constructPropsChangedCommand({locked: true}, {locked: false}));
                    }
                })
                return new CompositeCommand(locks);
            });

            this.registerAction("unlock", "Unlock", "Lock", function () {
                var locks = [];
                each(Selection.getSelection(), function (e) {
                    if (e.locked()) {
                        locks.push(e.constructPropsChangedCommand({locked: false}, {locked: true}));
                    }
                })
                return CompositeCommand(locks);
            });

            this.registerAction("unlockAllPage", "Unlock all on page", "Lock", function () {
                var locks = [];
                var page = that.app.activePage;
                page.applyVisitor(function (e) {
                    if (e.locked()) {
                        locks.push(e.constructPropsChangedCommand({locked: false}, {locked: true}));
                    }
                })
                return new CompositeCommand(locks);
            });

            this.registerAction("fontIncreaseSize", "Font increase size", "Font", function () {
                var selection = Selection.selectedElement();
                if (!selection) {
                    return null;
                }
                return new sketch.commands.FontNumericProperty('size', selection, true);
            }, "");

            this.registerAction("fontDecreaseSize", "Font decrease size", "Font", function () {
                var selection = Selection.selectedElement();
                if (!selection) {
                    return null;
                }
                return new sketch.commands.FontNumericProperty('size', selection, false);
            }, "");

            this.registerAction("fontBold", "Font bold", "Font", function () {
                return FontHelper.toggleFontProperty(Selection.selectedElements(), "weight");
            }, "");

            this.registerAction("fontItalic", "Font italic", "Font", function () {
                return FontHelper.toggleFontProperty(Selection.selectedElements(), "style");
            }, "");
            this.registerAction("fontUnderline", "Font underline", "Font", function () {
                return FontHelper.toggleFontProperty(Selection.selectedElements(), "underline");
            }, "");

            this.registerAction("selectAll", "Select all elements", "View", function () {
                Selection.selectAll();
            }, "");
            this.registerAction("clearSelection", "Unselect all elements", "View", function () {
                Selection.clearSelection();
            }, "");

            this.registerAction("switchToPreview", "Switch to preview mode", "Navigation", function () {
                fwk.pubSub.publishSync("switchToPreview");
            }, "");

            this.registerAction("switchToDesign", "Switch to design mode", "Navigation", function () {
                fwk.pubSub.publishSync("switchToDesign");
            }, "");

            this.registerAction("zoomOut", "Zoom out", "Zoom", function () {
                Environment.view.zoom(Environment.view.zoom() - 0.1);
            }, "ui-zoom_out");

            this.registerAction("zoomIn", "Zoom in", "Zoom", function () {
                Environment.view.zoom(Environment.view.zoom() + 0.1);
            }, "ui-zoom_in");

            this.registerAction("zoom100", "1:1", "Zoom", function () {
                Environment.view.zoom(1);

            }, "ui-zoom_100");

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
            }, "ui-zoom_fit");

            this.registerAction("zoomSelection", "Zoom selection", "Zoom", function () {
                var element = Selection.selectedElement();
                element = element || that.app.activePage.getActiveArtboard();
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
            }, "");

            this.registerAction("undo", "Undo", "Project actions", function () {
                if (fwk.commandManager.canUndo()) {
                    fwk.commandManager.undoPrevious();
                }
            }, "ui-undo");
            this.registerAction("redo", "Redo", "Project actions", function () {
                if (fwk.commandManager.canRedo()) {
                    fwk.commandManager.redoNext();
                }
            }, "ui-redo");
            this.registerAction("newPagePortrait", "New portrait page", "New page", function () {
                that.app.project.addNewPage("portrait");
            });
            this.registerAction("newPageLandscape", "New landscape page", "New page", function () {
                that.app.project.addNewPage("landscape");
            });

            this.registerAction("save", "Save", "Project actions", function () {
                return that.app.modelSyncProxy.change();
            }, "ui-save");

            this.registerAction("saveBackup", "Save backup", "Project actions", function () {
                return that.app.offlineModel.saveBackup(that.app);
            }, "ui-save");

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
            }, "ui-convert-to-path");

            this.registerAction("pathFlatten", "Flatten path", "Path", function () {
                var elements = Selection.getSelection();
                for(var i = 0; i < elements.length; ++i){
                    elements[i].flatten();
                }
            }, "ui-convert-to-path");

            this.registerAction("groupWithMask", "Create mask", "Group", function () {
                var selection = Selection.getSelection();
                if(typeof selection[0].drawPath == 'function') {
                    var group = Group.run(selection, GroupContainer);
                    group.children[0].setProps({clipMask: true});
                }
            }, "ui-convert-to-path");

            this.registerAction("sacred", "Sacred action", "Debug", function () {
                var dialog = new sketch.windows.Dialog("viewmodels/SacredDialogViewModel", {modal: true});
                dialog.show();
            });

            this.registerAction("cancel", "Cancel", "", function () {
            });

            // this.registerAction("showNavigationPane", "Expand pane", "Navigation pane", function () {
            //     that.app.viewModel.navigationModel.expandAndFocusOnSearch();
            // });

            this.registerAction("editText", "Edit text", "Edit", function () {
            }, "");

            this.actionPerformed.bind(this, checkConditions);
            fwk.commandManager.onCommandExecuted.bind(this, checkConditions);
            fwk.commandManager.onCommandRolledBack.bind(this, checkConditions);
        },
        registerApp: function (app) {
            this.app = app;
            Selection.onElementSelected.bind(this, checkConditions);
            checkConditions();
        },
        iterate: function (callback) {
            for (var name in this._actions) {
                callback(this._actions[name]);
            }
        },
        invokeAsync: function(actionName, callback){
            setTimeout(()=>this.invoke(actionName, callback), 100);
        },
        invoke: function (actionName, callback) {
            debug("Invoking %s", actionName);
            var that = this;
            var action = this._actions[actionName];

            if (!action) {
                throw "Unknown action " + actionName;
            }
            if (!action.enabled()) {
                return;
            }

            this.notifyActionStart(actionName);

            var cmd = action.callback();

            if (cmd) {
                if (cmd instanceof Command){
                    fwk.commandManager.execute(cmd);
                    this.notifyActionCompleted(actionName, true);
                    if (callback) {
                        callback(true);
                    }
                }
                else if (cmd.then){
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
            else{
                this.notifyActionCompleted(actionName, true);
            }

            Invalidate.request();
        },
        getActionsInCategory: function (category) {
            var result = [];
            this.iterate(function (action) {
                if (action.category === category) {
                    result.push(action);
                }
            });
            return result;
        },
        getAction: function (name) {
            return this._actions[name];
        },
        getActionFullDescription: function (name, translate) {
            var action = this._actions[name];
            var shortcut = platform.getActionShortcutDisplayLabel(name);

            if (shortcut) {
                if(translate){
                    return translate(action.description) + "(" + shortcut + ")";
                }
            }

            if(translate){
                return translate(action.description);
            }

            return action.description;
        },
        getActionDescription: function (name) {
            var action = this._actions[name];
            if (action) {
                return action.description;
            }
        },
        subscribe: function (action, handler) {
            var event = this._events[action];
            if (!event) {
                event = fwk.EventHelper.createEvent();
                this._events[action] = event;
            }
            return event.bind.apply(event, Array.prototype.slice.call(arguments, 1));
        },
        unsubscribe: function (action, handler) {
            var event = this._events[action];
            if (event) {
                event.unbind.apply(event, Array.prototype.slice.call(arguments, 1));
            }
        },

        subscribeToCategory: function (category, handler) {
            var event = this._categoryEvents[category];
            if (!event) {
                event = fwk.EventHelper.createEvent();
                this._categoryEvents[category] = event;
            }
            return event.bind.apply(event, Array.prototype.slice.call(arguments, 1));
        },

        unsubscribeFromCategory: function (category, handler) {
            var event = this._categoryEvents[category];
            if (event) {
                event.unbind.apply(event, Array.prototype.slice.call(arguments, 1));
            }
        },
        subscribeToActionStart: function (action, handler) {
            var event = this._actionStartEvents[action];
            if (!event) {
                event = fwk.EventHelper.createEvent();
                this._actionStartEvents[action] = event;
            }
            return event.bind.apply(event, Array.prototype.slice.call(arguments, 1));
        },
        showActions: function (config) {
            this._visibleActionsConfig = config;
        },
        getVisibleActionsConfig: function () {
            return this._visibleActionsConfig;
        }
    });

    var actionManager = new ActionManager();
    actionManager.registerActions();
    return actionManager;
});
