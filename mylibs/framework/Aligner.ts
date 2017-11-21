import { IUIElement } from "carbon-model";
import Point from "../math/point";
import { AlignMode } from "carbon-app";

export function align(mode, elements: IUIElement[]) {
    if (elements.length === 0) {
        return;
    }

    var alignMode = elements.length === 1 ? AlignMode.Parent : AlignMode.Selection;
    var parent = elements[0].parent();

    var center, space, leftmost, rightmost, topMost, bottomMost, sum, last, baseX, baseY;
    var baseElement = alignMode === AlignMode.Parent ? parent : elements[0];
    var sorted: IUIElement[];

    switch (mode) {
        case "left":
            baseX = alignMode === AlignMode.Parent ? parent.boundaryRect().x : findMinX(elements);
            elements.forEach(e => e.applyTranslation(Point.create(baseX - e.x, 0)));
            break;
        case "top":
            baseY = alignMode === AlignMode.Parent ? parent.boundaryRect().x : findMinY(elements);
            elements.forEach(e => e.applyTranslation(Point.create(0, baseY - e.y)));
            break;
        case "right":
            baseX = alignMode === AlignMode.Parent ? parent.boundaryRect().right() : findMaxX(elements);
            elements.forEach(e => e.applyTranslation(Point.create(baseX - e.x - e.width, 0)));
            break;
        case "bottom":
            baseY = alignMode === AlignMode.Parent ? parent.boundaryRect().bottom() : findMaxY(elements);
            elements.forEach(e => e.applyTranslation(Point.create(0, baseY - e.y - e.height)));
            break;
        case "center":
            if (alignMode === AlignMode.Parent){
                center = parent.boundaryRect().centerX();
            }
            else {
                leftmost = findMinX(elements);
                rightmost = findMaxX(elements);
                center = (leftmost + rightmost) / 2;
            }
            elements.forEach(e => e.applyTranslation(Point.create(center - e.width/2 - e.x, 0).roundMutable()));
            break;
        case "middle":
            if (alignMode === AlignMode.Parent){
                center = parent.boundaryRect().centerY();
            }
            else {
                topMost = findMinY(elements);
                bottomMost = findMaxY(elements);
                center = (topMost + bottomMost) / 2;
            }
            elements.forEach(e => e.applyTranslation(Point.create(0, center - e.height/2 - e.y).roundMutable()));
            break;
        case "distributeHorizontally":
            leftmost = findMinX(elements);
            rightmost = findMaxX(elements);
            sorted = elements.slice().sort(function (a, b) {
                var diff = a.x - b.x;
                if (diff !== 0) {
                    return diff;
                }

                return a.width - b.width;
            });
            sum = sorted.reduce((prev, cur) => prev + cur.width, 0);
            space = (rightmost - leftmost - sum) / (elements.length - 1);

            last = 0;
            sorted.forEach((element, i) => {
                if (i){
                    element.applyTranslation(Point.create(last + space - element.x, 0).roundMutable());
                }
                last = element.x + element.width;
            });
            break;
        case "distributeVertically":
            topMost = findMinY(elements);
            bottomMost = findMaxY(elements);
            sorted = elements.slice().sort(function (a, b) {
                var diff = a.y - b.y;
                if (diff !== 0) {
                    return diff;
                }

                return a.height - b.height;
            });
            sum = sorted.reduce((prev, cur) => prev + cur.height, 0);
            space = (bottomMost - topMost - sum) / (elements.length - 1);

            last = 0;
            sorted.forEach((element, i) => {
                if (i){
                    element.applyTranslation(Point.create(0, last + space - element.y).roundMutable());
                }
                last = element.y + element.height;
            });
            break;
    }
}

function findMinX(elements: IUIElement[]){
    var result = Number.POSITIVE_INFINITY;
    for (var i = 0; i < elements.length; i++) {
        var x = elements[i].x;
        if (x < result){
            result = x;
        }
    }
    return result;
}
function findMaxX(elements: IUIElement[]){
    var result = Number.NEGATIVE_INFINITY;
    for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        var x = element.x + element.width;
        if (x > result){
            result = x;
        }
    }
    return result;
}

function findMinY(elements: IUIElement[]){
    var result = Number.POSITIVE_INFINITY;
    for (var i = 0; i < elements.length; i++) {
        var y = elements[i].y;
        if (y < result){
            result = y;
        }
    }
    return result;
}
function findMaxY(elements: IUIElement[]){
    var result = Number.NEGATIVE_INFINITY;
    for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        var y = element.y + element.height;
        if (y > result){
            result = y;
        }
    }
    return result;
}
