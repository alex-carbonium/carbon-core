import Point from "math/point";
import {ChangeMode} from "../framework/Defs";

export default {
    run: function(elements, direction, offset = 1){
        var t = new Point(0, 0);
        switch (direction) {
            case "u":
                t.y = -offset;
                break;
            case "d":
                t.y = offset;
                break;
            case "l":
                t.x = -offset;
                break;
            case "r":
                t.x = offset;
                break;
        }

        elements.forEach(x => x.applyGlobalTranslation(t, ChangeMode.Self));
    }
}