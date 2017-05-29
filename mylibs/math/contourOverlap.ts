import { areTangentsAmbigious, tangentsCross, areValuesCloseWithOptions } from "./geometry";
import EdgeCrossing from "./edgeCrossing";
import { IEdgeOverlap, ICoordinate, IEdgeOverlapRun, IContourOverlap, IRange, IBezierCurve, IIntersectionRange, IBezierCrossing, IContour } from "carbon-core";

const OverlapThreshold = 1e-2;

function computeEdge1Tangents(firstOverlap: IEdgeOverlap, lastOverlap: IEdgeOverlap, offset: number, edge1Tangents: ICoordinate[]): number {
    // edge1Tangents are firstOverlap.range1.minimum going to previous and lastOverlap.range1.maximum going to next
    let firstLength = 0.0;
    let lastLength = 0.0;
    if (firstOverlap.range.isAtStartOfCurve1) {
        let otherEdge1 = firstOverlap.edge1.previousNonpoint;
        edge1Tangents[0] = otherEdge1.tangentFromRightOffset(offset);
        firstLength = otherEdge1.length();
    } else {
        edge1Tangents[0] = firstOverlap.range.curve1LeftBezier.tangentFromRightOffset(offset);
        firstLength = firstOverlap.range.curve1LeftBezier.length();
    }
    if (lastOverlap.range.isAtStopOfCurve1) {
        let otherEdge1 = lastOverlap.edge1.nextNonpoint;
        edge1Tangents[1] = otherEdge1.tangentFromLeftOffset(offset);
        lastLength = otherEdge1.length();
    } else {
        edge1Tangents[1] = lastOverlap.range.curve1RightBezier.tangentFromLeftOffset(offset);
        lastLength = lastOverlap.range.curve1RightBezier.length();
    }

    return Math.min(firstLength, lastLength);
}

function computeEdge2Tangents(firstOverlap: IEdgeOverlap, lastOverlap: IEdgeOverlap, offset: number, edge2Tangents: ICoordinate[]): number {
    // edge2Tangents are firstOverlap.range2.minimum going to previous and lastOverlap.range2.maximum going to next
    //  unless reversed, then
    // edge2Tangents are firstOverlap.range2.maximum going to next and lastOverlap.range2.minimum going to previous
    let firstLength = 0.0;
    let lastLength = 0.0;
    if (!firstOverlap.range.reversed) {
        if (firstOverlap.range.isAtStartOfCurve2) {
            let otherEdge2 = firstOverlap.edge2.previousNonpoint;
            edge2Tangents[0] = otherEdge2.tangentFromRightOffset(offset);
            firstLength = otherEdge2.length();
        } else {
            edge2Tangents[0] = firstOverlap.range.curve2LeftBezier.tangentFromRightOffset(offset);
            firstLength = firstOverlap.range.curve2LeftBezier.length();
        }
        if (lastOverlap.range.isAtStopOfCurve2) {
            let otherEdge2 = lastOverlap.edge2.nextNonpoint;
            edge2Tangents[1] = otherEdge2.tangentFromLeftOffset(offset);
            lastLength = otherEdge2.length();
        } else {
            edge2Tangents[1] = lastOverlap.range.curve2RightBezier.tangentFromLeftOffset(offset);
            lastLength = lastOverlap.range.curve2RightBezier.length();
        }
    } else {
        if (firstOverlap.range.isAtStopOfCurve2) {
            let otherEdge2 = firstOverlap.edge2.nextNonpoint;
            edge2Tangents[0] = otherEdge2.tangentFromLeftOffset(offset);
            firstLength = otherEdge2.length();
        } else {
            edge2Tangents[0] = firstOverlap.range.curve2RightBezier.tangentFromLeftOffset(offset);
            firstLength = firstOverlap.range.curve2RightBezier.length();
        }
        if (lastOverlap.range.isAtStartOfCurve2) {
            let otherEdge2 = lastOverlap.edge2.previousNonpoint;
            edge2Tangents[1] = otherEdge2.tangentFromRightOffset(offset);
            lastLength = otherEdge2.length();
        } else {
            edge2Tangents[1] = lastOverlap.range.curve2LeftBezier.tangentFromRightOffset(offset);
            lastLength = lastOverlap.range.curve2LeftBezier.length();
        }
    }

    return Math.min(firstLength, lastLength);
}

function computeEdge1TestPoints(firstOverlap: IEdgeOverlap, lastOverlap: IEdgeOverlap, offset: number, testPoints: ICoordinate[]): void {
    // edge1Tangents are firstOverlap.range1.minimum going to previous and lastOverlap.range1.maximum going to next
    if (firstOverlap.range.isAtStartOfCurve1) {
        let otherEdge1 = firstOverlap.edge1.previousNonpoint;
        testPoints[0] = otherEdge1.pointFromRightOffset(offset);
    } else {
        testPoints[0] = firstOverlap.range.curve1LeftBezier.pointFromRightOffset(offset);
    }
    if (lastOverlap.range.isAtStopOfCurve1) {
        let otherEdge1 = lastOverlap.edge1.nextNonpoint;
        testPoints[1] = otherEdge1.pointFromLeftOffset(offset);
    } else {
        testPoints[1] = lastOverlap.range.curve1RightBezier.pointFromLeftOffset(offset);
    }
}


export class ContourOverlap implements IContourOverlap {
    private _runs: IEdgeOverlapRun[];
    constructor() {
        this._runs = [];
    }

    addOverlap(range: IIntersectionRange, edge1: IBezierCurve, edge2: IBezierCurve): void {
        let overlap = new EdgeOverlap(edge1, edge2, range);
        let createNewRun = false;
        if (this._runs.length === 0) {
            createNewRun = true;
        } else if (this._runs.length === 1) {
            let inserted = this._runs[0].insertOverlap(overlap);
            createNewRun = !inserted;
        } else {
            let inserted = this._runs[this._runs.length - 1].insertOverlap(overlap);
            if (!inserted) {
                inserted = this._runs[0].insertOverlap(overlap);
            }
            createNewRun = !inserted;
        }
        if (createNewRun) {
            let run = new EdgeOverlapRun();
            run.insertOverlap(overlap);
            this._runs.push(run);
        }
    }

    doesContainCrossing(crossing: IBezierCrossing): boolean {
        for (let i = 0; i < this._runs.length; ++i) {
            let run = this._runs[i];
            if (run.doesContainCrossing(crossing)) {
                return true;
            }
        }

        return false;
    }

    doesContainParameter(parameter: number, edge: IBezierCurve): boolean {
        for (let i = 0; i < this._runs.length; ++i) {
            let run = this._runs[i];
            if (run.doesContainParameter(parameter, edge)) {
                return true;
            }
        }

        return false;
    }

    runsWithBlock(block: (run: IEdgeOverlapRun, stop: IReference<boolean>) => void) {
        let stop = { value: false };
        for (let i = 0; i < this._runs.length; ++i) {
            let run = this._runs[i];
            block(run, stop);
            if (stop.value) {
                break;
            }
        }
    }

    reset(): void {
        this._runs = [];
    }

    isComplete(): boolean {
        // To be complete, we should have exactly one run that wraps around
        if (this._runs.length !== 1) {
            return false;
        }

        return this._runs[0].isComplete();
    }

    isEmpty(): boolean {
        return this._runs.length === 0;
    }

    contour1(): IContour {
        if (this._runs.length === 0) {
            return null;
        }

        let run = this._runs[0];

        return run.contour1();
    }

    contour2(): IContour {
        if (this._runs.length === 0) {
            return null;
        }

        let run = this._runs[0];

        return run.contour2();
    }

    isBetweenContour(contour1: IContour, contour2: IContour) {
        let myContour1 = this.contour1();
        let myContour2 = this.contour2();

        return (contour1 === myContour1 && contour2 === myContour2) || (contour1 === myContour2 && contour2 === myContour1);
    }
}

export class EdgeOverlapRun implements IEdgeOverlapRun {
    private _overlaps: IEdgeOverlap[];
    constructor() {
        this._overlaps = [];
    }

    insertOverlap(overlap: IEdgeOverlap) {
        if (this._overlaps.length === 0) {
            // The first one always works
            this._overlaps.push(overlap)

            return true;
        }

        // Check to see if overlap fits after our last overlap
        let lastOverlap = this._overlaps[this._overlaps.length - 1];
        if (lastOverlap.fitsBefore(overlap)) {
            this._overlaps.push(overlap);

            return true;
        }
        // Check to see if overlap fits before our first overlap
        let firstOverlap = this._overlaps[0];
        if (firstOverlap.fitsAfter(overlap)) {
            this._overlaps.splice(0, 0, overlap);

            return true;
        }

        return false;
    }

    isComplete() {
        // To be complete, we should wrap around
        if (this._overlaps.length === 0) {
            return false;
        }

        let lastOverlap = this._overlaps[this._overlaps.length - 1];
        let firstOverlap = this._overlaps[0];

        return lastOverlap.fitsBefore(firstOverlap);
    }

    doesContainCrossing(crossing) {
        return this.doesContainParameter(crossing.parameter, crossing.edge);
    }

    doesContainParameter(parameter, edge) {
        if (this._overlaps.length === 0) {
            return false;
        }

        // Find the FBEdgeOverlap that contains the crossing (if it exists)
        let containingOverlap = null;
        for (let i = 0; i < this._overlaps.length; ++i) {
            let overlap = this._overlaps[i];
            if (overlap.edge1 === edge || overlap.edge2 === edge) {
                containingOverlap = overlap;
                break;
            }
        }

        // The edge it's attached to isn't here
        if (containingOverlap === null) {
            return false;
        }

        let lastOverlap = this._overlaps[this._overlaps.length - 1];
        let firstOverlap = this._overlaps[0];

        let atTheStart = containingOverlap === firstOverlap;
        let extendsBeforeStart = !atTheStart || (atTheStart && lastOverlap.fitsBefore(firstOverlap));

        let atTheEnd = containingOverlap === lastOverlap;
        let extendsAfterEnd = !atTheEnd || (atTheEnd && firstOverlap.fitsAfter(lastOverlap));

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

        let firstOverlap = this._overlaps[0];
        let lastOverlap = this._overlaps[this._overlaps.length - 1];

        let edge1Tangents = [null, null];
        let edge2Tangents = [null, null];
        let offset = 0.0;
        let maxOffset = 0.0;

        do {
            let length1 = computeEdge1Tangents(firstOverlap, lastOverlap, offset, edge1Tangents);
            let length2 = computeEdge2Tangents(firstOverlap, lastOverlap, offset, edge2Tangents);
            maxOffset = Math.min(length1, length2);

            offset += 1.0;
        } while (areTangentsAmbigious(edge1Tangents, edge2Tangents) && offset < maxOffset);

        if (tangentsCross(edge1Tangents, edge2Tangents)) {
            return true;
        }

        // Tangents work, mostly, for overlaps. If we get a yes, it's solid. If we get a no, it might still
        //  be a crossing. Only way to tell now is to an actual point test
        let testPoints = [];
        computeEdge1TestPoints(firstOverlap, lastOverlap, 1.0, testPoints);
        let contour2 = firstOverlap.edge2.contour;
        let testPoint1Inside = contour2.containsPoint(testPoints[0]);
        let testPoint2Inside = contour2.containsPoint(testPoints[1]);

        return testPoint1Inside !== testPoint2Inside;
    }

    addCrossings() {
        // Add crossings to both graphs for this intersection/overlap. Pick the middle point and use that
        if (this._overlaps.length === 0) {
            return;
        }

        let middleOverlap = this._overlaps[~~(this._overlaps.length / 2)];
        middleOverlap.addMiddleCrossing();
    }

    contour1(): IContour {
        if (this._overlaps.length === 0) {
            return null;
        }

        let overlap = this._overlaps[0];

        return overlap.edge1.contour;
    }

    contour2(): IContour {
        if (this._overlaps.length === 0) {
            return null;
        }

        let overlap = this._overlaps[0];

        return overlap.edge2.contour;
    }

}

export class EdgeOverlap implements IEdgeOverlap {
    constructor(public edge1: IBezierCurve, public edge2: IBezierCurve, public range: IIntersectionRange) {
    }


    fitsBefore(nextOverlap: IEdgeOverlap): boolean {
        if (areValuesCloseWithOptions(this.range.parameterRange1.maximum, 1.0, OverlapThreshold)) {
            // nextOverlap should start at 0 of the next edge
            let nextEdge = this.edge1.next;

            return nextOverlap.edge1 === nextEdge && areValuesCloseWithOptions(nextOverlap.range.parameterRange1.minimum, 0.0, OverlapThreshold);
        }

        // nextOverlap should start at about maximum on the same edge
        return nextOverlap.edge1 === this.edge1 && areValuesCloseWithOptions(nextOverlap.range.parameterRange1.minimum, this.range.parameterRange1.maximum, OverlapThreshold);
    }

    fitsAfter(previousOverlap: IEdgeOverlap): boolean {
        if (areValuesCloseWithOptions(this.range.parameterRange1.minimum, 0.0, OverlapThreshold)) {
            // previousOverlap should end at 1 of the previous edge
            let previousEdge = this.edge1.previous;

            return previousOverlap.edge1 === previousEdge && areValuesCloseWithOptions(previousOverlap.range.parameterRange1.maximum, 1.0, OverlapThreshold);
        }

        // previousOverlap should end at about the minimum on the same edge
        return previousOverlap.edge1 === this.edge1 && areValuesCloseWithOptions(previousOverlap.range.parameterRange1.maximum, this.range.parameterRange1.minimum, OverlapThreshold);
    }

    addMiddleCrossing(): void {
        let intersection = this.range.middleIntersection;
        let ourCrossing = EdgeCrossing.crossingWithIntersection(intersection);
        let theirCrossing = EdgeCrossing.crossingWithIntersection(intersection);
        ourCrossing.counterpart = theirCrossing;
        theirCrossing.counterpart = ourCrossing;
        ourCrossing.fromCrossingOverlap = true;
        theirCrossing.fromCrossingOverlap = true;
        this.edge1.addCrossing(ourCrossing);
        this.edge2.addCrossing(theirCrossing);
    }

    doesContainParameter(parameter: number, edge: IBezierCurve, extendsBeforeStart: boolean, extendsAfterEnd: boolean) {
        // By the time this is called, we know the crossing is on one of our edges.
        if (extendsBeforeStart && extendsAfterEnd) {
            return true; // The crossing is on the edge somewhere, and the overlap extens past this edge in both directions, so its safe to say the crossing is contained
        }

        let parameterRange: IRange = { minimum: null, maximum: null };
        if (edge === this.edge1) {
            parameterRange = this.range.parameterRange1;
        }
        else {
            parameterRange = this.range.parameterRange2;
        }

        let inLeftSide = extendsBeforeStart ? parameter >= 0.0 : parameter > parameterRange.minimum;
        let inRightSide = extendsAfterEnd ? parameter <= 1.0 : parameter < parameterRange.maximum;

        return inLeftSide && inRightSide;
    }
}