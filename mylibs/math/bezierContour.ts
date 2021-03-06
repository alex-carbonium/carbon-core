import { rangeMake, unionRect, arePointsClose } from "./geometry";
import { isPointInRect } from "./math";
import BezierCurve from "./bezierCurve";
import { IContour, IReference, IIntersectionRange, ILocation, IBezierCurve, IBezierCrossing } from "carbon-core";
import CurveLocation from './curveLocation';
import { IIntersection, ICoordinate, ContourDirection, IRectData, IContourOverlap } from "carbon-core";

export default class BezierContour implements IContour {
    private _edges: IBezierCurve[];
    private _inside: number;
    private _bounds: IRectData;
    private _boundingRect: IRectData
    private _overlaps: IContourOverlap[];

    get edges(): IBezierCurve[] {
        return this._edges;
    }

    set edges(value: IBezierCurve[]) {
        this._edges = value;
    }

    get inside(): number {
        return this._inside;
    }

    set inside(value: number) {
        this._inside = value;
    }

    constructor() {
        this._edges = [];
        this._overlaps = [];
    }

    static bezierContourWithCurve(curve: IBezierCurve): IContour {
        let contour = new BezierContour();
        contour.addCurve(curve);

        return contour;
    }


    addCurve(curve: IBezierCurve): void {
        // Add the curve by wrapping it in an edge
        if (curve === null) {
            return;
        }

        curve.contour = this;
        curve.index = this._edges.length;
        this._edges.push(curve);
        this._bounds = null; // force the bounds to be recalculated
        this._boundingRect = null;
    }

    addCurveFrom(startCrossing: IBezierCrossing, endCrossing: IBezierCrossing): void {
        // First construct the curve that we're going to add, by seeing which crossing
        //  is null. If the crossing isn't given go to the end of the edge on that side.
        let curve = null;
        if (startCrossing === null && endCrossing !== null) {
            // From start to endCrossing
            curve = endCrossing.leftCurve;
        } else if (startCrossing !== null && endCrossing === null) {
            // From startCrossing to end
            curve = startCrossing.rightCurve;
        } else if (startCrossing !== null && endCrossing !== null) {
            // From startCrossing to endCrossing
            curve = startCrossing.curve.subcurveWithRange(rangeMake(startCrossing.parameter, endCrossing.parameter));
        }
        this.addCurve(curve);
    }

    addReverseCurve(curve: IBezierCurve): void {
        // Just reverse the points on the curve. Need to do this to ensure the end point from one edge, matches the start
        //  on the next edge.
        if (curve === null) {
            return;
        }

        this.addCurve(curve.reversedCurve());
    }

    addReverseCurveFrom(startCrossing: IBezierCrossing, endCrossing: IBezierCrossing): void {
        // First construct the curve that we're going to add, by seeing which crossing
        //  is null. If the crossing isn't given go to the end of the edge on that side.
        let curve: IBezierCurve = null;
        if (startCrossing === null && endCrossing !== null) {
            // From start to endCrossing
            curve = endCrossing.leftCurve;
        } else if (startCrossing !== null && endCrossing === null) {
            // From startCrossing to end
            curve = startCrossing.rightCurve;
        } else if (startCrossing !== null && endCrossing !== null) {
            // From startCrossing to endCrossing
            curve = startCrossing.curve.subcurveWithRange(rangeMake(startCrossing.parameter, endCrossing.parameter));
        }
        this.addReverseCurve(curve);
    }

    get bounds(): IRectData {
        // Cache the bounds to save time
        if (this._bounds) {
            return this._bounds;
        }

        // If no edges, no bounds
        if (this._edges.length === 0) {
            return null;
        }

        let totalBounds = null;
        for (let edge of this._edges) {
            let bounds = edge.bounds;
            if (!totalBounds) {
                totalBounds = bounds;
            } else {
                totalBounds = unionRect(totalBounds, bounds);
            }
        }

        this._bounds = totalBounds;

        return this._bounds;
    }

    get boundingRect(): IRectData {
        // Cache the bounds to save time
        if (this._boundingRect) {
            return this._boundingRect;
        }

        // If no edges, no bounds
        if (this._edges.length === 0) {
            return null;
        }

        let totalBounds = null;
        for (let edge of this._edges) {
            let bounds = edge.boundingRect;
            if (!totalBounds) {
                totalBounds = bounds;
            } else {
                totalBounds = unionRect(totalBounds, bounds);
            }
        }

        this._boundingRect = totalBounds;

        return this._boundingRect;
    }

    firstPoint(): ICoordinate {
        if (this._edges.length === 0) {
            return null;
        }

        let edge = this._edges[0];

        return edge.endPoint1;
    }

    containsPoint(testPoint: ICoordinate): boolean {
        if (!isPointInRect(this.boundingRect, testPoint) || !isPointInRect(this.bounds, testPoint)) {
            return false;
        }

        // Create a test line from our point to somewhere outside our graph. We'll see how many times the test
        //  line intersects edges of the graph. Based on the even/odd rule, if it's an odd number, we're inside
        //  the graph, if even, outside.
        let lineEndPoint: ICoordinate = {
            x: testPoint.x > this.bounds.x ? this.bounds.x - 10 : (this.bounds.x + this.bounds.width) + 10,
            y: testPoint.y
        };
        /* just move us outside the bounds of the graph */
        let testCurve = BezierCurve.bezierCurveWithLine(testPoint, lineEndPoint);

        let intersectCount = this.numberOfIntersectionsWithRay(testCurve);

        return (intersectCount & 1) === 1;
    }

    numberOfIntersectionsWithRay(testEdge: IBezierCurve): number {
        let count = 0;
        this.intersectionsWithRay(testEdge, (intersection) => {
            count++;
        });

        return count;
    }

    intersectionsWithRay(testEdge: IBezierCurve, block: (p: IIntersection) => void): void {
        let firstIntersection = null;
        let previousIntersection = null;

        // Count how many times we intersect with this particular contour
        for (let edge of this._edges) {
            // Check for intersections between our test ray and the rest of the bezier graph
            let intersectRange: IReference<IIntersectionRange> = { value: null };
            testEdge.intersectionsWithBezierCurve(edge, intersectRange, (intersection: IIntersection) => {
                // Make sure this is a proper crossing
                if (!testEdge.crossesEdgeAtIntersection(edge, intersection) || edge.isPoint) {// don't count tangents
                    return;
                }

                // Make sure we don't count the same intersection twice. This happens when the ray crosses at
                //  start or end of an edge.
                if (intersection.isAtStartOfCurve2 && previousIntersection !== null) {
                    let previousEdge = edge.previous;
                    if (previousIntersection.isAtEndPointOfCurve2 && previousEdge === previousIntersection.curve2) {
                        return;
                    }
                } else if (intersection.isAtEndPointOfCurve2 && firstIntersection !== null) {
                    let nextEdge = edge.next;
                    if (firstIntersection.isAtStartOfCurve2 && nextEdge === firstIntersection.curve2) {
                        return;
                    }
                }

                block(intersection);

                if (firstIntersection === null) {
                    firstIntersection = intersection;
                }

                previousIntersection = intersection;
            });

            let intersectRangeValue = intersectRange.value;
            if (intersectRangeValue !== null && testEdge.crossesEdgeAtIntersectionRange(edge, intersectRangeValue)) {
                block(intersectRangeValue.middleIntersection);
            }
        }
    }

    startEdge(): IBezierCurve {
        // When marking we need to start at a point that is clearly either inside or outside
        //  the other graph, otherwise we could mark the crossings exactly opposite of what
        //  they're supposed to be.
        if (this.edges.length === 0) {
            return null;
        }

        let startEdge = this.edges[0];
        let stopValue = startEdge;
        while (startEdge.isStartShared) {
            startEdge = startEdge.next;
            if (startEdge === stopValue) {
                break; // for safety. But if we're here, we could be hosed
            }
        }

        return startEdge;
    }

    testPointForContainment(): ICoordinate {
        // Start with the startEdge, and if it's not shared (overlapping) then use its first point
        let testEdge = this.startEdge();
        if (!testEdge.isStartShared) {
            return testEdge.endPoint1;
        }

        // At this point we know that all the end points defining this contour are shared. We'll
        //  need to somewhat arbitrarily pick a point on an edge that's not overlapping
        let stopValue = testEdge;
        let parameter = 0.5;
        while (this.doesOverlapContainParameter(parameter, testEdge)) {
            testEdge = testEdge.next;
            if (testEdge === stopValue) {
                break; // for safety. But if we're here, we could be hosed
            }
        }

        return testEdge.pointAt(parameter, {});
    }

    startingEdge(outEdge: IReference<IBezierCurve>, outParameter: IReference<number>, outPoint: IReference<ICoordinate>): void {
        // Start with the startEdge, and if it's not shared (overlapping) then use its first point
        let testEdge = this.startEdge();
        if (!testEdge.isStartShared) {
            outEdge.value = testEdge;
            outParameter.value = 0.0;
            outPoint.value = testEdge.endPoint1;

            return;
        }

        // At this point we know that all the end points defining this contour are shared. We'll
        //  need to somewhat arbitrarily pick a point on an edge that's not overlapping
        let stopValue = testEdge;
        let parameter = 0.5;
        while (this.doesOverlapContainParameter(parameter, testEdge)) {
            testEdge = testEdge.next;
            if (testEdge === stopValue) {
                break; // for safety. But if we're here, we could be hosed
            }
        }

        outEdge.value = testEdge;
        outParameter.value = parameter;
        outPoint.value = testEdge.pointAt(parameter, {});
    }

    markCrossingsAsEntryOrExitWithContour(otherContour: IContour, markInside: boolean): void {
        // Go through and mark all the crossings with the given contour as "entry" or "exit". This
        //  determines what part of ths contour is outputted.

        // When marking we need to start at a point that is clearly either inside or outside
        //  the other graph, otherwise we could mark the crossings exactly opposite of what
        //  they're supposed to be.
        let startEdgeRef: IReference<IBezierCurve> = { value: null };
        let startPointRef: IReference<ICoordinate> = { value: null };
        let startParameterRef: IReference<number> = { value: null };
        this.startingEdge(startEdgeRef, startParameterRef, startPointRef);
        let startEdge = startEdgeRef.value;
        let startParameter = startParameterRef.value;
        let startPoint = startPointRef.value;

        // Calculate the first entry value. We need to determine if the edge we're starting
        //  on is inside or outside the otherContour.
        let contains = otherContour.contourAndSelfIntersectingContoursContainPoint(startPoint);
        let isEntry = markInside ? !contains : contains;
        let otherContours = otherContour.selfIntersectingContours.slice();
        otherContours.push(otherContour);

        let StopParameterNoLimit = 2.0; // needs to be > 1.0
        let StartParameterNoLimit = 0.0;

        // Walk all the edges in this contour and mark the crossings
        isEntry = this.markCrossingsOnEdge(startEdge, startParameter, StopParameterNoLimit, otherContours, isEntry);
        let edge = startEdge.next;
        while (edge !== startEdge) {
            isEntry = this.markCrossingsOnEdge(edge, StartParameterNoLimit, StopParameterNoLimit, otherContours, isEntry);
            edge = edge.next;
        }
        this.markCrossingsOnEdge(startEdge, StartParameterNoLimit, startParameter, otherContours, isEntry);
    }

    markCrossingsOnEdge(edge: IBezierCurve, startParameter: number, stopParameter: number, otherContours: IContour[], startIsEntry: boolean): boolean {
        let isEntry = startIsEntry;
        // Mark all the crossings on this edge
        edge.crossingsWithBlock((crossing, stop) => {
            // skip over other contours
            if (crossing.isSelfCrossing || otherContours.indexOf(crossing.counterpart.edge.contour) === -1) {
                return;
            }

            if (crossing.parameter < startParameter || crossing.parameter >= stopParameter) {
                return;
            }

            crossing.entry = isEntry;
            isEntry = !isEntry; // toggle.
        });

        return isEntry;
    }

    contourAndSelfIntersectingContoursContainPoint(point: ICoordinate): boolean {
        let containerCount = 0;
        if (this.containsPoint(point)) {
            containerCount++;
        }

        let intersectingContours = this.selfIntersectingContours;
        for (let contour of intersectingContours) {
            if (contour.containsPoint(point)) {
                containerCount++;
            }
        }

        return (containerCount & 1) !== 0;
    }

    close(): void {
        // adds an element to connect first and last points on the contour
        if (this._edges.length === 0) {
            return;
        }

        let first = this._edges[0];
        let last = this._edges[this._edges.length - 1];

        if (!arePointsClose(first.endPoint1, last.endPoint2)) {
            this.addCurve(BezierCurve.bezierCurveWithLine(last.endPoint2, first.endPoint1));
        }
    }

    reversedContour(): IContour {
        let revContour = new BezierContour();

        for (let edge of this._edges) {
            revContour.addReverseCurve(edge);
        }

        return revContour;
    }


    direction(): ContourDirection {
        let lastPoint = null, currentPoint = null;
        let firstPoint = true;
        let a = 0.0;

        for (let edge of this._edges) {
            if (firstPoint) {
                lastPoint = edge.endPoint1;
                firstPoint = false;
            } else {
                currentPoint = edge.endPoint2;
                a += ((lastPoint.x * currentPoint.y) - (currentPoint.x * lastPoint.y));
                lastPoint = currentPoint;
            }
        }

        return (a >= 0) ? ContourDirection.Clockwise : ContourDirection.AntiClockwise;
    }


    contourMadeClockwiseIfNecessary(): IContour {
        let dir = this.direction();

        if (dir === ContourDirection.Clockwise) {
            return this;
        }

        return this.reversedContour();
    }

    crossesOwnContour(contour: IContour): boolean {
        for (let edge of this._edges) {
            let intersects = false;
            edge.crossingsWithBlock((crossing, stop) => {
                if (!crossing.isSelfCrossing) {
                    return; // Only want the this intersecting crossings
                }

                let intersectingEdge = crossing.counterpart.edge;
                if (intersectingEdge.contour === contour) {
                    intersects = true;
                    stop.value = true;
                }
            });

            if (intersects) {
                return true;
            }
        }

        return false;
    }

    intersectingContours(): IContour[] {
        // Go and find all the unique contours that intersect this specific contour
        let contours: IContour[] = [];
        for (let edge of this._edges) {
            edge.intersectingEdgesWithBlock((intersectingEdge) => {
                if (contours.indexOf(intersectingEdge.contour) === -1) {
                    contours.push(intersectingEdge.contour);
                }
            });
        }

        return contours;
    }

    get selfIntersectingContours(): IContour[] {
        // Go and find all the unique contours that intersect this specific contour from our own graph
        let contours: IContour[] = [];
        this.addSelfIntersectingContoursToArray(contours, this);

        return contours;
    }

    addSelfIntersectingContoursToArray(contours: IContour[], originalContour: IContour): void {
        for (let edge of this._edges) {
            edge.selfIntersectingEdgesWithBlock((intersectingEdge) => {
                if (intersectingEdge.contour !== originalContour && contours.indexOf(intersectingEdge.contour) === -1) {
                    contours.push(intersectingEdge.contour);
                    intersectingEdge.contour.addSelfIntersectingContoursToArray(contours, originalContour);
                }
            });
        }
    }

    addOverlap(overlap: IContourOverlap): void {
        if (overlap.isEmpty()) {
            return;
        }

        this._overlaps.push(overlap);
    }

    removeAllOverlaps(): void {
        if (!this._overlaps) {
            return;
        }

        this._overlaps = [];
    }

    isEquivalent(other: IContour): boolean {
        if (!this._overlaps) {
            return false;
        }

        for (let overlap of this._overlaps) {
            if (overlap.isBetweenContour(this, other) && overlap.isComplete()) {
                return true;
            }
        }

        return false;
    }

    forEachEdgeOverlapDo(block): void {
        if (!this._overlaps) {
            return;
        }

        for (let overlap of this._overlaps) {
            overlap.runsWithBlock((run, stop) => {
                for (let edgeOverlap of run.overlaps()) {
                    block(edgeOverlap);
                }
            });
        }
    }

    doesOverlapContainCrossing(crossing: IBezierCrossing): boolean {
        if (!this._overlaps) {
            return false;
        }

        for (let overlap of this._overlaps) {
            if (overlap.doesContainCrossing(crossing)) {
                return true;
            }
        }

        return false;
    }

    doesOverlapContainParameter(parameter: number, edge: IBezierCurve) {
        if (!this._overlaps) {
            return false;
        }

        for (let overlap of this._overlaps) {
            if (overlap.doesContainParameter(parameter, edge)) {
                return true;
            }
        }

        return false;
    }

    closestLocationToPoint(point: ICoordinate): ILocation {
        let closestEdge = null;
        let location: ILocation = { distance: null, parameter: 0 };

        for (let edge of this._edges) {
            let edgeLocation = edge.closestLocationToPoint(point);
            if (closestEdge === null || edgeLocation.distance < location.distance) {
                closestEdge = edge;
                location = edgeLocation;
            }
        }

        if (closestEdge === null) {
            return null;
        }

        let curveLocation = new CurveLocation(closestEdge, location.parameter, location.distance);
        curveLocation.contour = this;

        return curveLocation;
    }
}