import Container from "../Container";
import PropertyMetadata from "../PropertyMetadata";
import Brush from "../Brush";
import {Overflow, Types} from "../Defs";

export default class RepeatCell extends Container{
    displayType(){
        return "Repeat cell";
    }
    canSelect(){
        return false;
    }
    getSnapPoints(){
        return null;
    }
}
RepeatCell.prototype.t = Types.RepeatCell;

RepeatCell.prototype._angleEditable = false;

PropertyMetadata.registerForType(RepeatCell, {
    // fill: {
    //     defaultValue: Brush.createFromColor("lightgreen")
    // },
    trackChildren: {
        defaultValue: true
    },
    repeatable: {
        defaultValue: true
    },
    allowMoveOutChildren:{
        defaultValue: false
    },
    hitTransparent: {
        defaultValue: true
    },
    overflow: {
        defaultValue: Overflow.AdjustBoth
    }
});