import ElementDropTool from "ui/common/ElementDropTool";
import PathTool from "ui/common/PathTool";
import SectionCreator from "ui/common/sections/SectionCreator";
import PolygonTool from "ui/common/PolygonTool";
import LineCreator from "ui/common/LineCreator";
import PencilCreator from "ui/common/PencilCreator";
import LinkingTool from "ui/prototyping/LinkingTool";
import HandTool from "ui/common/HandTool";
import ZoomTool from "ui/common/ZoomTool";
import ArtboardsTool from "ui/common/ArtboardsTool";
import TextTool from "ui/common/text/TextTool";
import Artboard from "framework/Artboard";
import DefaultShapeSettings from "ui/DefaultShapeSettings";
import ArtboardToolSettings from "ui/ArtboardToolSettings";
import ArtboardFrame from "framework/ArtboardFrame";
import {Types} from "../framework/Defs";
import Path from "framework/Path";
import Star from "framework/Star";
import Polygon from "framework/Polygon";
import SystemConfiguration from 'SystemConfiguration';
import Selection from "framework/SelectionModel";
import Cursor from "framework/Cursor";
import ExtensionBase from "./ExtensionBase";
import DesignerController from "framework/DesignerController";
import Invalidate from "framework/Invalidate";
import { IController, WorkspaceTool } from "carbon-core";
import Tool from "../ui/common/Tool";

var mousedown = function () {
    this.mousePressed = true;
};

var mouseup = function () {
    this.mousePressed = false;
};

var registerCommands = function () {
    var actionManager = this.app.actionManager;
    var that = this;

    actionManager.registerAction("textTool" as WorkspaceTool, "@tool.text", "Drawing", function () {
        that.detachAll();
        that._textTool.attach(that.app, that.view, that.controller);
        that._currentAction = that._textTool;
        that.app.allowSelection(false);
    });

    actionManager.registerAction("imageTool" as WorkspaceTool, "@tool.image", "Drawing", function () {
        that.detachAll();
        that._imageCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._imageCreator;
        that.app.allowSelection(false);
    });

    actionManager.registerAction("pathTool" as WorkspaceTool, "@tool.pen", "Drawing", function () {
        that.detachAll();
        that._polylineCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._polylineCreator;
        that.app.allowSelection(false);
        var element = Selection.selectedElement();
        if(element instanceof Path) {
            element.edit(that.view);
        } else {
            that._defaultShapeSettings.updateColors();
            Selection.makeSelection([that._defaultShapeSettings], "new", false, true);
        }
    });

    actionManager.registerAction("rectangleTool" as WorkspaceTool, "@tool.rect", "Drawing", function () {
        that.detachAll();
        that._rectCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._rectCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], "new", false, true);
        Invalidate.request();
    });

    actionManager.registerAction("starTool" as WorkspaceTool, "@tool.star", "Drawing", function () {
        that.detachAll();
        that._starCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._starCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], "new", false, true);

    });

    actionManager.registerAction("triangleTool" as WorkspaceTool, "@tool.triangle", "Drawing", function () {
        that.detachAll();
        that._triangleCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._triangleCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], "new", false, true);

    });

    actionManager.registerAction("polygonTool" as WorkspaceTool, "@tool.polygon", "Drawing", function () {
        that.detachAll();
        that._polygonCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._polygonCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], "new", false, true);

    });


    actionManager.registerAction("artboardTool" as WorkspaceTool, "@tool.artboard", "Artboard", function () {
        that.detachAll();
        that._artboardCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._artboardCreator;
        that.app.allowSelection(false);

        if (Selection.elements.length === 0 || !(Selection.elements[0] instanceof Artboard)) {
            Selection.makeSelection([that._artboardToolSettings], "new", false, true);
        }

    });

    actionManager.registerAction("artboardViewerTool" as WorkspaceTool, "@artboardFrameTool", "Artboard", function () {
        that.detachAll();
        that._artboardViewer.attach(that.app, that.view, that.controller);
        that._currentAction = that._artboardViewer;
        that.app.allowSelection(false);

    });

    actionManager.registerAction("sectionTool" as WorkspaceTool, "@tool.section", "Section", function () {
        that.detachAll();
        that._sectionCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._sectionCreator;
        //re-fire event if artboard is already selected
        Selection.makeSelection([that.app.activePage.getActiveArtboard()], "new", false, true);

    });

    actionManager.registerAction("circleTool" as WorkspaceTool, "@tool.ellipse", "Drawing", function () {
        that.detachAll();
        that._circleCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._circleCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], "new", false, true);
    });

    actionManager.registerAction("lineTool" as WorkspaceTool, "@tool.line", "Drawing", function () {
        that.detachAll();
        that._lineCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._lineCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], "new", false, true);
    });

    actionManager.registerAction("protoTool" as WorkspaceTool, "@tool.prototyping", "Prototyping", function () {
        that.detachAll();
        that._prototypingTool.attach(that.app, that.view, that.controller);
        that._currentAction = that._prototypingTool;
        that.app.allowSelection(false);
        Selection.refreshSelection();
    });

    actionManager.registerAction("pointerTool" as WorkspaceTool, "@tool.selection", "Drawing", function () {
        that.detachAll();
        Selection.directSelectionEnabled(false);
        that.app.allowSelection(true);
        that.controller.currentTool = "pointerTool";
        Selection.refreshSelection();
    });

    actionManager.registerAction("pointerDirectTool" as WorkspaceTool, "@tool.DirectSelection", "Drawing", function () {
        that.detachAll();
        Selection.directSelectionEnabled(true);
        Selection.invertDirectSelection(true);
        that.app.allowSelection(true);
        that.controller.currentTool = "pointerDirectTool";
        Invalidate.requestInteractionOnly();
    });


    actionManager.registerAction("pencilTool" as WorkspaceTool, "@tool.pencil", "Drawing", function () {
        that.detachAll();
        that._pencilCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._pencilCreator;
        that.app.allowSelection(false);
        Selection.makeSelection([that._defaultShapeSettings], "new", false, true);
    });

    actionManager.registerAction("handToolRelease", "@tool.handRelease", "Drawing utils", function () {
        //User released spacebar
        if (that._currentAction === that._handTool || that._currentAction === that._zoomTool) {
            //deattach hand tool
            that._currentAction.detach();
            //if it is possible to resume
            if (that._previousAction && that._previousAction.resume){
                that._previousAction.resume();
            }
            else{
                actionManager.invoke((Selection.directSelectionEnabled() ? "pointerDirectTool" : "pointerTool") as WorkspaceTool);
            }
            //restore action
            that._currentAction = that._previousAction;
            that._previousAction = null;
        }
    });

    actionManager.registerAction("handTool" as WorkspaceTool, "@tool.hand", "Drawing utils", function (selection, arg) {
        attachHandTool(arg === "active");
    });

    var attachHandTool = function (active) {
        if (that.mousePressed || that._currentAction === that._handTool) {
            return;
        }

        if (that._currentAction && that._currentAction.pause){
            that._currentAction.pause();
        }

        that._previousAction = that._currentAction; // should remember previous action
        that._handTool.attach(that.app, that.view, that.controller, that.mousePressed || active);
        that._currentAction = that._handTool;
    }

    actionManager.registerAction("zoomTool" as WorkspaceTool, "@tool.zoom", "Drawing utils", function () {
        attachZoomTool();
    });

    var attachZoomTool = function () {
        if (that.mousePressed || that._currentAction === that._zoomTool) {
            return;
        }

        if (that._currentAction && that._currentAction.pause){
            that._currentAction.pause();
        }

        that._previousAction = that._currentAction; // should remember previous action
        that._zoomTool.attach(that.app, that.view, that.controller, that.mousePressed);
        that._currentAction = that._zoomTool;
    }
};

export default class DrawActionSelector extends ExtensionBase {
    private _tools: Tool[] = [];

    attach(app, view, controller: IController) {
        super.attach.apply(this, arguments);

        if(!(controller instanceof  DesignerController)){
            return;
        }

        this._currentAction = null;
        registerCommands.call(this);

        this._rectCreator = new ElementDropTool("rectangleTool", Types.Rectangle);
        this._tools.push(this._rectCreator);

        this._artboardCreator = new ArtboardsTool();
        this._tools.push(this._artboardCreator);

        this._sectionCreator = new SectionCreator();
        this._tools.push(this._sectionCreator);

        this._circleCreator = new ElementDropTool("circleTool", Types.Circle);
        this._tools.push(this._circleCreator);

        this._polylineCreator = new PathTool(app, Types.Path);
        this._tools.push(this._polylineCreator);

        this._starCreator = new PolygonTool("starTool", Types.Star);
        this._tools.push(this._starCreator);

        this._polygonCreator = new PolygonTool("polygonTool", Types.Polygon);
        this._tools.push(this._polygonCreator);

        this._triangleCreator = new PolygonTool("triangleTool", Types.Polygon, {pointsCount: 3});
        this._tools.push(this._triangleCreator);

        this._artboardViewer = new ElementDropTool("artboardViewerTool", Types.ArtboardFrame);
        this._tools.push(this._artboardViewer);

        this._lineCreator = new LineCreator();
        this._tools.push(this._lineCreator);

        this._prototypingTool = new LinkingTool();
        this._tools.push(this._prototypingTool);

        this._pencilCreator = new PencilCreator();
        this._tools.push(this._pencilCreator);

        this._handTool = new HandTool();
        this._tools.push(this._handTool);

        this._zoomTool = new ZoomTool();
        this._tools.push(this._zoomTool);

        this._textTool = new TextTool(app);
        this._tools.push(this._textTool);

        this._imageCreator = new ElementDropTool("imageTool", Types.Image);
        this._tools.push(this._imageCreator);

        this._defaultShapeSettings = new DefaultShapeSettings(app);
        this._artboardToolSettings = new ArtboardToolSettings(app);

        this._pageChangedToken = app.pageChanged.bind(() => {
            if (this._currentAction) {
                if (SystemConfiguration.ResetActiveToolToDefault) {
                    controller.resetCurrentTool();
                }
            }
        });

        app.onLoad(this.load.bind(this));

        if (this.controller.currentTool) {
            app.actionManager.invoke(this.controller.currentTool);
        }
    }

    detach(){
        super.detach();

        this.detachAll();

        if(this._pageChangedToken) {
            this._pageChangedToken.dispose();
        }

        if(this._mouseDownSubscription) {
            this._mouseDownSubscription.dispose();
        }

        if(this._mouseUpSubscription) {
            this._mouseUpSubscription.dispose();
        }

        this._tools.forEach(x => x.dispose());
        this._tools.length = 0;
    }

    load() {
        var controller = this.controller;
        if(controller) {
            this._mouseDownSubscription = controller.mousedownEvent.bind(this, mousedown);
            this._mouseUpSubscription = controller.mouseupEvent.bind(this, mouseup);
        }
    }

    detachAll() {
        Cursor.removeGlobalCursor();
        if (this._currentAction) {
            this._currentAction.detach();
            this._currentAction = null;
        }

        var selectedElement = Selection.selectedElement();

        if (selectedElement === this._defaultShapeSettings || selectedElement === this._artboardToolSettings) {
            Selection.makeSelection([]);
        }

        Selection.invertDirectSelection(false);
    }

    dispose() {

    }
}


