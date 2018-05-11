import {registerExample} from "./example";
import { Rectangle, Origin, Selection } from "carbon-core";

let w = window as any;

registerExample("skew: simple", function(app, view, artboard){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.translate(200, 300);
    artboard.add(rect1);

    var rect2 = new Rectangle();
    rect2.setProps({width: 100, height: 100, name: 'rect 2'});
    rect2.translate(400, 300);
    rect2.rotate(20, Origin.Center);
    artboard.add(rect2);

    var rect3 = new Rectangle();
    rect3.setProps({width: 100, height: 100, name: 'rect 3'});
    rect3.translate(200, 500);
    rect3.rotate(25, Origin.Center);
    artboard.add(rect3);

    var rect4 = rect3.clone();
    rect4.setProps({name: 'rect 4'});
    rect4.translateInRotationDirection(120, 0);
    artboard.add(rect4);

    Selection.makeSelection([rect1, rect2]);
    app.actionManager.invoke("group");
    w.group = Selection.elements[0];

    w.rect1 = rect1;
    w.rect2 = rect2;
    w.rect3 = rect3;
});