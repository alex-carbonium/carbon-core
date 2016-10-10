define(function() {
    var fwk = sketch.framework;

    return {
        align: function(mode, elements) {
            var commands = [];

            if (elements.length === 0){
                return commands;
            }

            var center, space, leftmost, rightmost, topMost, bottomMost, sum, last;
            var baseElement;

            switch (mode){
                case "left":
                    baseElement = sketch.util.elementWithMin(elements, function(e){ return e.x(); });
                    commands = elements.map(e => e.constructPropsChangedCommand({x: baseElement.x()}));
                    break;
                case "top":
                    baseElement = sketch.util.elementWithMin(elements, function(e){ return e.y(); });
                    commands = elements.map(e => e.constructPropsChangedCommand({y: baseElement.y()}));
                    break;
                case "right":
                    baseElement = sketch.util.elementWithMax(elements, function(e){ return e.right(); });
                    commands = elements.map(e => e.constructPropsChangedCommand({x: baseElement.right() - e.width()}));
                    break;
                case "bottom":
                    baseElement = sketch.util.elementWithMax(elements, function(e){ return e.bottom(); });
                    commands = elements.map(e => e.constructPropsChangedCommand({y: baseElement.bottom() - e.height()}));
                    break;
                case "center":
                    leftmost = sketch.util.elementWithMin(elements, function(e){ return e.x(); });
                    rightmost = sketch.util.elementWithMax(elements, function(e){ return e.right(); });
                    center = ~~(leftmost.x() + (rightmost.right() - leftmost.x()) / 2);
                    commands = elements.map(e => e.constructPropsChangedCommand({x: center - e.width() / 2}));
                    break;
                case "middle":
                    topMost = sketch.util.elementWithMin(elements, function(e){ return e.y(); });
                    bottomMost = sketch.util.elementWithMax(elements, function(e){ return e.bottom(); });
                    center = ~~(topMost.y() + (bottomMost.bottom() - topMost.y()) / 2);
                    commands = elements.map(e => e.constructPropsChangedCommand({y: center - ~~(e.height() / 2)}));
                    break;
                case "distributeHorizontally":
                    leftmost = sketch.util.elementWithMin(elements, function(e){ return e.x(); });
                    rightmost = sketch.util.elementWithMax(elements, function(e){ return e.right(); });
                    var sorted = elements.slice().sort(function(a,b){
                        var diff = a.x() - b.x();
                        if (diff !== 0){
                            return diff;
                        }

                        return a.width() - b.width();
                    });
                    sum = sketch.util.sum(sorted, function(e){ return e.width(); });
                    space = ~~((rightmost.right() - leftmost.x() - sum) / (elements.length - 1));

                    last = leftmost;
                    sorted.forEach(function(element){
                        if (element !== leftmost && element !== rightmost) {
                            commands.push(element.constructPropsChangedCommand({x: last.right() + space}));
                            last = element;
                        }
                    });
                    break;
                case "distributeVertically":
                    topMost = sketch.util.elementWithMin(elements, function(e){ return e.y(); });
                    bottomMost = sketch.util.elementWithMax(elements, function(e){ return e.bottom(); });
                    var sorted = elements.slice().sort(function(a,b){
                        var diff = a.y() - b.y();
                        if (diff !== 0){
                            return diff;
                        }

                        return a.height() - b.height();
                    });
                    sum = sketch.util.sum(sorted, function(e){ return e.height(); });
                    space = ~~((bottomMost.bottom() - topMost.y() - sum) / (elements.length - 1));

                    last = topMost;
                    sorted.forEach(function(element){
                        if (element !== topMost && element !== bottomMost) {
                            commands.push(element.constructPropsChangedCommand({y: last.bottom() + space}));
                            last = element;
                        }
                    });
                    break;
            }

            return commands;
        }
    };
});