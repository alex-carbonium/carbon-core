import {registerExample} from "./example";
import Rectangle from "../../framework/Rectangle";
import Circle from "../../framework/Circle";
import Brush from "../../framework/Brush";
import Selection from "../../framework/SelectionModel";
import {StrokePosition} from "../../framework/Defs";

registerExample("path: simple", function(app, artboard){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.applyRotation(20, rect1.center());
    rect1.applyTranslation({x: 200, y: 300});
    var path1 = rect1.convertToPath();
    path1.setProps({stroke: Brush.createFromColor("red"), strokePosition: StrokePosition.Center});
    artboard.add(path1);

    Selection.makeSelection([path1]);

    window.path1 = path1;
});

registerExample("path: in a group", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'path1 1', stroke: Brush.createFromColor("red"), strokePosition: StrokePosition.Center});
    rect1.applyRotation(20, rect1.center());
    rect1.applyTranslation({x: 200, y: 300});
    var path1 = rect1.convertToPath();
    app.activePage.add(path1);

    var rect2 = rect1.clone();
    rect2.applyTranslation({x: 200, y: 0});
    rect2.applyRotation(-20, rect2.center());
    rect2.setProps({name: 'rect 2', stroke: Brush.createFromColor("black"), strokePosition: StrokePosition.Center});
    app.activePage.add(rect2);

    Selection.makeSelection([path1, rect2]);
    app.actionManager.invoke("groupElements");
    var group = Selection.selectedElements()[0];
    group.applyRotation(20, group.center());

    window.path1 = path1;
    window.rect2 = rect2;
    window.group = group;
});

registerExample("path: compound intersect", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect', fill: Brush.createFromColor("red")});
    rect1.applyTranslation({x: 200, y: 300});
    var path1 = rect1.convertToPath();
    app.activePage.add(path1);

    var circle1 = new Circle();
    circle1.setProps({width: 80, height: 80});
    circle1.applyTranslation({x: 210, y: 350});
    circle1.setProps({name: 'circle', stroke: Brush.createFromColor("black"), strokePosition: StrokePosition.Center});
    app.activePage.add(circle1);

    Selection.makeSelection([path1, circle1]);
    app.actionManager.invoke("pathIntersect");
    window.compound = Selection.selectedElements()[0];
});

registerExample("path: compound difference", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect', fill: Brush.createFromColor("red")});
    rect1.applyTranslation({x: 200, y: 300});
    var path1 = rect1.convertToPath();
    app.activePage.add(path1);

    var circle1 = new Circle();
    circle1.setProps({width: 60, height: 160});
    circle1.applyTranslation({x: 220, y: 270});
    circle1.setProps({name: 'circle'});
    app.activePage.add(circle1);

    Selection.makeSelection([path1, circle1]);
    app.actionManager.invoke("pathDifference");
    window.compound = Selection.selectedElements()[0];
});

registerExample("path: stroke position", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.applyTranslation({x: 200, y: 300});
    var path1 = rect1.convertToPath();
    path1.setProps({stroke: Brush.createFromColor("red"), strokePosition: StrokePosition.Outside, strokeWidth: 8});
    app.activePage.add(path1);

    var rect2 = new Rectangle();
    rect2.setProps({width: 100, height: 100, name: 'rect 1'});
    rect2.applyTranslation({x: 400, y: 300});
    var path2 = rect2.convertToPath();
    path2.setProps({stroke: Brush.createFromColor("blue"), strokePosition: StrokePosition.Inside, strokeWidth: 8});
    app.activePage.add(path2);

    Selection.makeSelection([path1]);

    window.path1 = path1;
    window.path2 = path2;
});