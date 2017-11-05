import {registerExample} from "./example";
import { model, Selection } from "carbon-core";

let w = window as any;

registerExample("shape: lines", function(app, artboard){
    var line1 = model.createLine();
    line1.prepareAndSetProps({x1: 0, y1: 0, x2: 100, y2: 50, name: 'line 1'});
    line1.translate(100, 300);
    artboard.add(line1);
    //Selection.makeSelection([line1]);

    var line2 = model.createLine();
    line2.prepareAndSetProps({x1: 0, y1: 0, x2: 100, y2: 80, name: 'line 2'});
    line2.translate(300, 300);
    artboard.add(line2);

    var line3 = model.createLine();
    line3.prepareAndSetProps({x1: 100, y1: 0, x2: 0, y2: 40, name: 'line 3'});
    line3.translate(450, 300);
    artboard.add(line3);

    Selection.makeSelection([line2, line3]);
    app.actionManager.invoke("group");

    w.line1 = line1;
});

registerExample("shape: star, polygon", function(app, artboard){
    var star = model.createStar();
    star.prepareAndSetProps({externalRadius: 50, name: 'line 1'});
    star.translate(100, 300);
    artboard.add(star);

    Selection.makeSelection([star]);

    w.star = star;
});