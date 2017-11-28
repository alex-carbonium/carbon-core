import ArrangeStrategy from "../arrangeStrategy/ArrangeStrategy";
import { ArrangeStrategies } from "../Defs";
import Point from "../../math/point";
import { IContainer, ChangeMode } from "carbon-core";

var debug = require("DebugUtil")("carb:repeatArrangeStrategy");

var Strategy = {
    arrange: function (container: any, e, changeMode: ChangeMode) {
        var items = container.children;
        if (!items.length) {
            return;
        }

        this._updateMargins(container, changeMode);

        var cols = container.cols();
        var rows = container.rows();

        this._deleteExcessiveItems(container, rows, cols, changeMode);
        this._insertNewItems(container, rows, cols, changeMode);
        this._rearrangeItems(container, rows, cols, changeMode);
    },

    _updateMargins: function(container: any, changeMode){
        var master = container.children[0];
        if (master.runtimeProps.newBr){
            var dx = master.runtimeProps.oldBr.width - master.runtimeProps.newBr.width;
            var dy = master.runtimeProps.oldBr.height - master.runtimeProps.newBr.height;
            container.prepareAndSetProps({
                innerMarginX: container.props.innerMarginX + dx,
                innerMarginY: container.props.innerMarginY + dy
            }, changeMode);

            delete master.runtimeProps.newBr;
            delete master.runtimeProps.oldBr;
        }
    },
    _deleteExcessiveItems: function (container: IContainer, rows, cols, changeMode): void {
        var items = container.children;
        for (let i = items.length - 1; i >= 0; --i) {
            var item = items[i];
            if (item.props.pos[1] >= cols || item.props.pos[0] >= rows) {
                container.remove(item, changeMode);
            }
        }
    },
    _insertNewItems: function (container: IContainer, rows, cols, changeMode) {
        var items = container.children;
        var rowSize = items[items.length - 1].props.pos[1] + 1;
        var rowDiff = cols - rowSize;

        if (rowDiff > 0) {
            for (let i = rowSize - 1; i < items.length; i += rowSize) {
                for (let j = 0; j < rowDiff; ++j) {
                    let item = items[i + j];
                    let slave = item.clone();
                    slave.setProps({
                        pos: [item.props.pos[0], item.props.pos[1] + 1]
                    }, changeMode);
                    slave.id = (container.id + "_" + slave.props.pos[0] + "_" + slave.props.pos[1]);
                    container.insert(slave, i + j + 1, changeMode);
                }
                i += rowDiff;
            }
        }

        let total = cols * rows;
        while (items.length < total) {
            let last = items[items.length - 1];
            let i = last.props.pos[0];
            let j = last.props.pos[1] + 1;
            if (j >= cols) {
                i += 1;
                j = 0;
            }

            let slave = items[0].clone();
            slave.id = (container.id + "_" + i + "_" + j);
            slave.setProps({pos: [i, j]});
            container.insert(slave, items.length, changeMode);
        }
    },
    _rearrangeItems: function (container: IContainer, rows, cols, changeMode) {
        var items = container.children;
        var master = items[0];
        var masterBb = master.getBoundingBox();
        var masterWidth = masterBb.width;
        var masterHeight = masterBb.height;

        //with repeat cells being groups, offset can be always found on the first element
        var offsetX = masterBb.x;
        var offsetY = masterBb.y;

        debug("Offset: x=%d y=%d", offsetX, offsetY);

        for (let x = 0; x < rows; ++x) {
            for (let y = 0; y < cols; ++y) {
                let cell: any = items[x * cols + y];
                let props = {
                    name: cols === 1 ? "Cell [" + y + "]" : "Cell [" + x + "," + y + "]",
                    pos: cell.createPos(x, y),
                    m: cell.viewMatrix().withTranslation(
                        y * (masterWidth + container.props.innerMarginX) + offsetX,
                        x * (masterHeight + container.props.innerMarginY) + offsetY)
                };
                cell.prepareAndSetProps(props, changeMode);
            }
        }
    },

    getActualMarginX: function (container) {
        return container.props.innerMarginX;
    },
    getActualMarginY: function (container) {
        return container.props.innerMarginY;
    },
    updateActualMargins: function (container, dx, dy) {
        var base = container.children[0];
        var br = base.boundaryRect();
        var marginX = container.props.innerMarginX + dx;
        var marginY = container.props.innerMarginY + dy;
        //debug("new margins marginX=%d marginY=%d masterWidth=%d masterHeight=%d", marginX, marginY, masterWidth, masterHeight);
        container.prepareAndSetProps({ innerMarginX: marginX, innerMarginY: marginY }, ChangeMode.Self);
        container.performArrange(null, ChangeMode.Self);
    }
};

ArrangeStrategy.register(ArrangeStrategies.Repeat, Strategy);

export default Strategy;