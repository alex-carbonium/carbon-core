import {registerExample} from "./example";
import { Rectangle, Origin, Brush, StrokePosition, Selection, Circle } from "carbon-core";

let w = window as any;

registerExample("path: simple", function(app, view, artboard){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.rotate(20, Origin.Center);
    rect1.translate(200, 300);
    var path1 = rect1.convertToPath();
    path1.setProps({stroke: Brush.createFromCssColor("red"), strokePosition: StrokePosition.Center});
    artboard.add(path1);

    Selection.makeSelection([path1]);

    w.path1 = path1;
});

registerExample("path: in a group", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'path1 1', stroke: Brush.createFromCssColor("red"), strokePosition: StrokePosition.Center});
    rect1.rotate(20, Origin.Center);
    rect1.translate(200, 300);
    var path1 = rect1.convertToPath();
    app.activePage.add(path1);

    var rect2 = rect1.clone();
    rect2.translate(200, 0);
    rect2.rotate(-20, Origin.Center);
    rect2.setProps({name: 'rect 2', stroke: Brush.createFromCssColor("black"), strokePosition: StrokePosition.Center});
    app.activePage.add(rect2);

    Selection.makeSelection([path1, rect2]);
    app.actionManager.invoke("group");
    var group = Selection.elements[0];
    group.rotate(20, Origin.Center);

    w.path1 = path1;
    w.rect2 = rect2;
    w.group = group;
});

registerExample("path: compound intersect", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect', fill: Brush.createFromCssColor("red")});
    rect1.translate(200, 300);
    var path1 = rect1.convertToPath();
    app.activePage.add(path1);

    var circle1 = new Circle();
    circle1.setProps({width: 80, height: 80});
    circle1.translate(210, 350);
    circle1.setProps({name: 'circle', stroke: Brush.createFromCssColor("black"), strokePosition: StrokePosition.Center});
    app.activePage.add(circle1);

    Selection.makeSelection([path1, circle1]);
    app.actionManager.invoke("pathIntersect");
    w.compound = Selection.elements[0];
});

registerExample("path: compound difference", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect', fill: Brush.createFromCssColor("red")});
    rect1.translate(200, 300);
    var path1 = rect1.convertToPath();
    app.activePage.add(path1);

    var circle1 = new Circle();
    circle1.setProps({width: 60, height: 160});
    circle1.translate(220, 270);
    circle1.setProps({name: 'circle'});
    app.activePage.add(circle1);

    Selection.makeSelection([path1, circle1]);
    app.actionManager.invoke("pathDifference");
    w.compound = Selection.elements[0];
});

registerExample("path: stroke position", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.translate(200, 300);
    var path1 = rect1.convertToPath();
    path1.setProps({stroke: Brush.createFromCssColor("red"), strokePosition: StrokePosition.Outside, strokeWidth: 8});
    app.activePage.add(path1);

    var rect2 = new Rectangle();
    rect2.setProps({width: 100, height: 100, name: 'rect 1'});
    rect2.translate(400, 300);
    var path2 = rect2.convertToPath();
    path2.setProps({stroke: Brush.createFromCssColor("blue"), strokePosition: StrokePosition.Inside, strokeWidth: 8});
    app.activePage.add(path2);

    Selection.makeSelection([path1]);

    w.path1 = path1;
    w.path2 = path2;
});