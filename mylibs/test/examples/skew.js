import {registerExample} from "./example";
import Rectangle from "../../framework/Rectangle";
import Selection from "../../framework/SelectionModel";

registerExample("skew", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.setTranslation({x: 200, y: 300});
    app.activePage.add(rect1);

    var rect2 = new Rectangle();
    rect2.setProps({width: 100, height: 100, name: 'rect 2'});
    rect2.setTranslation({x: 400, y: 300});
    rect2.rotate(20);
    app.activePage.add(rect2);

    var rect3 = new Rectangle();
    rect3.setProps({width: 100, height: 100, name: 'rect 3'});
    rect3.setTranslation({x: 200, y: 500});
    rect3.rotate(25);
    window.bb = rect3.getBoundingBox();
    app.activePage.add(rect3);

    Selection.makeSelection([rect1, rect2]);
    app.actionManager.invoke("groupElements");
    window.group = Selection.getSelection()[0];

    Selection.makeSelection([rect3]);

    window.rect1 = rect1;
    window.rect2 = rect2;
    window.rect3 = rect3;
});