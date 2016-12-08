import {registerExample} from "./example";
import Rectangle from "../../framework/Rectangle";

registerExample("skew", function(app){
    var rect = new Rectangle();
    rect.setProps({x: 100, y: 300, width: 100, height: 100});
    rect.setProps({x: 200});
    app.activePage.add(rect);
});