import Environment from "environment";
import Invalidate from "framework/Invalidate";
import Point from "math/point";
import { ICoordinate } from "carbon-core";
var debug = require("DebugUtil")("carb:snapController");

var SNAP_DELTA = 4;
var LINE_OFFSET = 10;

function findSnap(snaps, value, delta) {
    for (var j = 0, len2 = snaps.length; j < len2; ++j) {
        if (Math.abs(value - snaps[j].value) <= delta) {
            return snaps[j];
        }
    }

    return null;
}

function compareSnapLines(lines1, lines2){
    if(lines1.length !== lines2.length){
        return false;
    }

    for(var i = lines1.length - 1; i >= 0; --i){
        var l1 = lines1[i];
        var l2 = lines2[i];
        return l1.x1 === l2.x1 && l1.y1 === l2.y1 && l1.x2 === l2.x2 && l1.y2 === l2.y2;
    }
}

function buildHorizontal(snap, xs):any{
    var scale = Environment.view.scale();
    var exs = snap.element.getSnapPoints();
    if(exs.noLine){
        return null;
    }
    var arr = xs.concat(exs.xs);

    arr.sort((a,b)=>a-b);
    var line = {
        y1:snap.value,
        y2:snap.value,
        x1:arr[0] - LINE_OFFSET / scale,
        x2:arr[arr.length-1] + LINE_OFFSET/scale,
    }
    debug("horizontal: x1=%d, y1=%d  x2=%d,y2=%d", line.x1, line.y1, line.x2, line.y2);
    return line;
}

function buildVertical(snap, ys){
    var scale = Environment.view.scale();
    var eys = snap.element.getSnapPoints();
    if(eys.noLine){
        return null;
    }
    var arr = ys.concat(eys.ys);
    arr.sort((a,b)=>a-b);
    var line = {
        x1:snap.value,
        x2:snap.value,
        y1:arr[0] - LINE_OFFSET / scale,
        y2:arr[arr.length-1] + LINE_OFFSET / scale
    }

    debug("vertical: x1=%d, y1=%d  x2=%d,y2=%d", line.x1, line.y1, line.x2, line.y2);

    return line;
}

function collectPoints(data, element) {
    if (element.hitVisible() && !element.hitTransparent()) {
        var snapData = element.getSnapPoints();
        if (snapData) {
            var xs = snapData.xs;
            var ys = snapData.ys;
            for (var i = 0, length = xs.length; i < length; ++i) {
                data._snapX.push({value: xs[i], element: element});
            }

            for (i = 0, length = ys.length; i < length; ++i) {
                data._snapY.push({value: ys[i], element: element});
            }
            if (snapData.center) {
                data._snapXCenter.push({value: snapData.center.x, element: element});
                data._snapYCenter.push({value: snapData.center.y, element: element});
            }

        }
    }
}

class SnapController {
    [name:string]:any;
    calculateSnappingPointsForPath(path) {
        var data:any = {};
        data._snapX = [];
        data._snapY = [];
        data._snapXCenter = [];
        data._snapYCenter = [];

        var rect = path.getBoundaryRectGlobal();
        var x = rect.x,
            y = rect.y;

        var points = path.points;
        for(var i = 0; i < points.length; ++i){
            var p = points[i];
            data._snapX.push({value:p.x + x, element:path});
            data._snapY.push({value:p.y + y, element:path});
        }

        data._snapX.sort(function (x1, x2) {
            return x1.value - x2.value;
        });
        data._snapY.sort(function (x1, x2) {
            return x1.value - x2.value;
        });

        this.snapGuides.forEach(x => collectPoints(data, x));

        this.currentSnappingData = data;
    }

    calculateSnappingPoints(parent){
        var data: any = {};
        data._snapX = [];
        data._snapY = [];
        data._snapXCenter = [];
        data._snapYCenter = [];


        this.currentSnappingData = data;
        this.snapGuides.forEach(x => collectPoints(data, x));

        if(!parent){
            return;
        }
        // Selection.directSelectionEnabled(true); - should not be used anymore
        parent.applyVisitor(collectPoints.bind(null, data), true);
        // Selection.directSelectionEnabled(false);
        data._snapX.sort(function (x1, x2) {
            return x1.value - x2.value;
        });
        data._snapY.sort(function (x1, x2) {
            return x1.value - x2.value;
        });

    }
    prepareOwnSnapPoints(element, holdPcnt){
        var snapData = element.getSnapPoints();
        var rect = element.getBoundaryRectGlobal();
        var x = rect.x;
        var y = rect.y;
        var data: any = {};
        if (snapData !== null) {
            if (holdPcnt < 20) {
                snapData.xs.sort((a,b)=>a-b);
            } else if (holdPcnt > 80) {
                snapData.xs.sort((a,b)=>b-a);
            }
            // calculate local values for x
            data._xs = snapData.xs.map(function (v) {
                return v - x;
            });

            // calculate local values for y
            data._ys = snapData.ys.map(function (v) {
                return v - y;
            });
            data._xCenter = snapData.center.x - x;
            data._yCenter = snapData.center.y - y;
        } else {
            return null;
        }

        return data;
    }



    applySnapping(pos, target) {
        var data = this.currentSnappingData;
        if (target) {
            var xs = target._xs,
                ys = target._ys;
        } else {
            xs = [pos.x];
            ys = [pos.y];
        }
        var snapX = data._snapX,
            snapY = data._snapY,
            snapXCenter = data._snapXCenter,
            snapYCenter = data._snapYCenter;
        var snap = null;
        var snappedPoint = null;
        this.clearActiveSnapLines();

        var scale = Environment.view.scale();
        var SNAP_DELTA_SCALE = SNAP_DELTA / scale;
        var delta = SNAP_DELTA_SCALE;
        if(target) {
            snap = findSnap(snapXCenter, target._xCenter + pos.x, delta);
        }
        if (snap !== null) {
            snappedPoint = new Point(snap.value - target._xCenter, pos.y);
            var snapLine = buildVertical(snap, ys.map(v=>v+pos.y));
            if(snapLine) {
                this.snapLines.push(snapLine);
            }
        } else {
            for (var i = 0, len = xs.length; i < len; ++i) {
                snap = findSnap(snapX, xs[i] + pos.x, delta);
                if (snap !== null) {
                    snappedPoint = new Point(snap.value - xs[i], pos.y);
                    var snapLine = buildVertical(snap, ys.map(v=>v+pos.y));
                    if(snapLine) {
                        this.snapLines.push(snapLine);
                    }
                    delta = 0;
                    break;
                }
            }
        }

        delta = SNAP_DELTA_SCALE;
        snap = null;
        if(target) {
            snap = findSnap(snapYCenter, target._yCenter + pos.y, delta);
        }
        if (snap !== null) {
            snappedPoint = snappedPoint || new Point(pos.x, pos.y);
            snappedPoint.y = snap.value - target._yCenter;
            let snapLine = buildHorizontal(snap, xs.map(v=>v+pos.x));
            if(snapLine) {
                this.snapLines.push(snapLine);
            }
        } else {
            for (i = 0, len = ys.length; i < len; ++i) {
                snap = findSnap(snapY, ys[i] + pos.y, delta);
                if (snap !== null) {
                    snappedPoint = snappedPoint || new Point(pos.x, pos.y);
                    snappedPoint.y = snap.value - ys[i];
                    let snapLine = buildHorizontal(snap, xs.map(v=>v+pos.x));
                    if(snapLine) {
                        this.snapLines.push(snapLine);
                    }
                    delta = 0;
                    break;
                }
            }
        }

        return snappedPoint || pos;
    }

    applySnappingForPoint(pos:ICoordinate, disableVertical?, disableHorizontal?){
        var data = this.currentSnappingData;
        if(!data){
            return pos;
        }
        var xs = [pos.x];
        var ys = [pos.y];
        var snapX = data._snapX,
            snapY = data._snapY;

        var oldSnapLines = this.snapLines;
        var snappedPoint = null;

        this.clearActiveSnapLines();
        var scale = Environment.view.scale();
        var SNAP_DELTA_SCALE = SNAP_DELTA / scale;
        var delta = SNAP_DELTA_SCALE;
        if(!disableVertical) {
            var snap = findSnap(snapX, pos.x, delta);
            if (snap !== null) {
                snappedPoint = new Point(snap.value, pos.y);
                let snapLine = buildVertical(snap, ys);
                if (snapLine) {
                    this.snapLines.push(snapLine);
                }
            }
        }

        if(!disableHorizontal) {
            delta = SNAP_DELTA_SCALE;
            snap = findSnap(snapY, pos.y, delta);
            if (snap !== null) {
                snappedPoint = snappedPoint || new Point(pos.x, pos.y);
                snappedPoint.y = snap.value;
                let snapLine = buildHorizontal(snap, xs);
                if (snapLine) {
                    this.snapLines.push(snapLine);
                }
            }
        }

        if(!compareSnapLines(oldSnapLines, this.snapLines)){
            Invalidate.requestInteractionOnly();
        }

        return snappedPoint || pos;
    }

    clearActiveSnapLines(){
        this.snapLines =[];
        debug("clear");
    }

    constructor()
    {
        this.snapGuides = [];
        this.clearActiveSnapLines();
    }

    removeGuides(...guides){
        for (var i = this.snapGuides.length - 1; i >= 0; --i){
            if (guides.indexOf(this.snapGuides[i]) !== -1){
                this.snapGuides.splice(i, 1);
            }
        }
    }
}

export default new SnapController();