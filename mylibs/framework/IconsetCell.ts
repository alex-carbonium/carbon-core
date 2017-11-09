import Canvas from "../ui/common/Canvas";

import PropertyMetadata from "./PropertyMetadata";
import {Types, Overflow} from "./Defs";
import Brush from "./Brush";
import { RenderEnvironment, RenderFlags } from "carbon-core";

export class IconsetCell extends Canvas {
    canAlign() {
        return false;
    }
    fillBackground(context, l, t, w, h, environment: RenderEnvironment) {
        if((environment.flags & RenderFlags.ArtboardFill)) {
            super.fillBackground(context, l, t, w, h, environment);
        }
    }
    strokeBorder(context, w, h, environment: RenderEnvironment) {
        if((environment.flags & RenderFlags.ArtboardFill)) {
            super.strokeBorder(context, w, h, environment);
        }
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

    clearRenderingCache() {
        super.clearRenderingCache();
        delete this.runtimeProps.refclone;
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
