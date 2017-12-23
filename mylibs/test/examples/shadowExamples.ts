import {registerExample} from "./example";
import { Rectangle, Selection, Shadow, Brush } from "carbon-core";

registerExample("shadow: outset", function(app, artboard){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1'});
    rect1.translate(200, 300);
    rect1.setProps({shadows:[Shadow.create(20, 20, 20, 'rgba(0,0,0,.5)')]});
    artboard.add(rect1);

    var rect1s = new Rectangle();
    rect1s.setProps({width: 120, height: 120, name: 'rect 1'});
    rect1s.translate(210, 310);
    rect1s.setProps({fill: Brush.Empty, stroke: Brush.createFromCssColor('red')});
    artboard.add(rect1s);

    var rect2 = new Rectangle();
    rect2.setProps({width: 100, height: 100, name: 'rect 2'});
    rect2.translate(200, 500);
    rect2.setProps({shadows:[Shadow.create(20, 20, 20, 'rgba(0,0,0,.5)', true)]});
    artboard.add(rect2);


    var rect3 = new Rectangle();
    rect3.setProps({width: 100, height: 100, name: 'rect 2'});
    rect3.translate(400, 300);
    rect3.setProps({shadows:[Shadow.create(20, 20, 20, 'rgba(0,0,0,.5)', false, 80)]});
    artboard.add(rect3);

    //Selection.makeSelection([line1]);

});