import {registerExample} from "./example";
import Rectangle from "../../framework/Rectangle";
import Selection from "../../framework/SelectionModel";

registerExample("skew: simple", function(app, artboard){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.applyTranslation({x: 200, y: 300});
    artboard.add(rect1);

    var rect2 = new Rectangle();
    rect2.setProps({width: 100, height: 100, name: 'rect 2'});
    rect2.applyTranslation({x: 400, y: 300});
    rect2.applyRotation(20, rect2.center());
    artboard.add(rect2);

    var rect3 = new Rectangle();
    rect3.setProps({width: 100, height: 100, name: 'rect 3'});
    rect3.applyTranslation({x: 200, y: 500});
    rect3.applyRotation(25, rect3.center());
    artboard.add(rect3);

    var rect4 = rect3.clone();
    rect4.setProps({name: 'rect 4'});
    rect4.applyDirectedTranslation({x: 120, y: 0});
    artboard.add(rect4);

    Selection.makeSelection([rect1, rect2]);
    app.actionManager.invoke("group");
    window.group = Selection.getSelection()[0];

    window.rect1 = rect1;
    window.rect2 = rect2;
    window.rect3 = rect3;
});