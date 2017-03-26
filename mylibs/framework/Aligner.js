export function align(mode, elements) {
    if (elements.length === 0) {
        return;
    }

    var center, space, leftmost, rightmost, topMost, bottomMost, sum, last;
    var baseElement;

    switch (mode) {
        case "left":
            baseElement = sketch.util.elementWithMin(elements, function (e) { return e.position().x; });
            elements.forEach(e => e.applyTranslation({ x: baseElement.position().x - e.position().x, y: 0 }));
            break;
        case "top":
            baseElement = sketch.util.elementWithMin(elements, function (e) { return e.position().y; });
            elements.forEach(e => e.applyTranslation({ y: baseElement.position().y - e.position().y, x: 0 }));
            break;
        case "right":
            baseElement = sketch.util.elementWithMax(elements, function (e) { return e.right(); });
            elements.forEach(e => e.applyTranslation({ x: baseElement.right() - e.width() - e.position().x, y: 0 }));
            break;
        case "bottom":
            baseElement = sketch.util.elementWithMax(elements, function (e) { return e.bottom(); });
            elements.forEach(e => e.applyTranslation({ y: baseElement.bottom() - e.height() - e.position().y, x: 0 }));
            break;
        case "center":
            leftmost = sketch.util.elementWithMin(elements, function (e) { return e.position().x; });
            rightmost = sketch.util.elementWithMax(elements, function (e) { return e.right(); });
            center = ~~(leftmost.position().x + (rightmost.right() - leftmost.position().x) / 2);
            elements.forEach(e => e.applyTranslation({ x: center - e.width() / 2 - e.position().x, y: 0 }));
            break;
        case "middle":
            topMost = sketch.util.elementWithMin(elements, function (e) { return e.position().y });
            bottomMost = sketch.util.elementWithMax(elements, function (e) { return e.bottom(); });
            center = ~~(topMost.position().y + (bottomMost.bottom() - topMost.position().y) / 2);
            elements.forEach(e => e.applyTranslation({ y: center - ~~(e.height() / 2) - e.position().y, x: 0 }));
            break;
        case "distributeHorizontally":
            leftmost = sketch.util.elementWithMin(elements, function (e) { return e.position().x; });
            rightmost = sketch.util.elementWithMax(elements, function (e) { return e.right(); });
            var sorted = elements.slice().sort(function (a, b) {
                var diff = a.position().x - b.position().x;
                if (diff !== 0) {
                    return diff;
                }

                return a.width() - b.width();
            });
            sum = sketch.util.sum(sorted, function (e) { return e.width(); });
            space = ~~((rightmost.right() - leftmost.position().x - sum) / (elements.length - 1));

            last = leftmost;
            sorted.forEach(function (element) {
                if (element !== leftmost && element !== rightmost) {
                    element.applyTranslation({ x: last.right() + space - element.position().x, y: 0 });
                    last = element;
                }
            });
            break;
        case "distributeVertically":
            topMost = sketch.util.elementWithMin(elements, function (e) { return e.position().y; });
            bottomMost = sketch.util.elementWithMax(elements, function (e) { return e.bottom(); });
            var sorted = elements.slice().sort(function (a, b) {
                var diff = a.position().y - b.position().y;
                if (diff !== 0) {
                    return diff;
                }

                return a.height() - b.height();
            });
            sum = sketch.util.sum(sorted, function (e) { return e.height(); });
            space = ~~((bottomMost.bottom() - topMost.position().y - sum) / (elements.length - 1));

            last = topMost;
            sorted.forEach(function (element) {
                if (element !== topMost && element !== bottomMost) {
                    element.applyTranslation({ y: last.bottom() + space - element.position().y, x: 0 });
                    last = element;
                }
            });
            break;
    }
}
