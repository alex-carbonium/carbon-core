import {registerExample} from "./example";
import Rectangle from "../../framework/Rectangle";
import Selection from "../../framework/SelectionModel";
import Text from "../../framework/text/Text";
import Frame from "../../framework/Frame";
import FrameSource from "../../framework/FrameSource";

registerExample("skew", function(app){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.applyTranslation({x: 200, y: 300});
    app.activePage.add(rect1);

    var rect2 = new Rectangle();
    rect2.setProps({width: 100, height: 100, name: 'rect 2'});
    rect2.applyTranslation({x: 400, y: 300});
    rect2.applyRotation(20);
    app.activePage.add(rect2);

    var rect3 = new Rectangle();
    rect3.setProps({width: 100, height: 100, name: 'rect 3'});
    rect3.applyTranslation({x: 200, y: 500});
    rect3.applyRotation(25);
    app.activePage.add(rect3);

    Selection.makeSelection([rect1, rect2]);
    app.actionManager.invoke("groupElements");
    window.group = Selection.getSelection()[0];

    Selection.makeSelection([rect3]);

    // var frame = new Frame();
    // frame.prepareAndSetProps({source: FrameSource.createFromUrl("https://images.unsplash.com/reserve/9OdCcuk5SPy3BkEB3H1Y_Javier%20Calvo%20010_grande.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max&s=9fb3dd7be5a5fa6df2e9a6785957c900"), width: 200, height: 100});
    // frame.applyTranslation(new Point(200, 700));
    // app.activePage.add(frame);
    //Selection.makeSelection([frame]);

    window.rect1 = rect1;
    window.rect2 = rect2;
    window.rect3 = rect3;
    window.frame = frame;
});