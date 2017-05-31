import { equalPoints } from "./math"
import BezierCurve from "./bezierCurve";
import { ContourOverlap } from "./contourOverlap";
import { unionRect, lineBoundsMightOverlap, isValueLessThan, isValueGreaterThan, isValueLessThanEqual, isValueGreaterThanEqual, removeObject } from "./geometry";
import EdgeCrossing from "./edgeCrossing";
import BezierContour from "./bezierContour";
import CompoundPath from "ui/common/CompoundPath";
import { IIntersectionRange, IReference, IContour, IRectData, IBezierGraph, ICoordinate, ILocation, IBezierCrossing, IBezierCurve, IIntersection } from "carbon-core";

export default class BezierGraph implements IBezierGraph {
    private _contours: IContour[];
    private _bounds: IRectData;

    constructor() {
        this._contours = [];
    }

    get contours() {
        return this._contours;
    }

    set contours(value) {
        this._contours = value;
    }

    initWithBezierPath(path, matrix) {
        // A bezier graph is made up of contours, which are closed paths of curves. Anytime we
        //  see a move to in the NSBezierPath, that's a new contour.

        let lastPoint = null;
        let wasClosed = false;

        let contour = null;
        let elements = path.elements(matrix);
        for (let i = 0; i < elements.length; i++) {
            let element = elements[i];

            switch (element.kind) {
                case "M":
                    {
                        // if previous contour wasn't closed, close it

                        if (!wasClosed && contour !== null) {
                            contour.close();
                        }

                        wasClosed = false;

                        // Start a new contour
                        contour = new BezierContour();
                        this.addContour(contour);

                        lastPoint = element.point;
                        break;
                    }

                case "L":
                    {
                        // [MO] skip degenerate line segments
                        if (!equalPoints(element.point, lastPoint)) {
                            // Convert lines to bezier curves as well. Just set control point to be in the line formed
                            //  by the end points
                            contour.addCurve(BezierCurve.bezierCurveWithLine(lastPoint, element.point));

                            lastPoint = element.point;
                        }
                        break;
                    }

                case "C":
                    {
                        // GPC: skip degenerate case where all points are equal

                        if (!lastPoint || (equalPoints(element.point, lastPoint) && equalPoints(element.point, element.controlPoints[0]) && equalPoints(element.point, element.controlPoints[1]))) {
                            continue;
                        }

                        contour.addCurve(BezierCurve.bezierCurve(lastPoint, element.controlPoints[0], element.controlPoints[1], element.point));

                        lastPoint = element.point;
                        break;
                    }
                case "Z":
                    // [MO] attempt to close the bezier contour by
                    // mapping closepaths to equivalent lineto operations,
                    // though as with our NSLineToBezierPathElement processing,
                    // we check so as not to add degenerate line segments which
                    // blow up the clipping code.

                    if (contour.edges.length) {
                        let firstEdge = contour.edges[0];
                        let firstPoint = firstEdge.endPoint1;

                        // Skip degenerate line segments
                        if (!equalPoints(lastPoint, firstPoint)) {
                            contour.addCurve(BezierCurve.bezierCurveWithLine(lastPoint, firstPoint));
                            wasClosed = true;
                        }
                    }
                    lastPoint = null;
                    break;
            }
        }

        if (!wasClosed && contour !== null) {
            contour.close();
        }
    }

    unionWithBezierGraph(graph: IBezierGraph): IBezierGraph {
        // First insert FBEdgeCrossings into both graphs where the graphs
        //  cross.
        this.insertCrossingsWithBezierGraph(graph);
        this.insertSelfCrossings();
        graph.insertSelfCrossings();
        this.cleanupCrossingsWithBezierGraph(graph);

        // Handle the parts of the graphs that intersect first. Mark the parts
        //  of the graphs that are outside the other for the final result.
        this.markCrossingsAsEntryOrExitWithBezierGraph(graph, false);
        graph.markCrossingsAsEntryOrExitWithBezierGraph(this, false);

        // Walk the crossings and actually compute the final result for the intersecting parts
        let result = this.bezierGraphFromIntersections();

        // Finally, process the contours that don't cross anything else. They're either
        //  completely contained in another contour, or disjoint.
        this.unionNonintersectingPartsIntoGraph(result, graph);

        // Clean up crossings so the graphs can be reused, e.g. XOR will reuse graphs.
        this.removeCrossings();
        graph.removeCrossings();
        this.removeOverlaps();
        graph.removeOverlaps();

        (result as any)._cleanupEmptyContours();

        return result;
    }

    unionNonintersectingPartsIntoGraph(result: IBezierGraph, graph: IBezierGraph) {
        // Finally, process the contours that don't cross anything else. They're either
        //  completely contained in another contour, or disjoint.
        let ourNonintersectingContours: IContour[] = this.nonintersectingContours().slice();
        let theirNonintersectinContours: IContour[] = graph.nonintersectingContours().slice();
        let finalNonintersectingContours: IContour[] = ourNonintersectingContours.slice();

        for (let e of theirNonintersectinContours) {
            finalNonintersectingContours.push(e);
        }
        this.unionEquivalentNonintersectingContours(ourNonintersectingContours, theirNonintersectinContours, finalNonintersectingContours);

        // Since we're doing a union, assume all the non-crossing contours are in, and remove
        //  by exception when they're contained by another contour.
        for (let ourContour of ourNonintersectingContours) {
            // If the other graph contains our contour, it's redundant and we can just remove it
            let clipContainsSubject = graph.containsContour(ourContour);
            if (clipContainsSubject) {
                removeObject(finalNonintersectingContours, ourContour);
            }
        }
        for (let theirContour of theirNonintersectinContours) {
            // If we contain this contour, it's redundant and we can just remove it
            let subjectContainsClip = this.containsContour(theirContour);
            if (subjectContainsClip) {
                removeObject(finalNonintersectingContours, theirContour);
            }
        }

        // Append the final nonintersecting contours
        for (let contour of finalNonintersectingContours) {
            result.addContour(contour);
        }
    }

    _cleanupEmptyContours() {
        for (let i = this._contours.length - 1; i >= 0; --i) {
            if (this._contours[i].edges.length === 0) {
                this._contours.splice(i, 1);
            }
        }
    }

    unionEquivalentNonintersectingContours(ourNonintersectingContours: IContour[], theirNonintersectingContours: IContour[], results: IContour[]): void {
        for (let ourIndex = 0; ourIndex < ourNonintersectingContours.length; ourIndex++) {
            let ourContour = ourNonintersectingContours[ourIndex];
            for (let theirIndex = 0; theirIndex < theirNonintersectingContours.length; theirIndex++) {
                let theirContour = theirNonintersectingContours[theirIndex];

                if (!ourContour.isEquivalent(theirContour)) {
                    continue;
                }

                if (ourContour.inside === theirContour.inside) {
                    // Redundant, so just remove one of them from the results
                    removeObject(results, theirContour);
                } else {
                    // One is a hole, one is a fill, so they cancel each other out. Remove both from the results
                    removeObject(results, theirContour);
                    removeObject(results, ourContour);
                }

                // Remove both from the inputs so they aren't processed later
                theirNonintersectingContours.splice(theirIndex, 1);
                ourNonintersectingContours.splice(ourIndex, 1);
                ourIndex--;
                break;
            }
        }
    }

    intersectWithBezierGraph(graph: IBezierGraph): IBezierGraph {
        // First insert FBEdgeCrossings into both graphs where the graphs cross.
        this.insertCrossingsWithBezierGraph(graph);
        this.insertSelfCrossings();
        graph.insertSelfCrossings();
        this.cleanupCrossingsWithBezierGraph(graph);

        // Handle the parts of the graphs that intersect first. Mark the parts
        //  of the graphs that are inside the other for the final result.
        this.markCrossingsAsEntryOrExitWithBezierGraph(graph, true);
        graph.markCrossingsAsEntryOrExitWithBezierGraph(this, true);

        // Walk the crossings and actually compute the final result for the intersecting parts
        let result = this.bezierGraphFromIntersections();

        // Finally, process the contours that don't cross anything else. They're either
        //  completely contained in another contour, or disjoint.
        this.intersectNonintersectingPartsIntoGraph(result, graph);

        // Clean up crossings so the graphs can be reused, e.g. XOR will reuse graphs.
        this.removeCrossings();
        graph.removeCrossings();
        this.removeOverlaps();
        graph.removeOverlaps();

        (result as any)._cleanupEmptyContours();

        return result;
    }

    intersectNonintersectingPartsIntoGraph(result: IBezierGraph, graph: IBezierGraph) {
        // Finally, process the contours that don't cross anything else. They're either
        //  completely contained in another contour, or disjoint.
        let ourNonintersectingContours = this.nonintersectingContours().slice();
        let theirNonintersectinContours = graph.nonintersectingContours().slice()
        let finalNonintersectingContours: IContour[] = [];
        this.intersectEquivalentNonintersectingContours(ourNonintersectingContours, theirNonintersectinContours, finalNonintersectingContours);
        // Since we're doing an intersect, assume that most of these non-crossing contours shouldn't be in
        //  the final result.
        for (let ourContour of ourNonintersectingContours) {
            // If their graph contains ourContour, then the two graphs intersect (logical AND) at ourContour, so
            //  add it to the final result.
            let clipContainsSubject = graph.containsContour(ourContour);
            if (clipContainsSubject) {
                finalNonintersectingContours.push(ourContour);
            }
        }
        for (let theirContour of theirNonintersectinContours) {
            // If we contain theirContour, then the two graphs intersect (logical AND) at theirContour,
            //  so add it to the final result.
            let subjectContainsClip = this.containsContour(theirContour);
            if (subjectContainsClip) {
                finalNonintersectingContours.push(theirContour);
            }
        }

        // Append the final nonintersecting contours
        for (let contour of finalNonintersectingContours) {
            result.addContour(contour);
        }
    }

    intersectEquivalentNonintersectingContours(ourNonintersectingContours, theirNonintersectingContours, results) {
        for (let ourIndex = 0; ourIndex < ourNonintersectingContours.length; ourIndex++) {
            let ourContour = ourNonintersectingContours[ourIndex];
            for (let theirIndex = 0; theirIndex < theirNonintersectingContours.length; theirIndex++) {
                let theirContour = theirNonintersectingContours[theirIndex];

                if (!ourContour.isEquivalent(theirContour)) {
                    continue;
                }

                if (ourContour.inside === theirContour.inside) {
                    // Redundant, so just add one of them to our results
                    results.push(ourContour);
                } else {
                    // One is a hole, one is a fill, so the hole cancels the fill. Add the hole to the results
                    if (theirContour.inside === 1/*ContourInsideHole*/) {
                        // theirContour is the hole, so add it
                        results.push(theirContour);
                    } else {
                        // ourContour is the hole, so add it
                        results.push(ourContour);
                    }
                }

                // Remove both from the inputs so they aren't processed later
                theirNonintersectingContours.splice(theirIndex, 1);
                ourNonintersectingContours.splice(ourIndex, 1);
                ourIndex--;
                break;
            }
        }
    }

    differenceWithBezierGraph(graph: IBezierGraph): IBezierGraph {
        // First insert FBEdgeCrossings into both graphs where the graphs cross.
        this.insertCrossingsWithBezierGraph(graph);
        this.insertSelfCrossings();
        graph.insertSelfCrossings();
        this.cleanupCrossingsWithBezierGraph(graph);

        // Handle the parts of the graphs that intersect first. We're subtracting
        //  graph from outselves. Mark the outside parts of ourselves, and the inside
        //  parts of them for the final result.
        this.markCrossingsAsEntryOrExitWithBezierGraph(graph, false);
        graph.markCrossingsAsEntryOrExitWithBezierGraph(this, true);

        // Walk the crossings and actually compute the final result for the intersecting parts
        let result = this.bezierGraphFromIntersections();

        // Finally, process the contours that don't cross anything else. They're either
        //  completely contained in another contour, or disjoint.
        let ourNonintersectingContours = this.nonintersectingContours().slice();
        let theirNonintersectinContours = graph.nonintersectingContours().slice();
        let finalNonintersectingContours: IContour[] = [];
        this.differenceEquivalentNonintersectingContours(ourNonintersectingContours, theirNonintersectinContours, finalNonintersectingContours);

        // We're doing an subtraction, so assume none of the contours should be in the final result
        for (let ourContour of ourNonintersectingContours) {
            // If ourContour isn't subtracted away (contained by) the other graph, it should stick around,
            //  so add it to our final result.
            let clipContainsSubject = graph.containsContour(ourContour);
            if (!clipContainsSubject) {
                finalNonintersectingContours.push(ourContour);
            }
        }
        for (let theirContour of theirNonintersectinContours) {
            // If our graph contains theirContour, then add theirContour as a hole.
            let subjectContainsClip = this.containsContour(theirContour);
            if (subjectContainsClip) {
                finalNonintersectingContours.push(theirContour); // add it as a hole
            }
        }

        // Append the final nonintersecting contours
        for (let contour of finalNonintersectingContours) {
            result.addContour(contour);
        }

        // Clean up crossings so the graphs can be reused
        this.removeCrossings();
        graph.removeCrossings();
        this.removeOverlaps();
        graph.removeOverlaps();

        (result as any)._cleanupEmptyContours();

        return result;
    }

    differenceEquivalentNonintersectingContours(ourNonintersectingContours, theirNonintersectingContours, results) {
        for (let ourIndex = 0; ourIndex < ourNonintersectingContours.length; ourIndex++) {
            let ourContour = ourNonintersectingContours[ourIndex];
            for (let theirIndex = 0; theirIndex < theirNonintersectingContours.length; theirIndex++) {
                let theirContour = theirNonintersectingContours[theirIndex];

                if (!ourContour.isEquivalent(theirContour)) {
                    continue;
                }

                if (ourContour.inside !== theirContour.inside) {
                    // Trying to subtract a hole from a fill or vice versa does nothing, so add the original to the results
                    results.push(ourContour);
                } else if (ourContour.inside === 1/*ContourInsideHole*/ && theirContour.inside === 1/*ContourInsideHole*/) {
                    // Subtracting a hole from a hole is redundant, so just add one of them to the results
                    results.push(ourContour);
                } else {
                    // Both are fills, and subtracting a fill from a fill removes both. So add neither to the results
                    //  Intentionally do nothing for this case.
                }

                // Remove both from the inputs so they aren't processed later
                theirNonintersectingContours.splice(theirIndex, 1);
                ourNonintersectingContours.splice(ourIndex, 1);
                ourIndex--;
                break;
            }
        }
    }

    markCrossingsAsEntryOrExitWithBezierGraph(otherGraph: IBezierGraph, markInside: boolean): void {
        // Walk each contour in ourself and mark the crossings with each intersecting contour as entering
        //  or exiting the final contour.
        for (let contour of this.contours) {
            let intersectingContours = contour.intersectingContours();
            for (let otherContour of intersectingContours) {
                // If the other contour is a hole, that's a special case where we flip marking inside/outside.
                //  For example, if we're doing a union, we'd normally mark the outside of contours. But
                //  if we're unioning with a hole, we want to cut into that hole so we mark the inside instead
                //  of outside.
                if (otherContour.inside === 1/*ContourInsideHole*/) {
                    contour.markCrossingsAsEntryOrExitWithContour(otherContour, !markInside);
                }
                else {
                    contour.markCrossingsAsEntryOrExitWithContour(otherContour, markInside);
                }
            }
        }
    }

    xorWithBezierGraph(graph: IBezierGraph): IBezierGraph {
        // XOR is done by combing union (OR), intersect (AND) and difference. Specifically
        //  we compute the union of the two graphs, the intersect of them, then subtract
        //  the intersect from the union.
        // Note that we reuse the resulting graphs, which is why it is important that operations
        //  clean up any crossings when their done, otherwise they could interfere with subsequent
        //  operations.

        // First insert FBEdgeCrossings into both graphs where the graphs
        //  cross.
        this.insertCrossingsWithBezierGraph(graph);
        this.insertSelfCrossings();
        graph.insertSelfCrossings();
        this.cleanupCrossingsWithBezierGraph(graph);

        // Handle the parts of the graphs that intersect first. Mark the parts
        //  of the graphs that are outside the other for the final result.
        this.markCrossingsAsEntryOrExitWithBezierGraph(graph, false);
        graph.markCrossingsAsEntryOrExitWithBezierGraph(this, false);

        // Walk the crossings and actually compute the final result for the intersecting parts
        let allParts = this.bezierGraphFromIntersections();
        this.unionNonintersectingPartsIntoGraph(allParts, graph);

        this.markAllCrossingsAsUnprocessed();
        graph.markAllCrossingsAsUnprocessed();

        // Handle the parts of the graphs that intersect first. Mark the parts
        //  of the graphs that are inside the other for the final result.
        this.markCrossingsAsEntryOrExitWithBezierGraph(graph, true);
        graph.markCrossingsAsEntryOrExitWithBezierGraph(this, true);

        let intersectingParts = this.bezierGraphFromIntersections();
        this.intersectNonintersectingPartsIntoGraph(intersectingParts, graph);

        // Clean up crossings so the graphs can be reused, e.g. XOR will reuse graphs.
        this.removeCrossings();
        graph.removeCrossings();
        this.removeOverlaps();
        graph.removeOverlaps();

        var result = allParts.differenceWithBezierGraph(intersectingParts);

        (result as any)._cleanupEmptyContours();

        return result;
    }

    static fromPath(path, matrix): IBezierGraph {
        let r = new BezierGraph();
        r.initWithBezierPath(path, matrix);

        return r;
    }

    insertCrossingsWithBezierGraph(other: IBezierGraph) {
        // Find all intersections and, if they cross the other graph, create crossings for them, and insert
        //  them into each graph's edges.
        for (let ourContour of this.contours) {
            for (let theirContour of other.contours) {
                let overlap = new ContourOverlap();

                for (let ourEdge of ourContour.edges) {
                    for (let theirEdge of theirContour.edges) {
                        // Find all intersections between these two edges (curves)
                        let intersectRange: IReference<IIntersectionRange> = { value: null };
                        ourEdge.intersectionsWithBezierCurve(theirEdge, intersectRange, (intersection, stop) => {
                            // If this intersection happens at one of the ends of the edges, then mark
                            //  that on the edge. We do this here because not all intersections create
                            //  crossings, but we still need to know when the intersections fall on end points
                            //  later on in the algorithm.
                            if (intersection.isAtStartOfCurve1) {
                                ourEdge.startShared = true;
                            }
                            if (intersection.isAtStopOfCurve1) {
                                ourEdge.next.startShared = true;
                            }
                            if (intersection.isAtStartOfCurve2) {
                                theirEdge.startShared = true;
                            }
                            if (intersection.isAtStopOfCurve2) {
                                theirEdge.next.startShared = true;
                            }

                            // Don't add a crossing unless one edge actually crosses the other
                            if (!ourEdge.crossesEdgeAtIntersection(theirEdge, intersection)) {
                                return;
                            }

                            // Add crossings to both graphs for this intersection, and point them at each other
                            let ourCrossing = EdgeCrossing.crossingWithIntersection(intersection);
                            let theirCrossing = EdgeCrossing.crossingWithIntersection(intersection);
                            ourCrossing.counterpart = theirCrossing;
                            theirCrossing.counterpart = ourCrossing;
                            ourEdge.addCrossing(ourCrossing);
                            theirEdge.addCrossing(theirCrossing);

                        });
                        let intersectRangeValue = intersectRange.value;
                        if (intersectRangeValue !== null) {
                            overlap.addOverlap(intersectRangeValue, ourEdge, theirEdge);
                        }
                    } // end theirEdges
                } //end ourEdges

                // At this point we've found all intersections/overlaps between ourContour and theirContour

                // Determine if the overlaps constitute crossings
                if (!overlap.isComplete()) {
                    // The contours aren't equivalent so see if they're crossings
                    overlap.runsWithBlock((run, stop) => {
                        if (!run.isCrossing()) {
                            return;
                        }

                        // The two ends of the overlap run should serve as crossings
                        run.addCrossings();
                    });
                }

                ourContour.addOverlap(overlap);
                theirContour.addOverlap(overlap);
            } // end theirContours
        } // end ourContours
    }

    cleanupCrossingsWithBezierGraph(other: IBezierGraph) {
        // Remove duplicate crossings that can happen at end points of edges
        this.removeDuplicateCrossings();
        other.removeDuplicateCrossings();
        // Remove crossings that happen in the middle of overlaps that aren't crossings themselves
        this.removeCrossingsInOverlaps();
        other.removeCrossingsInOverlaps();
    }

    removeCrossingsInOverlaps(): void {
        for (let ourContour of this.contours) {
            for (let ourEdge of ourContour.edges) {
                ourEdge.crossingsCopyWithBlock((crossing, stop) => {
                    if (crossing.fromCrossingOverlap) {
                        return;
                    }

                    if (ourContour.doesOverlapContainCrossing(crossing)) {
                        let counterpart = crossing.counterpart;
                        crossing.removeFromEdge();
                        counterpart.removeFromEdge();
                    }
                });
            }
        }
    }

    removeDuplicateCrossings(): void {
        // Find any duplicate crossings. These will happen at the endpoints of edges.
        for (let ourContour of this.contours) {
            for (let ourEdge of ourContour.edges) {
                ourEdge.crossingsCopyWithBlock((crossing, stop) => {
                    if (crossing.isAtStart && crossing.edge.previous.lastCrossing.isAtEnd) {
                        // Found a duplicate. Remove this crossing and its counterpart
                        let counterpart = crossing.counterpart;
                        crossing.removeFromEdge();
                        counterpart.removeFromEdge();
                    }

                    if (crossing.isAtEnd && crossing.edge.next.firstCrossing && crossing.edge.next.firstCrossing.isAtStart) {
                        // Found a duplicate. Remove this crossing and its counterpart
                        let counterpart = crossing.edge.next.firstCrossing.counterpart;
                        crossing.edge.next.firstCrossing.removeFromEdge();
                        counterpart.removeFromEdge();
                    }
                });
            }
        }
    }

    insertSelfCrossings(): void {
        // Find all intersections and, if they cross other contours in this graph, create crossings for them, and insert
        //  them into each contour's edges.
        let remainingContours = this.contours.slice();
        while (remainingContours.length > 0) {
            let firstContour = remainingContours[remainingContours.length - 1];
            for (let secondContour of remainingContours) {
                // We don't handle this-intersections on the contour this way, so skip them here
                if (firstContour === secondContour) {
                    continue;
                }

                if (!lineBoundsMightOverlap(firstContour.boundingRect, secondContour.boundingRect) || !lineBoundsMightOverlap(firstContour.bounds, secondContour.bounds)) {
                    continue;
                }
                // Compare all the edges between these two contours looking for crossings
                for (let firstEdge of firstContour.edges) {
                    for (let secondEdge of secondContour.edges) {
                        // Find all intersections between these two edges (curves)
                        firstEdge.intersectionsWithBezierCurve(secondEdge, null, (intersection, stop) => {
                            // If this intersection happens at one of the ends of the edges, then mark
                            //  that on the edge. We do this here because not all intersections create
                            //  crossings, but we still need to know when the intersections fall on end points
                            //  later on in the algorithm.
                            if (intersection.isAtStartOfCurve1) {
                                firstEdge.startShared = true;
                            }
                            else if (intersection.isAtStopOfCurve1) {
                                firstEdge.next.startShared = true;
                            }
                            if (intersection.isAtStartOfCurve2) {
                                secondEdge.startShared = true;
                            }
                            else if (intersection.isAtStopOfCurve2) {
                                secondEdge.next.startShared = true;
                            }

                            // Don't add a crossing unless one edge actually crosses the other
                            if (!firstEdge.crossesEdgeAtIntersection(secondEdge, intersection)) {
                                return;
                            }

                            // Add crossings to both graphs for this intersection, and point them at each other
                            let firstCrossing = EdgeCrossing.crossingWithIntersection(intersection);
                            let secondCrossing = EdgeCrossing.crossingWithIntersection(intersection);
                            firstCrossing.selfCrossing = true;
                            secondCrossing.selfCrossing = true;
                            firstCrossing.counterpart = secondCrossing;
                            secondCrossing.counterpart = firstCrossing;
                            firstEdge.addCrossing(firstCrossing);
                            secondEdge.addCrossing(secondCrossing);
                        });
                    }
                }
            }

            // We just compared this contour to all the others, so we don't need to do it again
            remainingContours.splice(remainingContours.length - 1, 1); // do this at the end of the loop when we're done with it
        }

        // Go through and mark each contour if its a hole or filled region
        for (let contour of this._contours) {
            contour.inside = this.contourInsides(contour);
        }
    }

    get bounds() {
        // Compute the bounds of the graph by unioning together the bounds of the individual contours
        if (this._bounds) {
            return this._bounds;
        }
        if (this._contours.length === 0) {
            return null;
        }

        this._bounds = null;
        for (let contour of this._contours) {
            if (!this._bounds) {
                this._bounds = clone(contour.bounds);
            } else {
                this._bounds = unionRect(this._bounds, contour.bounds);
            }
        }

        return this._bounds;
    }


    contourInsides(testContour: IContour): 0 | 1 {
        // Determine if this contour, which should reside in this graph, is a filled region or
        //  a hole. Determine this by casting a ray from one edges of the contour to the outside of
        //  the entire graph. Count how many times the ray intersects a contour in the graph. If it's
        //  an odd number, the test contour resides inside of filled region, meaning it must be a hole.
        //  Otherwise it's "outside" of the graph and creates a filled region.
        // Create the line from the first point in the contour to outside the graph

        // NOTE: this method requires insertSelfCrossings: to be call before it, and the this crossings
        //  to be in place to work

        let testPoint = testContour.testPointForContainment();
        let lineEndPoint = {
            x: testPoint.x > this.bounds.x ? this.bounds.x - 10 : (this.bounds.x + this.bounds.width) + 10,
            y: testPoint.y
        };
        /* just move us outside the bounds of the graph */
        let testCurve = BezierCurve.bezierCurveWithLine(testPoint, lineEndPoint);

        let intersectCount = 0;
        for (let contour of this.contours) {
            if (contour === testContour || contour.crossesOwnContour(testContour)) {
                continue; // don't test this intersections
            }

            intersectCount += contour.numberOfIntersectionsWithRay(testCurve);
        }

        return (intersectCount & 1) === 1 ? 1/*ContourInsideHole*/ : 0/*ContourInsideFilled*/;
    }

    closestLocationToPoint(point: ICoordinate): ILocation {
        let closestLocation = null;

        for (let contour of this._contours) {
            let contourLocation = contour.closestLocationToPoint(point);
            if (contourLocation !== null && (closestLocation === null || contourLocation.distance < closestLocation.distance)) {
                closestLocation = contourLocation;
            }
        }

        if (closestLocation === null) {
            return null;
        }

        closestLocation.graph = this;

        return closestLocation;
    }

    containsContour(testContour: IContour) {
        // Determine the container, if any, for the test contour. We do this by casting a ray from one end of the graph to the other,
        //  and recording the intersections before and after the test contour. If the ray intersects with a contour an odd number of
        //  times on one side, we know it contains the test contour. After determine which contours contain the test contour, we simply
        //  pick the closest one to test contour.
        //
        // Things get a bit more complicated though. If contour shares and edge the test contour, then it can be impossible to determine
        //  whom contains whom. Or if we hit the test contour at a location where edges joint together (i.e. end points).
        //  For this reason, we sit in a loop passing both horizontal and vertical rays through the graph until we can eliminate the number
        //  of potentially enclosing contours down to 1 or 0. Most times the first ray will find the correct answer, but in some degenerate
        //  cases it will take a few iterations.

        const RayOverlap = 10.0;

        // Do a relatively cheap bounds test first
        if (!this.bounds || !lineBoundsMightOverlap(this.bounds, testContour.bounds)) {
            return false;
        }

        // In the beginning all our contours are possible containers for the test contour.
        let containers = this._contours.slice();

        // Each time through the loop we split the test contour into any increasing amount of pieces
        //  (halves, thirds, quarters, etc) and send a ray along the boundaries. In order to increase
        //  our changes of eliminate all but 1 of the contours, we do both horizontal and vertical rays.
        let count = Math.max(Math.ceil(testContour.bounds.width), Math.ceil(testContour.bounds.height));
        for (let fraction = 2; fraction <= (count * 2); fraction++) {
            let didEliminate = false;

            // Send the horizontal rays through the test contour and (possibly) through parts of the graph
            let verticalSpacing = testContour.bounds.height / fraction;
            for (let y = testContour.bounds.y + verticalSpacing; y < (testContour.bounds.y + testContour.bounds.height); y += verticalSpacing) {
                // Construct a line that will reach outside both ends of both the test contour and graph
                let ray = BezierCurve.bezierCurveWithLine({
                    x: Math.min(this.bounds.x, testContour.bounds.x) - RayOverlap,
                    y: y
                }, {
                        x: Math.max((this.bounds.x + this.bounds.width), (testContour.bounds.x + testContour.bounds.width)) + RayOverlap,
                        y: y
                    });
                // Eliminate any contours that aren't containers. It's possible for this method to fail, so check the return
                let eliminated = this.eliminateContainers(containers, testContour, ray);
                if (eliminated) {
                    didEliminate = true;
                }
            }

            // Send the vertical rays through the test contour and (possibly) through parts of the graph
            let horizontalSpacing = testContour.bounds.width / fraction;
            for (let x = testContour.bounds.x + horizontalSpacing; x < (testContour.bounds.x + testContour.bounds.width); x += horizontalSpacing) {
                // Construct a line that will reach outside both ends of both the test contour and graph
                let ray = BezierCurve.bezierCurveWithLine({
                    x: x,
                    y: Math.min(this.bounds.y, testContour.bounds.y) - RayOverlap
                }, {
                        x: x,
                        y: Math.max((this.bounds.y + this.bounds.height), (testContour.bounds.y + testContour.bounds.height) + RayOverlap)
                    });
                // Eliminate any contours that aren't containers. It's possible for this method to fail, so check the return
                let eliminated = this.eliminateContainers(containers, testContour, ray);
                if (eliminated) {
                    didEliminate = true;
                }
            }

            // If we've eliminated all the contours, then nothing contains the test contour, and we're done
            if (containers.length === 0) {
                return false;
            }
            // We were able to eliminate someone, and we're down to one, so we're done. If the eliminateContainers: method
            //  failed, we can't make any assumptions about the contains, so just let it go again.
            if (didEliminate) {
                return (containers.length & 1) === 1;
            }
        }

        // This is a curious case, because by now we've sent rays that went through every integral cordinate of the test contour.
        //  Despite that eliminateContainers: failed each time, meaning one container has a shared edge for each ray test. It is likely
        //  that contour is equal (the same) as the test contour. Return null, because if it is equal, it doesn't contain.
        return false;
    }

    findBoundsOfContour(testContour: IContour, ray: IBezierCurve, testMinimum: IReference<ICoordinate>, testMaximum: IReference<ICoordinate>) {
        // Find the bounds of test contour that lie on ray. Simply intersect the ray with test contour. For a horizontal ray, the minimum is the point
        //  with the lowest x value, the maximum with the highest x value. For a vertical ray, use the high and low y values.

        let horizontalRay = ray.endPoint1.y === ray.endPoint2.y; // ray has to be a vertical or horizontal line

        // First find all the intersections with the ray
        let rayIntersections: IIntersection[] = [];
        for (let edge of testContour.edges) {
            ray.intersectionsWithBezierCurve(edge, null, (intersection, stop) => {
                rayIntersections.push(intersection);
            });
        }
        if (rayIntersections.length === 0) {
            return false; // shouldn't happen
        }
        // Next go through and find the lowest and highest
        let firstRayIntersection = rayIntersections[0];
        testMinimum.value = firstRayIntersection.location;
        testMaximum.value = testMinimum.value;
        for (let intersection of rayIntersections) {
            if (horizontalRay) {
                if (intersection.location.x < testMinimum.value.x) {
                    testMinimum.value = intersection.location;
                }
                if (intersection.location.x > testMaximum.value.x) {
                    testMaximum.value = intersection.location;
                }
            } else {
                if (intersection.location.y < testMinimum.value.y) {
                    testMinimum.value = intersection.location;
                }
                if (intersection.location.y > testMaximum.value.y) {
                    testMaximum.value = intersection.location;
                }
            }
        }

        return true;
    }

    findCrossingsOnContainers(containers: IContour[], ray: IBezierCurve, testMinimum: ICoordinate, testMaximum: ICoordinate, crossingsBeforeMinimum: IBezierCrossing[], crossingsAfterMaximum: IBezierCrossing[]) {
        // Find intersections where the ray intersects the possible containers, before the minimum point, or after the maximum point. Store these
        //  as FBEdgeCrossings in the out parameters.
        let horizontalRay = ray.endPoint1.y === ray.endPoint2.y; // ray has to be a vertical or horizontal line

        // Walk through each possible container, one at a time and see where it intersects
        let ambiguousCrossings: IBezierCrossing[] = [];
        for (let container of containers) {
            for (let containerEdge of container.edges) {
                // See where the ray intersects this particular edge
                let ambigious = false;
                ray.intersectionsWithBezierCurve(containerEdge, null, (intersection, stop) => {
                    if (intersection.isTangent) {
                        return; // tangents don't count
                    }
                    // If the ray intersects one of the contours at a joint (end point), then we won't be able
                    //  to make any accurate conclusions, so bail now, and say we failed.
                    if (intersection.isAtEndPointOfCurve2) {
                        ambigious = true;
                        stop.value = true;

                        return;
                    }

                    // If the point likes inside the min and max bounds specified, just skip over it. We only want to remember
                    //  the intersections that fall on or outside of the min and max.
                    if (horizontalRay && isValueLessThan(intersection.location.x, testMaximum.x) && isValueGreaterThan(intersection.location.x, testMinimum.x)) {
                        return;
                    }
                    else if (!horizontalRay && isValueLessThan(intersection.location.y, testMaximum.y) && isValueGreaterThan(intersection.location.y, testMinimum.y)) {
                        return;
                    }

                    // Creat a crossing for it so we know what edge it is associated with. Don't insert it into a graph or anything though.
                    let crossing = EdgeCrossing.crossingWithIntersection(intersection);
                    crossing.edge = containerEdge;

                    // Special case if the bounds are just a point, and this crossing is on that point. In that case
                    //  it could fall on either side, and we'll need to do some special processing on it later. For now,
                    //  remember it, and move on to the next intersection.
                    if (equalPoints(testMaximum, testMinimum) && equalPoints(testMaximum, intersection.location)) {
                        ambiguousCrossings.push(crossing);

                        return;
                    }

                    // This crossing falls outse the bounds, so add it to the appropriate array

                    if (horizontalRay && isValueLessThanEqual(intersection.location.x, testMinimum.x)) {
                        crossingsBeforeMinimum.push(crossing);
                    }
                    else if (!horizontalRay && isValueLessThanEqual(intersection.location.y, testMinimum.y)) {
                        crossingsBeforeMinimum.push(crossing);
                    }
                    if (horizontalRay && isValueGreaterThanEqual(intersection.location.x, testMaximum.x)) {
                        crossingsAfterMaximum.push(crossing);
                    }
                    else if (!horizontalRay && isValueGreaterThanEqual(intersection.location.y, testMaximum.y)) {
                        crossingsAfterMaximum.push(crossing);
                    }
                });

                if (ambigious) {
                    return false;
                }
            }
        }

        // Handle any intersects that are ambigious. i.e. the min and max are one point, and the intersection is on that point.
        for (let ambiguousCrossing of ambiguousCrossings) {
            // See how many times the given contour crosses on each side. Add the ambigious crossing to the side that has less,
            //  in hopes of balancing it out.
            let numberOfTimesContourAppearsBefore = this.numberOfTimesContour(ambiguousCrossing.edge.contour, crossingsBeforeMinimum);
            let numberOfTimesContourAppearsAfter = this.numberOfTimesContour(ambiguousCrossing.edge.contour, crossingsAfterMaximum);
            if (numberOfTimesContourAppearsBefore < numberOfTimesContourAppearsAfter) {
                crossingsBeforeMinimum.push(ambiguousCrossing);
            }
            else {
                crossingsAfterMaximum.push(ambiguousCrossing);
            }
        }

        return true;
    }

    numberOfTimesContour(contour: IContour, crossings: IBezierCrossing[]): number {
        // Count how many times a contour appears in a crossings array
        let count = 0;
        for (let crossing of crossings) {
            if (crossing.edge.contour === contour) {
                count++;
            }
        }

        return count;
    }

    eliminateContainers(containers: IContour[], testContour: IContour, ray: IBezierCurve): boolean {
        // This method attempts to eliminate all or all but one of the containers that might contain test contour, using the ray specified.

        // First determine the exterior bounds of testContour on the given ray
        let testMinimumRef = makeRef<ICoordinate>();
        let testMaximumRef = makeRef<ICoordinate>();
        let foundBounds = this.findBoundsOfContour(testContour, ray, testMinimumRef, testMaximumRef);
        if (!foundBounds) {
            return false;
        }

        let testMinimum = testMinimumRef.value;
        let testMaximum = testMaximumRef.value;


        // Find all the containers on either side of the otherContour
        let crossingsBeforeMinimum: IBezierCrossing[] = [];
        let crossingsAfterMaximum: IBezierCrossing[] = [];
        let foundCrossings = this.findCrossingsOnContainers(containers, ray, testMinimum, testMaximum, crossingsBeforeMinimum, crossingsAfterMaximum);
        if (!foundCrossings) {
            return false;
        }

        // Remove containers that appear an even number of times on either side, because by the even/odd rule
        //  they can't contain test contour.
        this.removeContoursThatDontContain(crossingsBeforeMinimum);
        this.removeContoursThatDontContain(crossingsAfterMaximum);

        // Remove containers that appear only on one side
        this.removeContourCrossings(crossingsBeforeMinimum, crossingsAfterMaximum);
        this.removeContourCrossings(crossingsAfterMaximum, crossingsBeforeMinimum);

        // Although crossingsBeforeMinimum and crossingsAfterMaximum contain different crossings, they should contain the same
        //  contours, so just pick one to pull the contours from
        containers.splice(0, containers.length);
        let arr = this.contoursFromCrossings(crossingsBeforeMinimum);
        for (let a of arr) {
            containers.push(a);
        }

        return true;
    }

    contoursFromCrossings(crossings: IBezierCrossing[]) {
        // Determine all the unique contours in the array of crossings
        let contours: IContour[] = [];
        for (let crossing of crossings) {
            if (contours.indexOf(crossing.edge.contour) === -1) {
                contours.push(crossing.edge.contour);
            }
        }

        return contours;
    }

    removeContourCrossings(crossings1: IBezierCrossing[], crossings2: IBezierCrossing[]) {
        // If a contour appears in crossings1, but not crossings2, remove all the associated crossings from
        //  crossings1.

        let containersToRemove: IContour[] = [];
        for (let crossingToTest of crossings1) {
            let containerToTest = crossingToTest.edge.contour;
            // See if this contour exists in the other array
            let existsInOther = false;
            for (let crossing of crossings2) {
                if (crossing.edge.contour === containerToTest) {
                    existsInOther = true;
                    break;
                }
            }
            // If it doesn't exist in our counterpart, mark it for death
            if (!existsInOther) {
                containersToRemove.push(containerToTest);
            }
        }
        this.removeCrossings2(crossings1, containersToRemove);
    }

    removeContoursThatDontContain(crossings: IBezierCrossing[]) {
        // Remove contours that cross the ray an even number of times. By the even/odd rule this means
        //  they can't contain the test contour.
        let containersToRemove: IContour[] = [];
        for (let crossingToTest of crossings) {
            // For this contour, count how many times it appears in the crossings array
            let containerToTest = crossingToTest.edge.contour;
            let count = 0;
            for (let crossing of crossings) {
                if (crossing.edge.contour === containerToTest) {
                    count++;
                }
            }
            // If it's not an odd number of times, it doesn't contain the test contour, so mark it for death
            if ((count % 2) !== 1) {
                containersToRemove.push(containerToTest);
            }
        }
        this.removeCrossings2(crossings, containersToRemove);
    }

    removeCrossings2(crossings: IBezierCrossing[], containersToRemove: IContour[]) {
        // A helper method that goes through and removes all the crossings that appear on the specified
        //  contours.

        // First walk through and identify which crossings to remove
        let crossingsToRemove: IBezierCrossing[] = [];
        for (let contour of containersToRemove) {
            for (let crossing of crossings) {
                if (crossing.edge.contour === contour) {
                    crossingsToRemove.push(crossing);
                }
            }
        }
        // Now walk through and remove the crossings
        for (let crossing of crossingsToRemove) {
            let i = crossings.indexOf(crossing);
            crossings.splice(i, 1);
        }
    }

    markAllCrossingsAsUnprocessed() {
        for (let contour of this._contours) {
            for (let edge of contour.edges) {
                edge.crossingsCopyWithBlock((crossing) => {
                    crossing.processed = false;
                });
            }
        }
    }

    firstUnprocessedCrossing() {
        // Find the first crossing in our graph that has yet to be processed by the bezierGraphFromIntersections
        //  method.

        for (let contour of this._contours) {
            for (let edge of contour.edges) {
                let unprocessedCrossing = null;
                edge.crossingsWithBlock((crossing, stop) => {
                    if (crossing.isSelfCrossing) {
                        return;
                    }
                    if (!crossing.processed) {
                        unprocessedCrossing = crossing;
                        stop.value = true;
                    }
                });

                if (unprocessedCrossing !== null) {
                    return unprocessedCrossing;
                }
            }
        }

        return null;
    }

    bezierGraphFromIntersections(): IBezierGraph {
        // This method walks the current graph, starting at the crossings, and outputs the final contours
        //  of the parts of the graph that actually intersect. The general algorithm is: start an crossing
        //  we haven't seen before. If it's marked as entry, start outputing edges moving forward (i.e. using edge.next)
        //  until another crossing is hit. (If a crossing is marked as exit, start outputting edges move backwards, using
        //  edge.previous.) Once the next crossing is hit, switch to the crossing's counter part in the other graph,
        //  and process it in the same way. Continue this until we reach a crossing that's been processed.

        let result = new BezierGraph();

        // Find the first crossing to start one
        let crossing = this.firstUnprocessedCrossing();
        while (crossing !== null) {
            // This is the start of a contour, so create one
            let contour = new BezierContour();
            result.addContour(contour);

            // Keep going until we run into a crossing we've seen before.
            while (!crossing.processed) {
                crossing.processed = true; // ...and we've just seen this one

                if (crossing.isEntry) {
                    // Keep going to next until meet a crossing
                    contour.addCurveFrom(crossing, crossing.nextNonself);
                    if (crossing.nextNonself === null) {
                        // We hit the end of the edge without finding another crossing, so go find the next crossing
                        let edge = crossing.edge.next;
                        while (!edge.hasNonselfCrossings) {
                            // output this edge whole
                            contour.addCurve(edge.clone()); // make a copy to add. contours don't share too good

                            edge = edge.next;
                        }
                        // We have an edge that has at least one crossing
                        crossing = edge.firstNonselfCrossing;
                        contour.addCurveFrom(null, crossing); // add the curve up to the crossing
                    } else {
                        crossing = crossing.nextNonself; // this edge has a crossing, so just move to it
                    }
                } else {
                    // Keep going to previous until meet a crossing
                    contour.addReverseCurveFrom(crossing.previousNonself, crossing);
                    if (crossing.previousNonself === null) {
                        // we hit the end of the edge without finding another crossing, so go find the previous crossing
                        let edge = crossing.edge.previous;
                        while (!edge.hasNonselfCrossings) {
                            // output this edge whole
                            contour.addReverseCurve(edge);

                            edge = edge.previous;
                        }
                        // We have an edge that has at least one edge
                        crossing = edge.lastNonselfCrossing;
                        contour.addReverseCurveFrom(crossing, null); // add the curve up to the crossing
                    } else {
                        crossing = crossing.previousNonself;
                    }
                }

                // Switch over to counterpart in the other graph
                crossing.processed = true;
                crossing = crossing.counterpart;
            }

            // See if there's another contour that we need to handle
            crossing = this.firstUnprocessedCrossing();
        }

        return result;
    }

    removeCrossings(): void {
        // Crossings only make sense for the intersection between two specific graphs. In order for this
        //  graph to be usable in the future, remove all the crossings
        for (let contour of this._contours) {
            for (let edge of contour.edges) {
                edge.removeAllCrossings();
            }
        }
    }

    removeOverlaps(): void {
        for (let contour of this._contours) {
            contour.removeAllOverlaps();
        }
    }

    addContour(contour: IContour): void {
        // Add a contour to ouselves, and force the bounds to be recalculated
        this._contours.push(contour);
        this._bounds = null;
    }

    nonintersectingContours(): IContour[] {
        // Find all the contours that have no crossings on them.
        let contours: IContour[] = [];
        for (let contour of this._contours) {
            if (contour.intersectingContours().length === 0) {
                contours.push(contour);
            }
        }

        return contours;
    }
}