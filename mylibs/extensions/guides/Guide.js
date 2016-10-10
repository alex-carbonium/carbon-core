import UIElement from "framework/UIElement";
import PropertyMetadata from "framework/PropertyMetadata";

export default class Guide extends UIElement{
    getSnapPoints(){
        return this.props.snapPoints;
    }
};

PropertyMetadata.registerForType(Guide, {});