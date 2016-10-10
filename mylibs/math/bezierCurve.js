import {bezierCurveDataIsPoint,
    bezierCurveDataMake,
    bezierCurveDataIsEqual,
    bezierCurveDataBounds,
    bezierCurveDataBoundingRect,
    bezierCurveDataIntersectionsWithBezierCurve,
    bezierCurveDataSubcurveWithRange,
    bezierCurveDataPointAtParameter,
    bezierCurveDataReversed,
    bezierCurveDataRefineParameter,
    bezierCurveDataGetLength,
    bezierCurveDataGetLengthAtParameter,
    bezierCurveDataClosestLocationToPoint} from "./bezierCurveData";
import { equalPoints} from "./math";
import {normalizePoint, 
    subtractPoint, 
    addPoint,
    distanceBetweenPoints,
    unitScalePoint, 
    lineBoundsMightOverlap,
    rangeMake,
    areTangentsAmbigious,
    tangentsCross,
    removeObject} from "./geometry";


function findEdge1TangentCurves(edge, intersection, leftCurve, rightCurve)
{
    if ( intersection.isAtStartOfCurve1 ) {
        leftCurve.value = edge.previousNonpoint;
        rightCurve.value = edge;
    } else if ( intersection.isAtStopOfCurve1 ) {
        leftCurve.value = edge;
        rightCurve.value = edge.nextNonpoint;
    } else {
        leftCurve.value = intersection.curve1LeftBezier;
        rightCurve.value = intersection.curve1RightBezier;
    }
}

function findEdge2TangentCurves(edge, intersection, leftCurve, rightCurve)
{
    if ( intersection.isAtStartOfCurve2 ) {
        leftCurve.value = edge.previousNonpoint;
        rightCurve.value = edge;
    } else if ( intersection.isAtStopOfCurve2 ) {
        leftCurve.value = edge;
        rightCurve.value = edge.nextNonpoint;
    } else {
        leftCurve.value = intersection.curve2LeftBezier;
        rightCurve.value = intersection.curve2RightBezier;
    }
}

function computeEdgeTangents(leftCurve, rightCurve, offset, edgeTangents)
{
    edgeTangents[0] = leftCurve.tangentFromRightOffset(offset);
    edgeTangents[1] = rightCurve.tangentFromLeftOffset(offset);
}


function computeEdge1RangeTangentCurves(edge, intersectRange, leftCurve, rightCurve)
{
    // edge1Tangents are firstOverlap.range1.minimum going to previous and lastOverlap.range1.maximum going to next
    if ( intersectRange.isAtStartOfCurve1 )
        leftCurve.value = edge.previousNonpoint;
    else
        leftCurve.value = intersectRange.curve1LeftBezier;
    if ( intersectRange.isAtStopOfCurve1 )
        rightCurve.value = edge.nextNonpoint;
    else
        rightCurve.value = intersectRange.curve1RightBezier;
}

function computeEdge2RangeTangentCurves(edge, intersectRange, leftCurve, rightCurve)
{
    // edge2Tangents are firstOverlap.range2.minimum going to previous and lastOverlap.range2.maximum going to next
    if ( intersectRange.isAtStartOfCurve2 )
        leftCurve.value = edge.previousNonpoint;
    else
        leftCurve.value = intersectRange.curve2LeftBezier;
    if ( intersectRange.isAtStopOfCurve2 ) {
        rightCurve.value = edge.nextNonpoint;
    } else
        rightCurve.value = intersectRange.curve2RightBezier;
}


export default class BezierCurve {

    constructor() {
        this._crossings = [];
    }

    get data() {
        return this._data;
    }


    get endPoint1() {
        return this._data.endPoint1;
    }

    get controlPoint1() {
        return this._data.controlPoint1;
    }

    get controlPoint2() {
        return this._data.controlPoint2;
    }

    get endPoint2() {
        return this._data.endPoint2;
    }

    get isStraightLine() {
        return this._data.isStraightLine;
    }

    static bezierCurvesFromBezierPath(path) {
        // Helper method to easily convert a bezier path into an array of FBBezierCurves. Very straight forward,
        //  only lines are a special case.

        var lastPoint = null;
        var bezierCurves = new Array();
        var elements = path.elements();
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];

            switch (element.kind) {
                case "M":
                    lastPoint = element.point;
                    break;

                case "L": {
                    // Convert lines to bezier curves as well. Just set control point to be in the line formed
                    //  by the end points
                    bezierCurves.push(BezierCurve.bezierCurveWithLine(lastPoint, element.point));

                    lastPoint = element.point;
                    break;
                }

                case "C":
                    bezierCurves.push(BezierCurve.bezierCurve(lastPoint, element.controlPoints[0], element.controlPoints[1], element.point));

                    lastPoint = element.point;
                    break;

                case "Z":
                    lastPoint = null;
                    break;
            }
        }

        return bezierCurves;
    }

    static bezierCurveWithLine(startPoint, endPoint) {
        var curve = new BezierCurve();
        curve.initWithLine(startPoint, endPoint);
        return curve;
    }

    static bezierCurve(endPoint1, controlPoint1, controlPoint2, endPoint2) {
        var curve = new BezierCurve();
        curve.init(endPoint1, controlPoint1, controlPoint2, endPoint2);
        return curve;
    }

    static bezierCurveWithBezierCurveData(data) {
        var curve = new BezierCurve();
        curve._data = data;
        return curve;
    }


    init(endPoint1, controlPoint1, controlPoint2, endPoint2, contour) {
        this._data = bezierCurveDataMake(endPoint1, controlPoint1, controlPoint2, endPoint2, false);
        this._contour = contour; // no cyclical references
    }

    initWithLine(startPoint, endPoint, contour) {
        // Convert the line into a bezier curve to keep our intersection algorithm general (i.e. only
        //  has to deal with curves, not lines). As long as the control points are colinear with the
        //  end points, it'll be a line. But for consistency sake, we put the control points inside
        //  the end points, 1/3 of the total distance away from their respective end point.
        var distance = distanceBetweenPoints(startPoint, endPoint);
        var leftTangent = normalizePoint(subtractPoint(endPoint, startPoint));

        this._data = bezierCurveDataMake(startPoint, addPoint(startPoint, unitScalePoint(leftTangent, distance / 3.0)), addPoint(startPoint, unitScalePoint(leftTangent, 2.0 * distance / 3.0)), endPoint, true);
        this._contour = contour; // no cyclical references
    }

    isEqual(object) {
        if (!object instanceof BezierCurve)
            return false;

        return bezierCurveDataIsEqual(this._data, other._data);
    }

    doesHaveIntersectionsWithBezierCurve(curve) {
        var count = 0;
        this.intersectionsWithBezierCurve(curve, null, (_, stop)=> {
            ++count;
            stop.value = true; // Only need the one
        });
        return count > 0;
    }

    intersectionsWithBezierCurve(curve, intersectRange, block) {
        // For performance reasons, do a quick bounds check to see if these even might intersect
        if (!lineBoundsMightOverlap(bezierCurveDataBoundingRect(this._data), bezierCurveDataBoundingRect(curve._data)))
            return;

        if (!lineBoundsMightOverlap(bezierCurveDataBounds(this._data), bezierCurveDataBounds(curve._data)))
            return;

        var usRange = rangeMake(0, 1);
        var themRange = rangeMake(0, 1);
        var stop = {value:false};
        bezierCurveDataIntersectionsWithBezierCurve(this._data, curve.data, usRange, themRange, this, curve, intersectRange, 0, block, stop);
    }


    subcurveWithRange(range) {
        return BezierCurve.bezierCurveWithBezierCurveData(bezierCurveDataSubcurveWithRange(this._data, range));
    }

    splitSubcurvesWithRange(range, curves) {
        // Return a bezier curve representing the parameter range specified. We do this by splitting
        //  twice: once on the minimum, the splitting the result of that on the maximum.
        // Start with the left side curve
        var remainingCurve = {};
        if (range.minimum == 0.0) {
            remainingCurve = this._data;
            if (curves.leftCurve != null)
                curves.leftCurve = null;
        } else {
            var leftCurveData = {};
            bezierCurveDataPointAtParameter(this._data, range.minimum, leftCurveData, remainingCurve);
            if (curves.leftCurve !== undefined) {
                curves.leftCurve = BezierCurve.bezierCurveWithBezierCurveData(leftCurveData);
            }
        }

        // Special case  where we start at the end
        if (range.minimum == 1.0) {
            if (curves.middleCurve !== undefined)
                curves.middleCurve = BezierCurve.bezierCurveWithBezierCurveData(remainingCurve);
            if (curves.rightCurve !== undefined)
                curves.rightCurve = null;
            return; // avoid the divide by zero below
        }

        // We need to adjust the maximum parameter to fit on the new curve before we split again
        var adjustedMaximum = (range.maximum - range.minimum) / (1.0 - range.minimum);
        var middleCurveData = {};
        var rightCurveData = {};
        bezierCurveDataPointAtParameter(remainingCurve, adjustedMaximum, middleCurveData, rightCurveData);
        if (curves.middleCurve !== undefined)
            curves.middleCurve = BezierCurve.bezierCurveWithBezierCurveData(middleCurveData);
        if (curves.rightCurve !== undefined)
            curves.rightCurve = BezierCurve.bezierCurveWithBezierCurveData(rightCurveData);
    }

    reversedCurve() {
        return BezierCurve.bezierCurveWithBezierCurveData(bezierCurveDataReversed(this._data));
    }

    pointAt(parameter, curves) {
        var leftData = {};
        var rightData = {};
        var point = bezierCurveDataPointAtParameter(this._data, parameter, leftData, rightData);
        if (curves.leftBezierCurve !== undefined) {
            curves.leftBezierCurve = BezierCurve.bezierCurveWithBezierCurveData(leftData);
        }
        if (curves.rightBezierCurve !== undefined) {
            curves.rightBezierCurve = BezierCurve.bezierCurveWithBezierCurveData(rightData);
        }
        return point;
    }

    refineParameter(parameter, point) {
        return bezierCurveDataRefineParameter(this._data, parameter, point);
    }

    length() {
        return bezierCurveDataGetLength(this._data);
    }

    lengthAtParameter(parameter) {
        return bezierCurveDataGetLengthAtParameter(this._data, parameter);
    }

    get isPoint() {
        return bezierCurveDataIsPoint(this._data);
    }

    closestLocationToPoint(point) {
        return bezierCurveDataClosestLocationToPoint(this._data, point);
    }

    get bounds() {
        return bezierCurveDataBounds(this._data);
    }

    get boundingRect() {
        return bezierCurveDataBoundingRect(this._data);
    }

    pointFromRightOffset(offset) {
        var length = this.length();
        offset = Math.min(offset, length);
        var time = 1.0 - (offset / length);
        return bezierCurveDataPointAtParameter(this._data, time, null, null);
    }

    pointFromLeftOffset(offset) {
        var length = this.length();
        offset = Math.min(offset, length);
        var time = offset / length;
        return bezierCurveDataPointAtParameter(this._data, time, null, null);
    }

    tangentFromRightOffset(offset) {
        if (this._data.isStraightLine && !bezierCurveDataIsPoint(this._data))
            return subtractPoint(this._data.endPoint1, this._data.endPoint2);

        var returnValue = null;
        if (offset == 0.0 && !equalPoints(this._data.controlPoint2, this._data.endPoint2))
            returnValue = subtractPoint(this._data.controlPoint2, this._data.endPoint2);
        else {
            var length = bezierCurveDataGetLength(this._data);
            if (offset == 0.0)
                offset = Math.min(1.0, length);
            var time = 1.0 - (offset / length);
            var leftCurve = {};
            bezierCurveDataPointAtParameter(this._data, time, leftCurve, null);
            returnValue = subtractPoint(leftCurve.controlPoint2, leftCurve.endPoint2);
        }

        return returnValue;
    }

    tangentFromLeftOffset(offset) {
        if (this._data.isStraightLine && !bezierCurveDataIsPoint(this._data))
            return subtractPoint(this._data.endPoint2, this._data.endPoint1);

        var returnValue = null;
        if (offset == 0.0 && !equalPoints(this._data.controlPoint1, this._data.endPoint1))
            returnValue = subtractPoint(this._data.controlPoint1, this._data.endPoint1);
        else {
            var length = bezierCurveDataGetLength(this._data);
            if (offset == 0.0)
                offset = Math.min(1.0, length);
            var time = offset / length;
            var rightCurve = {};
            bezierCurveDataPointAtParameter(this._data, time, null, rightCurve);
            returnValue = subtractPoint(rightCurve.controlPoint1, rightCurve.endPoint1);
        }

        return returnValue;
    }

    // bezierPath()
    // {
    //     var path = new Path();
    //     path.moveToPoint(this.endPoint1);
    //     path.curveToPoint(this.endPoint2, this.controlPoint1, this.controlPoint2);
    //     return path;
    // }

    clone() {
        return BezierCurve.bezierCurveWithBezierCurveData(this._data);
    }

    // edge
    get index() {
        return this._index;
    }

    set index(value) {
        this._index = value;
    }

    get isStartShared() {
        return this._startShared;
    }

    set startShared(value) {
        this._startShared = value;
    }

    get contour() {
        return this._contour;
    }

    set contour(value) {
        this._contour = value;
    }

    addCrossing(crossing) {
        // Make sure the crossing can make it back to us, and keep all the crossings sorted
        crossing.edge = this;
        this._crossings.push(crossing);
        this.sortCrossings();
    }

    removeCrossing(crossing) {
        // Keep the crossings sorted
        crossing.edge = null;
        removeObject(this._crossings, crossing);
        this.sortCrossings();
    }

    removeAllCrossings() {
        this._crossings = [];
    }

    get next() {
        if (this._contour == null)
            return this;

        if (this._index >= (this.contour.edges.length - 1))
            return this.contour.edges[0];

        return this.contour.edges[this._index + 1];
    }

    get previous() {
        if (this._contour == null)
            return this;

        if (this._index == 0)
            return this.contour.edges[this.contour.edges.length - 1];

        return this.contour.edges[this._index - 1];
    }

    get nextNonpoint() {
        var edge = this.next;
        while (edge.isPoint)
            edge = edge.next;
        return edge;
    }

    get previousNonpoint() {
        var edge = this.previous;
        while (edge.isPoint)
            edge = edge.previous;
        return edge;
    }

    get hasCrossings() {
        return this._crossings != null && this._crossings.length > 0;
    }

    crossingsWithBlock(block) {
        if (this._crossings == null)
            return;

        var stop = {value: false};
        for (var crossing of this._crossings) {
            block(crossing, stop);
            if (stop.value)
                break;
        }
    }

    crossingsCopyWithBlock(block) {
        if (this._crossings == null)
            return;

        var stop = {value: false};
        var crossingsCopy = this._crossings.slice();
        for (var crossing of crossingsCopy) {
            block(crossing, stop);
            if (stop.value)
                break;
        }
    }

    nextCrossing(crossing) {
        if (this._crossings == null || crossing.index >= (this._crossings.length - 1))
            return null;

        return this._crossings[crossing.index + 1];
    }

    previousCrossing(crossing) {
        if (this._crossings == null || crossing.index == 0)
            return null;

        return this._crossings[crossing.index - 1];
    }

    intersectingEdgesWithBlock(block) {
        this.crossingsWithBlock((crossing, stop) => {
            if (crossing.isSelfCrossing)
                return; // Right now skip over this intersecting crossings
            var intersectingEdge = crossing.counterpart.edge;
            block(intersectingEdge);
        });
    }

    selfIntersectingEdgesWithBlock(block) {
        this.crossingsWithBlock((crossing, stop) => {
            if (!crossing.isSelfCrossing)
                return; // Only want the this intersecting crossings
            var intersectingEdge = crossing.counterpart.edge;
            block(intersectingEdge);
        });
    }

    get firstCrossing() {
        if (this._crossings == null || this._crossings.length == 0)
            return null;
        return this._crossings[0];
    }

    get lastCrossing() {
        if (this._crossings == null || this._crossings.length == 0)
            return null;
        return this._crossings[this._crossings.length - 1];
    }

    get firstNonselfCrossing() {
        var first = this.firstCrossing;
        while (first != null && first.isSelfCrossing)
            first = first.next;
        return first;
    }

    get lastNonselfCrossing() {
        var last = this.lastCrossing;
        while (last != null && last.isSelfCrossing)
            last = last.previous;
        return last;
    }

    get hasNonselfCrossings() {
        var hasNonself = false;
        for (var crossing of this._crossings) {
            if (!crossing.isSelfCrossing) {
                hasNonself = true;
                break;
            }
        }
        return hasNonself;
    }

    crossesEdgeAtIntersection(edge2, intersection) {
        // If it's tangent, then it doesn't cross
        if (intersection.isTangent)
            return false;
        // If the intersect happens in the middle of both curves, then it definitely crosses, so we can just return yes. Most
        //  intersections will fall into this category.
        if (!intersection.isAtEndPointOfCurve)
            return true;

        // The intersection happens at the end of one of the edges, meaning we'll have to look at the next
        //  edge in sequence to see if it crosses or not. We'll do that by computing the four tangents at the exact
        //  point the intersection takes place. We'll compute the polar angle for each of the tangents. If the
        //  angles of this split the angles of edge2 (i.e. they alternate when sorted), then the edges cross. If
        //  any of the angles are equal or if the angles group up, then the edges don't cross.

        // Calculate the four tangents: The two tangents moving away from the intersection point on this, the two tangents
        //  moving away from the intersection point on edge2.
        var edge1Tangents = [];
        var edge2Tangents = [];
        var offset = 0.0;

        var edge1LeftCurve = {};
        var edge1RightCurve = {};
        findEdge1TangentCurves(this, intersection, edge1LeftCurve, edge1RightCurve);
        edge1LeftCurve = edge1LeftCurve.value;
        edge1RightCurve = edge1RightCurve.value;
        var edge1Length = Math.min(edge1LeftCurve.length(), edge1RightCurve.length());

        var edge2LeftCurve = {};
        var edge2RightCurve = {};
        findEdge2TangentCurves(edge2, intersection, edge2LeftCurve, edge2RightCurve);
        edge2LeftCurve = edge2LeftCurve.value;
        edge2RightCurve = edge2RightCurve.value;

        var edge2Length = Math.min(edge2LeftCurve.length(), edge2RightCurve.length());

        var maxOffset = Math.min(edge1Length, edge2Length);

        do {
            computeEdgeTangents(edge1LeftCurve, edge1RightCurve, offset, edge1Tangents);
            computeEdgeTangents(edge2LeftCurve, edge2RightCurve, offset, edge2Tangents);

            offset += 1.0;
        } while (areTangentsAmbigious(edge1Tangents, edge2Tangents) && offset < maxOffset);

        return tangentsCross(edge1Tangents, edge2Tangents);
    }

    crossesEdgeAtIntersectionRange(edge2, intersectRange) {
        // Calculate the four tangents: The two tangents moving away from the intersection point on this, the two tangents
        //  moving away from the intersection point on edge2.
        var edge1Tangents = [];
        var edge2Tangents = [];
        var offset = 0.0;

        var edge1LeftCurve = {};
        var edge1RightCurve = {};
        computeEdge1RangeTangentCurves(this, intersectRange, edge1LeftCurve, edge1RightCurve);
        edge1LeftCurve = edge1LeftCurve.value;
        edge1RightCurve = edge1RightCurve.value;

        var edge1Length = Math.min(edge1LeftCurve.length(), edge1RightCurve.length());

        var edge2LeftCurve = {};
        var edge2RightCurve = {};
        computeEdge2RangeTangentCurves(edge2, intersectRange, edge2LeftCurve, edge2RightCurve);
        edge2LeftCurve = edge2LeftCurve.value;
        edge2RightCurve = edge2RightCurve.value;
        var edge2Length = Math.min(edge2LeftCurve.length(), edge2RightCurve.length());

        var maxOffset = Math.min(edge1Length, edge2Length);

        do {
            computeEdgeTangents(edge1LeftCurve, edge1RightCurve, offset, edge1Tangents);
            computeEdgeTangents(edge2LeftCurve, edge2RightCurve, offset, edge2Tangents);

            offset += 1.0;
        } while (areTangentsAmbigious(edge1Tangents, edge2Tangents) && offset < maxOffset);

        return tangentsCross(edge1Tangents, edge2Tangents);
    }

    sortCrossings() {
        if (this._crossings == null)
            return;

        // Sort by the "order" of the crossing, then assign indices so next and previous work correctly.
        this._crossings.sort((crossing1, crossing2) => {
            return crossing1.order - crossing2.order;
        });
        var index = 0;
        for (var crossing of this._crossings)
            crossing.index = index++;
    }
}