import Container from "../Container";
import PropertyMetadata from "../PropertyMetadata";
import Brush from "../Brush";
import {Overflow, Types, ArrangeStrategies} from "../Defs";
import {IGroupContainer} from "../CoreModel";

export default class RepeatCell extends Container implements IGroupContainer {
    constructor() {
        super();
    }

    displayType(){
        return "Repeat cell";
    }

    canSelect(){
        return false;
    }

    canRotate(){
        return false;
    }
    
    getSnapPoints(){
        return null;
    }

    wrapSingleChild(){
        return false;
    }

    translateChildren(){
        return true;
    }
}
RepeatCell.prototype.t = Types.RepeatCell;

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
    },
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Group
    }
});