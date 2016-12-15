import {app, Intl, Environment, ActionManager} from "../../SketchFacade";
import RenderLoop from "../../RenderLoop";
import ArtboardPage from "../../ui/pages/ArtboardPage";
import Matrix from "../../math/matrix";
import UserSettings from "../../UserSettings";

var viewContainer = document.getElementById("viewContainer");
var viewport = document.getElementById("viewport");
var canvas = document.getElementById("app_canvas");
var middleCanvas = document.getElementById("middle_canvas");
var upperCanvas = document.getElementById("app_upperCanvas");
var htmlPanel = document.getElementById("htmlPanel");
var htmlLayer = document.getElementById("htmlLayer");

RenderLoop.init(app, viewContainer, viewport, canvas, middleCanvas, upperCanvas, htmlPanel, htmlLayer);

Intl.instance = {
    formatMessage(msg){
        return msg.defaultMessage;
    }
};

export function registerExample(name, fn){
    app.unload();

    app.init();
    app.setProps({
        noConfirmOnClose: true
    });

    app.initExtensions();

    var page = new ArtboardPage();
    page.setProps({
        width: 600,
        height: 600
    });
    app.addPage(page);
    app.raiseLoaded();

    fn(app);
}

UserSettings.showBoundingBoxes = true;

window.Matrix = Matrix;
