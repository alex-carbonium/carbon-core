import Environment from "environment";
import Invalidate from "framework/Invalidate";
import Point from "math/point";
import { ICoordinate } from "carbon-core";
import UserSettings from "UserSettings";
import { areRectsIntersecting } from "../math/math";

var debug = require("DebugUtil")("carb:snapController");

var SNAP_DELTA = 4;
var LINE_OFFSET = 10;

function findSnap(snaps, values, pos, delta, snappedPoint, axe: string) {
    var res = [];
    var min = Number.MAX_VALUE;
    for (let i = 0; i < values.length; ++i) {
        let value = values[i] + pos;
        for (var j = 0, len2 = snaps.length; j < len2; ++j) {
            var m = Math.abs(value - snaps[j].value);

            if (m <= delta) {
                res.push({
                    idx: j,
                    value: m,
                    snappedPoint: snaps[j].value - values[i]
                });
            }
        }
    }

    if (res.length) {
        res.sort((a, b) => a.value - b.value);
        var ret = [];
        let v = res[0].value;
        snappedPoint[axe] = res[0].snappedPoint;
        for (let i = 0; i < res.length; ++i) {
            if (res[i].value > v) {
                break;
            }
            ret.push(snaps[res[i].idx]);
        }

        return ret;
    }

    return null;
}

function offsetToOverlap(oxs, x) {
    var v1 = oxs[0] - x;
    var v2 = oxs[oxs.length - 1] - x;
    var d = 0;
    if (Math.sign(v1) === Math.sign(v2)) {
        d = (Math.abs(v1) < Math.abs(v2)) ? v1 : v2;
    }

    return d;
}

function handleVerticalOverlap(xs, ys, pos) {
    var overlap = [];

    let min = xs[0] + pos.x;
    let max = xs[xs.length - 1] + pos.x;
    var elements = this.currentSnappingElements;
    var rootOverlap = null;
    for (var j = 0, len2 = elements.length; j < len2; ++j) {
        var snap = elements[j].snapData.xs;

        if (min < snap[snap.length - 1] && max > snap[0]) {
            overlap.push(elements[j]);
        }

        if(elements[j].root) {
            rootOverlap = elements[j];
        }
    }

    if (overlap.length) {
        overlap.sort((a, b) => a.snapData.ys[a.snapData.ys.length - 1] - b.snapData.ys[b.snapData.ys.length - 1]);
        let i;
        let found = false;
        let ymin = ys[0] + pos.y;
        let ymax;
        for (i = overlap.length - 1; i >= 0; --i) {
            let oys = overlap[i].snapData.ys;
            ymax = oys[oys.length - 1];
            if (ymin > ymax) {
                found = true;
                break;
            }
        }
        let x = (min + max) / 2;
        if (found) {
            this.distances.push({
                x1: x,
                x2: x,
                y1: ymin,
                y2: ymax,
                value: Math.abs(ymin - ymax),
                vertical: true,
                temp: true,
                d: offsetToOverlap(overlap[i].snapData.xs, x)
            })
        }

        overlap.sort((a, b) => a.snapData.ys[0] - b.snapData.ys[0]);

        if (!found && rootOverlap) {
            ymax = rootOverlap.snapData.ys[0];
            this.distances.push({
                x1: x,
                x2: x,
                y1: ymin,
                y2: ymax,
                value: Math.abs(ymin - ymax),
                vertical: true,
                temp: true
            })
        }

        // find element below the target
        ymax = ys[ys.length - 1] + pos.y;

        found = false;
        for (i = overlap.length - 1; i >= 0; --i) {
            let oys = overlap[i].snapData.ys;
            ymin = oys[0];
            if (ymax < ymin) {
                found = true;
                break;
            }
        }

        if (found) {
            this.distances.push({
                x1: x,
                x2: x,
                y1: ymax,
                y2: ymin,
                value: Math.abs(ymin - ymax),
                vertical: true,
                temp: true,
                d: offsetToOverlap(overlap[i].snapData.xs, x)
            })
        } else if(rootOverlap) {
            ymin = rootOverlap.snapData.ys[rootOverlap.snapData.ys.length - 1];
            this.distances.push({
                x1: x,
                x2: x,
                y1: ymax,
                y2: ymin,
                value: Math.abs(ymin - ymax),
                vertical: true,
                temp: true
            })
        }
    }
}
function handleHorizontalOverlap(_xs, _ys, pos) {
    var overlap = [];

    let min = _ys[0] + pos.y;
    let max = _ys[_ys.length - 1] + pos.y;
    var elements = this.currentSnappingElements;
    var rootOverlap = null;
    for (var j = 0, len2 = elements.length; j < len2; ++j) {
        var snap = elements[j].snapData.ys;

        if (min < snap[snap.length - 1] && max > snap[0]) {
            overlap.push(elements[j]);
        }

        if(elements[j].root) {
            rootOverlap = elements[j];
        }
    }

    if (overlap.length) {
        overlap.sort((a, b) => a.snapData.xs[a.snapData.xs.length - 1] - b.snapData.xs[b.snapData.xs.length - 1]);
        let i;
        let found = false;
        let xmin = _xs[0] + pos.x;
        let xmax;
        for (i = overlap.length - 1; i >= 0; --i) {
            let _oxs = overlap[i].snapData.xs;
            xmax = _oxs[_oxs.length - 1];
            if (xmin > xmax) {
                found = true;
                break;
            }
        }
        let _y = (min + max) / 2;
        if (found) {
            this.distances.push({
                y1: _y,
                y2: _y,
                x1: xmin,
                x2: xmax,
                value: Math.abs(xmin - xmax),
                vertical: false,
                temp: true,
                d: offsetToOverlap(overlap[i].snapData.ys, _y)
            })
        }

        overlap.sort((a, b) => a.snapData.xs[0] - b.snapData.xs[0]);

        if (!found && rootOverlap) {
            xmax = rootOverlap.snapData.xs[0];
            this.distances.push({
                y1: _y,
                y2: _y,
                x1: xmin,
                x2: xmax,
                value: Math.abs(xmin - xmax),
                vertical: false,
                temp: true
            })
        }

        // find element below the target
        xmax = _xs[_xs.length - 1] + pos.x;

        found = false;
        for (i = overlap.length - 1; i >= 0; --i) {
            let _oxs = overlap[i].snapData.xs;
            xmin = _oxs[0];
            if (xmax < xmin) {
                found = true;
                break;
            }
        }

        if (found) {
            this.distances.push({
                y1: _y,
                y2: _y,
                x1: xmax,
                x2: xmin,
                value: Math.abs(xmin - xmax),
                vertical: false,
                temp: true,
                d: offsetToOverlap(overlap[i].snapData.ys, _y)
            })
        } else if(rootOverlap){
            xmin = rootOverlap.snapData.xs[rootOverlap.snapData.xs.length - 1];
            this.distances.push({
                y1: _y,
                y2: _y,
                x1: xmax,
                x2: xmin,
                value: Math.abs(xmin - xmax),
                vertical: false,
                temp: true
            })
        }
    }
}

function compareSnapLines(lines1, lines2) {
    if (lines1.length !== lines2.length) {
        return false;
    }

    for (var i = lines1.length - 1; i >= 0; --i) {
        var l1 = lines1[i];
        var l2 = lines2[i];
        return l1.x1 === l2.x1 && l1.y1 === l2.y1 && l1.x2 === l2.x2 && l1.y2 === l2.y2;
    }
}

function buildHorizontal(snap, xs): any {
    var scale = Environment.view.scale();
    let snapData = snap.element.getSnapPoints();
    if (snapData.noLine) {
        return null;
    }

    var arr = xs.concat(snapData.xs);

    arr.sort((a, b) => a - b);
    var line = {
        y1: snap.value,
        y2: snap.value,
        x1: arr[0] - LINE_OFFSET / scale,
        x2: arr[arr.length - 1] + LINE_OFFSET / scale,
    }

    debug("horizontal: x1=%d, y1=%d  x2=%d,y2=%d", line.x1, line.y1, line.x2, line.y2);
    return line;
}

function buildVertical(snap, ys) {
    var scale = Environment.view.scale();
    let snapData = snap.element.getSnapPoints();
    if (snapData.noLine) {
        return null;
    }
    var arr = ys.concat(snapData.ys);
    arr.sort((a, b) => a - b);

    var line = {
        x1: snap.value,
        x2: snap.value,
        y1: arr[0] - LINE_OFFSET / scale,
        y2: arr[arr.length - 1] + LINE_OFFSET / scale
    }

    debug("vertical: x1=%d, y1=%d  x2=%d,y2=%d", line.x1, line.y1, line.x2, line.y2);

    return line;
}

function buildVerticalDistances(distances, snap, b) {
    var scale = Environment.view.scale();
    let snapData = snap.element.getSnapPoints();
    if (snapData.noLine) {
        return;
    }

    var a = snapData.ys;
    var amin = a[0];
    var amax = a[a.length - 1];
    var bmin = b[0];
    var bmax = b[b.length - 1];

    if (bmax < amin) {
        distances.push({
            x1: snap.value,
            x2: snap.value,
            y1: bmax,
            y2: amin,
            value: Math.abs(bmax - amin),
            vertical: true
        });
    } else if (bmin > amax) {
        distances.push({
            x1: snap.value,
            x2: snap.value,
            y2: amax,
            y1: bmin,
            value: Math.abs(amax - bmin),
            vertical: true
        });
    } else if (bmax > amin && bmin < amin) {
        distances.push({
            x1: snap.value,
            x2: snap.value,
            y1: bmax,
            y2: amax,
            value: Math.abs(bmax - amax),
            vertical: true
        });
    } else if (bmin > amin && bmax > amax) {
        distances.push({
            x1: snap.value,
            x2: snap.value,
            y1: bmin,
            y2: amin,
            value: Math.abs(bmin - amin),
            vertical: true
        });
    } else if (bmin >= amin && bmax <= amax) {
        distances.push({
            x1: snap.value,
            x2: snap.value,
            y1: bmin,
            y2: amin,
            value: Math.abs(bmin - amin),
            vertical: true
        });

        distances.push({
            x1: snap.value,
            x2: snap.value,
            y1: bmax,
            y2: amax,
            value: Math.abs(bmax - amax),
            vertical: true
        });
    } else if (bmax = amin) {
        distances.push({
            x1: snap.value,
            x2: snap.value,
            y1: bmax,
            y2: amax,
            value: Math.abs(amax - amin),
            vertical: true
        });
    }

    return;
}

function buildHorizontalDistances(distances, snap, b) {
    var scale = Environment.view.scale();
    let snapData = snap.element.getSnapPoints();
    if (snapData.noLine) {
        return null;
    }

    var a = snapData.xs;
    var amin = a[0];
    var amax = a[a.length - 1];
    var bmin = b[0];
    var bmax = b[b.length - 1];

    if (bmin > amax) {
        distances.push({
            y1: snap.value,
            y2: snap.value,
            x2: amax,
            x1: bmin,
            value: Math.abs(amax - bmin),
            vertical: false
        });
    } else if (bmax < amin) {
        distances.push({
            y1: snap.value,
            y2: snap.value,
            x1: bmax,
            x2: amin,
            value: Math.abs(bmax - amin),
            vertical: false
        });
    } else if (bmax > amin && bmin < amin) {
        distances.push({
            y1: snap.value,
            y2: snap.value,
            x1: bmax,
            x2: amax,
            value: Math.abs(bmax - amax),
            vertical: false
        });
    } else if (bmin > amin && bmax > amax) {
        distances.push({
            y1: snap.value,
            y2: snap.value,
            x1: bmin,
            x2: amin,
            value: Math.abs(bmin - amin),
            vertical: false
        });
    } else if (bmin >= amin && bmax <= amax) {
        distances.push({
            y1: snap.value,
            y2: snap.value,
            x1: bmin,
            x2: amin,
            value: Math.abs(bmin - amin),
            vertical: false
        });

        distances.push({
            y1: snap.value,
            y2: snap.value,
            x1: bmax,
            x2: amax,
            value: Math.abs(bmax - amax),
            vertical: false
        });
    } else if (bmax = amin) {
        distances.push({
            y1: snap.value,
            y2: snap.value,
            x1: bmax,
            x2: amax,
            value: Math.abs(amax - amin),
            vertical: false
        });
    }

    return { value: 0 }
}

function collectPoints(data, elements, viewportRect, root, element) {
    if (element.hitVisible(false, UserSettings.snapTo.lockedObjects) && !element.hitTransparent()) {
        if (UserSettings.snapTo.onlyVisibleObjects && !areRectsIntersecting(viewportRect, element.getBoundingBoxGlobal(false))) {
            return;
        }

        var snapData = element.getSnapPoints();
        if (snapData) {
            var xs = snapData.xs;
            var ys = snapData.ys;
            for (var i = 0, length = xs.length; i < length; ++i) {
                data._snapX.push({ value: xs[i], element: element });
            }

            for (i = 0, length = ys.length; i < length; ++i) {
                data._snapY.push({ value: ys[i], element: element });
            }

            if (root) {
                elements.push({ element, snapData, root:element === root });
            }
        }
    }
}

class SnapController {
    [name: string]: any;
    calculateSnappingPointsForPath(path) {
        var data: any = {};
        var elements = [];
        data._snapX = [];
        data._snapY = [];
        data._snapXCenter = [];
        data._snapYCenter = [];

        var points = path.snapElements();
        for (var i = 0; i < points.length; ++i) {
            var p = points[i];
            data._snapX.push({ value: p.px, element: p });
            data._snapY.push({ value: p.py, element: p });
        }

        data._snapX.sort(function (x1, x2) {
            return x1.value - x2.value;
        });
        data._snapY.sort(function (x1, x2) {
            return x1.value - x2.value;
        });

        let viewportRect = Environment.view.viewportRect();

        if (UserSettings.snapTo.guides) {
            this.snapGuides.forEach(x => collectPoints(data, elements, viewportRect, null, x));
        }

        this.currentSnappingData = data;
        this.currentSnappingElements = elements;
    }

    calculateSnappingPoints(parent) {
        var data: any = {};
        var elements = [];
        data._snapX = [];
        data._snapY = [];
        data._snapXCenter = [];
        data._snapYCenter = [];
        this._parent = parent;
        let viewportRect = Environment.view.viewportRect()

        this.currentSnappingData = data;
        this.currentSnappingElements = elements;
        if (UserSettings.snapTo.guides) {
            this.snapGuides.forEach(x => collectPoints(data, elements, viewportRect, null, x));
        }

        if (!parent) {
            return;
        }

        parent.applyVisitor(collectPoints.bind(null, data, elements, viewportRect, parent), true);

        data._snapX.sort(function (x1, x2) {
            return x1.value - x2.value;
        });

        data._snapY.sort(function (x1, x2) {
            return x1.value - x2.value;
        });

    }
    prepareOwnSnapPoints(element, holdPcnt) {
        var snapData = element.getSnapPoints();
        var rect = element.getBoundaryRectGlobal();
        var x = rect.x;
        var y = rect.y;
        var data: any = {};
        if (snapData.center) {
            snapData.xs.push(snapData.center.x);
        }

        if (snapData.center) {
            snapData.ys.push(snapData.center.y);
        }
        if (snapData !== null) {
            if (holdPcnt < 20) {
                snapData.xs.sort((a, b) => a - b);
            } else if (holdPcnt > 80) {
                snapData.xs.sort((a, b) => b - a);
            }
            // calculate local values for x
            data._xs = snapData.xs.map(function (v) {
                return v - x;
            });

            // calculate local values for y
            data._ys = snapData.ys.map(function (v) {
                return v - y;
            });
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
            xs.sort((a, b) => a - b);
            ys.sort((a, b) => a - b);
        } else {
            xs = [pos.x];
            ys = [pos.y];
        }


        var snapX = data._snapX,
            snapY = data._snapY,
            snapXCenter = data._snapXCenter,
            snapYCenter = data._snapYCenter;
        var snaps = null;
        var snappedPoint = new Point(pos.x, pos.y);
        this.clearActiveSnapLines();

        var scale = Environment.view.scale();
        var SNAP_DELTA_SCALE = SNAP_DELTA / scale;
        var delta = SNAP_DELTA_SCALE;

        let verticalSnaps = [];
        let horizontalSnaps = [];

        let offsetYs = ys.map(v => v + pos.y);
        snaps = findSnap(snapX, xs, pos.x, delta, snappedPoint, 'x');
        if (snaps !== null) {
            let snap = snaps[0];
            for (snap of snaps) {
                let snapLine = buildVertical(snap, offsetYs);
                if (snapLine) {
                    this.snapLines.push(snapLine);
                    verticalSnaps.push(snap);
                }
            }
        }

        delta = SNAP_DELTA_SCALE;
        snaps = null;

        let offsetXs = xs.map(v => v + pos.x);
        snaps = findSnap(snapY, ys, pos.y, delta, snappedPoint, 'y');
        if (snaps !== null) {
            let snap = snaps[0];
            for (snap of snaps) {
                let snapLine = buildHorizontal(snap, offsetXs);
                if (snapLine) {
                    this.snapLines.push(snapLine);
                    horizontalSnaps.push(snap);
                }
            }
        }

        // build distances
        if (verticalSnaps.length) {
            let ysv = ys.map(v => v + snappedPoint.y);
            for (let snap of verticalSnaps) {
                buildVerticalDistances(this.distances, snap, ysv);
            }
        }

        if (horizontalSnaps.length) {
            let xsv = xs.map(v => v + snappedPoint.x);
            for (let snap of horizontalSnaps) {
                buildHorizontalDistances(this.distances, snap, xsv);
            }
        }

        handleVerticalOverlap.call(this, xs, ys, snappedPoint);
        handleHorizontalOverlap.call(this, xs, ys, snappedPoint);

        return snappedPoint || pos;
    }

    applySnappingForPoint(pos: ICoordinate, disableVertical?, disableHorizontal?) {
        if (!UserSettings.snapTo.enabled) {
            return pos;
        }

        var data = this.currentSnappingData;
        if (!data) {
            return pos;
        }
        var xs = [pos.x];
        var ys = [pos.y];

        var snapX = data._snapX,
            snapY = data._snapY;

        var oldSnapLines = this.snapLines;
        let snappedPoint = new Point(pos.x, pos.y);;

        this.clearActiveSnapLines();
        var scale = Environment.view.scale();
        var SNAP_DELTA_SCALE = SNAP_DELTA / scale;
        var delta = SNAP_DELTA_SCALE;
        let verticalSnaps = [];
        let horizontalSnaps = [];

        if (!disableVertical) {
            var snaps = findSnap(snapX, [pos.x], 0, delta, snappedPoint, 'x');
            if (snaps !== null) {
                let snap = snaps[0];
                snappedPoint = new Point(snap.value, pos.y);

                for (snap of snaps) {
                    let snapLine = buildVertical(snap, ys);
                    if (snapLine) {
                        this.snapLines.push(snapLine);
                        verticalSnaps.push(snap);
                    }
                }
            }
        }

        if (!disableHorizontal) {
            delta = SNAP_DELTA_SCALE;
            snaps = findSnap(snapY, [pos.y], 0, delta, snappedPoint, 'y');
            if (snaps !== null) {
                let snap = snaps[0];

                snappedPoint.y = snap.value;
                for (snap of snaps) {
                    let snapLine = buildHorizontal(snap, xs);
                    if (snapLine) {
                        this.snapLines.push(snapLine);
                        horizontalSnaps.push(snap);
                    }
                }
            }
        }

        Invalidate.requestInteractionOnly();

        // build distances
        if (verticalSnaps.length) {
            for (let snap of verticalSnaps) {
                buildVerticalDistances(this.distances, snap, [snappedPoint.y]);
            }
        }

        if (horizontalSnaps.length) {
            for (let snap of horizontalSnaps) {
                buildHorizontalDistances(this.distances, snap, [snappedPoint.x]);
            }
        }

        return snappedPoint || pos;
    }

    clearActiveSnapLines() {
        this.snapLines = [];
        this.distances = [];
        debug("clear");
    }

    constructor() {
        this.snapGuides = [];
        this.clearActiveSnapLines();
    }

    removeGuides(...guides) {
        for (var i = this.snapGuides.length - 1; i >= 0; --i) {
            if (guides.indexOf(this.snapGuides[i]) !== -1) {
                this.snapGuides.splice(i, 1);
            }
        }
    }
}

export default new SnapController();