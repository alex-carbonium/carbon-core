import {areTangentsAmbigious, tangentsCross, areValuesCloseWithOptions} from "./geometry";
import EdgeCrossing from "./edgeCrossing";

const OverlapThreshold = 1e-2;

function computeEdge1Tangents(firstOverlap, lastOverlap, offset, edge1Tangents) {
    // edge1Tangents are firstOverlap.range1.minimum going to previous and lastOverlap.range1.maximum going to next
    var firstLength = 0.0;
    var lastLength = 0.0;
    if (firstOverlap.range.isAtStartOfCurve1) {
        var otherEdge1 = firstOverlap.edge1.previousNonpoint;
        edge1Tangents[0] = otherEdge1.tangentFromRightOffset(offset);
        firstLength = otherEdge1.length();
    } else {
        edge1Tangents[0] = firstOverlap.range.curve1LeftBezier.tangentFromRightOffset(offset);
        firstLength = firstOverlap.range.curve1LeftBezier.length();
    }
    if (lastOverlap.range.isAtStopOfCurve1()) {
        var otherEdge1 = lastOverlap.edge1.nextNonpoint;
        edge1Tangents[1] = otherEdge1.tangentFromLeftOffset(offset);
        lastLength = otherEdge1.length();
    } else {
        edge1Tangents[1] = lastOverlap.range.curve1RightBezier.tangentFromLeftOffset(offset);
        lastLength = lastOverlap.range.curve1RightBezier.length();
    }
    return Math.min(firstLength, lastLength);
}

function computeEdge2Tangents(firstOverlap, lastOverlap, offset, edge2Tangents) {
    // edge2Tangents are firstOverlap.range2.minimum going to previous and lastOverlap.range2.maximum going to next
    //  unless reversed, then
    // edge2Tangents are firstOverlap.range2.maximum going to next and lastOverlap.range2.minimum going to previous
    var firstLength = 0.0;
    var lastLength = 0.0;
    if (!firstOverlap.range.reversed()) {
        if (firstOverlap.range.isAtStartOfCurve2) {
            var otherEdge2 = firstOverlap.edge2.previousNonpoint;
            edge2Tangents[0] = otherEdge2.tangentFromRightOffset(offset);
            firstLength = otherEdge2.length();
        } else {
            edge2Tangents[0] = firstOverlap.range.curve2LeftBezier.tangentFromRightOffset(offset);
            firstLength = firstOverlap.range.curve2LeftBezier.length();
        }
        if (lastOverlap.range.isAtStopOfCurve2) {
            var otherEdge2 = lastOverlap.edge2.nextNonpoint;
            edge2Tangents[1] = otherEdge2.tangentFromLeftOffset(offset);
            lastLength = otherEdge2.length();
        } else {
            edge2Tangents[1] = lastOverlap.range.curve2RightBezier.tangentFromLeftOffset(offset);
            lastLength = lastOverlap.range.curve2RightBezier.length();
        }
    } else {
        if (firstOverlap.range.isAtStopOfCurve2) {
            var otherEdge2 = firstOverlap.edge2.nextNonpoint;
            edge2Tangents[0] = otherEdge2.tangentFromLeftOffset(offset);
            firstLength = otherEdge2.length();
        } else {
            edge2Tangents[0] = firstOverlap.range.curve2RightBezier.tangentFromLeftOffset(offset);
            firstLength = firstOverlap.range.curve2RightBezier.length();
        }
        if (lastOverlap.range.isAtStartOfCurve2) {
            var otherEdge2 = lastOverlap.edge2.previousNonpoint;
            edge2Tangents[1] = otherEdge2.tangentFromRightOffset.offset();
            lastLength = otherEdge2.length();
        } else {
            edge2Tangents[1] = lastOverlap.range.curve2LeftBezier.tangentFromRightOffset(offset);
            lastLength = lastOverlap.range.curve2LeftBezier.length();
        }
    }
    return Math.min(firstLength, lastLength);
}

function computeEdge1TestPoints(firstOverlap, lastOverlap, offset, testPoints) {
    // edge1Tangents are firstOverlap.range1.minimum going to previous and lastOverlap.range1.maximum going to next
    if (firstOverlap.range.isAtStartOfCurve1) {
        var otherEdge1 = firstOverlap.edge1.previousNonpoint;
        testPoints[0] = otherEdge1.pointFromRightOffset(offset);
    } else {
        testPoints[0] = firstOverlap.range.curve1LeftBezier.pointFromRightOffset(offset);
    }
    if (lastOverlap.range.isAtStopOfCurve1()) {
        var otherEdge1 = lastOverlap.edge1.nextNonpoint;
        testPoints[1] = otherEdge1.pointFromLeftOffset(offset);
    } else {
        testPoints[1] = lastOverlap.range.curve1RightBezier.pointFromLeftOffset(offset);
    }
}


export class ContourOverlap {
    constructor() {
        this._runs = [];
    }

    addOverlap(range, edge1, edge2) {
        var overlap = new EdgeOverlap(edge1, edge2, range);
        var createNewRun = false;
        if (this._runs.length === 0) {
            createNewRun = true;
        } else if (this._runs.length == 1) {
            var inserted = this._runs[0].insertOverlap(overlap);
            createNewRun = !inserted;
        } else {
            var inserted = this._runs[this._runs.length - 1].insertOverlap(overlap);
            if (!inserted)
                inserted = this._runs[0].insertOverlap(overlap);
            createNewRun = !inserted;
        }
        if (createNewRun) {
            var run = new EdgeOverlapRun();
            run.insertOverlap(overlap);
            this._runs.push(run);
        }
    }

    doesContainCrossing(crossing) {
        for (var i = 0; i < this._runs.length; ++i) {
            var run = this._runs[i];
            if (run.doesContainCrossing(crossing)) {
                return true;
            }
        }
        return false;
    }

    doesContainParameter(parameter, edge) {
        for (var i = 0; i < this._runs.length; ++i) {
            var run = this._runs[i];
            if (run.doesContainParameter(parameter, edge))
                return true;
        }
        return false;
    }

    runsWithBlock(block) {
        var stop = {value:false};
        for (var i = 0; i < this._runs.length; ++i) {
            var run = this._runs[i];
            block(run, stop);
            if (stop.value)
                break;
        }
    }

    reset() {
        this._runs = [];
    }

    isComplete() {
        // To be complete, we should have exactly one run that wraps around
        if (this._runs.length != 1)
            return false;

        return this._runs[0].isComplete();
    }

    isEmpty() {
        return this._runs.length === 0;
    }

    contour1() {
        if (this._runs.length === 0)
            return null;

        var run = this._runs[0];
        return run.contour1();
    }

    contour2() {
        if (this._runs.length === 0)
            return null;

        var run = this._runs[0];
        return run.contour2();
    }

    isBetweenContour(contour1, contour2) {
        var myContour1 = this.contour1();
        var myContour2 = this.contour2();
        return (contour1 == myContour1 && contour2 == myContour2) || (contour1 == myContour2 && contour2 == myContour1);
    }
}

export class EdgeOverlapRun {
    constructor() {
        this._overlaps = [];
    }

    insertOverlap(overlap) {
        if (this._overlaps.length == 0) {
            // The first one always works
            this._overlaps.push(overlap)
            return true;
        }

        // Check to see if overlap fits after our last overlap
        var lastOverlap = this._overlaps[this._overlaps.length - 1];
        if (lastOverlap.fitsBefore(overlap)) {
            this._overlaps.push(overlap);
            return true;
        }
        // Check to see if overlap fits before our first overlap
        var firstOverlap = this._overlaps[0];
        if (firstOverlap.fitsAfter(overlap)) {
            this._overlaps.splice(0, 0, overlap);
            return true;
        }
        return false;
    }

    isComplete() {
        // To be complete, we should wrap around
        if (this._overlaps.length == 0)
            return false;

        var lastOverlap = this._overlaps[this._overlaps.length - 1];
        var firstOverlap = this._overlaps[0];
        return lastOverlap.fitsBefore(firstOverlap);
    }

    doesContainCrossing(crossing) {
        return this.doesContainParameter(crossing.parameter, crossing.edge);
    }

    doesContainParameter(parameter, edge) {
        if (this._overlaps.length === 0)
            return false;

        // Find the FBEdgeOverlap that contains the crossing (if it exists)
        var containingOverlap = null;
        for (var i = 0; i < this._overlaps.length; ++i) {
            var overlap = this._overlaps[i];
            if (overlap.edge1 == edge || overlap.edge2 == edge) {
                containingOverlap = overlap;
                break;
            }
        }

        // The edge it's attached to isn't here
        if (containingOverlap == null)
            return false;


        var lastOverlap = this._overlaps[this._overlaps.length - 1];
        var firstOverlap = this._overlaps[0];

        var atTheStart = containingOverlap == firstOverlap;
        var extendsBeforeStart = !atTheStart || (atTheStart && lastOverlap.fitsBefore(firstOverlap));

        var atTheEnd = containingOverlap == lastOverlap;
        var extendsAfterEnd = !atTheEnd || (atTheEnd && firstOverlap.fitsAfter(lastOverlap));

        return containingOverlap.doesContainParameter(parameter, edge, extendsBeforeStart, extendsAfterEnd);
    }

    isCrossing() {
        // The intersection happens at the end of one of the edges, meaning we'll have to look at the next
        //  edge in sequence to see if it crosses or not. We'll do that by computing the four tangents at the exact
        //  point the intersection takes place. We'll compute the polar angle for each of the tangents. If the
        //  angles of self split the angles of edge2 (i.e. they alternate when sorted), then the edges cross. If
        //  any of the angles are equal or if the angles group up, then the edges don't cross.

        // Calculate the four tangents: The two tangents moving away from the intersection point on self, the two tangents
        //  moving away from the intersection point on edge2.

        var firstOverlap = this._overlaps[0];
        var lastOverlap = this._overlaps[this._overlaps.length - 1];

        var edge1Tangents = [null, null];
        var edge2Tangents = [null, null];
        var offset = 0.0;
        var maxOffset = 0.0;

        do {
            var length1 = computeEdge1Tangents(firstOverlap, lastOverlap, offset, edge1Tangents);
            var length2 = computeEdge2Tangents(firstOverlap, lastOverlap, offset, edge2Tangents);
            maxOffset = Math.min(length1, length2);

            offset += 1.0;
        } while (areTangentsAmbigious(edge1Tangents, edge2Tangents) && offset < maxOffset);

        if (tangentsCross(edge1Tangents, edge2Tangents))
            return true;

        // Tangents work, mostly, for overlaps. If we get a yes, it's solid. If we get a no, it might still
        //  be a crossing. Only way to tell now is to an actual point test
        var testPoints = [];
        computeEdge1TestPoints(firstOverlap, lastOverlap, 1.0, testPoints);
        var contour2 = firstOverlap.edge2.contour;
        var testPoint1Inside = contour2.containsPoint(testPoints[0]);
        var testPoint2Inside = contour2.containsPoint(testPoints[1]);
        return testPoint1Inside != testPoint2Inside;
    }

    addCrossings() {
        // Add crossings to both graphs for this intersection/overlap. Pick the middle point and use that
        if (this._overlaps.length === 0)
            return;

        var middleOverlap = this._overlaps[~~(this._overlaps.length / 2)];
        middleOverlap.addMiddleCrossing();
    }

    contour1() {
        if (this._overlaps.length === 0)
            return null;

        var overlap = this._overlaps[0];
        return overlap.edge1.contour;
    }

    contour2() {
        if (this._overlaps.length === 0)
            return null;

        var overlap = this._overlaps[0];
        return overlap.edge2.contour;
    }

}

export class EdgeOverlap {

    constructor(edge1, edge2, range) {
        this._edge1 = edge1;
        this._edge2 = edge2;
        this._range = range;
    }

    get edge1(){
        return this._edge1;
    }

    get edge2(){
        return this._edge2;
    }

    fitsBefore(nextOverlap) {
        if (areValuesCloseWithOptions(this._range.parameterRange1.maximum, 1.0, OverlapThreshold)) {
            // nextOverlap should start at 0 of the next edge
            var nextEdge = this._edge1.next;
            return nextOverlap.edge1 == nextEdge && areValuesCloseWithOptions(nextOverlap.range.parameterRange1.minimum, 0.0, OverlapThreshold);
        }

        // nextOverlap should start at about maximum on the same edge
        return nextOverlap.edge1 == this._edge1 && areValuesCloseWithOptions(nextOverlap.range.parameterRange1.minimum, this._range.parameterRange1.maximum, OverlapThreshold);
    }

    fitsAfter(previousOverlap) {
        if (areValuesCloseWithOptions(this._range.parameterRange1.minimum, 0.0, OverlapThreshold)) {
            // previousOverlap should end at 1 of the previous edge
            var previousEdge = this._edge1.previous;
            return previousOverlap.edge1 == previousEdge && areValuesCloseWithOptions(previousOverlap.range().parameterRange1.maximum, 1.0, OverlapThreshold);
        }

        // previousOverlap should end at about the minimum on the same edge
        return previousOverlap.edge1 == this._edge1 && areValuesCloseWithOptions(previousOverlap.range().parameterRange1.maximum, this._range.parameterRange1.minimum, OverlapThreshold);
    }

    addMiddleCrossing() {
        var intersection = this._range.middleIntersection();
        var ourCrossing = EdgeCrossing.crossingWithIntersection(intersection);
        var theirCrossing = EdgeCrossing.crossingWithIntersection(intersection);
        ourCrossing.counterpart = theirCrossing;
        theirCrossing.counterpart = ourCrossing;
        ourCrossing.fromCrossingOverlap = true;
        theirCrossing.fromCrossingOverlap = true;
        this._edge1.addCrossing(ourCrossing);
        this._edge2.addCrossing(theirCrossing);
    }

    doesContainParameter(parameter, edge, extendsBeforeStart, extendsAfterEnd) {
        // By the time this is called, we know the crossing is on one of our edges.
        if (extendsBeforeStart && extendsAfterEnd)
            return true; // The crossing is on the edge somewhere, and the overlap extens past this edge in both directions, so its safe to say the crossing is contained

        var parameterRange = {};
        if (edge == this._edge1)
            parameterRange = this._range.parameterRange1;
        else
            parameterRange = this._range.parameterRange2;

        var inLeftSide = extendsBeforeStart ? parameter >= 0.0 : parameter > parameterRange.minimum;
        var inRightSide = extendsAfterEnd ? parameter <= 1.0 : parameter < parameterRange.maximum;
        return inLeftSide && inRightSide;
    }
}