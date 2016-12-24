import {registerExample} from "./example";
import Rectangle from "../../framework/Rectangle";
import Brush from "../../framework/Brush";
import Selection from "../../framework/SelectionModel";
import {StrokePosition} from "../../framework/Defs";

registerExample("path: simple", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.applyRotation(20, rect1.center());
    rect1.applyTranslation({x: 200, y: 300});
    var path1 = rect1.convertToPath();
    path1.setProps({stroke: Brush.createFromColor("red", 1, StrokePosition.Center)});
    app.activePage.add(path1);

    Selection.makeSelection([path1]);

    window.path1 = path1;
});

registerExample("path: in a group", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'path1 1', stroke: Brush.createFromColor("red", 1, StrokePosition.Center)});
    rect1.applyRotation(20, rect1.center());
    rect1.applyTranslation({x: 200, y: 300});
    var path1 = rect1.convertToPath();
    app.activePage.add(path1);

    var rect2 = rect1.clone();
    rect2.applyTranslation({x: 200, y: 0});
    rect2.applyRotation(-20, rect2.center());
    rect2.setProps({name: 'rect 2', stroke: Brush.createFromColor("black", 1, StrokePosition.Center)});
    app.activePage.add(rect2);

    Selection.makeSelection([path1, rect2]);
    app.actionManager.invoke("groupElements");
    var group = Selection.selectedElements()[0];

    window.path1 = path1;
    window.group = group;
});