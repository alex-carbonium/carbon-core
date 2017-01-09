import {registerExample} from "./example";
import Line from "../../framework/Line";
import Selection from "../../framework/SelectionModel";

registerExample("shape: lines", function(app, artboard){
    var line1 = new Line();
    line1.prepareAndSetProps({x1: 0, y1: 0, x2: 100, y2: 50, name: 'line 1'});
    line1.applyTranslation({x: 100, y: 300});
    artboard.add(line1);
    //Selection.makeSelection([line1]);

    var line2 = new Line();
    line2.prepareAndSetProps({x1: 0, y1: 0, x2: 100, y2: 80, name: 'line 2'});
    line2.applyTranslation({x: 300, y: 300});
    artboard.add(line2);

    var line3 = new Line();
    line3.prepareAndSetProps({x1: 100, y1: 0, x2: 0, y2: 40, name: 'line 3'});
    line3.applyTranslation({x: 450, y: 300});
    artboard.add(line3);

    Selection.makeSelection([line2, line3]);
    app.actionManager.invoke("groupElements");

    window.line1 = line1;
});