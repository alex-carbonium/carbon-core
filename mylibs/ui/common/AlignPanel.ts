import Container from "../../framework/Container";
import PropertyMetadata from "../../framework/PropertyMetadata";
import {ArrangeStrategies, Types} from "../../framework/Defs";

export default class AlignPanel extends Container {

}
AlignPanel.prototype.t = Types.AlignPanel;

PropertyMetadata.registerForType(AlignPanel, {
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Align
    }
});
