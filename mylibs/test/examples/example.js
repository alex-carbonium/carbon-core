import {app, Intl, Environment, ActionManager} from "../../SketchFacade";
import RenderLoop from "../../RenderLoop";
import ArtboardPage from "../../ui/pages/ArtboardPage";
import Selection from "../../framework/SelectionModel";
import Matrix from "../../math/matrix";
import Point from "../../math/point";
import backend from "../../backend";
import logger from "../../logger";

var viewContainer = document.getElementById("viewContainer");
var viewport = document.getElementById("viewport");
var canvas = document.getElementById("app_canvas");
var middleCanvas = document.getElementById("middle_canvas");
var upperCanvas = document.getElementById("app_upperCanvas");
var htmlPanel = document.getElementById("htmlPanel");
var htmlLayer = document.getElementById("htmlLayer");

RenderLoop.init(app, viewContainer, viewport, canvas, middleCanvas, upperCanvas, htmlPanel, htmlLayer);

Intl.instance = {
    formatMessage(msg, data){
        var result = msg.defaultMessage;
        if (data && data.index){
            result += " " + data.index;
        }
        return result;
    }
};

var examples = {};

var selector = document.getElementById("selector");
selector.addEventListener("change", e => runExample(e.target.value));

var rerun = document.getElementById("rerun");
rerun.addEventListener("click", e => runExample(selector.value));
document.body.addEventListener("keyup", e => {
    if (e.code === "F3"){
        runExample(selector.value)
    }
});

export function registerExample(name, fn){
    var option = document.createElement("option");
    option.text = name;
    selector.add(option);
    examples[name] = fn;
}

function runExample(name){
    Selection.makeSelection([]);
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

    var fn = examples[name];
    fn(app, page.getActiveArtboard());

    history.replaceState({}, document.title, location.pathname + "?" + encodeURIComponent(name));
}

backend.init(logger, {services: '', storage: '', file: '', cdn: ''});

window.Matrix = Matrix;
window.Point = Point;

window.onload = function(){
    var q = location.search.substr(1);
    if (q){
        var example = decodeURIComponent(q);
        selector.value = example;
        runExample(example);
    }
};
