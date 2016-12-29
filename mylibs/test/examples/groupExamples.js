import {registerExample} from "./example";
import Rectangle from "../../framework/Rectangle";
import Selection from "../../framework/SelectionModel";

registerExample("group: nested, multilevel", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.applyTranslation({x: 100, y: 300});
    app.activePage.add(rect1);

    var rect2 = rect1.clone();
    rect2.setProps({name: 'rect 2'});
    rect2.applyTranslation({x: 100, y: 0});
    app.activePage.add(rect2);

    var rect3 = rect2.clone();
    rect3.setProps({name: 'rect 3'});
    rect3.applyTranslation({x: 150, y: 0});
    rect3.applyRotation(45, rect3.center());
    app.activePage.add(rect3);

    var rect4 = rect3.clone();
    rect4.setProps({name: 'rect 4'});
    rect4.applyTranslation({x: rect3.getBoundingBox().width, y: 0});
    app.activePage.add(rect4);

    Selection.makeSelection([rect1, rect2]);
    app.actionManager.invoke("groupElements");
    var group1 = Selection.selectedElements()[0];

    Selection.makeSelection([rect3, rect4]);
    app.actionManager.invoke("groupElements");
    var group2 = Selection.selectedElements()[0];

    var group3 = group2.clone();
    group3.name("group 3");
    group3.applyTranslation({x: 0, y: group3.getBoundingBox().height + 10});
    app.activePage.add(group3);

    Selection.makeSelection([group2, group3]);
    app.actionManager.invoke("groupElements");
    var group4 = Selection.selectedElements()[0];

    Selection.makeSelection([group1, group4]);
    app.actionManager.invoke("groupElements");
    var group5 = Selection.selectedElements()[0];

    window.rect1 = rect1;
    window.rect2 = rect2;
    window.rect3 = rect3;
    window.rect4 = rect4;
    window.group1 = group1;
    window.group2 = group2;
    window.group3 = group3;
    window.group4 = group4;
    window.group5 = group5;
});