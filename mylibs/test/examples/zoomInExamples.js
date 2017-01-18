import {registerExample} from "./example";
import Rectangle from "../../framework/Rectangle";
import Selection from "../../framework/SelectionModel";
import Rect from "../../math/rect";
import Environment from "../../environment";

registerExample("zoom in: rect", function(app, artboard){
    app.activePage._placeBeforeRender = false;

    var rect = new Rectangle();
    rect.prepareAndSetProps({br: new Rect(0, 0, 10, 10), name: 'rect 1'});
    rect.applyTranslation({x: 100.5, y: 100.5});
    artboard.add(rect);

    Environment.view.scale(20.5);
    Environment.view.scrollX(1853);
    Environment.view.scrollY(1916);

    Selection.makeSelection([rect]);
});

registerExample("zoom in: path", function(app, artboard){
    app.activePage._placeBeforeRender = false;

    var rect = new Rectangle();
    rect.prepareAndSetProps({br: new Rect(0, 0, 10.5, 10.5), name: 'rect 1'});
    rect.applyTranslation({x: 100.2, y: 100.2});
    var path = rect.convertToPath();
    artboard.add(path);

    Environment.view.scale(20.5);
    Environment.view.scrollX(1853);
    Environment.view.scrollY(1916);

    Selection.makeSelection([path]);

    window.path = path;
});