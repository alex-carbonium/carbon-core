import {
    HorizontalAlignment,
    VerticalAlignment
} from "framework/Defs";

function getTotalChildrenWidth(container) {
    let res = 0;
    for (let i = 0; i < container.children.length; i++) {
        let child = container.children[i];
        if (!child.visible()) {
            continue;
        }

        res += child.margin().left + child.width() + child.margin().right;
    }

    return res;
}

function getTotalChildrenHeight(container) {
    let res = 0;
    for (let i = 0; i < container.children.length; i++) {
        let child = container.children[i];
        if (!child.visible()) {
            continue;
        }

        res += child.margin().top + child.height() + child.margin().bottom;
    }

    return res;
}

function calculateHeight(container) {
    let highestChild = null;
    let topPadding = container.padding().top;
    let bottomPadding = container.padding().bottom;

    for (let child of container.children) {
        if (!child.visible()) {
            continue;
        }
        if (!highestChild || child.height() > highestChild.height()) {
            highestChild = child;
        }
    }

    if (highestChild) {
        let h = highestChild.height() + topPadding + bottomPadding
            + highestChild.margin().top + highestChild.margin().bottom;
        return h;
    }

    return 0;
}

function calculateWidth(container) {
    let widestChild;
    let leftPadding = container.padding().left;
    let rightPadding = container.padding().right;

    for (let child of container.children) {
        if (!child.visible()) {
            continue;
        }
        if (!widestChild || child.width() > widestChild.width()) {
            widestChild = child;
        }
    }

    if (widestChild) {
        let w = widestChild.width() + leftPadding + rightPadding
            + widestChild.margin().left + widestChild.margin().right;
        return w;
    }

    return 0;
}

export let HorizontalArrangeStrategy = {
    arrange: function (container: any, e?, changeMode?) {
        let x = container.x();
        let y = container.y()
        let pos = container.padding().left;
        let topPadding = container.padding().top;
        let bottomPadding = container.padding().bottom;

        let newHeight;

        if(e && (e.newRect.height !== e.oldRect.height && e.newRect.height)) {
            newHeight = e.newRect.height;
        } else {
            newHeight = calculateHeight(container);
        }

        for (let child of container.children) {
            if (!child.visible()) {
                continue;
            }

            let topSpace = topPadding + child.margin().top;
            let bottomSpace = bottomPadding + child.margin().bottom;

            pos += child.margin().left;

            let r = child.getBoundingBox();
            let x = pos,
                y = r.y,
                width = r.width,
                height = r.height;

            switch (child.verticalAlignment()) {
                case VerticalAlignment.Stretch:
                    y = topSpace;
                    height = newHeight - topSpace - bottomSpace;
                    break;
                case VerticalAlignment.Top:
                    y = topSpace;
                    break;
                case VerticalAlignment.Middle:
                    y = ~~(newHeight / 2 - child.height() / 2);
                    break;
                case VerticalAlignment.Bottom:
                    y = newHeight - bottomSpace - child.height();
                    break;
            }

            if (r.width !== width || r.height !== height || r.x !== x || r.y !== y) {
                child.resetTransform();
                child.applyTranslation({ x, y }, changeMode);
                child.prepareAndSetProps({ br: child.props.br.withSize(width, height) }, changeMode);
                child.arrange({ oldRect: r, newRect: { x: x, y: y, width: width, height: height } });
            }

            pos += child.width() + child.margin().right;
        }

        pos += container.padding().right;

        container.setProps({ br: container.props.br.withSize(pos, newHeight) });
    }
}

export let VerticalArrangeStrategy = {
    arrange: function (container, e, changeMode) {
        let x = container.x(), y = container.y();
        let pos = container.padding().top;
        let leftPadding = container.padding().left;
        let rightPadding = container.padding().right;

        let newWidth;
        if(e && (e.newRect.width !== e.oldRect.width && e.newRect.width)) {
            newWidth = e.newRect.width;
        } else {
            newWidth = calculateWidth(container);
        }

        for (let child of container.children) {
            if (!child.visible()) {
                continue;
            }
            let leftSpace = leftPadding + child.margin().left;
            let rightSpace = rightPadding + child.margin().right;

            pos += child.margin().top;

            let r = child.getBoundingBox();
            let x = r.x,
                y = pos,
                width = r.width,
                height = r.height;

            switch (child.horizontalAlignment()) {
                case HorizontalAlignment.Stretch:
                    x = leftSpace;
                    width = newWidth - leftSpace - rightSpace;
                    break;
                case HorizontalAlignment.Left:
                    x = leftSpace;
                    break;
                case HorizontalAlignment.Center:
                    x = ~~(newWidth / 2 - child.width() / 2);
                    break;
                case HorizontalAlignment.Right:
                    x = newWidth - rightSpace - child.width();
                    break;
            }

            let newRect = null;
            if (r.width !== width || r.height !== height || r.x !== x || r.y !== y) {
                child.resetTransform();
                child.applyTranslation({ x, y }, changeMode);
                child.prepareAndSetProps({ br: child.props.br.withSize(width, height) }, changeMode);
                child.arrange({ oldRect: r, newRect: { x: x, y: y, width: width, height: height } });
            }

            pos += child.height() + child.margin().bottom;
        }

        pos += container.padding().bottom;

        if (container.autoGrowMode() === 'up') {
            let delta = pos - container.height();
            let y = container.y() - delta;
            let x = container.x();
            container.applyTranslation({ x, y });
        }

        container.setProps({ br: container.props.br.withSize(newWidth, pos) });

    }
}
