import {registerExample} from "./example";
import { Rectangle, Selection, Rect, Environment } from "carbon-core";

let w = window as any;

registerExample("zoom in: rect", function(app, artboard){
    app.activePage._placeBeforeRender = false;

    var rect = new Rectangle();
    rect.prepareAndSetProps({br: new Rect(0, 0, 10, 10), name: 'rect 1'});
    rect.translate(100.5, 100.5);
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
    rect.translate(100.2, 100.2);
    var path = rect.convertToPath();
    artboard.add(path);

    Environment.view.scale(20.5);
    Environment.view.scrollX(1853);
    Environment.view.scrollY(1916);

    Selection.makeSelection([path]);

    w.path = path;
});

registerExample("zoom in: group", function(app, artboard){
    app.activePage._placeBeforeRender = false;

    var rect1 = new Rectangle();
    rect1.prepareAndSetProps({br: new Rect(0, 0, 10, 10), name: 'rect1 1'});
    rect1.translate(100, 100);
    artboard.add(rect1);

    var rect2 = rect1.clone();
    rect2.translate(12, 0);
    artboard.add(rect2);

    Environment.view.scale(13);
    Environment.view.scrollX(1182);
    Environment.view.scrollY(1098);

    Selection.makeSelection([rect1, rect2]);
    app.actionManager.invoke("group");
});