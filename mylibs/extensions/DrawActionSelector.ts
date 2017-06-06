import ElementDropTool from "ui/common/ElementDropTool";
import PathTool from "ui/common/PathTool";
import SectionCreator from "ui/common/sections/SectionCreator";
import PolygonTool from "ui/common/PolygonTool";
import LineCreator from "ui/common/LineCreator";
import PencilCreator from "ui/common/PencilCreator";
import LinkingTool from "ui/prototyping/LinkingTool";
import HandTool from "ui/common/HandTool";
import ArtboardsTool from "ui/common/ArtboardsTool";
import TextTool from "ui/common/text/TextTool";
import Artboard from "framework/Artboard";
import DefaultShapeSettings from "ui/DefaultShapeSettings";
import ArtboardToolSettings from "ui/ArtboardToolSettings";
import ArtboardFrame from "framework/ArtboardFrame";
import {ViewTool, Types} from "../framework/Defs";
import Path from "framework/Path";
import Star from "framework/Star";
import Polygon from "framework/Polygon";
import SystemConfiguration from 'SystemConfiguration';
import Selection from "framework/SelectionModel";
import Cursor from "framework/Cursor";
import ExtensionBase from "./ExtensionBase";
import Environment from "environment";
import DesignerController from "framework/DesignerController";
import Invalidate from "framework/Invalidate";

var mousedown = function () {
    this.mousePressed = true;
};

var mouseup = function () {
    this.mousePressed = false;
};

var registerCommands = function () {
    var actionManager = this.app.actionManager;
    var that = this;

    actionManager.registerAction(ViewTool.Text, "@tool.text", "Drawing", function () {
        that.detachAll();
        that._textTool.attach(that.app, that.view, that.controller);
        that._currentAction = that._textTool;
        that.app.allowSelection(false);
    }, "ui-text");

    actionManager.registerAction(ViewTool.Image, "@tool.image", "Drawing", function () {
        that.detachAll();
        that._imageCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._imageCreator;
        that.app.allowSelection(false);
    }, "ui-text");

    actionManager.registerAction(ViewTool.Path, "@tool.pen", "Drawing", function () {
        that.detachAll();
        that._polylineCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._polylineCreator;
        that.app.allowSelection(false);
        var element = Selection.selectedElement();
        if(element instanceof Path) {
            element.edit();
        } else {
            that._defaultShapeSettings.updateColors();
            Selection.makeSelection([that._defaultShapeSettings], false, true);
        }
    }, "ui-pen");

    actionManager.registerAction(ViewTool.Rectangle, "@tool.rect", "Drawing", function () {
        that.detachAll();
        that._rectCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._rectCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], false, true);
        Invalidate.request();
    }, "ui-rectangle");

    actionManager.registerAction(ViewTool.Star, "@tool.star", "Drawing", function () {
        that.detachAll();
        that._starCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._starCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], false, true);

    }, "ui-star");

    actionManager.registerAction(ViewTool.Triangle, "@tool.triangle", "Drawing", function () {
        that.detachAll();
        that._triangleCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._triangleCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], false, true);

    }, "ui-ploygon");

    actionManager.registerAction(ViewTool.Polygon, "@tool.polygon", "Drawing", function () {
        that.detachAll();
        that._polygonCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._polygonCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], false, true);

    }, "ui-ploygon");


    actionManager.registerAction(ViewTool.Artboard, "@tool.artboard", "Artboard", function () {
        that.detachAll();
        that._artboardCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._artboardCreator;
        that.app.allowSelection(false);
        Selection.makeSelection([that._artboardToolSettings], false, true);

    }, "ui-rectangle");

    actionManager.registerAction(ViewTool.ArtboardViewer, "@artboardFrameTool", "Artboard", function () {
        that.detachAll();
        that._artboardViewer.attach(that.app, that.view, that.controller);
        that._currentAction = that._artboardViewer;
        that.app.allowSelection(false);

    }, "");

    actionManager.registerAction(ViewTool.Section, "@tool.section", "Section", function () {
        that.detachAll();
        that._sectionCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._sectionCreator;
        //re-fire event if artboard is already selected
        Selection.makeSelection([], false, true);
        Selection.makeSelection([that.app.activePage.getActiveArtboard()], false, true);

    }, "ui-rectangle");

    actionManager.registerAction(ViewTool.Circle, "@tool.ellipse", "Drawing", function () {
        that.detachAll();
        that._circleCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._circleCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], false, true);
    }, "ui-circle");

    actionManager.registerAction(ViewTool.Line, "@tool.line", "Drawing", function () {
        that.detachAll();
        that._lineCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._lineCreator;
        that.app.allowSelection(false);
        that._defaultShapeSettings.updateColors();
        Selection.makeSelection([that._defaultShapeSettings], false, true);
    }, "ui-line");

    actionManager.registerAction(ViewTool.Proto, "@tool.prototyping", "Prototyping", function () {
        that.detachAll();
        that._prototypingTool.attach(that.app, that.view, that.controller);
        that._currentAction = that._prototypingTool;
        that.app.allowSelection(false);
        Selection.refreshSelection();
    }, "ui-line");

    actionManager.registerAction(ViewTool.Pointer, "@tool.selection", "Drawing", function () {
        that.detachAll();
        Selection.directSelectionEnabled(false);
        that.app.allowSelection(true);
        that.app.currentTool = ViewTool.Pointer;
        Selection.refreshSelection();
    }, "ui-arrow");

    actionManager.registerAction(ViewTool.PointerDirect, "@tool.DirectSelection", "Drawing", function () {
        that.detachAll();
        Selection.directSelectionEnabled(true);
        Selection.invertDirectSelection(true);
        that.app.allowSelection(true);
        that.app.currentTool = ViewTool.PointerDirect;
        Invalidate.requestInteractionOnly();
    }, "ui-arrow-black");


    actionManager.registerAction(ViewTool.Pencil, "@tool.pencil", "Drawing", function () {
        that.detachAll();
        that._pencilCreator.attach(that.app, that.view, that.controller);
        that._currentAction = that._pencilCreator;
        that.app.allowSelection(false);
        Selection.makeSelection([that._defaultShapeSettings], false, true);
    }, "ui-pencil");

    actionManager.registerAction("handToolRelease", "@tool.handRelease", "Drawing utils", function () {
        //User released spacebar
        if (that._currentAction == that._handTool) {
            //deattach hand tool
            that._currentAction.detach();
            //if it is possible to resume
            if (that._previousAction && that._previousAction.resume){
                that._previousAction.resume();
            }
            else{
                actionManager.invoke(Selection.directSelectionEnabled() ? ViewTool.PointerDirect : ViewTool.Pointer);
            }
            //restore action
            that._currentAction = that._previousAction;
            that._previousAction = null;
        }
    });

    actionManager.registerAction(ViewTool.Hand, "@tool.hand", "Drawing utils", function () {
        attachHandTool();
    });

    var attachHandTool = function () {
        if (that.mousePressed || that._currentAction == that._handTool) {
            return;
        }

        if (that._currentAction && that._currentAction.pause)
            that._currentAction.pause();

        that._previousAction = that._currentAction; // should remember previous action
        that._handTool.attach(that.app, that.view, that.controller, that.mousePressed);
        that._currentAction = that._handTool;
    }
};

export default class DrawActionSelector extends ExtensionBase {
    attach(app, view, controller) {
        super.attach.apply(this, arguments);

        if(!(controller instanceof  DesignerController)){
            return;
        }

        this._currentAction = null;
        registerCommands.call(this);
        this._rectCreator = new ElementDropTool(ViewTool.Rectangle, Types.Rectangle);
        this._artboardCreator = new ArtboardsTool(Artboard);
        this._sectionCreator = new SectionCreator();
        this._circleCreator = new ElementDropTool(ViewTool.Circle, Types.Circle);
        this._polylineCreator = new PathTool(app, Types.Path);
        this._starCreator = new PolygonTool(ViewTool.Star, Types.Star);
        this._polygonCreator = new PolygonTool(ViewTool.Polygon, Types.Polygon);
        this._triangleCreator = new PolygonTool(ViewTool.Triangle, Types.Polygon, {pointsCount: 3});
        this._artboardViewer = new ElementDropTool(ViewTool.ArtboardViewer, Types.ArtboardFrame);
        this._lineCreator = new LineCreator();
        this._prototypingTool = new LinkingTool();
        this._pencilCreator = new PencilCreator();
        this._handTool = new HandTool();
        this._textTool = new TextTool(app);
        this._imageCreator = new ElementDropTool(ViewTool.Image, Types.Image);

        this._defaultShapeSettings = new DefaultShapeSettings(app);
        this._artboardToolSettings = new ArtboardToolSettings(app);

        this._pageChangedToken = app.pageChanged.bind(() => {
            if (this._currentAction) {
                if (SystemConfiguration.ResetActiveToolToDefault) {
                    app.resetCurrentTool();
                }
            }
        });

        app.onLoad(this.load.bind(this));

        if(app.currentTool) {
            app.actionManager.invoke(app.currentTool);
        }
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
        if (this._textTool){
            this._textTool.dispose();
        }
    }
}


