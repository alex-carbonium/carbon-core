import {registerExample} from "./example";
import { Rectangle, Selection, Origin } from "carbon-core";

registerExample("group: nested, multilevel", function(app, artboard){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.translate(100, 300);
    artboard.add(rect1);

    var rect2 = rect1.clone();
    rect2.setProps({name: 'rect 2'});
    rect2.translate(100, 0);
    artboard.add(rect2);

    var rect3 = rect2.clone();
    rect3.setProps({name: 'rect 3'});
    rect3.translate(150, 0);
    rect3.rotate(45, Origin.Center);
    artboard.add(rect3);

    var rect4 = rect3.clone();
    rect4.setProps({name: 'rect 4'});
    rect4.translate(rect3.getBoundingBox().width, 0);
    artboard.add(rect4);

    Selection.makeSelection([rect1, rect2]);
    app.actionManager.invoke("group");
    var group1 = Selection.elements[0];

    Selection.makeSelection([rect3, rect4]);
    app.actionManager.invoke("group");
    var group2 = Selection.elements[0];
    group2.name("group 2");

    var group3 = group2.clone();
    group3.name("group 3");
    group3.translate(0, group3.getBoundingBox().height + 10);
    artboard.add(group3);

    Selection.makeSelection([group2, group3]);
    app.actionManager.invoke("group");
    var group4 = Selection.elements[0];
    group4.name("group 4");

    Selection.makeSelection([group1, group4]);
    app.actionManager.invoke("group");
    var group5 = Selection.elements[0];
    group5.name("group 5");

    var w = window as any;
    w.rect1 = rect1;
    w.rect2 = rect2;
    w.rect3 = rect3;
    w.rect4 = rect4;
    w.group1 = group1;
    w.group2 = group2;
    w.group3 = group3;
    w.group4 = group4;
    w.group5 = group5;
});