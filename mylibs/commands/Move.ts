import Point from "math/point";
import { ChangeMode, IUIElement } from "carbon-core";

export default {
    run: function(elements: IUIElement[], direction, offset = 1){
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

        elements.forEach(x => x.applyGlobalTranslation(t, false, ChangeMode.Self));
    }
}