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
import { Types } from "../framework/Defs";
import Path from "framework/Path";
import SystemConfiguration from 'SystemConfiguration';
import Selection from "framework/SelectionModel";
import Cursor from "framework/Cursor";
import ExtensionBase from "./ExtensionBase";
import Invalidate from "framework/Invalidate";
import { IController, WorkspaceTool, IView, IApp, IDisposable } from "carbon-core";
import Tool from "../ui/common/Tool";

export default class DrawActionSelector extends ExtensionBase {
    private _tools: Tool[] = [];
    private _currentAction: Tool;
    private _previousAction: Tool;
    private _rectCreator: ElementDropTool;
    private _artboardCreator: ArtboardsTool;
    private _sectionCreator: SectionCreator;
    private _circleCreator: ElementDropTool;
    private _polylineCreator: PathTool;
    private _starCreator: PolygonTool;
    private _polygonCreator: PolygonTool;
    private _triangleCreator: PolygonTool;
    private _artboardViewer: ElementDropTool;
    private _lineCreator: LineCreator;
    private _prototypingTool: LinkingTool;
    private _pencilCreator: PencilCreator;
    private _handTool: HandTool;
    private _zoomTool: ZoomTool;
    private _textTool: TextTool;
    private _imageCreator: ElementDropTool;
    private _defaultShapeSettings: DefaultShapeSettings;
    private _artboardToolSettings: ArtboardToolSettings;
    private _pageChangedToken: IDisposable;
    private _mouseDownSubscription: IDisposable;
    private _mouseUpSubscription: IDisposable;    
    private mousePressed: boolean;

    attach(app: IApp, view: IView, controller: IController) {
        super.attach.apply(this, arguments);

        if (!controller || controller.id !== "designer") {
            return;
        }

        this._currentAction = null;
        this.registerCommands();

        this._rectCreator = new ElementDropTool("rectangleTool", app, view, controller, Types.Rectangle);
        this._tools.push(this._rectCreator);

        this._artboardCreator = new ArtboardsTool(app, view, controller);
        this._tools.push(this._artboardCreator);

        this._sectionCreator = new SectionCreator();
        this._tools.push(this._sectionCreator);

        this._circleCreator = new ElementDropTool("circleTool", app, view, controller, Types.Circle);
        this._tools.push(this._circleCreator);

        this._polylineCreator = new PathTool(app, view, controller, Types.Path);
        this._tools.push(this._polylineCreator);

        this._starCreator = new PolygonTool("starTool", app, view, controller, Types.Star);
        this._tools.push(this._starCreator);

        this._polygonCreator = new PolygonTool("polygonTool", app, view, controller, Types.Polygon);
        this._tools.push(this._polygonCreator);

        this._triangleCreator = new PolygonTool("triangleTool", app, view, controller, Types.Polygon, { pointsCount: 3 });
        this._tools.push(this._triangleCreator);

        this._artboardViewer = new ElementDropTool("artboardViewerTool", app, view, controller, Types.ArtboardFrame);
        this._tools.push(this._artboardViewer);

        this._lineCreator = new LineCreator(app, view, controller);
        this._tools.push(this._lineCreator);

        this._prototypingTool = new LinkingTool(app, view, controller);
        this._tools.push(this._prototypingTool);

        this._pencilCreator = new PencilCreator(app, view, controller);
        this._tools.push(this._pencilCreator);

        this._handTool = new HandTool(app, view, controller);
        this._tools.push(this._handTool);

        this._zoomTool = new ZoomTool(app, view, controller);
        this._tools.push(this._zoomTool);

        this._textTool = new TextTool(app, view, controller);
        this._tools.push(this._textTool);

        this._imageCreator = new ElementDropTool("imageTool", app, view, controller, Types.Image);
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

    detach() {
        super.detach();

        this.detachAll();

        if (this._pageChangedToken) {
            this._pageChangedToken.dispose();
        }

        if (this._mouseDownSubscription) {
            this._mouseDownSubscription.dispose();
        }

        if (this._mouseUpSubscription) {
            this._mouseUpSubscription.dispose();
        }

        this._tools.forEach(x => x.dispose());
        this._tools.length = 0;
    }

    load() {
        var controller = this.controller;
        if (controller) {
            this._mouseDownSubscription = controller.mousedownEvent.bind(this, this.mouseDown);
            this._mouseUpSubscription = controller.mouseupEvent.bind(this, this.mouseUp);
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

    registerCommands() {
        var actionManager = this.app.actionManager;

        actionManager.registerAction("textTool" as WorkspaceTool, "@tool.text", "Drawing", () =>{
            this.detachAll();
            this._textTool.attach();
            this._currentAction = this._textTool;
            this.app.allowSelection(false);
        });

        actionManager.registerAction("imageTool" as WorkspaceTool, "@tool.image", "Drawing", () => {
            this.detachAll();
            this._imageCreator.attach();
            this._currentAction = this._imageCreator;
            this.app.allowSelection(false);
        });

        actionManager.registerAction("pathTool" as WorkspaceTool, "@tool.pen", "Drawing", () => {
            this.detachAll();
            this._polylineCreator.attach();
            this._currentAction = this._polylineCreator;
            this.app.allowSelection(false);
            var element = Selection.selectedElement();
            if (element instanceof Path) {
                element.edit(this.view, this.controller);
            } else {
                this._defaultShapeSettings.updateColors();
                Selection.makeSelection([this._defaultShapeSettings], "new", false, true);
            }
        });

        actionManager.registerAction("rectangleTool" as WorkspaceTool, "@tool.rect", "Drawing", () => {
            this.detachAll();
            this._rectCreator.attach();
            this._currentAction = this._rectCreator;
            this.app.allowSelection(false);
            this._defaultShapeSettings.updateColors();
            Selection.makeSelection([this._defaultShapeSettings], "new", false, true);
            Invalidate.request();
        });

        actionManager.registerAction("starTool" as WorkspaceTool, "@tool.star", "Drawing", () => {
            this.detachAll();
            this._starCreator.attach();
            this._currentAction = this._starCreator;
            this.app.allowSelection(false);
            this._defaultShapeSettings.updateColors();
            Selection.makeSelection([this._defaultShapeSettings], "new", false, true);

        });

        actionManager.registerAction("triangleTool" as WorkspaceTool, "@tool.triangle", "Drawing", () => {
            this.detachAll();
            this._triangleCreator.attach();
            this._currentAction = this._triangleCreator;
            this.app.allowSelection(false);
            this._defaultShapeSettings.updateColors();
            Selection.makeSelection([this._defaultShapeSettings], "new", false, true);

        });

        actionManager.registerAction("polygonTool" as WorkspaceTool, "@tool.polygon", "Drawing", () => {
            this.detachAll();
            this._polygonCreator.attach();
            this._currentAction = this._polygonCreator;
            this.app.allowSelection(false);
            this._defaultShapeSettings.updateColors();
            Selection.makeSelection([this._defaultShapeSettings], "new", false, true);

        });


        actionManager.registerAction("artboardTool" as WorkspaceTool, "@tool.artboard", "Artboard", () => {
            this.detachAll();
            this._artboardCreator.attach();
            this._currentAction = this._artboardCreator;
            this.app.allowSelection(false);

            if (Selection.elements.length === 0 || !(Selection.elements[0] instanceof Artboard)) {
                Selection.makeSelection([this._artboardToolSettings], "new", false, true);
            }

        });

        actionManager.registerAction("artboardViewerTool" as WorkspaceTool, "@artboardFrameTool", "Artboard", () => {
            this.detachAll();
            this._artboardViewer.attach();
            this._currentAction = this._artboardViewer;
            this.app.allowSelection(false);

        });

        actionManager.registerAction("sectionTool" as WorkspaceTool, "@tool.section", "Section", () => {
            this.detachAll();
            this._sectionCreator.attach(this.app, this.view, this.controller);
            this._currentAction = this._sectionCreator;
            //re-fire event if artboard is already selected
            Selection.makeSelection([this.app.activePage.getActiveArtboard()], "new", false, true);

        });

        actionManager.registerAction("circleTool" as WorkspaceTool, "@tool.ellipse", "Drawing", () => {
            this.detachAll();
            this._circleCreator.attach();
            this._currentAction = this._circleCreator;
            this.app.allowSelection(false);
            this._defaultShapeSettings.updateColors();
            Selection.makeSelection([this._defaultShapeSettings], "new", false, true);
        });

        actionManager.registerAction("lineTool" as WorkspaceTool, "@tool.line", "Drawing", () => {
            this.detachAll();
            this._lineCreator.attach();
            this._currentAction = this._lineCreator;
            this.app.allowSelection(false);
            this._defaultShapeSettings.updateColors();
            Selection.makeSelection([this._defaultShapeSettings], "new", false, true);
        });

        actionManager.registerAction("protoTool" as WorkspaceTool, "@tool.prototyping", "Prototyping", () => {
            this.detachAll();
            this._prototypingTool.attach();
            this._currentAction = this._prototypingTool;
            this.app.allowSelection(false);
            Selection.refreshSelection();
        });

        actionManager.registerAction("pointerTool" as WorkspaceTool, "@tool.selection", "Drawing", () => {
            this.detachAll();
            Selection.directSelectionEnabled(false);
            this.app.allowSelection(true);
            this.controller.currentTool = "pointerTool";
            Selection.refreshSelection();
        });

        actionManager.registerAction("pointerDirectTool" as WorkspaceTool, "@tool.DirectSelection", "Drawing", () => {
            this.detachAll();
            Selection.directSelectionEnabled(true);
            Selection.invertDirectSelection(true);
            this.app.allowSelection(true);
            this.controller.currentTool = "pointerDirectTool";
            Invalidate.requestInteractionOnly();
        });


        actionManager.registerAction("pencilTool" as WorkspaceTool, "@tool.pencil", "Drawing", () => {
            this.detachAll();
            this._pencilCreator.attach();
            this._currentAction = this._pencilCreator;
            this.app.allowSelection(false);
            Selection.makeSelection([this._defaultShapeSettings], "new", false, true);
        });

        actionManager.registerAction("handToolRelease", "@tool.handRelease", "Drawing utils", () => {
            //User released spacebar
            if (this._currentAction === this._handTool || this._currentAction === this._zoomTool) {
                //deattach hand tool
                this._currentAction.detach();
                //if it is possible to resume
                if (this._previousAction && this._previousAction.resume) {
                    this._previousAction.resume();
                }
                else {
                    actionManager.invoke((Selection.directSelectionEnabled() ? "pointerDirectTool" : "pointerTool") as WorkspaceTool);
                }
                //restore action
                this._currentAction = this._previousAction;
                this._previousAction = null;
            }
        });

        actionManager.registerAction("handTool" as WorkspaceTool, "@tool.hand", "Drawing utils", (_, arg) => {
            attachHandTool(arg === "active");
        });

        var attachHandTool = (active) => {
            if (this.mousePressed || this._currentAction === this._handTool) {
                return;
            }

            if (this._currentAction && this._currentAction.pause) {
                this._currentAction.pause();
            }

            this._previousAction = this._currentAction; // should remember previous action
            this._handTool.attach(this.mousePressed || active);            
            this._currentAction = this._handTool;
        }

        actionManager.registerAction("zoomTool" as WorkspaceTool, "@tool.zoom", "Drawing utils", () => {
            attachZoomTool();
        });

        var attachZoomTool = () => {
            if (this.mousePressed || this._currentAction === this._zoomTool) {
                return;
            }

            if (this._currentAction && this._currentAction.pause) {
                this._currentAction.pause();
            }

            this._previousAction = this._currentAction; // should remember previous action
            this._zoomTool.attach(this.mousePressed);
            this._currentAction = this._zoomTool;
        }
    }

    private mouseDown() {
        this.mousePressed = true;
    }
    private mouseUp() {
        this.mousePressed = false;
    }

    dispose() {

    }
}


