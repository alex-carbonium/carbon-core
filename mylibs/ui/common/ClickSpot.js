import UIElement from "../../framework/UIElement";
import PropertyMetadata from "../../framework/PropertyMetadata";
import Resources from "../../framework/Resources";
import {Types} from "../../framework/Defs";

export default class ClickSpot extends UIElement {
    drawSelf(context, w, h, environment){
        //TODO: fix
        if (App.Current.activePage && App.Current.activePage.preview()) //zone shouldn't be visible in preview mode
            return;
        var x = 0;
        var y = 0;
        var x2 = x + w, y2 = y + h;

        context.save();
        var pattern = context.createPattern(Resources['empty_view'], "repeat");
        context.fillStyle = pattern;
        context.globalAlpha = 0.1;
        context.fillRect(x, y, w, h);

        context.globalAlpha = 1;
        context.strokeStyle = "#000000";
        context.beginPath();
        context.setLineDash([3, 5]);
        context.rect(0, 0, w, h);
        context.stroke();

        context.restore();

        super.drawSelf.apply(this, arguments);
    }


}
ClickSpot.prototype.t = Types.ClickSpot;

PropertyMetadata.registerForType(ClickSpot, {
    width:{
        defaultValue: 64
    },
    height:{
        defaultValue: 64
    }
});