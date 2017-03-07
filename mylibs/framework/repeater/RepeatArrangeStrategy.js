import RepeatViewListener from "./RepeatViewListener";;
import ArrangeStrategy from "../ArrangeStrategy";
import {ArrangeStrategies, ChangeMode} from "../Defs";
import Point from "../../math/point";

var debug = require("DebugUtil")("carb:repeatArrangeStrategy");


var Strategy = {
    arrange: function(container, e, changeMode){
        var items = container.children;
        if (!items.length){
            return;
        }

        var master = items[0];
        var masterBr = master.br();
        var masterBb = master.getBoundingBox();
        var masterWidth = masterBr.width;//container.props.masterWidth;
        var masterHeight = masterBr.height;//container.props.masterHeight;
        var numX = container.getNumX();
        var numY = container.getNumY();
        var numTotal = numX * numY;
        while (items.length < numTotal){
            var clone = master.clone();
            container.insert(clone, items.length);
        }
        items.length = numTotal;

        //with repeat cells being groups, offset can be always found on the first element
        var offsetX = masterBb.x;
        var offsetY = masterBb.y;

        debug("Offset: x=%d y=%d", offsetX, offsetY);

        for (let y = 0; y < numY; ++y){
            for (let x = 0; x < numX; ++x){
                let cell = items[y * numX + x];
                let props = {
                    name: "Cell [" + y + "," + x + "]"
                };
                let bb = cell.getBoundingBox();
                cell.prepareAndSetProps(props, changeMode);
                let t = new Point(
                    x * (masterWidth + container.props.innerMarginX) + offsetX - bb.x,
                    y * (masterHeight + container.props.innerMarginY) + offsetY - bb.y
                );
                cell.applyTranslation(t, false, changeMode);
            }
        }
    },
    // getNumX: function(container){
    //     var masterWidth = container.props.masterWidth;
    //     return masterWidth === 0 ? 1 : Math.ceil(container.width()/masterWidth);
    // },
    // getNumY: function(container){
    //     var masterHeight = container.props.masterHeight;
    //     return masterHeight === 0 ? 1 : Math.ceil(container.height()/masterHeight);
    // },
    getActualMarginX: function(container){
        var items = container.children;
        if (items.length < 2){
            return 0;
        }
        var bb0 = items[0].getBoundingBox();
        var bb1 = items[1].getBoundingBox();
        if (bb0.y !== bb1.y){
            return 0;
        }
        return bb1.x - bb0.x - bb0.width;
    },
    getActualMarginY: function(container){
        var items = container.children;
        if (items.length < 2){
            return 0;
        }
        var item1 = null;
        var bb0 = items[0].getBoundingBox()
        var bb1 = null;
        for (let i = 1, l = items.length; i < l; ++i) {
            let item = items[i];
            bb1 = item.getBoundingBox();
            if (bb1.y !== bb0.y){
                item1 = item;
                break;
            }
        }
        if (item1 === null){
            return 0;
        }
        return bb1.y - bb0.y - bb0.height;
    },
    updateActualMargins: function(container, dx, dy){
        var base = container.children[0];
        var br = base.br();
        var marginX = container.props.innerMarginX + dx;
        var masterWidth = container.props.masterWidth;
        if (marginX < 0){
            masterWidth += marginX;
            marginX = 0;
            if (masterWidth < br.width){
                masterWidth = br.width;
            }
        }

        var marginY = container.props.innerMarginY + dy;
        var masterHeight = container.props.masterHeight;
        if (marginY < 0){
            masterHeight += marginY;
            marginY = 0;

            if (masterHeight < br.height){
                masterHeight = br.height;
            }
        }

        debug("new margins marginX=%d marginY=%d masterWidth=%d masterHeight=%d", marginX, marginY, masterWidth, masterHeight);
        container.prepareAndSetProps({innerMarginX: marginX, innerMarginY: marginY, masterWidth: masterWidth, masterHeight: masterHeight}, ChangeMode.Self);
        container.performArrange();
    }
};

ArrangeStrategy.register(ArrangeStrategies.Repeat, Strategy);

export default Strategy;