import UIElement from "framework/UIElement";
import PropertyMetadata from "framework/PropertyMetadata";
import {Types} from "../../framework/Defs";

export default class Guide extends UIElement{
    getSnapPoints(){
        return this.props.snapPoints;
    }

}
Guide.prototype.t = Types.Guide;

PropertyMetadata.registerForType(Guide, {});