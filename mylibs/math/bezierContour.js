import {rangeMake, unionRect, arePointsClose} from "./geometry";
import {isPointInRect} from "./math";
import BezierCurve from "./bezierCurve";

export default class BezierContour {
    get edges() {
        return this._edges;
    }

    set edges(value) {
        this._edges = value;
    }

    get inside() {
        return this._inside;
    }

    set inside(value) {
        this._inside = value;
    }

    constructor() {
        this._edges = [];
        this._overlaps = [];
    }

    static bezierContourWithCurve(curve) {
        var contour = new BezierContour();
        contour.addCurve(curve);
        return contour;
    }


    addCurve(curve) {
        // Add the curve by wrapping it in an edge
        if (curve == null)
            return;
        curve.contour = this;
        curve.index = this._edges.length;
        this._edges.push(curve);
        this._bounds = null; // force the bounds to be recalculated
        this._boundingRect = null;
        this._bezPathCache = null;
    }

    addCurveFrom(startCrossing, endCrossing) {
        // First construct the curve that we're going to add, by seeing which crossing
        //  is null. If the crossing isn't given go to the end of the edge on that side.
        var curve = null;
        if (startCrossing == null && endCrossing != null) {
            // From start to endCrossing
            curve = endCrossing.leftCurve;
        } else if (startCrossing != null && endCrossing == null) {
            // From startCrossing to end
            curve = startCrossing.rightCurve;
        } else if (startCrossing != null && endCrossing != null) {
            // From startCrossing to endCrossing
            curve = startCrossing.curve.subcurveWithRange(rangeMake(startCrossing.parameter, endCrossing.parameter));
        }
        this.addCurve(curve);
    }

    addReverseCurve(curve) {
        // Just reverse the points on the curve. Need to do this to ensure the end point from one edge, matches the start
        //  on the next edge.
        if (curve == null)
            return;

        this.addCurve(curve.reversedCurve());
    }

    addReverseCurveFrom(startCrossing, endCrossing) {
        // First construct the curve that we're going to add, by seeing which crossing
        //  is null. If the crossing isn't given go to the end of the edge on that side.
        var curve = null;
        if (startCrossing == null && endCrossing != null) {
            // From start to endCrossing
            curve = endCrossing.leftCurve;
        } else if (startCrossing != null && endCrossing == null) {
            // From startCrossing to end
            curve = startCrossing.rightCurve;
        } else if (startCrossing != null && endCrossing != null) {
            // From startCrossing to endCrossing
            curve = startCrossing.curve.subcurveWithRange(rangeMake(startCrossing.parameter, endCrossing.parameter));
        }
        this.addReverseCurve(curve);
    }

    get bounds() {
        // Cache the bounds to save time
        if (this._bounds)
            return this._bounds;

        // If no edges, no bounds
        if (this._edges.length == 0)
            return null;

        var totalBounds = null;
        for (var edge of this._edges) {
            var bounds = edge.bounds;
            if (!totalBounds)
                totalBounds = bounds;
            else
                totalBounds = unionRect(totalBounds, bounds);
        }

        this._bounds = totalBounds;

        return this._bounds;
    }

    get boundingRect() {
        // Cache the bounds to save time
        if (this._boundingRect)
            return this._boundingRect;

        // If no edges, no bounds
        if (this._edges.length == 0)
            return null;

        var totalBounds = null;
        for (var edge of this._edges) {
            var bounds = edge.boundingRect;
            if (!totalBounds)
                totalBounds = bounds;
            else
                totalBounds = unionRect(totalBounds, bounds);
        }

        this._boundingRect = totalBounds;

        return this._boundingRect;
    }

    firstPoint() {
        if (this._edges.length == 0)
            return null;

        var edge = this._edges[0];
        return edge.endPoint1;
    }

    containsPoint(testPoint) {
        if (!isPointInRect(this.boundingRect, testPoint) || !isPointInRect(this.bounds, testPoint))
            return false;

        // Create a test line from our point to somewhere outside our graph. We'll see how many times the test
        //  line intersects edges of the graph. Based on the even/odd rule, if it's an odd number, we're inside
        //  the graph, if even, outside.
        var lineEndPoint = {
            x: testPoint.x > this.bounds.x ? this.bounds.x - 10 : (this.bounds.x + this.bounds.width) + 10,
            y: testPoint.y
        };
        /* just move us outside the bounds of the graph */
        var testCurve = BezierCurve.bezierCurveWithLine(testPoint, lineEndPoint);

        var intersectCount = this.numberOfIntersectionsWithRay(testCurve);
        return (intersectCount & 1) == 1;
    }

    numberOfIntersectionsWithRay(testEdge) {
        var count = 0;
        this.intersectionsWithRay(testEdge, (intersection) => {
            count++;
        });
        return count;
    }

    intersectionsWithRay(testEdge, block) {
        var firstIntersection = null;
        var previousIntersection = null;

        // Count how many times we intersect with this particular contour
        for (var edge of this._edges) {
            // Check for intersections between our test ray and the rest of the bezier graph
            var intersectRange = {};
            testEdge.intersectionsWithBezierCurve(edge, intersectRange, (intersection, stop) => {
                // Make sure this is a proper crossing
                if (!testEdge.crossesEdgeAtIntersection(edge, intersection) || edge.isPoint) // don't count tangents
                    return;

                // Make sure we don't count the same intersection twice. This happens when the ray crosses at
                //  start or end of an edge.
                if (intersection.isAtStartOfCurve2 && previousIntersection != null) {
                    var previousEdge = edge.previous;
                    if (previousIntersection.isAtEndPointOfCurve2 && previousEdge == previousIntersection.curve2)
                        return;
                } else if (intersection.isAtEndPointOfCurve2 && firstIntersection != null) {
                    var nextEdge = edge.next;
                    if (firstIntersection.isAtStartOfCurve2 && nextEdge == firstIntersection.curve2)
                        return;
                }

                block(intersection);
                if (firstIntersection == null)
                    firstIntersection = intersection;
                previousIntersection = intersection;
            });
            intersectRange = intersectRange.value;
            if (intersectRange != null && testEdge.crossesEdgeAtIntersectionRange(edge, intersectRange)) {
                block(intersectRange.middleIntersection());
            }
        }
    }

    startEdge() {
        // When marking we need to start at a point that is clearly either inside or outside
        //  the other graph, otherwise we could mark the crossings exactly opposite of what
        //  they're supposed to be.
        if (this.edges.length == 0)
            return null;

        var startEdge = this.edges[0];
        var stopValue = startEdge;
        while (startEdge.isStartShared) {
            startEdge = startEdge.next;
            if (startEdge == stopValue)
                break; // for safety. But if we're here, we could be hosed
        }
        return startEdge;
    }

    testPointForContainment() {
        // Start with the startEdge, and if it's not shared (overlapping) then use its first point
        var testEdge = this.startEdge();
        if (!testEdge.isStartShared)
            return testEdge.endPoint1;

        // At this point we know that all the end points defining this contour are shared. We'll
        //  need to somewhat arbitrarily pick a point on an edge that's not overlapping
        var stopValue = testEdge;
        var parameter = 0.5;
        while (this.doesOverlapContainParameter(parameter, testEdge)) {
            testEdge = testEdge.next;
            if (testEdge == stopValue)
                break; // for safety. But if we're here, we could be hosed
        }

        return testEdge.pointAt(parameter, {});
    }

    startingEdge(outEdge, outParameter, outPoint) {
        // Start with the startEdge, and if it's not shared (overlapping) then use its first point
        var testEdge = this.startEdge();
        if (!testEdge.isStartShared) {
            outEdge.value = testEdge;
            outParameter.value = 0.0;
            outPoint.value = testEdge.endPoint1;
            return;
        }

        // At this point we know that all the end points defining this contour are shared. We'll
        //  need to somewhat arbitrarily pick a point on an edge that's not overlapping
        var stopValue = testEdge;
        var parameter = 0.5;
        while (this.doesOverlapContainParameter(parameter, testEdge)) {
            testEdge = testEdge.next;
            if (testEdge == stopValue)
                break; // for safety. But if we're here, we could be hosed
        }

        outEdge.value = testEdge;
        outParameter.value = parameter;
        outPoint.value = testEdge.pointAt(parameter, {});
    }

    markCrossingsAsEntryOrExitWithContour(otherContour, markInside) {
        // Go through and mark all the crossings with the given contour as "entry" or "exit". This
        //  determines what part of ths contour is outputted.

        // When marking we need to start at a point that is clearly either inside or outside
        //  the other graph, otherwise we could mark the crossings exactly opposite of what
        //  they're supposed to be.
        var startEdge = {};
        var startPoint = {};
        var startParameter = {};
        this.startingEdge(startEdge, startParameter, startPoint);
        startEdge = startEdge.value;
        startParameter = startParameter.value;
        startPoint = startPoint.value;

        // Calculate the first entry value. We need to determine if the edge we're starting
        //  on is inside or outside the otherContour.
        var contains = otherContour.contourAndSelfIntersectingContoursContainPoint(startPoint);
        var isEntry = markInside ? !contains : contains;
        var otherContours = otherContour.selfIntersectingContours.slice();
        otherContours.push(otherContour);

        var StopParameterNoLimit = 2.0; // needs to be > 1.0
        var StartParameterNoLimit = 0.0;

        // Walk all the edges in this contour and mark the crossings
        isEntry = this.markCrossingsOnEdge(startEdge, startParameter, StopParameterNoLimit, otherContours, isEntry);
        var edge = startEdge.next;
        while (edge != startEdge) {
            isEntry = this.markCrossingsOnEdge(edge, StartParameterNoLimit, StopParameterNoLimit, otherContours, isEntry);
            edge = edge.next;
        }
        this.markCrossingsOnEdge(startEdge, StartParameterNoLimit, startParameter, otherContours, isEntry);
    }

    markCrossingsOnEdge(edge, startParameter, stopParameter, otherContours, startIsEntry) {
        var isEntry = startIsEntry;
        // Mark all the crossings on this edge
        edge.crossingsWithBlock((crossing, stop) => {
            // skip over other contours
            if (crossing.isSelfCrossing || otherContours.indexOf(crossing.counterpart.edge.contour) == -1)
                return;
            if (crossing.parameter < startParameter || crossing.parameter >= stopParameter)
                return;
            crossing.entry = isEntry;
            isEntry = !isEntry; // toggle.
        });
        return isEntry;
    }

    contourAndSelfIntersectingContoursContainPoint(point) {
        var containerCount = 0;
        if (this.containsPoint(point))
            containerCount++;
        var intersectingContours = this.selfIntersectingContours;
        for (var contour of intersectingContours) {
            if (contour.containsPoint(point))
                containerCount++;
        }
        return (containerCount & 1) != 0;
    }

    // bezierPath() {
    //     if ( this._bezPathCache == null ) {
    //         var  path = new Path();
    //         var firstPoint = true;
    //
    //         for ( var edge of this.edges ) {
    //             if ( firstPoint ) {
    //                 path.moveToPoint(clone(edge.endPoint1));
    //                 firstPoint = false;
    //             }
    //
    //             if ( edge.isStraightLine )
    //                 path.lineToPoint(clone(edge.endPoint2));
    //         else
    //             path.curveToPoint(clone(edge.endPoint2), clone(edge.controlPoint1), clone(edge.controlPoint2));
    //         }
    //
    //         path.closed(true);
    //         //[path setWindingRule:NSEvenOddWindingRule];
    //         this._bezPathCache = path;
    //     }
    //
    //     return this._bezPathCache;
    // }


    close() {
        // adds an element to connect first and last points on the contour
        if (this._edges.length == 0)
            return;

        var first = this._edges[0];
        var last = this._edges[this._edges.length - 1];

        if (!arePointsClose(first.endPoint1, last.endPoint2))
            this.addCurve(BezierCurve.bezierCurveWithLine(last.endPoint2, first.endPoint1));
    }


    reversedContour() {
        var revContour = new BezierContour();

        for (var edge of this._edges)
            revContour.addReverseCurve(edge);

        return revContour;
    }


    direction() {
        var lastPoint = null, currentPoint = null;
        var firstPoint = true;
        var a = 0.0;

        for (var edge of this._edges) {
            if (firstPoint) {
                lastPoint = edge.endPoint1;
                firstPoint = false;
            } else {
                currentPoint = edge.endPoint2;
                a += ((lastPoint.x * currentPoint.y) - (currentPoint.x * lastPoint.y));
                lastPoint = currentPoint;
            }
        }

        return ( a >= 0 ) ? 0/*ContourClockwise*/ : 1/*ContourAntiClockwise*/;
    }


    contourMadeClockwiseIfNecessary() {
        var dir = this.direction();

        if (dir == 0/*FBContourClockwise*/)
            return this;

        return this.reversedContour();
    }

    crossesOwnContour(contour) {
        for (var edge of this._edges) {
            var intersects = false;
            edge.crossingsWithBlock((crossing, stop) => {
                if (!crossing.isSelfCrossing)
                    return; // Only want the this intersecting crossings
                var intersectingEdge = crossing.counterpart.edge;
                if (intersectingEdge.contour == contour) {
                    intersects = true;
                    stop.value = true;
                }
            });
            if (intersects)
                return true;
        }
        return false;
    }

    intersectingContours() {
        // Go and find all the unique contours that intersect this specific contour
        var contours = [];
        for (var edge of this._edges) {
            edge.intersectingEdgesWithBlock((intersectingEdge) => {
                if (contours.indexOf(intersectingEdge.contour) === -1)
                    contours.push(intersectingEdge.contour);
            });
        }
        return contours;
    }

    get selfIntersectingContours() {
        // Go and find all the unique contours that intersect this specific contour from our own graph
        var contours = [];
        this.addSelfIntersectingContoursToArray(contours, this);
        return contours;
    }

    addSelfIntersectingContoursToArray(contours, originalContour) {
        for (var edge of this._edges) {
            edge.selfIntersectingEdgesWithBlock((intersectingEdge) => {
                if (intersectingEdge.contour != originalContour && contours.indexOf(intersectingEdge.contour) === -1) {
                    contours.push(intersectingEdge.contour);
                    intersectingEdge.contour.addSelfIntersectingContoursToArray(contours, originalContour);
                }
            });
        }
    }

    addOverlap(overlap) {
        if (overlap.isEmpty())
            return;

        this._overlaps.push(overlap);
    }

    removeAllOverlaps() {
        if (!this._overlaps)
            return;

        this._overlaps = [];
    }

    isEquivalent(other) {
        if (!this._overlaps)
            return false;

        for (var overlap of this._overlaps) {
            if (overlap.isBetweenContour(this, other) && overlap.isComplete())
                return true;
        }
        return false;
    }

    forEachEdgeOverlapDo(block) {
        if (!this._overlaps)
            return;

        for (var overlap of this._overlaps) {
            overlap.runsWithBlock((run, stop)=> {
                for (var edgeOverlap of run.overlaps())
                    block(edgeOverlap);
            });
        }
    }

    doesOverlapContainCrossing(crossing) {
        if (!this._overlaps)
            return false;

        for (var overlap of this._overlaps) {
            if (overlap.doesContainCrossing(crossing))
                return true;
        }
        return false;
    }

    doesOverlapContainParameter(parameter, edge) {
        if (!this._overlaps)
            return false;

        for (var overlap of this._overlaps) {
            if (overlap.doesContainParameter(parameter, edge))
                return true;
        }
        return false;
    }

    copyWithZone(zone) {
        var copy = new BezierContour();
        for (var edge of this._edges)
            copy.addCurve(edge);
        return copy;
    }

    closestLocationToPoint(point) {
        var closestEdge = null;
        var location = {};

        for (var edge of this._edges) {
            var edgeLocation = edge.closestLocationToPoint(point);
            if (closestEdge == null || edgeLocation.distance < location.distance) {
                closestEdge = edge;
                location = edgeLocation;
            }
        }

        if (closestEdge == null)
            return null;

        var curveLocation = new CurveLocation(closestEdge, location.parameter, location.distance);
        curveLocation.contour = this;
        return curveLocation;
    }
}