import * as math from "./math";
import * as geometry from "./geometry";
import BezierIntersectRange from "./bezierIntersectRange";
import BezierIntersection from "./BezierIntersection";
import { IBezierCurveData, IBezierCurve, IRange, INormilizedLine2D, IRectData, IReference, IBezierCurveData2, IBezierCurveData3, ILocation, IIntersectionRange, IIntersection } from "carbon-core";
import { ICoordinate } from "carbon-geometry";

const BezierCurveDataInvalidLength = -1.0;
const BezierCurveDataInvalidIsPoint = null;


export function bezierCurveDataGetLengthAtParameter(data: IBezierCurveData, parameter: number): number {
    // Use the cached value if at all possible
    if (parameter === 1.0 && data.length !== BezierCurveDataInvalidLength) {
        return data.length;
    }

    // If it's a line, use that equation instead
    let length = BezierCurveDataInvalidLength;
    if (data.isStraightLine) {
        length = geometry.distanceBetweenPoints(data.endPoint1, data.endPoint2) * parameter;
    } else {
        length = math.gaussQuadratureComputeCurveLengthForCubic(parameter, 12, data.endPoint1, data.controlPoint1, data.controlPoint2, data.endPoint2);
    }

    // If possible, update our cache
    if (parameter === 1.0) {
        data.length = length;
    }

    return length;
}

export function bezierCurveDataGetLength(data: IBezierCurveData): number {
    return bezierCurveDataGetLengthAtParameter(data, 1.0);
}

// function clone(point: ICoordinate): ICoordinate {
//     return { x: point.x, y: point.y };
// }

export function bezierCurveDataPointAtParameter(data: IBezierCurveData, parameter: number, leftBezierCurveData: IBezierCurveData, rightBezierCurveData: IBezierCurveData): ICoordinate {
    // This method is a simple wrapper around the BezierWithPoints() helper function. It computes the 2D point at the given parameter,
    //  and (optionally) the resulting curves that splitting at the parameter would create.

    let points = [clone(data.endPoint1), clone(data.controlPoint1), clone(data.controlPoint2), clone(data.endPoint2)];
    let leftCurve = [];
    let rightCurve = [];

    let point = math.bezierWithPoints(3, points, parameter, leftCurve, rightCurve);

    if (leftBezierCurveData) {
        bezierCurveDataSet(leftBezierCurveData, leftCurve[0], leftCurve[1], leftCurve[2], leftCurve[3], data.isStraightLine);
    }

    if (rightBezierCurveData) {
        bezierCurveDataSet(rightBezierCurveData, rightCurve[0], rightCurve[1], rightCurve[2], rightCurve[3], data.isStraightLine);
    }

    return point;
}

export function bezierCurveDataSubcurveWithRange(data: IBezierCurveData, range: IRange) {
    // Return a bezier curve representing the parameter range specified. We do this by splitting
    //  twice: once on the minimum, the splitting the result of that on the maximum.
    let upperCurve = emptyObject<IBezierCurveData>();
    bezierCurveDataPointAtParameter(data, range.minimum, null, upperCurve);
    if (range.minimum === 1.0) {
        return upperCurve; // avoid the divide by zero below
    }
    // We need to adjust the maximum parameter to fit on the new curve before we split again
    let adjustedMaximum = (range.maximum - range.minimum) / (1.0 - range.minimum);

    let lowerCurve = emptyObject<IBezierCurveData>();
    bezierCurveDataPointAtParameter(upperCurve, adjustedMaximum, lowerCurve, null);

    return lowerCurve;
}

export function bezierCurveDataRegularFatLineBounds(data: IBezierCurveData, range: IRange): INormilizedLine2D {
    // Create the fat line based on the end points
    let line = math.normalizedLineMake(data.endPoint1, data.endPoint2);

    // Compute the bounds of the fat line. The fat line bounds should entirely encompass the
    //  bezier curve. Since we know the convex hull entirely compasses the curve, just take
    //  all four points that define this cubic bezier curve. Compute the signed distances of
    //  each of the end and control points from the fat line, and that will give us the bounds.

    // In this case, we know that the end points are on the line, thus their distances will be 0.
    //  So we can skip computing those and just use 0.
    let controlPoint1Distance = math.normalizedLineDistanceFromPoint(line, data.controlPoint1);
    let controlPoint2Distance = math.normalizedLineDistanceFromPoint(line, data.controlPoint2);
    let min = Math.min(controlPoint1Distance, Math.min(controlPoint2Distance, 0.0));
    let max = Math.max(controlPoint1Distance, Math.max(controlPoint2Distance, 0.0));

    range.minimum = min;
    range.maximum = max;

    return line;
}

export function bezierCurveDataPerpendicularFatLineBounds(data: IBezierCurveData, range: IRange) {
    // Create a fat line that's perpendicular to the line created by the two end points.
    let normal = geometry.lineNormal(data.endPoint1, data.endPoint2);
    let startPoint = geometry.lineMidpoint(data.endPoint1, data.endPoint2);
    let endPoint = geometry.addPoint(startPoint, normal);
    let line = math.normalizedLineMake(startPoint, endPoint);

    // Compute the bounds of the fat line. The fat line bounds should entirely encompass the
    //  bezier curve. Since we know the convex hull entirely compasses the curve, just take
    //  all four points that define this cubic bezier curve. Compute the signed distances of
    //  each of the end and control points from the fat line, and that will give us the bounds.
    let controlPoint1Distance = math.normalizedLineDistanceFromPoint(line, data.controlPoint1);
    let controlPoint2Distance = math.normalizedLineDistanceFromPoint(line, data.controlPoint2);
    let point1Distance = math.normalizedLineDistanceFromPoint(line, data.endPoint1);
    let point2Distance = math.normalizedLineDistanceFromPoint(line, data.endPoint2);

    let min = Math.min(controlPoint1Distance, Math.min(controlPoint2Distance, Math.min(point1Distance, point2Distance)));
    let max = Math.max(controlPoint1Distance, Math.max(controlPoint2Distance, Math.max(point1Distance, point2Distance)));

    range.minimum = min;
    range.maximum = max;

    return line;
}

export function bezierCurveDataClipWithFatLine(data: IBezierCurveData, fatLine: INormilizedLine2D, bounds: IRange) {
    // This method computes the range of self that could possibly intersect with the fat line passed in (and thus with the curve enclosed by the fat line).
    //  To do that, we first compute the signed distance of all our points (end and control) from the fat line, and map those onto a bezier curve at
    //  evenly spaced intervals from [0..1]. The parts of the distance bezier that fall inside of the fat line bounds, correspond to the parts of ourself
    //  that could potentially intersect with the other curve. Ideally, we'd calculate where the distance bezier intersected the horizontal lines representing
    //  the fat line bounds. However, computing those intersections is hard and costly. So instead we'll compute the convex hull, and intersect those lines
    //  with the fat line bounds. The intersection with the lowest x coordinate will be the minimum, and the intersection with the highest x coordinate will
    //  be the maximum.

    // The convex hull (for cubic beziers) is the four points that define the curve. A useful property of the convex hull is that the entire curve lies
    //  inside of it.

    // First calculate bezier curve points distance from the fat line that's clipping us
    let distanceBezierPoints = [
        { x: 0, y: math.normalizedLineDistanceFromPoint(fatLine, data.endPoint1) },
        { x: 1.0 / 3.0, y: math.normalizedLineDistanceFromPoint(fatLine, data.controlPoint1) },
        { x: 2.0 / 3.0, y: math.normalizedLineDistanceFromPoint(fatLine, data.controlPoint2) },
        { x: 1.0, y: math.normalizedLineDistanceFromPoint(fatLine, data.endPoint2) }
    ];


    let convexHull: ICoordinate[] = [];
    math.convexHullBuildFromPoints(distanceBezierPoints, convexHull);
    let convexHullLength = convexHull.length;
    // Find intersections of convex hull with the fat line bounds
    let range = geometry.rangeMake(1.0, 0.0);
    for (let i = 0; i < convexHullLength; i++) {
        // Pull out the current line on the convex hull
        let indexOfNext = i < (convexHullLength - 1) ? i + 1 : 0;
        let startPoint = convexHull[i];
        let endPoint = convexHull[indexOfNext];
        let intersectionPoint = null;

        // See if the segment of the convex hull intersects with the minimum fat line bounds
        if (intersectionPoint = math.lineIntersectsHorizontalLine(startPoint, endPoint, bounds.minimum)) {
            if (intersectionPoint.x < range.minimum) {
                range.minimum = intersectionPoint.x;
            }
            if (intersectionPoint.x > range.maximum) {
                range.maximum = intersectionPoint.x;
            }
        }

        // See if this segment of the convex hull intersects with the maximum fat line bounds
        if (intersectionPoint = math.lineIntersectsHorizontalLine(startPoint, endPoint, bounds.maximum)) {
            if (intersectionPoint.x < range.minimum) {
                range.minimum = intersectionPoint.x;
            }
            if (intersectionPoint.x > range.maximum) {
                range.maximum = intersectionPoint.x;
            }
        }

        // We want to be able to refine t even if the convex hull lies completely inside the bounds. This
        //  also allows us to be able to use range of [1..0] as a sentinel value meaning the convex hull
        //  lies entirely outside of bounds, and the curves don't intersect.
        if (startPoint.y < bounds.maximum && startPoint.y > bounds.minimum) {
            if (startPoint.x < range.minimum) {
                range.minimum = startPoint.x;
            }
            if (startPoint.x > range.maximum) {
                range.maximum = startPoint.x;
            }
        }
    }

    // Check for bad values
    if (range.minimum === Number.MAX_VALUE || isNaN(range.minimum) || range.maximum === Number.MAX_VALUE || isNaN(range.maximum)) {
        range = geometry.rangeMake(0, 1); // equivalent to: something went wrong, so I don't know
    }

    return range;
}

export function bezierCurveDataBezierClipWithBezierCurve(data: IBezierCurveData, curve: IBezierCurveData, originalCurve: IBezierCurveData, originalRange: IRange) {
    // This method does the clipping of self. It removes the parts of self that we can determine don't intersect
    //  with curve. It'll return the clipped version of self, update originallet  which corresponds to the range
    //  on the original curve that the return value represents. Finally, it'll set the intersects out parameter
    //  to yes or no depending on if the curves intersect or not.

    // Clipping works as follows:
    //  Draw a line through the two endpoints of the other curve, which we'll call the fat line. Measure the
    //  signed distance between the control points on the other curve and the fat line. The distance from the line
    //  will give us the fat line bounds. Any part of our curve that lies further away from the fat line than the
    //  fat line bounds we know can't intersect with the other curve, and thus can be removed.

    // We actually use two different fat lines. The first one uses the end points of the other curve, and the second
    //  one is perpendicular to the first. Most of the time, the first fat line will clip off more, but sometimes the
    //  second proves to be a better fat line in that it clips off more. We use both in order to converge more quickly.

    // Compute the regular fat line using the end points, then compute the range that could still possibly intersect
    //  with the other curve
    let fatLineBounds: IRange = { minimum: undefined, maximum: undefined };
    let intersects;
    let fatLine = bezierCurveDataRegularFatLineBounds(curve, fatLineBounds);
    let regularClippedRange = bezierCurveDataClipWithFatLine(data, fatLine, fatLineBounds);
    // A range of [1, 0] is a special sentinel value meaning "they don't intersect". If they don't, bail early to save time
    if (regularClippedRange.minimum === 1.0 && regularClippedRange.maximum === 0.0) {
        intersects = false;

        return { data: data, intersects: intersects, originalRange: originalRange };
    }

    // Just in case the regular fat line isn't good enough, try the perpendicular one
    let perpendicularLineBounds: IRange = { minimum: undefined, maximum: undefined };
    let perpendicularLine = bezierCurveDataPerpendicularFatLineBounds(curve, perpendicularLineBounds);
    let perpendicularClippedRange = bezierCurveDataClipWithFatLine(data, perpendicularLine, perpendicularLineBounds);
    if (perpendicularClippedRange.minimum === 1.0 && perpendicularClippedRange.maximum === 0.0) {
        intersects = false;

        return { data: data, intersects: intersects, originalRange: originalRange };
    }

    // Combine to form Voltron. Take the intersection of the regular fat line range and the perpendicular one.
    let clippedRange = geometry.rangeMake(Math.max(regularClippedRange.minimum, perpendicularClippedRange.minimum), Math.min(regularClippedRange.maximum, perpendicularClippedRange.maximum));

    // Right now the clipped range is relative to ourself, not the original curve. So map the newly clipped range onto the original range
    originalRange = geometry.rangeMake(geometry.rangeScaleNormalizedValue(originalRange, clippedRange.minimum), geometry.rangeScaleNormalizedValue(originalRange, clippedRange.maximum));
    intersects = true;

    // Actually divide the curve, but be sure to use the original curve. This helps with errors building up.
    return { data: bezierCurveDataSubcurveWithRange(originalCurve, originalRange), intersects: intersects, originalRange: originalRange };
}

export function bezierCurveDataIsPoint(data: IBezierCurveData): boolean {
    // If the two end points are close together, then we're a point. Ignore the control
    //  points.
    let ClosenessThreshold = 1e-5;

    if (data.isPoint !== BezierCurveDataInvalidIsPoint) {
        return data.isPoint;
    }

    data.isPoint = geometry.arePointsCloseWithOptions(data.endPoint1, data.endPoint2, ClosenessThreshold)
        && geometry.arePointsCloseWithOptions(data.endPoint1, data.controlPoint1, ClosenessThreshold)
        && geometry.arePointsCloseWithOptions(data.endPoint1, data.controlPoint2, ClosenessThreshold);

    return data.isPoint;
}

export function bezierCurveDataBoundingRect(data: IBezierCurveData): IRectData {
    // Use the cache if we have one
    if (data.boundingRect) {
        return data.boundingRect;
    }

    let left = Math.min(data.endPoint1.x, Math.min(data.controlPoint1.x, Math.min(data.controlPoint2.x, data.endPoint2.x)));
    let top = Math.min(data.endPoint1.y, Math.min(data.controlPoint1.y, Math.min(data.controlPoint2.y, data.endPoint2.y)));
    let right = Math.max(data.endPoint1.x, Math.max(data.controlPoint1.x, Math.max(data.controlPoint2.x, data.endPoint2.x)));
    let bottom = Math.max(data.endPoint1.y, Math.max(data.controlPoint1.y, Math.max(data.controlPoint2.y, data.endPoint2.y)));

    data.boundingRect = { x: left, y: top, width: right - left, height: bottom - top };

    return data.boundingRect;
}

export function bezierCurveDataBounds(data: IBezierCurveData) {
    // Use the cache if we have one
    if (data.bounds) {
        return data.bounds;
    }

    let bounds: IRectData = null;

    if (data.isStraightLine) {
        let topLeft: ICoordinate = { x: data.endPoint1.x, y: data.endPoint1.y };
        let bottomRight: ICoordinate = { x: topLeft.x, y: topLeft.y };
        geometry.expandBoundsByPoint(topLeft, bottomRight, data.endPoint2);

        bounds = { x: topLeft.x, y: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };
    } else {
        // Start with the end points
        let topLeft = clone(bezierCurveDataPointAtParameter(data, 0, null, null));
        let bottomRight = clone(topLeft);
        let lastPoint = bezierCurveDataPointAtParameter(data, 1, null, null);
        geometry.expandBoundsByPoint(topLeft, bottomRight, lastPoint);

        // Find the roots, which should be the extremities
        let xRoots = [0.0, 0.0];

        math.computeCubicFirstDerivativeRoots(data.endPoint1.x, data.controlPoint1.x, data.controlPoint2.x, data.endPoint2.x, xRoots);
        let xRootsCount = xRoots.length;
        for (let i = 0; i < xRootsCount; i++) {
            let t = xRoots[i];
            if (t < 0 || t > 1) {
                continue;
            }

            let location = bezierCurveDataPointAtParameter(data, t, null, null);
            geometry.expandBoundsByPoint(topLeft, bottomRight, location);
        }

        let yRoots = [0.0, 0.0];

        math.computeCubicFirstDerivativeRoots(data.endPoint1.y, data.controlPoint1.y, data.controlPoint2.y, data.endPoint2.y, yRoots);
        let yRootsCount = yRoots.length;
        for (let i = 0; i < yRootsCount; i++) {
            let t = yRoots[i];
            if (t < 0 || t > 1) {
                continue;
            }

            let location = bezierCurveDataPointAtParameter(data, t, null, null);
            geometry.expandBoundsByPoint(topLeft, bottomRight, location);
        }

        bounds = { x: topLeft.x, y: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };
    }

    // Cache the value
    data.bounds = bounds;

    return data.bounds;
}

export function bezierCurveDataRefineIntersectionsOverIterations(iterations: number, usRange: IRange, themRange: IRange, originalUs: IBezierCurveData, originalThem: IBezierCurveData, us: IBezierCurveData, them: IBezierCurveData, nonpointUs: IReference<IBezierCurveData>, nonpointThem: IReference<IBezierCurveData>) {
    for (let i = 0; i < iterations; i++) {
        let intersects = false;
        let r = bezierCurveDataBezierClipWithBezierCurve(us, them, originalUs, usRange);
        us = r.data;
        usRange = r.originalRange;
        intersects = r.intersects;

        if (!intersects) {
            r = bezierCurveDataBezierClipWithBezierCurve(nonpointUs.value, nonpointThem.value, originalUs, usRange);
            us = r.data;
            usRange = r.originalRange;
            intersects = r.intersects;
        }

        r = bezierCurveDataBezierClipWithBezierCurve(them, us, originalThem, themRange);
        them = r.data;
        intersects = r.intersects;
        themRange = r.originalRange;

        if (!intersects) {
            r = bezierCurveDataBezierClipWithBezierCurve(nonpointThem.value, nonpointUs.value, originalThem, themRange);
            them = r.data;
            intersects = r.intersects;
            themRange = r.originalRange;
        }

        if (!bezierCurveDataIsPoint(them)) {
            nonpointThem.value = them;
        }

        if (!bezierCurveDataIsPoint(us)) {
            nonpointUs.value = us;
        }
    }
}

export function bezierCurveDataClipLineOriginalCurve(me: IBezierCurveData, originalCurve: IBezierCurveData, curve: IBezierCurveData, originalRange: IRange, otherCurve: IBezierCurveData): IBezierCurveData2 {
    let themOnUs1 = math.parameterOfPointOnLine(curve.endPoint1, curve.endPoint2, otherCurve.endPoint1);
    let themOnUs2 = math.parameterOfPointOnLine(curve.endPoint1, curve.endPoint2, otherCurve.endPoint2);
    let clippedRange = geometry.rangeMake(Math.max(0, Math.min(themOnUs1, themOnUs2)), Math.min(1, Math.max(themOnUs1, themOnUs2)));
    let intersects;
    if (clippedRange.minimum > clippedRange.maximum) {
        intersects = false;

        return { data: curve, intersects: intersects, originalRange: originalRange }; // No intersection
    }

    // Right now the clipped range is relative to ourself, not the original curve. So map the newly clipped range onto the original range
    let newRange = geometry.rangeMake(geometry.rangeScaleNormalizedValue(originalRange, clippedRange.minimum), geometry.rangeScaleNormalizedValue(originalRange, clippedRange.maximum));
    originalRange = newRange;
    intersects = true;

    // Actually divide the curve, but be sure to use the original curve. This helps with errors building up.
    return { data: bezierCurveDataSubcurveWithRange(originalCurve, originalRange), intersects: intersects, originalRange: originalRange };
}

export function bezierCurveDataCheckLinesForOverlap(data: IBezierCurveData, usRange: IRange, themRange: IRange, originalUs: IBezierCurveData, originalThem: IBezierCurveData, us: IBezierCurveData, them: IBezierCurveData): IBezierCurveData3 {
    let intersects = false;
    // First see if its possible for them to overlap at all
    if (!geometry.lineBoundsMightOverlap(bezierCurveDataBounds(us), bezierCurveDataBounds(them)))
    { return { intersects: intersects, us: us, them: them }; }

    // Are all 4 points in a single line?
    let errorThreshold = 1e-7;
    let isColinear = geometry.areValuesCloseWithOptions(math.counterClockwiseTurn(us.endPoint1, us.endPoint2, them.endPoint1), 0.0, errorThreshold)
        && geometry.areValuesCloseWithOptions(math.counterClockwiseTurn(us.endPoint1, us.endPoint2, them.endPoint2), 0.0, errorThreshold);
    if (!isColinear)
    { return { intersects: intersects, us: us, them: them }; }

    let r = bezierCurveDataClipLineOriginalCurve(data, originalUs, us, usRange, them);
    us = r.data;
    if (!r.intersects) {
        return { intersects: intersects, us: us, them: them };
    }

    r = bezierCurveDataClipLineOriginalCurve(data, originalThem, them, themRange, us);
    them = r.data;

    return { intersects: intersects, us: us, them: them };
}

export function bezierCurveDataConvertSelfAndPoint(data: IBezierCurveData, point: ICoordinate, bezierPoints: ICoordinate[]): void {
    let selfPoints: ICoordinate[] = [data.endPoint1, data.controlPoint1, data.controlPoint2, data.endPoint2];

    // c[i] in the paper
    let distanceFromPoint: ICoordinate[] = [];
    for (let i = 0; i < 4; i++) {
        distanceFromPoint[i] = geometry.subtractPoint(selfPoints[i], point);
    }

    // d[i] in the paper
    let weightedDelta: ICoordinate[] = [];
    for (let i = 0; i < 3; i++) {
        weightedDelta[i] = geometry.scalePoint(geometry.subtractPoint(selfPoints[i + 1], selfPoints[i]), 3);
    }

    // Precompute the dot product of distanceFromPoint and weightedDelta in order to speed things up
    let precomputedTable = [[], [], []];
    for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 4; column++) {
            precomputedTable[row][column] = geometry.dotMultiplyPoint(weightedDelta[row], distanceFromPoint[column]);
        }
    }

    // Precompute some of the values to speed things up
    let Z = [
        [1.0, 0.6, 0.3, 0.1],
        [0.4, 0.6, 0.6, 0.4],
        [0.1, 0.3, 0.6, 1.0]
    ];

    // Set the x values of the bezier points
    for (let i = 0; i < 6; i++) {
        bezierPoints[i] = { x: i / 5.0, y: 0 };
    }

    // Finally set the y values of the bezier points
    let n = 3;
    let m = n - 1;
    for (let k = 0; k <= (n + m); k++) {
        let lowerBound = Math.max(0, k - m);
        let upperBound = Math.min(k, n);
        for (let i = lowerBound; i <= upperBound; i++) {
            let j = k - i;
            bezierPoints[i + j].y += precomputedTable[j][i] * Z[j][i];
        }
    }
}

export function bezierCurveDataClosestLocationToPoint(me: IBezierCurveData, point: ICoordinate): ILocation {
    let bezierPoints = [];
    bezierCurveDataConvertSelfAndPoint(me, point, bezierPoints);

    let distance = geometry.distanceBetweenPoints(me.endPoint1, point);
    let parameter = 0.0;

    math.findBezierRoots(bezierPoints, 5, root => {
        let location = bezierCurveDataPointAtParameter(me, root, null, null);
        let theDistance = geometry.distanceBetweenPoints(location, point);
        if (theDistance < distance) {
            distance = theDistance;
            parameter = root;
        }
    });

    let lastDistance = geometry.distanceBetweenPoints(me.endPoint2, point);
    if (lastDistance < distance) {
        distance = lastDistance;
        parameter = 1.0;
    }

    let location: ILocation = { parameter: undefined, distance: undefined };
    location.parameter = parameter;
    location.distance = distance;

    return location;
}

export function bezierCurveDataIsEqualWithOptions(data: IBezierCurveData, other: IBezierCurveData, threshold: number): boolean {
    if (bezierCurveDataIsPoint(data) || bezierCurveDataIsPoint(other)) {
        return false;
    }
    if (data.isStraightLine !== other.isStraightLine) {
        return false;
    }

    if (data.isStraightLine) {
        return geometry.arePointsCloseWithOptions(data.endPoint1, other.endPoint1, threshold) && geometry.arePointsCloseWithOptions(data.endPoint2, other.endPoint2, threshold);
    }

    return geometry.arePointsCloseWithOptions(data.endPoint1, other.endPoint1, threshold) && geometry.arePointsCloseWithOptions(data.controlPoint1, other.controlPoint1, threshold) && geometry.arePointsCloseWithOptions(data.controlPoint2, other.controlPoint2, threshold) && geometry.arePointsCloseWithOptions(data.endPoint2, other.endPoint2, threshold);
}

export function bezierCurveDataAreCurvesEqual(data: IBezierCurveData, other: IBezierCurveData): boolean {
    if (bezierCurveDataIsPoint(data) || bezierCurveDataIsPoint(other)) {
        return false;
    }

    if (data.isStraightLine !== other.isStraightLine) {
        return false;
    }

    let endPointThreshold = 1e-4;
    let controlPointThreshold = 1e-1;

    if (data.isStraightLine) {
        return geometry.arePointsCloseWithOptions(data.endPoint1, other.endPoint1, endPointThreshold) && geometry.arePointsCloseWithOptions(data.endPoint2, other.endPoint2, endPointThreshold);
    }

    return geometry.arePointsCloseWithOptions(data.endPoint1, other.endPoint1, endPointThreshold)
        && geometry.arePointsCloseWithOptions(data.controlPoint1, other.controlPoint1, controlPointThreshold)
        && geometry.arePointsCloseWithOptions(data.controlPoint2, other.controlPoint2, controlPointThreshold)
        && geometry.arePointsCloseWithOptions(data.endPoint2, other.endPoint2, endPointThreshold);
}

export function bezierCurveDataIsEqual(data: IBezierCurveData, other: IBezierCurveData): boolean {
    return bezierCurveDataIsEqualWithOptions(data, other, 1e-10);
}

export function bezierCurveDataReversed(data: IBezierCurveData): IBezierCurveData {
    return bezierCurveDataMake(data.endPoint2, data.controlPoint2, data.controlPoint1, data.endPoint1, data.isStraightLine);
}

export function bezierCurveDataCheckForOverlapRange(me: IBezierCurveData, intersectRange: IReference<IIntersectionRange>, usRange: IRange, themRange: IRange, originalUs: IBezierCurve, originalThem: IBezierCurve, us: IBezierCurveData, them: IBezierCurveData) {
    if (bezierCurveDataAreCurvesEqual(us, them)) {
        if (intersectRange) {
            intersectRange.value = new BezierIntersectRange(originalUs, usRange, originalThem, themRange, false);
        }

        return true;
    } else if (bezierCurveDataAreCurvesEqual(us, bezierCurveDataReversed(them))) {
        if (intersectRange) {
            intersectRange.value = new BezierIntersectRange(originalUs, usRange, originalThem, themRange, true);
        }

        return true;
    }

    return false;
}

export function bezierCurveDataFindPossibleOverlap(data: IBezierCurveData, originalUs: IBezierCurveData, them: IBezierCurveData, possibleRange: IRange): IBezierCurveData {
    let themOnUs1 = bezierCurveDataClosestLocationToPoint(originalUs, them.endPoint1);
    let themOnUs2 = bezierCurveDataClosestLocationToPoint(originalUs, them.endPoint2);
    let range = geometry.rangeMake(Math.min(themOnUs1.parameter, themOnUs2.parameter), Math.max(themOnUs1.parameter, themOnUs2.parameter));
    possibleRange.minimum = range.minimum;
    possibleRange.maximum = range.maximum;

    return bezierCurveDataSubcurveWithRange(originalUs, range);
}

export function bezierCurveDataCheckCurvesForOverlapRange(me: IBezierCurveData, intersectRange: IReference<IIntersectionRange>, usRange: IReference<IRange>, themRange: IReference<IRange>, originalUs: IBezierCurve, originalThem: IBezierCurve, us: IBezierCurveData, them: IBezierCurveData) {
    if (bezierCurveDataCheckForOverlapRange(me, intersectRange, usRange.value, themRange.value, originalUs, originalThem, us, them)) {
        return true;
    }

    let usSubcurveRange: IRange = { minimum: null, maximum: null };
    let usSubcurve = bezierCurveDataFindPossibleOverlap(me, originalUs.data, them, usSubcurveRange);

    let themSubcurveRange: IRange = { minimum: null, maximum: null };
    let themSubcurve = bezierCurveDataFindPossibleOverlap(me, originalThem.data, us, themSubcurveRange);

    let threshold = 1e-4;
    if (bezierCurveDataIsEqualWithOptions(usSubcurve, themSubcurve, threshold)
        || bezierCurveDataIsEqualWithOptions(usSubcurve, bezierCurveDataReversed(themSubcurve), threshold)) {
        usRange.value = usSubcurveRange;
        themRange.value = themSubcurveRange;

        return bezierCurveDataCheckForOverlapRange(me, intersectRange, usRange.value, themRange.value, originalUs, originalThem, usSubcurve, themSubcurve);
    }

    return false;
}

export function bezierCurveDataCheckNoIntersectionsForOverlapRange(me: IBezierCurveData, intersectRange: IReference<IIntersectionRange>, usRange: IRange, themRange: IRange, originalUs: IBezierCurve, originalThem: IBezierCurve, us: IBezierCurveData, them: IBezierCurveData): void {
    let r: IBezierCurveData3 = { us: null, them: null, intersects: false };

    if (us.isStraightLine && them.isStraightLine) {
        r = bezierCurveDataCheckLinesForOverlap(me, usRange, themRange, originalUs.data, originalThem.data, us, them);
    }
    bezierCurveDataCheckForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, r.us || us, r.them || them);
}


export function bezierCurveDataCheckForStraightLineOverlap(me: IBezierCurveData, intersectRange: IReference<IIntersectionRange>, usRange: IRange, themRange: IRange, originalUs: IBezierCurve, originalThem: IBezierCurve, us: IBezierCurveData, them: IBezierCurveData, nonpointUs, nonpointThem) {
    let res: IBezierCurveData3 = { intersects: false, us: null, them: null };

    if (us.isStraightLine && them.isStraightLine) {
        res = bezierCurveDataCheckLinesForOverlap(me, usRange, themRange, originalUs.data, originalThem.data, us, them);
    }

    if (res.intersects) {
        res.intersects = bezierCurveDataCheckForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, res.us || us, res.them || them);
    }

    return res.intersects;
}

export function bezierCurveDataRefineParameter(me: IBezierCurveData, parameter: number, point: ICoordinate): number {
    // Use Newton's Method to refine our parameter. In general, that formula is:
    //
    //  parameter = parameter - f(parameter) / f'(parameter)
    //
    // In our case:
    //
    //  f(parameter) = (Q(parameter) - point) * Q'(parameter) = 0
    //
    // Where Q'(parameter) is tangent to the curve at Q(parameter) and orthogonal to [Q(parameter) - P]
    //
    // Taking the derivative gives us:
    //
    //  f'(parameter) = (Q(parameter) - point) * Q''(parameter) + Q'(parameter) * Q'(parameter)
    //

    let bezierPoints = [clone(me.endPoint1), clone(me.controlPoint1), clone(me.controlPoint2), clone(me.endPoint2)];

    // Compute Q(parameter)
    let qAtParameter = math.bezierWithPoints(3, bezierPoints, parameter, null, null);

    // Compute Q'(parameter)
    let qPrimePoints = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    for (let i = 0; i < 3; i++) {
        qPrimePoints[i].x = (bezierPoints[i + 1].x - bezierPoints[i].x) * 3.0;
        qPrimePoints[i].y = (bezierPoints[i + 1].y - bezierPoints[i].y) * 3.0;
    }
    let qPrimeAtParameter = math.bezierWithPoints(2, qPrimePoints, parameter, null, null);

    // Compute Q''(parameter)
    let qPrimePrimePoints = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    for (let i = 0; i < 2; i++) {
        qPrimePrimePoints[i].x = (qPrimePoints[i + 1].x - qPrimePoints[i].x) * 2.0;
        qPrimePrimePoints[i].y = (qPrimePoints[i + 1].y - qPrimePoints[i].y) * 2.0;
    }
    let qPrimePrimeAtParameter = math.bezierWithPoints(1, qPrimePrimePoints, parameter, null, null);

    // Compute f(parameter) and f'(parameter)
    let qMinusPoint = geometry.subtractPoint(qAtParameter, point);
    let fAtParameter = geometry.dotMultiplyPoint(qMinusPoint, qPrimeAtParameter);
    let fPrimeAtParameter = geometry.dotMultiplyPoint(qMinusPoint, qPrimePrimeAtParameter) + geometry.dotMultiplyPoint(qPrimeAtParameter, qPrimeAtParameter);

    // Newton's method!
    return parameter - (fAtParameter / fPrimeAtParameter);
}

export function bezierCurveDataMergeIntersectRange(intersectRange: IIntersectionRange, otherIntersectRange: IIntersectionRange): IIntersectionRange {
    if (otherIntersectRange === null) {
        return intersectRange;
    }

    if (intersectRange === null) {
        return otherIntersectRange;
    }

    intersectRange.merge(otherIntersectRange);

    return intersectRange;
}

export function bezierCurveDataIntersectionsWithStraightLines(me: IBezierCurveData, curve: IBezierCurveData, usRange: IRange, themRange: IRange, originalUs: IBezierCurve, originalThem: IBezierCurve, outputBlock: (i: IIntersection, stop: IReference<boolean>) => boolean, stop: IReference<boolean>): boolean {
    if (!me.isStraightLine || !curve.isStraightLine) {
        return false;
    }

    let intersectionPoint = math.linesIntersect(me.endPoint1, me.endPoint2, curve.endPoint1, curve.endPoint2);
    if (!intersectionPoint) {
        return false;
    }
    let meParameter = math.parameterOfPointOnLine(me.endPoint1, me.endPoint2, intersectionPoint);
    if (geometry.isValueLessThan(meParameter, 0.0) || geometry.isValueGreaterThan(meParameter, 1.0)) {
        return false;
    }

    let curveParameter = math.parameterOfPointOnLine(curve.endPoint1, curve.endPoint2, intersectionPoint);
    if (geometry.isValueLessThan(curveParameter, 0.0) || geometry.isValueGreaterThan(curveParameter, 1.0)) {
        return false;
    }

    if (true === outputBlock(new BezierIntersection(originalUs, meParameter, originalThem, curveParameter), stop)) {
        return;
    }

    return true;
}

export function bezierCurveDataIntersectionsWithBezierCurve(me: IBezierCurveData, curve: IBezierCurveData, usRange: IReference<IRange>, themRange: IReference<IRange>, originalUs: IBezierCurve, originalThem: IBezierCurve, intersectRange: IReference<IIntersectionRange>, depth: number, outputBlock, stop: IReference<boolean>) {
    // This is the main work loop. At a high level this method sits in a loop and removes sections (ranges) of the two bezier curves that it knows
    //  don't intersect (how it knows that is covered in the appropriate method). The idea is to whittle the curves down to the point where they
    //  do intersect. When the range where they intersect converges (i.e. matches to 6 decimal places) or there are more than 500 attempts, the loop
    //  stops. A special case is when we're not able to remove at least 20% of the curves on a given interation. In that case we assume there are likely
    //  multiple intersections, so we divide one of curves in half, and recurse on the two halves.

    let places = 6; // How many decimals place to calculate the solution out to
    let maxIterations = 500; // how many iterations to allow before we just give up
    let maxDepth = 10; // how many recursive calls to allow before we just give up
    let minimumChangeNeeded = 0.20; // how much to clip off for a given iteration minimum before we subdivide the curve

    let us = me; // us is self, but clipped down to where the intersection is
    let them = curve; // them is the other curve we're intersecting with, but clipped down to where the intersection is
    let nonpointUs = makeRef(us);
    let nonpointThem = makeRef(them);

    // Horizontal and vertical lines are somewhat special cases, and the math doesn't always work out that great. For example, two vertical lines
    //  that overlap will kick out as intersecting at the endpoints. Try to detect that kind of overlap at the start.
    if (bezierCurveDataCheckForStraightLineOverlap(me, intersectRange, usRange.value, themRange.value, originalUs, originalThem, us, them, nonpointUs, nonpointThem)) {
        return;
    }
    if (us.isStraightLine && them.isStraightLine) {
        bezierCurveDataIntersectionsWithStraightLines(me, curve, usRange.value, themRange.value, originalUs, originalThem, outputBlock, stop);

        return;
    }

    let originalUsData = originalUs.data;
    let originalThemData = originalThem.data;

    // Don't check for convergence until we actually see if we intersect or not. i.e. Make sure we go through at least once, otherwise the results
    //  don't mean anything. Be sure to stop as soon as either range converges, otherwise calculations for the other range goes funky because one
    //  curve is essentially a point.
    let iterations = 0;
    let hadConverged = true;
    while (iterations < maxIterations && ((iterations === 0) || (!geometry.rangeHasConverged(usRange.value, places) || !geometry.rangeHasConverged(themRange.value, places)))) {
        // Remember what the current range is so we can calculate how much it changed later
        let previousUsRange = makeRef(usRange.value);
        let previousThemRange = makeRef(themRange.value);

        // Remove the range from ourselves that doesn't intersect with them. If the other curve is already a point, use the previous iteration's
        //  copy of them so calculations still work.
        let intersects = false;
        if (!bezierCurveDataIsPoint(them)) {
            nonpointThem.value = them;
        }
        let r = bezierCurveDataBezierClipWithBezierCurve(nonpointUs.value, nonpointThem.value, originalUsData, usRange.value);
        us = r.data;
        usRange.value = r.originalRange;
        if (!r.intersects) {
            bezierCurveDataCheckNoIntersectionsForOverlapRange(me, intersectRange, usRange.value, themRange.value, originalUs, originalThem, us, them);

            return; // If they don't intersect at all stop now
        }
        if (iterations > 0 && (bezierCurveDataIsPoint(us) || bezierCurveDataIsPoint(them))) {
            break;
        }
        // Remove the range of them that doesn't intersect with us
        if (!bezierCurveDataIsPoint(us)) {
            nonpointUs.value = us;
        }
        else if (iterations === 0) {
            // If the first time through us was reduced to a point, then we're never going to know if the curves actually intersect,
            //  even if both ranges converge. The ranges can converge on the parameters on each respective curve that is closest to the
            //  other. But without being clipped to a smaller range the algorithm won't necessarily detect that they don't actually intersect
            hadConverged = false;
        }
        r = bezierCurveDataBezierClipWithBezierCurve(nonpointThem.value, nonpointUs.value, originalThemData, themRange.value);
        them = r.data;
        themRange.value = r.originalRange;
        if (!r.intersects) {
            bezierCurveDataCheckNoIntersectionsForOverlapRange(me, intersectRange, usRange.value, themRange.value, originalUs, originalThem, us, them);

            return; // If they don't intersect at all stop now
        }

        if (iterations > 0 && (bezierCurveDataIsPoint(us) || bezierCurveDataIsPoint(them))) {
            break;
        }

        // See if either of curves ranges is reduced by less than 20%.
        let percentChangeInUs = (geometry.rangeGetSize(previousUsRange.value) - geometry.rangeGetSize(usRange.value)) / geometry.rangeGetSize(previousUsRange.value);
        let percentChangeInThem = (geometry.rangeGetSize(previousThemRange.value) - geometry.rangeGetSize(themRange.value)) / geometry.rangeGetSize(previousThemRange.value);
        let didNotSplit = false;
        if (percentChangeInUs < minimumChangeNeeded && percentChangeInThem < minimumChangeNeeded) {
            // We're not converging fast enough, likely because there are multiple intersections here.
            //  Or the curves are the same, check for that first
            if (bezierCurveDataCheckCurvesForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, us, them)) {
                return;
            }
            // Divide and conquer. Divide the longer curve in half, and recurse
            if (geometry.rangeGetSize(usRange.value) > geometry.rangeGetSize(themRange.value)) {
                // Since our remaining range is longer, split the remains of us in half at the midway point
                let usRange1 = makeRef(geometry.rangeMake(usRange.value.minimum, (usRange.value.minimum + usRange.value.maximum) / 2.0));
                let us1 = bezierCurveDataSubcurveWithRange(originalUsData, usRange1.value);
                let themRangeCopy1 = clone(themRange); // make a local copy because it'll get modified when we recurse

                let usRange2 = makeRef(geometry.rangeMake((usRange.value.minimum + usRange.value.maximum) / 2.0, usRange.value.maximum));
                let us2 = bezierCurveDataSubcurveWithRange(originalUsData, usRange2.value);
                let themRangeCopy2 = clone(themRange); // make a local copy because it'll get modified when we recurse

                let range1ConvergedAlready = geometry.rangeHasConverged(usRange1.value, places) && geometry.rangeHasConverged(themRange.value, places);
                let range2ConvergedAlready = geometry.rangeHasConverged(usRange2.value, places) && geometry.rangeHasConverged(themRange.value, places);

                if (!range1ConvergedAlready && !range2ConvergedAlready && depth < maxDepth) {
                    // Compute the intersections between the two halves of us and them
                    let leftIntersectRangeRef: IReference<IIntersectionRange> = { value: null };
                    bezierCurveDataIntersectionsWithBezierCurve(us1, them, usRange1, themRangeCopy1, originalUs, originalThem, leftIntersectRangeRef, depth + 1, outputBlock, stop);
                    let leftIntersectRange = leftIntersectRangeRef.value;
                    if (intersectRange && intersectRange.value) {
                        intersectRange.value = bezierCurveDataMergeIntersectRange(intersectRange.value, leftIntersectRange);
                    }

                    if (stop.value) {
                        return;
                    }

                    let rightIntersectRangeRef: IReference<IIntersectionRange> = { value: null };
                    bezierCurveDataIntersectionsWithBezierCurve(us2, them, usRange2, themRangeCopy2, originalUs, originalThem, rightIntersectRangeRef, depth + 1, outputBlock, stop);
                    let rightIntersectRange = rightIntersectRangeRef.value;
                    if (intersectRange && intersectRange.value) {
                        intersectRange.value = bezierCurveDataMergeIntersectRange(intersectRange.value, rightIntersectRange);
                    }

                    return;
                } else {
                    didNotSplit = true;
                }
            } else {
                // Since their remaining range is longer, split the remains of them in half at the midway point
                let themRange1 = makeRef(geometry.rangeMake(themRange.value.minimum, (themRange.value.minimum + themRange.value.maximum) / 2.0));
                let them1 = bezierCurveDataSubcurveWithRange(originalThemData, themRange1.value);
                let usRangeCopy1 = makeRef(clone(usRange.value));  // make a local copy because it'll get modified when we recurse

                let themRange2 = makeRef(geometry.rangeMake((themRange.value.minimum + themRange.value.maximum) / 2.0, themRange.value.maximum));
                let them2 = bezierCurveDataSubcurveWithRange(originalThemData, themRange2.value);
                let usRangeCopy2 = makeRef(clone(usRange.value));  // make a local copy because it'll get modified when we recurse

                let range1ConvergedAlready = geometry.rangeHasConverged(themRange1.value, places) && geometry.rangeHasConverged(usRange.value, places);
                let range2ConvergedAlready = geometry.rangeHasConverged(themRange2.value, places) && geometry.rangeHasConverged(usRange.value, places);

                if (!range1ConvergedAlready && !range2ConvergedAlready && depth < maxDepth) {
                    // Compute the intersections between the two halves of them and us
                    let leftIntersectRangeRef: IReference<IIntersectionRange> = makeRef<IIntersectionRange>();
                    bezierCurveDataIntersectionsWithBezierCurve(us, them1, usRangeCopy1, themRange1, originalUs, originalThem, leftIntersectRangeRef, depth + 1, outputBlock, stop);
                    let leftIntersectRange = leftIntersectRangeRef.value;
                    if (intersectRange && intersectRange.value) {
                        intersectRange.value = bezierCurveDataMergeIntersectRange(intersectRange.value, leftIntersectRange);
                    }

                    if (stop.value) {
                        return;
                    }

                    let rightIntersectRangeRef: IReference<IIntersectionRange> = makeRef<IIntersectionRange>();
                    bezierCurveDataIntersectionsWithBezierCurve(us, them2, usRangeCopy2, themRange2, originalUs, originalThem, rightIntersectRangeRef, depth + 1, outputBlock, stop);
                    let rightIntersectRange = rightIntersectRangeRef.value;
                    if (intersectRange && intersectRange.value) {
                        intersectRange.value = bezierCurveDataMergeIntersectRange(intersectRange.value, rightIntersectRange);
                    }

                    return;
                } else {
                    didNotSplit = true;
                }
            }

            if (didNotSplit && (geometry.rangeGetSize(previousUsRange.value) - geometry.rangeGetSize(usRange.value) === 0) && (geometry.rangeGetSize(previousThemRange.value) - geometry.rangeGetSize(themRange.value) === 0)) {
                // We're not converging at _all_ and we can't split, so we need to bail out.
                return; // no intersections
            }
        }

        iterations++;
    }


    // It's possible that one of the curves has converged, but the other hasn't. Since the math becomes wonky once a curve becomes a point,
    //  the loop stops as soon as either curve converges. However for our purposes we need _both_ curves to converge; that is we need
    //  the parameter for each curve where they intersect. Fortunately, since one curve did converge we know the 2D point where they converge,
    //  plus we have a reasonable approximation for the parameter for the curve that didn't. That means we can use Newton's method to refine
    //  the parameter of the curve that did't converge.
    if (!geometry.rangeHasConverged(usRange.value, places) || !geometry.rangeHasConverged(themRange.value, places)) {
        // Maybe there's an overlap in here?

        let res = bezierCurveDataCheckCurvesForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, originalUsData, originalThemData);
        if (res) {
            return;
        }

        // We bail out of the main loop as soon as we know things intersect, but before the math falls apart. Unfortunately sometimes this
        //  means we don't always get the best estimate of the parameters. Below we fall back to Netwon's method, but it's accuracy is
        //  dependant on our previous calculations. So here assume things intersect and just try to tighten up the parameters. If the
        //  math falls apart because everything's a point, that's OK since we already have a "reasonable" estimation of the parameters.
        bezierCurveDataRefineIntersectionsOverIterations(3, usRange.value, themRange.value, originalUsData, originalThemData, us, them, nonpointUs, nonpointThem);
        // Sometimes we need a little more precision. Be careful though, in that in some cases trying for more makes the math fall apart
        if (!geometry.rangeHasConverged(usRange.value, places) || !geometry.rangeHasConverged(themRange.value, places)) {
            bezierCurveDataRefineIntersectionsOverIterations(4, usRange.value, themRange.value, originalUsData, originalThemData, us, them, nonpointUs, nonpointThem);
        }
    }
    if (geometry.rangeHasConverged(usRange.value, places) && !geometry.rangeHasConverged(themRange.value, places)) {
        // Refine the them range since it didn't converge
        let intersectionPoint = bezierCurveDataPointAtParameter(originalUsData, geometry.rangeAverage(usRange.value), null, null);
        let refinedParameter = geometry.rangeAverage(themRange.value); // Although the range didn't converge, it should be a reasonable approximation which is all Newton needs
        for (let i = 0; i < 3; i++) {
            refinedParameter = bezierCurveDataRefineParameter(originalThemData, refinedParameter, intersectionPoint);
            refinedParameter = Math.min(themRange.value.maximum, Math.max(themRange.value.minimum, refinedParameter));
        }
        themRange.value.minimum = refinedParameter;
        themRange.value.maximum = refinedParameter;
        hadConverged = false;
    } else if (!geometry.rangeHasConverged(usRange.value, places) && geometry.rangeHasConverged(themRange.value, places)) {
        // Refine the us range since it didn't converge
        let intersectionPoint = bezierCurveDataPointAtParameter(originalThemData, geometry.rangeAverage(themRange.value), null, null);
        let refinedParameter = geometry.rangeAverage(usRange.value); // Although the range didn't converge, it should be a reasonable approximation which is all Newton needs
        for (let i = 0; i < 3; i++) {
            refinedParameter = bezierCurveDataRefineParameter(originalUsData, refinedParameter, intersectionPoint);
            refinedParameter = Math.min(usRange.value.maximum, Math.max(usRange.value.minimum, refinedParameter));
        }
        usRange.value.minimum = refinedParameter;
        usRange.value.maximum = refinedParameter;
        hadConverged = false;
    }

    // If it never converged and we stopped because of our loop max, assume overlap or something else. Bail.
    if ((!geometry.rangeHasConverged(usRange.value, places) || !geometry.rangeHasConverged(themRange.value, places)) && iterations >= maxIterations) {
        bezierCurveDataCheckForOverlapRange(me, intersectRange, usRange.value, themRange.value, originalUs, originalThem, us, them);

        return;
    }

    if (!hadConverged) {
        // Since one of them didn't converge, we need to make sure they actually intersect. Compute the point from both and compare
        let intersectionPoint = bezierCurveDataPointAtParameter(originalUsData, geometry.rangeAverage(usRange.value), null, null);
        let checkPoint = bezierCurveDataPointAtParameter(originalThemData, geometry.rangeAverage(themRange.value), null, null);
        if (!geometry.arePointsCloseWithOptions(intersectionPoint, checkPoint, 1e-3)) {
            return;
        }
    }
    // Return the final intersection, which we represent by the original curves and the parameters where they intersect. The parameter values are useful
    //  later in the boolean operations, plus it allows us to do lazy calculations.
    outputBlock(new BezierIntersection(originalUs, geometry.rangeAverage(usRange.value), originalThem, geometry.rangeAverage(themRange.value)), stop);
}


function bezierCurveDataSet(data: IBezierCurveData, endPoint1: ICoordinate, controlPoint1: ICoordinate, controlPoint2: ICoordinate, endPoint2: ICoordinate, isStraightLine: boolean): void {
    data.endPoint1 = endPoint1;
    data.controlPoint1 = controlPoint1;
    data.controlPoint2 = controlPoint2;
    data.endPoint2 = endPoint2;
    data.isStraightLine = isStraightLine;
    data.length = BezierCurveDataInvalidLength;
    data.isPoint = BezierCurveDataInvalidIsPoint;
}

export function bezierCurveDataMake(endPoint1: ICoordinate, controlPoint1: ICoordinate, controlPoint2: ICoordinate, endPoint2: ICoordinate, isStraightLine: boolean): IBezierCurveData {
    return {
        endPoint1,
        controlPoint1,
        controlPoint2,
        endPoint2,
        isStraightLine,
        length: BezierCurveDataInvalidLength,
        isPoint: BezierCurveDataInvalidIsPoint
    };
}



