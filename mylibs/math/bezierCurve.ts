import {
    bezierCurveDataIsPoint,
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
    bezierCurveDataClosestLocationToPoint
} from "./bezierCurveData";
import { equalPoints } from "./math";
import {
    normalizePoint,
    subtractPoint,
    addPoint,
    distanceBetweenPoints,
    unitScalePoint,
    lineBoundsMightOverlap,
    rangeMake,
    areTangentsAmbigious,
    tangentsCross,
    removeObject
} from "./geometry";
import { ICoordinate } from "carbon-geometry";
import { IBezierCurve, IBezierCrossing, IBezierCurveData, IContour, IIntersectionRange, IIntersection, IReference, IntersectionBlockCallback, IRange, CurveSplit, ILocation, IRectData } from "carbon-core";


function findEdge1TangentCurves(edge: IBezierCurve, intersection: IIntersection, leftCurve: IReference<IBezierCurve>, rightCurve: IReference<IBezierCurve>) {
    if (intersection.isAtStartOfCurve1) {
        leftCurve.value = edge.previousNonpoint;
        rightCurve.value = edge;
    } else if (intersection.isAtStopOfCurve1) {
        leftCurve.value = edge;
        rightCurve.value = edge.nextNonpoint;
    } else {
        leftCurve.value = intersection.curve1LeftBezier;
        rightCurve.value = intersection.curve1RightBezier;
    }
}

function findEdge2TangentCurves(edge: IBezierCurve, intersection: IIntersection, leftCurve: IReference<IBezierCurve>, rightCurve: IReference<IBezierCurve>) {
    if (intersection.isAtStartOfCurve2) {
        leftCurve.value = edge.previousNonpoint;
        rightCurve.value = edge;
    } else if (intersection.isAtStopOfCurve2) {
        leftCurve.value = edge;
        rightCurve.value = edge.nextNonpoint;
    } else {
        leftCurve.value = intersection.curve2LeftBezier;
        rightCurve.value = intersection.curve2RightBezier;
    }
}

function computeEdgeTangents(leftCurve: IBezierCurve, rightCurve: IBezierCurve, offset: number, edgeTangents: ICoordinate[]) {
    edgeTangents[0] = leftCurve.tangentFromRightOffset(offset);
    edgeTangents[1] = rightCurve.tangentFromLeftOffset(offset);
}


function computeEdge1RangeTangentCurves(edge: IBezierCurve, intersectRange: IIntersectionRange, leftCurve: IReference<IBezierCurve>, rightCurve: IReference<IBezierCurve>) {
    // edge1Tangents are firstOverlap.range1.minimum going to previous and lastOverlap.range1.maximum going to next
    if (intersectRange.isAtStartOfCurve1) {
        leftCurve.value = edge.previousNonpoint;
    }
    else {
        leftCurve.value = intersectRange.curve1LeftBezier;
    }

    if (intersectRange.isAtStopOfCurve1) {
        rightCurve.value = edge.nextNonpoint;
    }
    else {
        rightCurve.value = intersectRange.curve1RightBezier;
    }
}

function computeEdge2RangeTangentCurves(edge: IBezierCurve, intersectRange: IIntersectionRange, leftCurve: IReference<IBezierCurve>, rightCurve: IReference<IBezierCurve>) {
    // edge2Tangents are firstOverlap.range2.minimum going to previous and lastOverlap.range2.maximum going to next
    if (intersectRange.isAtStartOfCurve2) {
        leftCurve.value = edge.previousNonpoint;
    }
    else {
        leftCurve.value = intersectRange.curve2LeftBezier;
    }

    if (intersectRange.isAtStopOfCurve2) {
        rightCurve.value = edge.nextNonpoint;
    } else {
        rightCurve.value = intersectRange.curve2RightBezier;
    }
}


export default class BezierCurve implements IBezierCurve {
    private _crossings: IBezierCrossing[];
    private _data: IBezierCurveData;
    private _contour: IContour;
    private _index: number;
    private _startShared: boolean;

    constructor() {
        this._crossings = [];
    }

    get data(): IBezierCurveData {
        return this._data;
    }

    get endPoint1(): ICoordinate {
        return this._data.endPoint1;
    }

    get controlPoint1(): ICoordinate {
        return this._data.controlPoint1;
    }

    get controlPoint2(): ICoordinate {
        return this._data.controlPoint2;
    }

    get endPoint2(): ICoordinate {
        return this._data.endPoint2;
    }

    get isStraightLine(): boolean {
        return this._data.isStraightLine;
    }

    static bezierCurvesFromBezierPath(path): IBezierCurve[] {
        // Helper method to easily convert a bezier path into an array of FBBezierCurves. Very straight forward,
        //  only lines are a special case.

        let lastPoint = null;
        let bezierCurves = new Array();
        let elements = path.elements();
        for (let i = 0; i < elements.length; i++) {
            let element = elements[i];

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

    static bezierCurveWithLine(startPoint: ICoordinate, endPoint: ICoordinate): IBezierCurve {
        let curve = new BezierCurve();
        curve.initWithLine(startPoint, endPoint);

        return curve;
    }

    static bezierCurve(endPoint1: ICoordinate, controlPoint1: ICoordinate, controlPoint2: ICoordinate, endPoint2: ICoordinate): IBezierCurve {
        let curve = new BezierCurve();
        curve.init(endPoint1, controlPoint1, controlPoint2, endPoint2);

        return curve;
    }

    static bezierCurveWithBezierCurveData(data): IBezierCurve {
        let curve = new BezierCurve();
        curve._data = data;

        return curve;
    }

    init(endPoint1: ICoordinate, controlPoint1: ICoordinate, controlPoint2: ICoordinate, endPoint2: ICoordinate, contour?: IContour): void {
        this._data = bezierCurveDataMake(endPoint1, controlPoint1, controlPoint2, endPoint2, false);
        this._contour = contour; // no cyclical references
    }

    initWithLine(startPoint: ICoordinate, endPoint: ICoordinate, contour?: any): void {
        // Convert the line into a bezier curve to keep our intersection algorithm general (i.e. only
        //  has to deal with curves, not lines). As long as the control points are colinear with the
        //  end points, it'll be a line. But for consistency sake, we put the control points inside
        //  the end points, 1/3 of the total distance away from their respective end point.
        let distance = distanceBetweenPoints(startPoint, endPoint);
        let leftTangent = normalizePoint(subtractPoint(endPoint, startPoint));

        this._data = bezierCurveDataMake(startPoint, addPoint(startPoint, unitScalePoint(leftTangent, distance / 3.0)), addPoint(startPoint, unitScalePoint(leftTangent, 2.0 * distance / 3.0)), endPoint, true);
        this._contour = contour; // no cyclical references
    }

    isEqual(other: IBezierCurve): boolean {
        if (!(other instanceof BezierCurve)) {
            return false;
        }

        return bezierCurveDataIsEqual(this._data, other._data);
    }

    doesHaveIntersectionsWithBezierCurve(curve: IBezierCurve): boolean {
        let count = 0;
        this.intersectionsWithBezierCurve(curve, null, (_, stop) => {
            ++count;
            stop.value = true; // Only need the one
        });

        return count > 0;
    }

    intersectionsWithBezierCurve(curve: IBezierCurve, intersectRange: IReference<IIntersectionRange>, block: IntersectionBlockCallback): void {
        // For performance reasons, do a quick bounds check to see if these even might intersect
        if (!lineBoundsMightOverlap(bezierCurveDataBoundingRect(this._data), bezierCurveDataBoundingRect(curve.data))) {
            return;
        }
        if (!lineBoundsMightOverlap(bezierCurveDataBounds(this._data), bezierCurveDataBounds(curve.data))) {
            return;
        }

        let usRangeRef: IReference<IRange> = { value: rangeMake(0, 1) };
        let themRangeRef: IReference<IRange> = { value: rangeMake(0, 1) };
        let stop: IReference<boolean> = { value: false };
        bezierCurveDataIntersectionsWithBezierCurve(this._data, curve.data, usRangeRef, themRangeRef, this, curve, intersectRange, 0, block, stop);
    }


    subcurveWithRange(range: IRange): IBezierCurve {
        return BezierCurve.bezierCurveWithBezierCurveData(bezierCurveDataSubcurveWithRange(this._data, range));
    }

    splitSubcurvesWithRange(range: IRange, curves: CurveSplit): void {
        // Return a bezier curve representing the parameter range specified. We do this by splitting
        //  twice: once on the minimum, the splitting the result of that on the maximum.
        // Start with the left side curve
        let remainingCurve = emptyObject<IBezierCurveData>();
        if (range.minimum === 0.0) {
            remainingCurve = this._data;
            if (curves.leftCurve !== null) {
                curves.leftCurve = null;
            }
        } else {
            let leftCurveData = emptyObject<IBezierCurveData>();
            bezierCurveDataPointAtParameter(this._data, range.minimum, leftCurveData, remainingCurve);
            if (curves.leftCurve !== undefined) {
                curves.leftCurve = BezierCurve.bezierCurveWithBezierCurveData(leftCurveData);
            }
        }

        // Special case  where we start at the end
        if (range.minimum === 1.0) {
            if (curves.middleCurve !== undefined) {
                curves.middleCurve = BezierCurve.bezierCurveWithBezierCurveData(remainingCurve);
            }

            if (curves.rightCurve !== undefined) {
                curves.rightCurve = null;
            }

            return; // avoid the divide by zero below
        }

        // We need to adjust the maximum parameter to fit on the new curve before we split again
        let adjustedMaximum = (range.maximum - range.minimum) / (1.0 - range.minimum);
        let middleCurveData = emptyObject<IBezierCurveData>();;
        let rightCurveData = emptyObject<IBezierCurveData>();;
        bezierCurveDataPointAtParameter(remainingCurve, adjustedMaximum, middleCurveData, rightCurveData);
        if (curves.middleCurve !== undefined) {
            curves.middleCurve = BezierCurve.bezierCurveWithBezierCurveData(middleCurveData);
        }

        if (curves.rightCurve !== undefined) {
            curves.rightCurve = BezierCurve.bezierCurveWithBezierCurveData(rightCurveData);
        }
    }

    reversedCurve(): IBezierCurve {
        return BezierCurve.bezierCurveWithBezierCurveData(bezierCurveDataReversed(this._data));
    }

    pointAt(parameter: number, curves: CurveSplit): ICoordinate {
        let leftData = emptyObject<IBezierCurveData>();
        let rightData = emptyObject<IBezierCurveData>();
        let point = bezierCurveDataPointAtParameter(this._data, parameter, leftData, rightData);
        if (curves.leftCurve !== undefined) {
            curves.leftCurve = BezierCurve.bezierCurveWithBezierCurveData(leftData);
        }
        if (curves.rightCurve !== undefined) {
            curves.rightCurve = BezierCurve.bezierCurveWithBezierCurveData(rightData);
        }

        return point;
    }

    refineParameter(parameter: number, point: ICoordinate): number {
        return bezierCurveDataRefineParameter(this._data, parameter, point);
    }

    length(): number {
        return bezierCurveDataGetLength(this._data);
    }

    lengthAtParameter(parameter: number): number {
        return bezierCurveDataGetLengthAtParameter(this._data, parameter);
    }

    get isPoint(): boolean {
        return bezierCurveDataIsPoint(this._data);
    }

    closestLocationToPoint(point: ICoordinate): ILocation {
        return bezierCurveDataClosestLocationToPoint(this._data, point);
    }

    get bounds(): IRectData {
        return bezierCurveDataBounds(this._data);
    }

    get boundingRect(): IRectData {
        return bezierCurveDataBoundingRect(this._data);
    }

    pointFromRightOffset(offset: number): ICoordinate {
        let length = this.length();
        offset = Math.min(offset, length);
        let time = 1.0 - (offset / length);

        return bezierCurveDataPointAtParameter(this._data, time, null, null);
    }

    pointFromLeftOffset(offset: number): ICoordinate {
        let length = this.length();
        offset = Math.min(offset, length);
        let time = offset / length;

        return bezierCurveDataPointAtParameter(this._data, time, null, null);
    }

    tangentFromRightOffset(offset: number): ICoordinate {
        if (this._data.isStraightLine && !bezierCurveDataIsPoint(this._data)) {
            return subtractPoint(this._data.endPoint1, this._data.endPoint2);
        }

        let returnValue = null;
        if (offset === 0.0 && !equalPoints(this._data.controlPoint2, this._data.endPoint2)) {
            returnValue = subtractPoint(this._data.controlPoint2, this._data.endPoint2);
        }
        else {
            let length = bezierCurveDataGetLength(this._data);
            if (offset === 0.0) {
                offset = Math.min(1.0, length);
            }
            let time = 1.0 - (offset / length);
            let leftCurveData = emptyObject<IBezierCurveData>();
            bezierCurveDataPointAtParameter(this._data, time, leftCurveData, null);
            returnValue = subtractPoint(leftCurveData.controlPoint2, leftCurveData.endPoint2);
        }

        return returnValue;
    }

    tangentFromLeftOffset(offset: number): ICoordinate {
        if (this._data.isStraightLine && !bezierCurveDataIsPoint(this._data)) {
            return subtractPoint(this._data.endPoint2, this._data.endPoint1);
        }

        let returnValue = null;
        if (offset === 0.0 && !equalPoints(this._data.controlPoint1, this._data.endPoint1)) {
            returnValue = subtractPoint(this._data.controlPoint1, this._data.endPoint1);
        }
        else {
            let length = bezierCurveDataGetLength(this._data);
            if (offset === 0.0) {
                offset = Math.min(1.0, length);
            }
            let time = offset / length;
            let rightCurve = emptyObject<IBezierCurveData>();
            bezierCurveDataPointAtParameter(this._data, time, null, rightCurve);
            returnValue = subtractPoint(rightCurve.controlPoint1, rightCurve.endPoint1);
        }

        return returnValue;
    }

    clone(): IBezierCurve {
        return BezierCurve.bezierCurveWithBezierCurveData(this._data);
    }

    // edge
    get index(): number {
        return this._index;
    }

    set index(value: number) {
        this._index = value;
    }

    get isStartShared(): boolean {
        return this._startShared;
    }

    set startShared(value: boolean) {
        this._startShared = value;
    }

    get contour(): IContour {
        return this._contour;
    }

    set contour(value: IContour) {
        this._contour = value;
    }

    addCrossing(crossing: IBezierCrossing): void {
        // Make sure the crossing can make it back to us, and keep all the crossings sorted
        crossing.edge = this;
        this._crossings.push(crossing);
        this.sortCrossings();
    }

    removeCrossing(crossing: IBezierCrossing): void {
        // Keep the crossings sorted
        crossing.edge = null;
        removeObject(this._crossings, crossing);
        this.sortCrossings();
    }

    removeAllCrossings(): void {
        this._crossings = [];
    }

    get next(): IBezierCurve {
        if (this._contour === null) {
            return this;
        }

        if (this._index >= (this.contour.edges.length - 1)) {
            return this.contour.edges[0];
        }

        return this.contour.edges[this._index + 1];
    }

    get previous(): IBezierCurve {
        if (this._contour === null) {
            return this;
        }

        if (this._index === 0) {
            return this.contour.edges[this.contour.edges.length - 1];
        }

        return this.contour.edges[this._index - 1];
    }

    get nextNonpoint(): IBezierCurve {
        let edge = this.next;
        while (edge && edge.isPoint) {
            edge = edge.next;
        }

        return edge;
    }

    get previousNonpoint(): IBezierCurve {
        let edge = this.previous;
        while (edge && edge.isPoint) {
            edge = edge.previous;
        }

        return edge;
    }

    get hasCrossings(): boolean {
        return this._crossings !== null && this._crossings.length > 0;
    }

    crossingsWithBlock(block: (crossing: IBezierCrossing, stop: IReference<boolean>) => void): void {
        if (this._crossings === null) {
            return;
        }

        let stop = { value: false };
        for (let crossing of this._crossings) {
            block(crossing, stop);

            if (stop.value) {
                break;
            }
        }
    }

    crossingsCopyWithBlock(block: (crossing: IBezierCrossing, stop: IReference<boolean>) => void): void {
        if (this._crossings === null) {
            return;
        }

        let stop = { value: false };
        let crossingsCopy = this._crossings.slice();
        for (let crossing of crossingsCopy) {
            block(crossing, stop);
            if (stop.value) {
                break;
            }
        }
    }

    nextCrossing(crossing: IBezierCrossing): IBezierCrossing {
        if (this._crossings === null || crossing.index >= (this._crossings.length - 1)) {
            return null;
        }

        return this._crossings[crossing.index + 1];
    }

    previousCrossing(crossing: IBezierCrossing): IBezierCrossing {
        if (this._crossings === null || crossing.index === 0) {
            return null;
        }

        return this._crossings[crossing.index - 1];
    }

    intersectingEdgesWithBlock(block: (edge: IBezierCurve) => void): void {
        this.crossingsWithBlock((crossing, stop) => {
            if (crossing.isSelfCrossing) {
                return; // Right now skip over this intersecting crossings
            }
            let intersectingEdge = crossing.counterpart.edge;
            block(intersectingEdge);
        });
    }

    selfIntersectingEdgesWithBlock(block: (edge: IBezierCurve) => void): void {
        this.crossingsWithBlock((crossing, stop) => {
            if (!crossing.isSelfCrossing) {
                return; // Only want the this intersecting crossings
            }

            let intersectingEdge = crossing.counterpart.edge;
            block(intersectingEdge);
        });
    }

    get firstCrossing(): IBezierCrossing {
        if (this._crossings === null || this._crossings.length === 0) {
            return null;
        }

        return this._crossings[0];
    }

    get lastCrossing(): IBezierCrossing {
        if (this._crossings === null || this._crossings.length === 0) {
            return null;
        }

        return this._crossings[this._crossings.length - 1];
    }

    get firstNonselfCrossing(): IBezierCrossing {
        let first = this.firstCrossing;
        while (first !== null && first.isSelfCrossing) {
            first = first.next;
        }

        return first;
    }

    get lastNonselfCrossing(): IBezierCrossing {
        let last = this.lastCrossing;
        while (last !== null && last.isSelfCrossing) {
            last = last.previous;
        }

        return last;
    }

    get hasNonselfCrossings(): boolean {
        let hasNonself = false;
        for (let crossing of this._crossings) {
            if (!crossing.isSelfCrossing) {
                hasNonself = true;
                break;
            }
        }

        return hasNonself;
    }

    crossesEdgeAtIntersection(edge2: IBezierCurve, intersection: IIntersection): boolean {
        // If it's tangent, then it doesn't cross
        if (intersection.isTangent) {
            return false;
        }
        // If the intersect happens in the middle of both curves, then it definitely crosses, so we can just return yes. Most
        //  intersections will fall into this category.
        if (!intersection.isAtEndPointOfCurve) {
            return true;
        }

        // The intersection happens at the end of one of the edges, meaning we'll have to look at the next
        //  edge in sequence to see if it crosses or not. We'll do that by computing the four tangents at the exact
        //  point the intersection takes place. We'll compute the polar angle for each of the tangents. If the
        //  angles of this split the angles of edge2 (i.e. they alternate when sorted), then the edges cross. If
        //  any of the angles are equal or if the angles group up, then the edges don't cross.

        // Calculate the four tangents: The two tangents moving away from the intersection point on this, the two tangents
        //  moving away from the intersection point on edge2.
        let edge1Tangents: ICoordinate[] = [];
        let edge2Tangents: ICoordinate[] = [];
        let offset = 0.0;

        let edge1LeftCurveRef = { value: null };
        let edge1RightCurveRef = { value: null };
        findEdge1TangentCurves(this, intersection, edge1LeftCurveRef, edge1RightCurveRef);
        let edge1LeftCurve = edge1LeftCurveRef.value;
        let edge1RightCurve = edge1RightCurveRef.value;
        let edge1Length = Math.min(edge1LeftCurve.length(), edge1RightCurve.length());

        let edge2LeftCurveRef = { value: null };
        let edge2RightCurveRef = { value: null };
        findEdge2TangentCurves(edge2, intersection, edge2LeftCurveRef, edge2RightCurveRef);
        let edge2LeftCurve = edge2LeftCurveRef.value;
        let edge2RightCurve = edge2RightCurveRef.value;

        let edge2Length = Math.min(edge2LeftCurve.length(), edge2RightCurve.length());

        let maxOffset = Math.min(edge1Length, edge2Length);

        do {
            computeEdgeTangents(edge1LeftCurve, edge1RightCurve, offset, edge1Tangents);
            computeEdgeTangents(edge2LeftCurve, edge2RightCurve, offset, edge2Tangents);

            offset += 1.0;
        } while (areTangentsAmbigious(edge1Tangents, edge2Tangents) && offset < maxOffset);

        return tangentsCross(edge1Tangents, edge2Tangents);
    }

    crossesEdgeAtIntersectionRange(edge2: IBezierCurve, intersectRange: IIntersectionRange): boolean {
        // Calculate the four tangents: The two tangents moving away from the intersection point on this, the two tangents
        //  moving away from the intersection point on edge2.
        let edge1Tangents: ICoordinate[] = [];
        let edge2Tangents: ICoordinate[] = [];
        let offset = 0.0;

        let edge1LeftCurveRef = { value: null };
        let edge1RightCurveRef = { value: null };
        computeEdge1RangeTangentCurves(this, intersectRange, edge1LeftCurveRef, edge1RightCurveRef);
        let edge1LeftCurve = edge1LeftCurveRef.value;
        let edge1RightCurve = edge1RightCurveRef.value;

        let edge1Length = Math.min(edge1LeftCurve.length(), edge1RightCurve.length());

        let edge2LeftCurveRef = { value: null };
        let edge2RightCurveRef = { value: null };
        computeEdge2RangeTangentCurves(edge2, intersectRange, edge2LeftCurveRef, edge2RightCurveRef);
        let edge2LeftCurve = edge2LeftCurveRef.value;
        let edge2RightCurve = edge2RightCurveRef.value;
        let edge2Length = Math.min(edge2LeftCurve.length(), edge2RightCurve.length());

        let maxOffset = Math.min(edge1Length, edge2Length);

        do {
            computeEdgeTangents(edge1LeftCurve, edge1RightCurve, offset, edge1Tangents);
            computeEdgeTangents(edge2LeftCurve, edge2RightCurve, offset, edge2Tangents);

            offset += 1.0;
        } while (areTangentsAmbigious(edge1Tangents, edge2Tangents) && offset < maxOffset);

        return tangentsCross(edge1Tangents, edge2Tangents);
    }

    toString() {
        return `(${this.endPoint1.x}, ${this.endPoint1.y}) - (${this.endPoint2.x}, ${this.endPoint2.y})`;
    }

    sortCrossings(): void {
        if (this._crossings === null) {
            return;
        }

        // Sort by the "order" of the crossing, then assign indices so next and previous work correctly.
        this._crossings.sort((crossing1, crossing2) => {
            return crossing1.order - crossing2.order;
        });

        let index = 0;
        for (let crossing of this._crossings) {
            crossing.index = index++;
        }
    }
}