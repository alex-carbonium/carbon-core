import CanvasStrategy from "./CanvasArrangeStrategy";
import StackStrategy from "./StackArrangeStrategy";
import DockStrategy from "./DockArrangeStrategy";
import AlignStrategy from "./AlignArrangeStrategy";
import { ArrangeStrategies, ChangeMode } from "./Defs";

var ArrangeStrategy = {
    _strategies: [],
    arrange: function(container, e, mode?: ChangeMode){
        var strategy = this.findStrategy(container);
        strategy.arrange(container, e, mode);
    },
    register: function(index, instance){
        this._strategies[index] = instance;
    },
    findStrategy: function(container){
        var strategy = this._strategies[container.props.arrangeStrategy];
        if (!strategy){
            throw new Error("Unknown arrange strategy " + container.props.arrangeStrategy);
        }
        return strategy;
    }
};

ArrangeStrategy.register(ArrangeStrategies.Canvas, CanvasStrategy);
ArrangeStrategy.register(ArrangeStrategies.Align, AlignStrategy);
ArrangeStrategy.register(ArrangeStrategies.Dock, DockStrategy);
ArrangeStrategy.register(ArrangeStrategies.Stack, StackStrategy);

export default ArrangeStrategy;