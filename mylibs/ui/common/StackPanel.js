import Container from "../../framework/Container";
import PropertyMetadata from "../../framework/PropertyMetadata";
import {ArrangeStrategies, Types} from "../../framework/Defs";

export default class StackPanel extends Container {

}
StackPanel.prototype.t = Types.StackPanel;

PropertyMetadata.registerForType(StackPanel, {
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Stack
    }
});
