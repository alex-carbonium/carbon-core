import {registerExample} from "./example";
import Rectangle from "../../framework/Rectangle";
import Selection from "../../framework/SelectionModel";
import {renderer} from "../../framework/render/Renderer";
import Brush from "../../framework/Brush";
import Rect from "../../math/rect";
import Environment from "../../environment";
import {StrokePosition} from "../../framework/Defs";

registerExample("dataUrl: artboard zoomed out", function(app, artboard){
    artboard.boundaryRect(Rect.fromSize(400, 800));
    artboard.fill(Brush.createFromColor("green"));
    artboard.applyTranslation({x: 1000, y: 0});

    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1', fill: Brush.createFromColor("red")});
    artboard.add(rect1);

    var rect2 = rect1.clone();
    rect2.setProps({name: 'rect 2'});
    rect2.applyTranslation({x: 300, y: 700});
    artboard.add(rect2);

    Environment.view.draw();

    //var dataUrl = renderer.renderElementToDataUrl(artboard, Rect.fromSize(300, 300));
    //window.open(dataUrl, "_blank");
});

registerExample("dataUrl: page", function(app, artboard){
    artboard.boundaryRect(Rect.fromSize(400, 800));
    artboard.fill(Brush.createFromColor("green"));
    artboard.applyTranslation({x: 1000, y: 0});

    var artboard2 = artboard.clone();
    artboard.fill(Brush.createFromColor("red"));
    artboard2.applyTranslation({x: 600, y: 0});
    app.activePage.add(artboard2);

    Environment.view.draw();

    //var dataUrl = renderer.elementToDataUrl(app.activePage, Rect.fromSize(300, 300));
    //window.open(dataUrl, "_blank");
});

registerExample("dataUrl: detached element", function(app, artboard){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1',
        fill: Brush.createFromColor("red"),
        stroke: Brush.createFromColor("white"),
        strokePosition: StrokePosition.Inside,
        strokeWidth: 5
    });

    Environment.view.draw();

    //var dataUrl = Environment.view.renderElementToDataUrl(rect1, Rect.fromSize(300, 300));
    //window.open(dataUrl, "_blank");
});