import Container from "../../framework/Container";
import PropertyMetadata from "../../framework/PropertyMetadata";
import {ArrangeStrategies, Types} from "../../framework/Defs";

export default class Canvas extends Container {

}
Canvas.prototype.t = Types.Canvas;

PropertyMetadata.registerForType(Canvas, {
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Canvas
    }
});
