import {ActionType} from "framework/Defs";
import {distanceBetweenPoints} from "math/geometry";


export function getConnectionPoints(fromRect, toRect) {
    var left1 = {x:fromRect.x, y:fromRect.y + fromRect.height / 2, type:0};
    var top1 = {x:fromRect.x + fromRect.width / 2, y:fromRect.y, type:1};
    var right1 = {x:fromRect.x + fromRect.width, y:left1.y, type:2};
    var bottom1 = {x:top1.x, y:fromRect.y + fromRect.height, type:3};

    var left2 = {x:toRect.x, y:toRect.y + toRect.height / 2, type:0};
    var top2 = {x:toRect.x + toRect.width / 2, y:toRect.y, type:1};
    var right2 = {x:toRect.x + toRect.width, y:left2.y, type:2};
    var bottom2 = {x:top2.x, y:toRect.y + toRect.height, type:3};

    var from = [left1, top1, right1, bottom1];
    var to = [right2, bottom2, left2, top2];
    var minDistance = distanceBetweenPoints(from[0], to[0]);
    var minIndex = 0;
    for(var i = 1; i < from.length; ++i) {
        var distance = distanceBetweenPoints(from[i], to[i]);
        if(distance < minDistance) {
            minDistance = distance;
            minIndex = i;
        }
    }

    return {from:from[minIndex], to:to[minIndex]};
}


