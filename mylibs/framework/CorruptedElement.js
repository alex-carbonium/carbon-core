import Rectangle from "./Rectangle";
import PropertyMetadata from "./PropertyMetadata";
import Brush from "./Brush";
import logger from "../logger";
import ObjectFactory from "./ObjectFactory";
import {Types} from "./Defs";

class CorruptedElement extends Rectangle {
    constructor(data) {
        super();
        var props = data ? (data.props || {}) : {};
        this.setProps({
            originalData: JSON.stringify(data),
            width: (props.width || 100),
            height: (props.height || 100),
            x: (props.x || 0),
            y: (props.y || 0),
            stroke: (Brush.createFromColor('red'))
        });

        if (data) { //else restoring from json
            this.id(data.id);
        }

        setTimeout(function () {
            try {
                if (data) {
                    logger.fatal("Corrupted elements", data);
                }
                else {
                    logger.error("Existing corrupted elements");
                }
            } catch (e) {

            }
        }, 1);

    }

    drawSelf(context, w, h) {
        Rectangle.prototype.drawSelf.apply(this, arguments);
        context.save();
        Brush.setStroke(this.stroke(), context, 0, 0, w, h);
        context.linePath(0, 0, 0 + w, 0 + h);
        context.stroke();
        context.linePath(0, 0 + h, 0 + w, 0);
        context.stroke();
        context.restore();
    }
}
CorruptedElement.prototype.t = Types.CorruptedElement;

PropertyMetadata.registerForType(CorruptedElement, {
    originalData: {
        useInModel: true
    }
});

ObjectFactory.objectCreationFailed.bind(args => {
    args.newObject = new CorruptedElement(args.data);
});

export default CorruptedElement;