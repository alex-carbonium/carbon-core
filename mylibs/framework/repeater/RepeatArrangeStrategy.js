import RepeatViewListener from "./RepeatViewListener";;
import ArrangeStrategy from "../ArrangeStrategy";
import {ArrangeStrategies, ChangeMode} from "../Defs";

var debug = require("DebugUtil")("carb:repeatArrangeStrategy");


var Strategy = {
    arrange: function(container, e, changeMode){
        var items = container.children;
        if (!items.length){
            return;
        }

        var master = items[0];
        var masterWidth = master.width();//container.props.masterWidth;
        var masterHeight = master.height();//container.props.masterHeight;
        var numX = container.getNumX();
        var numY = container.getNumY();
        var numTotal = numX * numY;
        while (items.length < numTotal){
            var clone = master.clone();
            container.insert(clone, items.length);
        }
        items.length = numTotal;

        //with repeat cells having overflow=adjust, offset can be always found on the first element
        var offsetX = master.x();
        var offsetY = master.y();

        debug("Offset: x=%d y=%d", offsetX, offsetY);

        for (let y = 0; y < numY; ++y){
            for (let x = 0; x < numX; ++x){
                let element = items[y * numX + x];
                let props = {
                    name: "Cell [" + y + "," + x + "]"
                };
                element.setProps(props, changeMode);
                let t = {
                    x: x * (masterWidth + container.props.innerMarginX) + offsetX - element.x(),
                    y: y * (masterHeight + container.props.innerMarginY) + offsetY - element.y()
                };
                element.applyTranslation(t, false, changeMode);
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
        if (items[0].y() !== items[1].y()){
            return 0;
        }
        return items[1].x() - items[0].x() - items[0].width();
    },
    getActualMarginY: function(container){
        var items = container.children;
        if (items.length < 2){
            return 0;
        }
        var item1 = null;
        for (let i = 1, l = items.length; i < l; ++i) {
            let item = items[i];
            if (item.y() !== items[0].y()){
                item1 = item;
                break;
            }
        }
        if (item1 === null){
            return 0;
        }
        return item1.y() - items[0].y() - items[0].height();
    },
    updateActualMargins: function(container, dx, dy){
        var base = container.children[0];
        var marginX = container.props.innerMarginX + dx;
        var masterWidth = container.props.masterWidth;
        if (marginX < 0){
            masterWidth += marginX;
            marginX = 0;
            if (masterWidth < base.width()){
                masterWidth = base.width();
            }
        }

        var marginY = container.props.innerMarginY + dy;
        var masterHeight = container.props.masterHeight;
        if (marginY < 0){
            masterHeight += marginY;
            marginY = 0;

            if (masterHeight < base.height()){
                masterHeight = base.height();
            }
        }

        debug("new margins marginX=%d marginY=%d masterWidth=%d masterHeight=%d", marginX, marginY, masterWidth, masterHeight);
        container.prepareAndSetProps({innerMarginX: marginX, innerMarginY: marginY, masterWidth: masterWidth, masterHeight: masterHeight}, ChangeMode.Self);
        container.performArrange();
    }
};

ArrangeStrategy.register(ArrangeStrategies.Repeat, Strategy);

export default Strategy;