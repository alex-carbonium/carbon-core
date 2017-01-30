import RepeatContainer from "./RepeatContainer";
import RepeatCell from "./RepeatCell";
import Selection from "framework/SelectionModel";
import {combineRects} from "math/math";
import Rect from "math/rect";

require("./RepeatArrangeStrategy");

export default {
    run: function(elements){
        var element = elements[0];
        var parent = element.parent();
        var repeater = new RepeatContainer();

        var globalRect = element.getBoundingBoxGlobal();
        var x1 = globalRect.x
            , y1 = globalRect.y
            , x2 = globalRect.width + x1
            , y2 = globalRect.height + y1;

        for (let i = 1, l = elements.length; i < l; ++i) {
            let element = elements[i];
            let globalRect = element.getBoundingBoxGlobal();

            if (globalRect.x < x1) x1 = globalRect.x;
            if (globalRect.y < y1) y1 = globalRect.y;
            if (globalRect.x + globalRect.width > x2) x2 = globalRect.x + globalRect.width;
            if (globalRect.y + globalRect.height > y2) y2 = globalRect.y + globalRect.height;
        }

        var cell = new RepeatCell();
        var t = {x: -x1, y: -y1};
        for (let i = 0, l = elements.length; i < l; ++i) {
            let element = elements[i];

            element.prepareAndSetProps({id: element.id()});
            element.applyTranslation(t);

            cell.add(element);
            element.resetGlobalViewCache();
        }
        cell.arrange({newRect:Rect.Zero, oldRect:Rect.Zero});

        var pos = parent.global2local({x: x1, y: y1});
        repeater.setProps({width: x2 - x1, height: y2 - y1, masterWidth: x2 - x1, masterHeight: y2 - y1});
        repeater.applyTranslation({x: pos.x, y: pos.y})
        parent.insert(repeater, parent.getChildren().length);
        repeater.insert(cell, 0);

        Selection.makeSelection([repeater]);
    }
}
