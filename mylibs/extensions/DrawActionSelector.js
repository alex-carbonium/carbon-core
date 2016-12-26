import ElementDragCreator from "ui/common/ElementDragCreator";
import GraphicalPathCreator from "ui/common/GraphicalPathCreator";
import SectionCreator from "ui/common/sections/SectionCreator";
import LineCreator from "ui/common/LineCreator";
import PencilCreator from "ui/common/PencilCreator";
import EditModeAction from "ui/common/EditModeAction";
import LinkingTool from "ui/prototyping/LinkingTool";
import HandTool from "ui/common/HandTool";
import ArtboardsTool from "ui/common/ArtboardsTool";
import TextTool from "ui/common/text/TextTool";
import Artboard from "framework/Artboard";
import DefaultShapeSettings from "ui/DefaultShapeSettings";
import DefaultLineSettings from "ui/DefaultLineSettings";
import ArtboardToolSettings from "ui/ArtboardToolSettings";
import ArtboardFrame from "framework/ArtboardFrame";
import {ViewTool, Types} from "../framework/Defs";
import Path from "ui/common/Path";
import Star from "framework/Star";
import Polygon from "framework/Polygon";
import SystemConfiguration from 'SystemConfiguration';
import Selection from "framework/SelectionModel";
import Cursor from "framework/Cursor";
import ExtensionBase from "./ExtensionBase";
import Environment from "environment";
import DesignerController from "framework/DesignerController";

var mousedown = function () {
    this.mousePressed = true;
};

var mouseup = function () {
    this.mousePressed = false;
};

var registerCommands = function () {
    var actionManager = this.app.actionManager;
    var that = this;

    actionManager.registerAction("@textTool", "Text tool", "Drawing", function () {
        that.detachAll();
        that._textTool.attach(that.app, that.view, that.controller);
        that._currentAction = that._textTool;
        that.app.allowSelection(false);
        that.app.setCurrentTool(ViewTool.Text);
    }, "ui-text");

    actionManager.registerAction("@imageTool", "Image tool", "Drawing", function () {
        that.detachAll();
        that._imageCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._imageCreator;
        that.app.allowSelection(false);
        that.app.setCurrentTool(ViewTool.Text);
    }, "ui-text");

    actionManager.registerAction("@addPath", "Pen tool", "Drawing", function () {
        that.detachAll();
        that._polylineCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._polylineCreator;
        that.app.allowSelection(false);
        var element = Selection.selectedElement();
        if(element instanceof Path) {
            element.edit();
        } else {
            that._defaultShapeSettings.updateColors();
            Selection.makeSelection([that._defaultShapeSettings]);
        }
        that.app.setCurrentTool(ViewTool.Path);
    }, "ui-pen");

    actionManager.registerAction("@addRectangle", "Rectangle tool", "Drawing", function () {
        that.detachAll();
        that._rectCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._rectCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings]);
        that.app.setCurrentTool(ViewTool.Rectangle);

    }, "ui-rectangle");

    actionManager.registerAction("@addStar", "Star tool", "Drawing", function () {
        that.detachAll();
        that._starCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._starCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings]);
        that.app.setCurrentTool(ViewTool.Star);

    }, "ui-star");

    actionManager.registerAction("@addTriangle", "Triangle tool", "Drawing", function () {
        that.detachAll();
        that._triangleCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._triangleCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings]);
        that.app.setCurrentTool(ViewTool.Triangle);

    }, "ui-ploygon");

    actionManager.registerAction("@addPolygon", "Polygon tool", "Drawing", function () {
        that.detachAll();
        that._polygonCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._polygonCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings]);
        that.app.setCurrentTool(ViewTool.Polygon);

    }, "ui-ploygon");


    actionManager.registerAction("@artboardTool", "Artboard tool", "Artboard", function () {
        that.detachAll();
        that._artboardCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._artboardCreator;
        that.app.allowSelection(false);
        Selection.makeSelection([that._artboardToolSettings]);
        that.app.setCurrentTool(ViewTool.Artboard);

    }, "ui-rectangle");

    actionManager.registerAction("@artboardViewerTool", "@artboardFrameTool", "Artboard", function () {
        that.detachAll();
        that._artboardViewer.attach(that.app, that.view, that.controller);
        that._currentAction = that._artboardViewer;
        that.app.allowSelection(false);
        that.app.setCurrentTool(ViewTool.ArtboardViewer);

    }, "");

    actionManager.registerAction("@sectionTool", "Section tool", "Section", function () {
        that.detachAll();
        that._sectionCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._sectionCreator;
        //re-fire event if artboard is already selected
        Selection.makeSelection([]);
        Selection.makeSelection([that.app.activePage.getActiveArtboard()]);
        that.app.setCurrentTool(ViewTool.Section);

    }, "ui-rectangle");

    actionManager.registerAction("@addCircle", "Ellipse tool", "Drawing", function () {
        that.detachAll();
        that._circleCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._circleCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings]);
        that.app.setCurrentTool(ViewTool.Circle);
    }, "ui-circle");

    actionManager.registerAction("@addLine", "Line tool", "Drawing", function () {
        that.detachAll();
        that._lineCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._lineCreator;
        that.app.allowSelection(false);
        that._defaultLineSettings.updateColors();
        Selection.makeSelection([that._defaultLineSettings]);
        that.app.setCurrentTool(ViewTool.Line);
    }, "ui-line");

    actionManager.registerAction("@protoTool", "Prototyping tool", "Prototyping", function () {
        that.detachAll();
        that._prototypingTool.attach(that.app, that.view, that.controller);
        that._currentAction = that._prototypingTool;
        that.app.allowSelection(false);
        that.app.setCurrentTool(ViewTool.Proto);
        Selection.refreshSelection();
    }, "ui-line");

    actionManager.registerAction("@movePointer", "Pointer tool", "Drawing", function () {
        that.detachAll();
        Cursor.setDefaultCursor("default_cursor", true);
        that.app.allowSelection(true);
        that.app.setCurrentTool(ViewTool.Pointer);
        Selection.refreshSelection();
    }, "ui-arrow");

    actionManager.registerAction("@movePointerDirect", "Direct selection tool", "Drawing", function () {
        that.detachAll();
        Cursor.setDefaultCursor("direct_select_cursor", true);
        Selection.forceDirectSelection(true);
        that.app.allowSelection(true);
        that.app.setCurrentTool(ViewTool.PointerDirect);
    }, "ui-arrow-black");


    actionManager.registerAction("@addPencil", "Pencil tool", "Drawing", function () {
        that.detachAll();
        that._pencilCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._pencilCreator;
        that.app.allowSelection(false);
        Selection.makeSelection([that._defaultShapeSettings]);
        that.app.setCurrentTool(ViewTool.Pencil);
    }, "ui-pencil");

    actionManager.registerAction("handToolRelease", "Hand tool release", "Drawing utils", function () {
        //User released spacebar
        if (that._currentAction == that._handTool) {
            //deattach hand tool
            that._currentAction.detach();
            //if it is possible to resume
            if (that._previousAction && that._previousAction.resume)
                that._previousAction.resume();
            //restore action
            that._currentAction = that._previousAction;
            that._previousAction = null;
        }
    });

    actionManager.registerAction("handTool", "Hand Tool", "Drawing utils", function () {
        attachHandTool(); // action activated by spacebar
    });
    actionManager.registerAction("@handToolH", "Hand Tool", "Drawing", function () {
        attachHandTool(); //action activated by pressing H or icon
    }, "ui-handTool");

    var attachHandTool = function () {
        if (that.mousePressed || that._currentAction == that._handTool) {
            return;
        }

        if (that._currentAction && that._currentAction.pause)
            that._currentAction.pause();

        that._previousAction = that._currentAction; // should remember previous action
        that._handTool.attach(that.app, that.view, that.controller, that.mousePressed);
        that._currentAction = that._handTool;
        that.app.setCurrentTool(ViewTool.Hand);

    }
};

export default class DrawActionSelector extends ExtensionBase {
    attach(app, view, controller) {
        super.attach.apply(this, arguments);

        if(!(controller instanceof  DesignerController)){
            return;
        }

        this.app.drawActionSelector = this;
        this._currentAction = null;
        registerCommands.call(this);
        this._rectCreator = new ElementDragCreator(app, Types.Rectangle);
        this._artboardCreator = new ArtboardsTool(app, Artboard);
        this._sectionCreator = new SectionCreator(app);
        this._circleCreator = new ElementDragCreator(app, Types.Circle);
        this._polylineCreator = new GraphicalPathCreator(app, Types.Path);
        this._starCreator = new ElementDragCreator(app, Types.Star);
        this._polygonCreator = new ElementDragCreator(app, Types.Polygon);
        this._artboardViewer = new ElementDragCreator(app, Types.ArtboardFrame);
        this._triangleCreator = new ElementDragCreator(app, Types.Polygon, {pointsCount: 3});
        this._lineCreator = new LineCreator(app);
        this._prototypingTool = new LinkingTool(app);
        this._pencilCreator = new PencilCreator(app);
        this._handTool = new HandTool(app);
        this._textTool = new TextTool(app);
        this._imageCreator = new ElementDragCreator(app, Types.Frame);

        this._defaultShapeSettings = new DefaultShapeSettings(app);
        this._defaultLineSettings = new DefaultLineSettings(app);
        this._artboardToolSettings = new ArtboardToolSettings(app);

        var that = this;
        this._startDraggingToken = sketch.framework.pubSub.subscribe("toolbox.startDragging", function () {
            that.wasDirectSelectionForced = Selection.forceDirectSelection();
            if (SystemConfiguration.ResetActiveToolToDefault) {
                app.actionManager.invoke("movePointer");
            }
        });

        this._stopDraggingToken = sketch.framework.pubSub.subscribe("toolbox.stopDragging", function () {
            if (that.wasDirectSelectionForced) {
                if (SystemConfiguration.ResetActiveToolToDefault) {
                    app.actionManager.invoke("movePointerDirect");
                }
            }
        });
        this._pageChangedToken = app.pageChanged.bind(function () {
            if (that._currentAction) {
                if (SystemConfiguration.ResetActiveToolToDefault) {
                    app.actionManager.invoke("movePointer");
                }
            }
        });

        app.loaded.then(this.load.bind(this));
    }

    detach(){
        super.detach();
        this.dispose();
    }

    load() {
        var controller = this.controller;
        if(controller) {
            this._mouseDownSubscription = controller.mousedownEvent.bind(this, mousedown);
            this._mouseUpSubscription = controller.mouseupEvent.bind(this, mouseup);
        }
    }

    detachAll() {
        Cursor.removeGlobalCursor(true);
        if (this._currentAction) {
            this._currentAction.detach();
            this._currentAction = null;
        }

        var selectedElement = Selection.selectedElement();

        if (selectedElement === this._defaultShapeSettings || selectedElement === this._artboardToolSettings) {
            Selection.makeSelection([]);
        }

        Selection.forceDirectSelection(false);
        this.app.setCurrentTool(ViewTool.Pointer);
    }

    dispose() {
       // this.app.actionManager.invoke("movePointer");
        this.detachAll();

        sketch.framework.pubSub.unsubscribe(this._startDraggingToken);
        sketch.framework.pubSub.unsubscribe(this._stopDraggingToken);
        if(this._pageChangedToken) {
            this._pageChangedToken.dispose();
        }

        if(this._mouseDownSubscription) {
            this._mouseDownSubscription.dispose();
        }

        if(this._mouseUpSubscription) {
            this._mouseUpSubscription.dispose();
        }
        if (this._textTool){
            this._textTool.dispose();
        }
    }
}


