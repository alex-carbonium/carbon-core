import Container from "../../framework/Container";
import PropertyMetadata from "../../framework/PropertyMetadata";
import {ArrangeStrategies, Types} from "../../framework/Defs";

export default class DockPanel extends Container {

}
DockPanel.prototype.t = Types.DockPanel;

PropertyMetadata.registerForType(DockPanel, {
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Dock
    }
});
