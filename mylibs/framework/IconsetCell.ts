import Canvas from "../ui/common/Canvas";

import PropertyMetadata from "./PropertyMetadata";
import {Types, Overflow} from "./Defs";
import Brush from "./Brush";

export class IconsetCell extends Canvas {
    canAlign() {
        return false;
    }
    canGroup() {
        return false;
    }
    canChangeOrder() {
        return false;
    }
    multiselectTransparent() {
        return true;
    }
    canBeRemoved() {
        return false;
    }
    resizeDimensions() {
        return 0;
    }
    canRotate() {
        return false;
    }
    canMultiSelect() {
        return false;
    }
    canDrag() {
        return false;
    }
    canBeAccepted() {
        return false;
    }
    allowColorOverride() {
        return false;
    }
}

IconsetCell.prototype.t = Types.IconSetCell;

PropertyMetadata.registerForType(IconsetCell, {
    groups: function (element) {
        return [
            {
                label: "",
                properties: []
            },
        ];
    },
    overflow: {
        defaultValue: Overflow.Clip
    },
    fill: {
        defaultValue: Brush.White
    }
});
