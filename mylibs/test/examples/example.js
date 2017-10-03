import {app, Intl, Environment, ActionManager} from "../../CarbonCore";
import RenderLoop from "../../framework/render/RenderLoop";
import ArtboardPage from "../../ui/pages/ArtboardPage";
import Selection from "../../framework/SelectionModel";
import Matrix from "../../math/matrix";
import Point from "../../math/point";
import ResizeOptions from "../../decorators/ResizeOptions";
import backend from "../../backend";
import logger from "../../logger";
import CoreIntl from "../../CoreIntl";

app.setProps({noConfirmOnClose: true});

var viewport = document.getElementById("viewport");
var renderLoop = new RenderLoop();
renderLoop.mountDesignerView(app, viewport);

CoreIntl.registerTestInstance();

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
    var artboard = page.getActiveArtboard();

    window['page'] = page;
    window['artboard'] = artboard;

    fn(app, artboard);

    history.replaceState({}, document.title, location.pathname + "?" + encodeURIComponent(name));
}

window.Matrix = Matrix;
window.Point = Point;
window.ResizeOptions = ResizeOptions;

window.onload = function(){
    var q = location.search.substr(1);
    if (q){
        var example = decodeURIComponent(q);
        selector.value = example;
        runExample(example);
    }
};
