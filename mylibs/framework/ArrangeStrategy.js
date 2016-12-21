import CanvasStrategy from "./CanvasArrangeStrategy";
import StackStrategy from "./StackArrangeStrategy";
import DockStrategy from "./DockArrangeStrategy";
import AlignStrategy from "./AlignArrangeStrategy";
import {ArrangeStrategies} from "./Defs";

var ArrangeStrategy = {
    _strategies: [],
    arrange: function(container, e){
        var strategy = this.findStrategy(container);
        return strategy.arrange(container, e);
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
    },

    arrangeRoots: function(elements){
        var roots = [];
        for (let i = 0; i < elements.length; i++){
            var r = elements[i].primitiveRoot();
            if (r && roots.indexOf(r) === -1){
                roots.push(r);
            }
        }

        for (let i = 0; i < roots.length; i++){
            roots[i].arrangeRootDepthFirst();
        }
    }
};

ArrangeStrategy.register(ArrangeStrategies.Canvas, CanvasStrategy);
ArrangeStrategy.register(ArrangeStrategies.Align, AlignStrategy);
ArrangeStrategy.register(ArrangeStrategies.Dock, DockStrategy);
ArrangeStrategy.register(ArrangeStrategies.Stack, StackStrategy);

export default ArrangeStrategy;