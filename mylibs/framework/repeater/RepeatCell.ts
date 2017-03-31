import Container from "../Container";
import PropertyMetadata from "../PropertyMetadata";
import Brush from "../Brush";
import {Overflow, Types, ArrangeStrategies} from "../Defs";
import {IGroupContainer} from "carbon-core";
import UserSettings from "../../UserSettings";
import Environment from "../../environment";
import GlobalMatrixModifier from "../GlobalMatrixModifier";

export default class RepeatCell extends Container implements IGroupContainer {
    prepareProps(changes){
        super.prepareProps(changes);

        if (changes.hasOwnProperty("br")){
            changes.br = changes.br.round();
        }

        if (changes.hasOwnProperty("m")){
            changes.m = changes.m.withRoundedTranslation();
        }
    }

    propsUpdated(newProps, oldProps, mode){
        super.propsUpdated(newProps, oldProps, mode);
        //need to store last size change, but not the first one from 0 to width
        if (newProps.hasOwnProperty("br") && oldProps.hasOwnProperty("br") && oldProps.br.width){
            this.runtimeProps.newBr = newProps.br;
            this.runtimeProps.oldBr = oldProps.br;
        }
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

    createPos(x, y): number[]{
        if (x === this.props.pos[0] && y === this.props.pos[1]){
            return this.props.pos;
        }
        return [x, y];
    }

    activeGroup(): boolean{
        return this.parent().activeGroup();
    }

    lockGroup(){
        this.runtimeProps.unlocked = false;
    }
    unlockGroup(): boolean{
        this.runtimeProps.unlocked = true;
        this.parent().runtimeProps.lastActiveCell = this;
        return true;
    }

    showBoundaryWhenTransparent(): boolean{
        return true;
    }

    strokeBorder(context, w, h) {
        if (this.runtimeProps.unlocked) {
            super.strokeBorder(context, w, h);
        }
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
    },
    pos: {
        defaultValue: [0, 0]
    }
});