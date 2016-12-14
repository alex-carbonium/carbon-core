import * as math from "./math";
import * as geometry from "./geometry";
import BezierIntersectRange from "./bezierIntersectRange";
import BezierIntersection from "./BezierIntersection";

const  BezierCurveDataInvalidLength = -1.0;
const BezierCurveDataInvalidIsPoint = -1;


export function bezierCurveDataGetLengthAtParameter(me, parameter)
{
    // Use the cached value if at all possible
    if ( parameter == 1.0 && me.length != BezierCurveDataInvalidLength )
        return me.length;

    // If it's a line, use that equation instead
    var length = BezierCurveDataInvalidLength;
    if ( me.isStraightLine )
        length = geometry.distanceBetweenPoints(me.endPoint1, me.endPoint2) * parameter;
    else
        length = math.gaussQuadratureComputeCurveLengthForCubic(parameter, 12, me.endPoint1, me.controlPoint1, me.controlPoint2, me.endPoint2);

    // If possible, update our cache
    if ( parameter == 1.0 )
        me.length = length;

    return length;
}

export function bezierCurveDataGetLength(me)
{
    return bezierCurveDataGetLengthAtParameter(me, 1.0);
}
function clone(point){
    return {x:point.x, y:point.y};
}

export function bezierCurveDataPointAtParameter( me,  parameter, leftBezierCurve, rightBezierCurve)
{
    // This method is a simple wrapper around the BezierWithPoints() helper function. It computes the 2D point at the given parameter,
    //  and (optionally) the resulting curves that splitting at the parameter would create.

    var points = [ clone(me.endPoint1), clone(me.controlPoint1), clone(me.controlPoint2), clone(me.endPoint2) ];
    var leftCurve = [];
    var rightCurve = [];

    var point = math.bezierWithPoints(3, points, parameter, leftCurve, rightCurve);

    if ( leftBezierCurve ) {
        bezierCurveDataSet(leftBezierCurve, leftCurve[0], leftCurve[1], leftCurve[2], leftCurve[3], me.isStraightLine);
	}
    if ( rightBezierCurve ) {
        bezierCurveDataSet(rightBezierCurve, rightCurve[0], rightCurve[1], rightCurve[2], rightCurve[3], me.isStraightLine);
	}
    return point;
}

export function bezierCurveDataSubcurveWithRange( me,  range)
{
    // Return a bezier curve representing the parameter range specified. We do this by splitting
    //  twice: once on the minimum, the splitting the result of that on the maximum.
    var upperCurve = {};
    bezierCurveDataPointAtParameter(me, range.minimum, null, upperCurve);
    if ( range.minimum == 1.0 )
        return upperCurve; // avoid the divide by zero below
    // We need to adjust the maximum parameter to fit on the new curve before we split again
    var adjustedMaximum = (range.maximum - range.minimum) / (1.0 - range.minimum);

    var lowerCurve = {};
    bezierCurveDataPointAtParameter(upperCurve, adjustedMaximum, lowerCurve, null);
    return lowerCurve;
}

export function bezierCurveDataRegularFatLineBounds( me, range)
{
    // Create the fat line based on the end points
    var line = math.normalizedLineMake(me.endPoint1, me.endPoint2);

    // Compute the bounds of the fat line. The fat line bounds should entirely encompass the
    //  bezier curve. Since we know the convex hull entirely compasses the curve, just take
    //  all four points that define this cubic bezier curve. Compute the signed distances of
    //  each of the end and control points from the fat line, and that will give us the bounds.

    // In this case, we know that the end points are on the line, thus their distances will be 0.
    //  So we can skip computing those and just use 0.
    var controlPoint1Distance = math.normalizedLineDistanceFromPoint(line, me.controlPoint1);
    var controlPoint2Distance = math.normalizedLineDistanceFromPoint(line, me.controlPoint2);
    var min = Math.min(controlPoint1Distance, Math.min(controlPoint2Distance, 0.0));
    var max = Math.max(controlPoint1Distance, Math.max(controlPoint2Distance, 0.0));

    range.minimum = min;
    range.maximum =  max;

    return line;
}

export function bezierCurveDataPerpendicularFatLineBounds(me, range)
{
    // Create a fat line that's perpendicular to the line created by the two end points.
    var normal = geometry.lineNormal(me.endPoint1, me.endPoint2);
    var startPoint =  geometry.lineMidpoint(me.endPoint1, me.endPoint2);
    var endPoint =  geometry.addPoint(startPoint, normal);
    var line = math.normalizedLineMake(startPoint, endPoint);

    // Compute the bounds of the fat line. The fat line bounds should entirely encompass the
    //  bezier curve. Since we know the convex hull entirely compasses the curve, just take
    //  all four points that define this cubic bezier curve. Compute the signed distances of
    //  each of the end and control points from the fat line, and that will give us the bounds.
    var controlPoint1Distance = math.normalizedLineDistanceFromPoint(line, me.controlPoint1);
    var controlPoint2Distance = math.normalizedLineDistanceFromPoint(line, me.controlPoint2);
    var point1Distance = math.normalizedLineDistanceFromPoint(line, me.endPoint1);
    var point2Distance = math.normalizedLineDistanceFromPoint(line, me.endPoint2);

    var min = Math.min(controlPoint1Distance, Math.min(controlPoint2Distance, Math.min(point1Distance, point2Distance)));
    var max = Math.max(controlPoint1Distance, Math.max(controlPoint2Distance, Math.max(point1Distance, point2Distance)));

    range.minimum = min;
    range.maximum =  max;
    
    return line;
}

export function bezierCurveDataClipWithFatLine(me, fatLine, bounds)
{
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
    var distanceBezierPoints = [
        {x:0, y:math.normalizedLineDistanceFromPoint(fatLine, me.endPoint1)},
        {x:1.0/3.0, y:math.normalizedLineDistanceFromPoint(fatLine, me.controlPoint1)},
        {x:2.0/3.0, y:math.normalizedLineDistanceFromPoint(fatLine, me.controlPoint2)},
        {x:1.0, y:math.normalizedLineDistanceFromPoint(fatLine, me.endPoint2)}
    ];

    
    var convexHull = [];
    math.convexHullBuildFromPoints(distanceBezierPoints, convexHull);
    var convexHullLength = convexHull.length;
    // Find intersections of convex hull with the fat line bounds
    var range = geometry.rangeMake(1.0, 0.0);
    for (var i = 0; i < convexHullLength; i++) {
        // Pull out the current line on the convex hull
        var indexOfNext = i < (convexHullLength - 1) ? i + 1 : 0;
        var startPoint = convexHull[i];
        var endPoint = convexHull[indexOfNext];
        var intersectionPoint = null;

        // See if the segment of the convex hull intersects with the minimum fat line bounds
        if ( intersectionPoint = math.lineIntersectsHorizontalLine(startPoint, endPoint, bounds.minimum) ) {
            if ( intersectionPoint.x < range.minimum )
                range.minimum = intersectionPoint.x;
            if ( intersectionPoint.x > range.maximum )
                range.maximum = intersectionPoint.x;
        }

        // See if this segment of the convex hull intersects with the maximum fat line bounds
        if ( intersectionPoint = math.lineIntersectsHorizontalLine(startPoint, endPoint, bounds.maximum) ) {
            if ( intersectionPoint.x < range.minimum )
                range.minimum = intersectionPoint.x;
            if ( intersectionPoint.x > range.maximum )
                range.maximum = intersectionPoint.x;
        }

        // We want to be able to refine t even if the convex hull lies completely inside the bounds. This
        //  also allows us to be able to use range of [1..0] as a sentinel value meaning the convex hull
        //  lies entirely outside of bounds, and the curves don't intersect.
        if ( startPoint.y < bounds.maximum && startPoint.y > bounds.minimum ) {
            if ( startPoint.x < range.minimum )
                range.minimum = startPoint.x;
            if ( startPoint.x > range.maximum )
                range.maximum = startPoint.x;
        }
    }

    // Check for bad values
    if ( range.minimum == Number.MAX_VALUE || isNaN(range.minimum) || range.maximum == Number.MAX_VALUE || isNaN(range.maximum) )
        range = geometry.rangeMake(0, 1); // equivalent to: something went wrong, so I don't know

    return range;
}

export function bezierCurveDataBezierClipWithBezierCurve(me, curve, originalCurve, originalRange)
{
    // This method does the clipping of self. It removes the parts of self that we can determine don't intersect
    //  with curve. It'll return the clipped version of self, update originalvar which corresponds to the range
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
    var fatLineBounds = {};
    var intersects;
    var fatLine = bezierCurveDataRegularFatLineBounds(curve, fatLineBounds);
    var regularClippedRange = bezierCurveDataClipWithFatLine(me, fatLine, fatLineBounds);
    // A range of [1, 0] is a special sentinel value meaning "they don't intersect". If they don't, bail early to save time
    if ( regularClippedRange.minimum == 1.0 && regularClippedRange.maximum == 0.0 ) {
        intersects = false;
        return {data:me, intersects:intersects, originalRange:originalRange};
    }

    // Just in case the regular fat line isn't good enough, try the perpendicular one
    var perpendicularLineBounds = {};
    var perpendicularLine = bezierCurveDataPerpendicularFatLineBounds(curve, perpendicularLineBounds);
    var perpendicularClippedRange = bezierCurveDataClipWithFatLine(me, perpendicularLine, perpendicularLineBounds);
    if ( perpendicularClippedRange.minimum == 1.0 && perpendicularClippedRange.maximum == 0.0 ) {
        intersects = false;
        return {data:me, intersects:intersects, originalRange:originalRange};
    }

    // Combine to form Voltron. Take the intersection of the regular fat line range and the perpendicular one.
    var clippedRange = geometry.rangeMake(Math.max(regularClippedRange.minimum, perpendicularClippedRange.minimum), Math.min(regularClippedRange.maximum, perpendicularClippedRange.maximum));

    // Right now the clipped range is relative to ourself, not the original curve. So map the newly clipped range onto the original range
    originalRange = geometry.rangeMake(geometry.rangeScaleNormalizedValue(originalRange, clippedRange.minimum), geometry.rangeScaleNormalizedValue(originalRange, clippedRange.maximum));
    intersects = true;

    // Actually divide the curve, but be sure to use the original curve. This helps with errors building up.
    return {data:bezierCurveDataSubcurveWithRange(originalCurve, originalRange),intersects:intersects, originalRange:originalRange};
}

export function bezierCurveDataIsPoint(me)
{
    // If the two end points are close together, then we're a point. Ignore the control
    //  points.
    var ClosenessThreshold = 1e-5;

    if ( me.isPoint != BezierCurveDataInvalidIsPoint )
        return me.isPoint;

    me.isPoint = geometry.arePointsCloseWithOptions(me.endPoint1, me.endPoint2, ClosenessThreshold)
        && geometry.arePointsCloseWithOptions(me.endPoint1, me.controlPoint1, ClosenessThreshold)
        && geometry.arePointsCloseWithOptions(me.endPoint1, me.controlPoint2, ClosenessThreshold);

    return me.isPoint;
}

export function bezierCurveDataBoundingRect(me)
{
    // Use the cache if we have one
    if ( me.boundingRect )
        return me.boundingRect;

    var left = Math.min(me.endPoint1.x, Math.min(me.controlPoint1.x, Math.min(me.controlPoint2.x, me.endPoint2.x)));
    var top = Math.min(me.endPoint1.y, Math.min(me.controlPoint1.y, Math.min(me.controlPoint2.y, me.endPoint2.y)));
    var right = Math.max(me.endPoint1.x, Math.max(me.controlPoint1.x, Math.max(me.controlPoint2.x, me.endPoint2.x)));
    var bottom = Math.max(me.endPoint1.y, Math.max(me.controlPoint1.y, Math.max(me.controlPoint2.y, me.endPoint2.y)));

    me.boundingRect = {x:left, y:top, width:right - left, height:bottom - top};

    return me.boundingRect;
}

export function bezierCurveDataBounds(me)
{
    // Use the cache if we have one
    if ( me.bounds )
        return me.bounds;

    var bounds = null;

    if ( me.isStraightLine ) {
        var topLeft = {x:me.endPoint1.x, y:me.endPoint1.y};
        var bottomRight = {x:topLeft.x, y:topLeft.y};
        geometry.expandBoundsByPoint(topLeft, bottomRight, me.endPoint2);

        bounds = {x:topLeft.x, y:topLeft.y, width:bottomRight.x - topLeft.x, height:bottomRight.y - topLeft.y};
    } else {
        // Start with the end points
        var topLeft = clone(bezierCurveDataPointAtParameter(me, 0, null, null));
        var bottomRight = clone(topLeft);
        var lastPoint = bezierCurveDataPointAtParameter(me, 1, null, null);
        geometry.expandBoundsByPoint(topLeft, bottomRight, lastPoint);

        // Find the roots, which should be the extremities
        var xRoots = [0.0, 0.0];

        math.computeCubicFirstDerivativeRoots(me.endPoint1.x, me.controlPoint1.x, me.controlPoint2.x, me.endPoint2.x, xRoots);
        var xRootsCount = xRoots.length;
        for (var i = 0; i < xRootsCount; i++) {
            var t = xRoots[i];
            if ( t < 0 || t > 1 )
                continue;

            var location = bezierCurveDataPointAtParameter(me, t, null, null);
            geometry.expandBoundsByPoint(topLeft, bottomRight, location);
        }

        var yRoots = [0.0, 0.0];

        math.computeCubicFirstDerivativeRoots(me.endPoint1.y, me.controlPoint1.y, me.controlPoint2.y, me.endPoint2.y, yRoots);
        var yRootsCount = yRoots.length;
        for (var i = 0; i < yRootsCount; i++) {
            var t = yRoots[i];
            if ( t < 0 || t > 1 )
                continue;

            var location = bezierCurveDataPointAtParameter(me, t, null, null);
            geometry.expandBoundsByPoint(topLeft, bottomRight, location);
        }

        bounds = {x:topLeft.x, y:topLeft.y, width: bottomRight.x - topLeft.x, height:bottomRight.y - topLeft.y};
    }

    // Cache the value
    me.bounds = bounds;

    return me.bounds;
}

export function bezierCurveDataRefineIntersectionsOverIterations(iterations, usRange, themRange, originalUs, originalThem, us,  them,  nonpointUs, nonpointThem)
{
    for (var i = 0; i < iterations; i++) {
        var intersects = false;
        var r = bezierCurveDataBezierClipWithBezierCurve(us, them, originalUs, usRange);
        us = r.data;
        usRange = r.originalRange;
        intersects = r.intersects;

        if ( !intersects ) {
            r = bezierCurveDataBezierClipWithBezierCurve(nonpointUs, nonpointThem, originalUs, usRange);
            us = r.data;
            usRange = r.originalRange;
            intersects = r.intersects;
        }

        r = bezierCurveDataBezierClipWithBezierCurve(them, us, originalThem, themRange);
        them = r.data;
        intersects = r.intersects;
        themRange = r.originalRange;

        if ( !intersects ) {
            r = bezierCurveDataBezierClipWithBezierCurve(nonpointThem, nonpointUs, originalThem, themRange);
            them = r.data;
            intersects = r.intersects;
            themRange = r.originalRange;
        }
        if ( !bezierCurveDataIsPoint(them) )
            nonpointThem = them;
        if ( !bezierCurveDataIsPoint(us) )
            nonpointUs = us;
    }
}


export function bezierCurveDataClipLineOriginalCurve(me, originalCurve, curve, originalRange,  otherCurve)
{
    var themOnUs1 = math.parameterOfPointOnLine(curve.endPoint1, curve.endPoint2, otherCurve.endPoint1);
    var themOnUs2 = math.parameterOfPointOnLine(curve.endPoint1, curve.endPoint2, otherCurve.endPoint2);
    var clippedRange = geometry.rangeMake(Math.max(0, Math.min(themOnUs1, themOnUs2)), Math.min(1, Math.max(themOnUs1, themOnUs2)));
    var intersects;
    if ( clippedRange.minimum > clippedRange.maximum ) {
        intersects = false;
        return {data:curve, intersects:intersects, originalRange:originalRange}; // No intersection
    }

    // Right now the clipped range is relative to ourself, not the original curve. So map the newly clipped range onto the original range
    var newRange = geometry.rangeMake(geometry.rangeScaleNormalizedValue(originalRange, clippedRange.minimum), geometry.rangeScaleNormalizedValue(originalRange, clippedRange.maximum));
    originalRange = newRange;
    intersects = true;

    // Actually divide the curve, but be sure to use the original curve. This helps with errors building up.
    return {data:bezierCurveDataSubcurveWithRange(originalCurve, originalRange), intersects:intersects, originalRange:originalRange};
}

export function bezierCurveDataCheckLinesForOverlap(me, usRange, themRange, originalUs, originalThem, us, them)
{
    var intersects = false;
    // First see if its possible for them to overlap at all
    if ( !geometry.lineBoundsMightOverlap(bezierCurveDataBounds(us), bezierCurveDataBounds(them)) )
        return {intersects:intersects, us:us, them:them};

    // Are all 4 points in a single line?
    var errorThreshold = 1e-7;
    var isColinear = geometry.areValuesCloseWithOptions(math.counterClockwiseTurn(us.endPoint1, us.endPoint2, them.endPoint1), 0.0, errorThreshold)
                    && geometry.areValuesCloseWithOptions(math.counterClockwiseTurn(us.endPoint1, us.endPoint2, them.endPoint2), 0.0, errorThreshold);
    if ( !isColinear )
        return {intersects:intersects, us:us, them:them};

    
    var r=  bezierCurveDataClipLineOriginalCurve(me, originalUs, us, usRange, them); 
    us = r.data;
    if ( !r.intersects )
        return {intersects:intersects, us:us, them:them};

    r = bezierCurveDataClipLineOriginalCurve(me, originalThem, them, themRange, us);
    them = r.data;
    return {intersects:intersects, us:us, them:them};
}

export function bezierCurveDataConvertSelfAndPoint(me, point, bezierPoints)
{
    var selfPoints = [ me.endPoint1, me.controlPoint1, me.controlPoint2, me.endPoint2 ];

    // c[i] in the paper
    var distanceFromPoint = [];
    for (var i = 0; i < 4; i++)
        distanceFromPoint[i] = geometry.subtractPoint(selfPoints[i], point);

        // d[i] in the paper
        var weightedDelta = [];
        for (var i = 0; i < 3; i++)
            weightedDelta[i] = geometry.scalePoint(geometry.subtractPoint(selfPoints[i + 1], selfPoints[i]), 3);

            // Precompute the dot product of distanceFromPoint and weightedDelta in order to speed things up
            var precomputedTable = [[],[],[]];
            for (var row = 0; row < 3; row++) {
                for (var column = 0; column < 4; column++)
                    precomputedTable[row][column] = geometry.dotMultiplyPoint(weightedDelta[row], distanceFromPoint[column]);
            }

    // Precompute some of the values to speed things up
    var Z = [
        [1.0, 0.6, 0.3, 0.1],
        [0.4, 0.6, 0.6, 0.4],
        [0.1, 0.3, 0.6, 1.0]
    ];

    // Set the x values of the bezier points
    for (var i = 0; i < 6; i++)
        bezierPoints[i] = {x:i / 5.0, y:0};

        // Finally set the y values of the bezier points
        var n = 3;
        var m = n - 1;
        for (var k = 0; k <= (n + m); k++) {
            var lowerBound = Math.max(0, k - m);
            var upperBound = Math.min(k, n);
            for (var i = lowerBound; i <= upperBound; i++) {
                var j = k - i;
                bezierPoints[i + j].y += precomputedTable[j][i] * Z[j][i];
            }
        }
}

export function bezierCurveDataClosestLocationToPoint(me, point)
{
    var bezierPoints = [];
    bezierCurveDataConvertSelfAndPoint(me, point, bezierPoints);

     var distance = geometry.distanceBetweenPoints(me.endPoint1, point);
     var parameter = 0.0;

    math.findBezierRoots(bezierPoints, 5, root=> {
        var location = bezierCurveDataPointAtParameter(me, root, null, null);
        var theDistance = geometry.distanceBetweenPoints(location, point);
        if ( theDistance < distance ) {
            distance = theDistance;
            parameter = root;
        }
    });

    var lastDistance = geometry.distanceBetweenPoints(me.endPoint2, point);
    if ( lastDistance < distance ) {
        distance = lastDistance;
        parameter = 1.0;
    }

    var location = {};
    location.parameter = parameter;
    location.distance = distance;
    return location;
}


export function bezierCurveDataIsEqualWithOptions(me, other, threshold)
{
    if ( bezierCurveDataIsPoint(me) || bezierCurveDataIsPoint(other) )
        return false;
    if ( me.isStraightLine != other.isStraightLine )
        return false;

    if ( me.isStraightLine )
        return geometry.arePointsCloseWithOptions(me.endPoint1, other.endPoint1, threshold) && geometry.arePointsCloseWithOptions(me.endPoint2, other.endPoint2, threshold);
    return geometry.arePointsCloseWithOptions(me.endPoint1, other.endPoint1, threshold) && geometry.arePointsCloseWithOptions(me.controlPoint1, other.controlPoint1, threshold) && geometry.arePointsCloseWithOptions(me.controlPoint2, other.controlPoint2, threshold) && geometry.arePointsCloseWithOptions(me.endPoint2, other.endPoint2, threshold);
}

export function bezierCurveDataAreCurvesEqual(me, other)
{
    if ( bezierCurveDataIsPoint(me) || bezierCurveDataIsPoint(other) )
        return false;
    if ( me.isStraightLine != other.isStraightLine )
        return false;


    var endPointThreshold = 1e-4;
    var controlPointThreshold = 1e-1;

    if ( me.isStraightLine )
        return geometry.arePointsCloseWithOptions(me.endPoint1, other.endPoint1, endPointThreshold) && geometry.arePointsCloseWithOptions(me.endPoint2, other.endPoint2, endPointThreshold);

    return geometry.arePointsCloseWithOptions(me.endPoint1, other.endPoint1, endPointThreshold)
        && geometry.arePointsCloseWithOptions(me.controlPoint1, other.controlPoint1, controlPointThreshold)
        && geometry.arePointsCloseWithOptions(me.controlPoint2, other.controlPoint2, controlPointThreshold)
        && geometry.arePointsCloseWithOptions(me.endPoint2, other.endPoint2, endPointThreshold);
}

export function bezierCurveDataIsEqual(me, other)
{
    return bezierCurveDataIsEqualWithOptions(me, other, 1e-10);
}

export function bezierCurveDataReversed(me)
{
    return bezierCurveDataMake(me.endPoint2, me.controlPoint2, me.controlPoint1, me.endPoint1, me.isStraightLine);
}

export function bezierCurveDataCheckForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, us, them)
{
    if ( bezierCurveDataAreCurvesEqual(us, them) ) {
        if ( intersectRange) {
            intersectRange.value = new BezierIntersectRange(originalUs,usRange ,originalThem, themRange,false);
        }
        return true;
    } else if ( bezierCurveDataAreCurvesEqual(us, bezierCurveDataReversed(them)) ) {
        if ( intersectRange ) {
            intersectRange.value = new BezierIntersectRange(originalUs, usRange,originalThem,themRange,true);
        }
        return true;
    }
    return false;
}

export function bezierCurveDataFindPossibleOverlap(me, originalUs,  them, possibleRange)
{
    var themOnUs1 = bezierCurveDataClosestLocationToPoint(originalUs, them.endPoint1);
    var themOnUs2 = bezierCurveDataClosestLocationToPoint(originalUs, them.endPoint2);
    var range = geometry.rangeMake(Math.min(themOnUs1.parameter, themOnUs2.parameter), Math.max(themOnUs1.parameter, themOnUs2.parameter));
    possibleRange.minimum = range.minimum;
    possibleRange.maximum = range.maximum;
    return bezierCurveDataSubcurveWithRange(originalUs, range);
}

export function bezierCurveDataCheckCurvesForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, us, them)
{
    if ( bezierCurveDataCheckForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, us, them) )
        return true;

    var usSubcurveRange = {};
    var usSubcurve = bezierCurveDataFindPossibleOverlap(me, originalUs.data, them, usSubcurveRange);

    var themSubcurveRange = {};
    var themSubcurve = bezierCurveDataFindPossibleOverlap(me, originalThem.data, us, themSubcurveRange);

    var threshold = 1e-4;
    if ( bezierCurveDataIsEqualWithOptions(usSubcurve, themSubcurve, threshold)
        || bezierCurveDataIsEqualWithOptions(usSubcurve, bezierCurveDataReversed(themSubcurve), threshold) ) {
        usRange = usSubcurveRange;
        themRange = themSubcurveRange;
        return bezierCurveDataCheckForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, usSubcurve, themSubcurve);
    }

    return false;
}

export function bezierCurveDataCheckNoIntersectionsForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, us, them, nonpointUs, nonpointThem) {
    var r = {};
    if (us.isStraightLine && them.isStraightLine){
        r = bezierCurveDataCheckLinesForOverlap(me, usRange, themRange, originalUs.data, originalThem.data, us, them);
    }
    bezierCurveDataCheckForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, r.us || us, r.them || them);
}


export function bezierCurveDataCheckForStraightLineOverlap(me, intersectRange, usRange, themRange, originalUs, originalThem, us, them,  nonpointUs,  nonpointThem)
{
    var res = {intersects:false};

    if ( us.isStraightLine && them.isStraightLine ) {
        res = bezierCurveDataCheckLinesForOverlap(me, usRange, themRange, originalUs.data, originalThem.data, us, them);
    }

    if ( res.intersects )
        res = bezierCurveDataCheckForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, res.us || us, res.them || them);

    return res.intersects;
}

export function bezierCurveDataRefineParameter(me,  parameter,  point)
{
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

    var bezierPoints = [clone(me.endPoint1), clone(me.controlPoint1), clone(me.controlPoint2), clone(me.endPoint2)];

    // Compute Q(parameter)
    var qAtParameter = math.bezierWithPoints(3, bezierPoints, parameter, null, null);

    // Compute Q'(parameter)
    var qPrimePoints = [{x:0, y:0},{x:0, y:0},{x:0, y:0}];
    for (var i = 0; i < 3; i++) {
        qPrimePoints[i].x = (bezierPoints[i + 1].x - bezierPoints[i].x) * 3.0;
        qPrimePoints[i].y = (bezierPoints[i + 1].y - bezierPoints[i].y) * 3.0;
    }
    var qPrimeAtParameter = math.bezierWithPoints(2, qPrimePoints, parameter, null, null);

    // Compute Q''(parameter)
    var qPrimePrimePoints = [{x:0, y:0},{x:0, y:0}];
    for (var i = 0; i < 2; i++) {
        qPrimePrimePoints[i].x = (qPrimePoints[i + 1].x - qPrimePoints[i].x) * 2.0;
        qPrimePrimePoints[i].y = (qPrimePoints[i + 1].y - qPrimePoints[i].y) * 2.0;
    }
    var qPrimePrimeAtParameter = math.bezierWithPoints(1, qPrimePrimePoints, parameter, null, null);

    // Compute f(parameter) and f'(parameter)
    var qMinusPoint = geometry.subtractPoint(qAtParameter, point);
    var fAtParameter = geometry.dotMultiplyPoint(qMinusPoint, qPrimeAtParameter);
    var fPrimeAtParameter = geometry.dotMultiplyPoint(qMinusPoint, qPrimePrimeAtParameter) + geometry.dotMultiplyPoint(qPrimeAtParameter, qPrimeAtParameter);

    // Newton's method!
    return parameter - (fAtParameter / fPrimeAtParameter);
}

export function bezierCurveDataMergeIntersectRange(intersectRange, otherIntersectRange)
{
    if ( otherIntersectRange == null )
        return intersectRange;

    if ( intersectRange == null )
        return otherIntersectRange;

    intersectRange.merge(otherIntersectRange);

    return intersectRange;
}

export function bezierCurveDataIntersectionsWithStraightLines(me, curve, usRange, themRange, originalUs, originalThem, outputBlock, stop)
{
    if ( !me.isStraightLine || !curve.isStraightLine )
        return false;

    var intersectionPoint = math.linesIntersect(me.endPoint1, me.endPoint2, curve.endPoint1, curve.endPoint2);
    if ( !intersectionPoint )
        return false;

    var meParameter = math.parameterOfPointOnLine(me.endPoint1, me.endPoint2, intersectionPoint);
    if ( geometry.isValueLessThan(meParameter, 0.0) || geometry.isValueGreaterThan(meParameter, 1.0) )
        return false;

    var curveParameter = math.parameterOfPointOnLine(curve.endPoint1, curve.endPoint2, intersectionPoint);
    if ( geometry.isValueLessThan(curveParameter, 0.0) || geometry.isValueGreaterThan(curveParameter, 1.0) )
        return false;

    if(true===outputBlock(new BezierIntersection(originalUs,meParameter, originalThem,curveParameter), stop)){
        return;
    }

    return true;
}

export function bezierCurveDataIntersectionsWithBezierCurve(me, curve, usRange, themRange, originalUs, originalThem, intersectRange, depth, outputBlock, stop)
{
    // This is the main work loop. At a high level this method sits in a loop and removes sections (ranges) of the two bezier curves that it knows
    //  don't intersect (how it knows that is covered in the appropriate method). The idea is to whittle the curves down to the point where they
    //  do intersect. When the range where they intersect converges (i.e. matches to 6 decimal places) or there are more than 500 attempts, the loop
    //  stops. A special case is when we're not able to remove at least 20% of the curves on a given interation. In that case we assume there are likely
    //  multiple intersections, so we divide one of curves in half, and recurse on the two halves.

    var places = 6; // How many decimals place to calculate the solution out to
    var maxIterations = 500; // how many iterations to allow before we just give up
    var maxDepth = 10; // how many recursive calls to allow before we just give up
    var minimumChangeNeeded = 0.20; // how much to clip off for a given iteration minimum before we subdivide the curve

    var us = me; // us is self, but clipped down to where the intersection is
    var them = curve; // them is the other curve we're intersecting with, but clipped down to where the intersection is
    var nonpointUs = us;
    var nonpointThem = them;


    // Horizontal and vertical lines are somewhat special cases, and the math doesn't always work out that great. For example, two vertical lines
    //  that overlap will kick out as intersecting at the endpoints. Try to detect that kind of overlap at the start.
    if ( bezierCurveDataCheckForStraightLineOverlap(me, intersectRange, usRange, themRange, originalUs, originalThem, us, them, nonpointUs, nonpointThem) )
        return;
    if ( us.isStraightLine && them.isStraightLine ) {
        bezierCurveDataIntersectionsWithStraightLines(me, curve, usRange, themRange, originalUs, originalThem, outputBlock, stop);
        return;
    }

    var originalUsData = originalUs.data;
    var originalThemData = originalThem.data;

    // Don't check for convergence until we actually see if we intersect or not. i.e. Make sure we go through at least once, otherwise the results
    //  don't mean anything. Be sure to stop as soon as either range converges, otherwise calculations for the other range goes funky because one
    //  curve is essentially a point.
    var iterations = 0;
    var hadConverged = true;
    while ( iterations < maxIterations && ((iterations == 0) || (!geometry.rangeHasConverged(usRange, places) || !geometry.rangeHasConverged(themRange, places))) ) {
        // Remember what the current range is so we can calculate how much it changed later
        var previousUsRange = usRange;
        var previousThemRange = themRange;

        // Remove the range from ourselves that doesn't intersect with them. If the other curve is already a point, use the previous iteration's
        //  copy of them so calculations still work.
        var intersects = false;
        if ( !bezierCurveDataIsPoint(them) )
            nonpointThem = them;
        var r = bezierCurveDataBezierClipWithBezierCurve(nonpointUs, nonpointThem, originalUsData, usRange);
        us = r.data;
        usRange = r.originalRange;
        if ( !r.intersects ) {
            bezierCurveDataCheckNoIntersectionsForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, us, them, nonpointUs, nonpointThem);
            return; // If they don't intersect at all stop now
        }
        if ( iterations > 0 && (bezierCurveDataIsPoint(us) || bezierCurveDataIsPoint(them)) )
            break;

        // Remove the range of them that doesn't intersect with us
        if ( !bezierCurveDataIsPoint(us) )
            nonpointUs = us;
        else if ( iterations == 0 )
            // If the first time through us was reduced to a point, then we're never going to know if the curves actually intersect,
            //  even if both ranges converge. The ranges can converge on the parameters on each respective curve that is closest to the
            //  other. But without being clipped to a smaller range the algorithm won't necessarily detect that they don't actually intersect
            hadConverged = false;
        r = bezierCurveDataBezierClipWithBezierCurve(nonpointThem, nonpointUs, originalThemData, themRange);
        them = r.data;
        themRange = r.originalRange;
        if ( !r.intersects ) {
            bezierCurveDataCheckNoIntersectionsForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, us, them, nonpointUs, nonpointThem);
            return; // If they don't intersect at all stop now
        }
        if ( iterations > 0 && (bezierCurveDataIsPoint(us) || bezierCurveDataIsPoint(them)) )
            break;

        // See if either of curves ranges is reduced by less than 20%.
        var percentChangeInUs = (geometry.rangeGetSize(previousUsRange) - geometry.rangeGetSize(usRange)) / geometry.rangeGetSize(previousUsRange);
        var percentChangeInThem = (geometry.rangeGetSize(previousThemRange) - geometry.rangeGetSize(themRange)) / geometry.rangeGetSize(previousThemRange);
        var didNotSplit = false;
        if ( percentChangeInUs < minimumChangeNeeded && percentChangeInThem < minimumChangeNeeded ) {
            // We're not converging fast enough, likely because there are multiple intersections here.
            //  Or the curves are the same, check for that first
            if ( bezierCurveDataCheckCurvesForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, us, them) )
                return;

            // Divide and conquer. Divide the longer curve in half, and recurse
            if ( geometry.rangeGetSize(usRange) > geometry.rangeGetSize(themRange) ) {
                // Since our remaining range is longer, split the remains of us in half at the midway point
                var usRange1 = geometry.rangeMake(usRange.minimum, (usRange.minimum + usRange.maximum) / 2.0);
                var us1 = bezierCurveDataSubcurveWithRange(originalUsData, usRange1);
                var themRangeCopy1 = clone(themRange); // make a local copy because it'll get modified when we recurse

                var usRange2 = geometry.rangeMake((usRange.minimum + usRange.maximum) / 2.0, usRange.maximum);
                var us2 = bezierCurveDataSubcurveWithRange(originalUsData, usRange2);
                var themRangeCopy2 = clone(themRange); // make a local copy because it'll get modified when we recurse

                var range1ConvergedAlready = geometry.rangeHasConverged(usRange1, places) && geometry.rangeHasConverged(themRange, places);
                var range2ConvergedAlready = geometry.rangeHasConverged(usRange2, places) && geometry.rangeHasConverged(themRange, places);

                if ( !range1ConvergedAlready && !range2ConvergedAlready && depth < maxDepth ) {
                    // Compute the intersections between the two halves of us and them
                    var leftIntersectRange = {};
                    bezierCurveDataIntersectionsWithBezierCurve(us1, them, usRange1, themRangeCopy1, originalUs, originalThem, leftIntersectRange, depth + 1, outputBlock, stop);
                    leftIntersectRange = leftIntersectRange.value;
                    if ( intersectRange != null )
                        intersectRange.value = bezierCurveDataMergeIntersectRange(intersectRange.value, leftIntersectRange);
                    if ( stop )
                        return;
                    var rightIntersectRange = {};
                    bezierCurveDataIntersectionsWithBezierCurve(us2, them, usRange2, themRangeCopy2, originalUs, originalThem, rightIntersectRange, depth + 1, outputBlock, stop);
                    rightIntersectRange = rightIntersectRange.value;
                    if ( intersectRange != null )
                        intersectRange.value = bezierCurveDataMergeIntersectRange(intersectRange.value, rightIntersectRange);
                    return;
                } else
                    didNotSplit = true;
            } else {
                // Since their remaining range is longer, split the remains of them in half at the midway point
                var themRange1 = geometry.rangeMake(themRange.minimum, (themRange.minimum + themRange.maximum) / 2.0);
                var them1 = bezierCurveDataSubcurveWithRange(originalThemData, themRange1);
                var usRangeCopy1 = clone(usRange);  // make a local copy because it'll get modified when we recurse

                var themRange2 = geometry.rangeMake((themRange.minimum + themRange.maximum) / 2.0, themRange.maximum);
                var them2 = bezierCurveDataSubcurveWithRange(originalThemData, themRange2);
                var usRangeCopy2 = clone(usRange);  // make a local copy because it'll get modified when we recurse

                var range1ConvergedAlready = geometry.rangeHasConverged(themRange1, places) && geometry.rangeHasConverged(usRange, places);
                var range2ConvergedAlready = geometry.rangeHasConverged(themRange2, places) && geometry.rangeHasConverged(usRange, places);

                if ( !range1ConvergedAlready && !range2ConvergedAlready && depth < maxDepth ) {
                    // Compute the intersections between the two halves of them and us
                    var leftIntersectRange = {};
                    bezierCurveDataIntersectionsWithBezierCurve(us, them1, usRangeCopy1, themRange1, originalUs, originalThem, leftIntersectRange, depth + 1, outputBlock, stop);
                    leftIntersectRange = leftIntersectRange.value;
                    if ( intersectRange != null )
                        intersectRange.value = bezierCurveDataMergeIntersectRange(intersectRange.value, leftIntersectRange);

                    if ( stop.value )
                        return;
                    var rightIntersectRange = {};
                    bezierCurveDataIntersectionsWithBezierCurve(us, them2, usRangeCopy2, themRange2, originalUs, originalThem, rightIntersectRange, depth + 1, outputBlock, stop);
                    rightIntersectRange = rightIntersectRange.value;
                    if ( intersectRange != null )
                        intersectRange.value = bezierCurveDataMergeIntersectRange(intersectRange.value, rightIntersectRange);

                    return;
                } else
                    didNotSplit = true;
            }

            if ( didNotSplit && (geometry.rangeGetSize(previousUsRange) - geometry.rangeGetSize(usRange) == 0) && (geometry.rangeGetSize(previousThemRange) - geometry.rangeGetSize(themRange) == 0) ) {
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
    if ( !geometry.rangeHasConverged(usRange, places) || !geometry.rangeHasConverged(themRange, places) ) {
        // Maybe there's an overlap in here?
        if ( bezierCurveDataCheckCurvesForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, originalUsData, originalThemData) )
            return;

        // We bail out of the main loop as soon as we know things intersect, but before the math falls apart. Unfortunately sometimes this
        //  means we don't always get the best estimate of the parameters. Below we fall back to Netwon's method, but it's accuracy is
        //  dependant on our previous calculations. So here assume things intersect and just try to tighten up the parameters. If the
        //  math falls apart because everything's a point, that's OK since we already have a "reasonable" estimation of the parameters.
        bezierCurveDataRefineIntersectionsOverIterations(3, usRange, themRange, originalUsData, originalThemData, us, them, nonpointUs, nonpointThem);
        // Sometimes we need a little more precision. Be careful though, in that in some cases trying for more makes the math fall apart
        if ( !geometry.rangeHasConverged(usRange, places) || !geometry.rangeHasConverged(themRange, places) )
            bezierCurveDataRefineIntersectionsOverIterations(4, usRange, themRange, originalUsData, originalThemData, us, them, nonpointUs, nonpointThem);
    }
    if ( geometry.rangeHasConverged(usRange, places) && !geometry.rangeHasConverged(themRange, places) ) {
        // Refine the them range since it didn't converge
        var intersectionPoint = bezierCurveDataPointAtParameter(originalUsData, geometry.rangeAverage(usRange), null, null);
        var refinedParameter = geometry.rangeAverage(themRange); // Although the range didn't converge, it should be a reasonable approximation which is all Newton needs
        for (var i = 0; i < 3; i++) {
            refinedParameter = bezierCurveDataRefineParameter(originalThemData, refinedParameter, intersectionPoint);
            refinedParameter = Math.min(themRange.maximum, Math.max(themRange.minimum, refinedParameter));
        }
        themRange.minimum = refinedParameter;
        themRange.maximum = refinedParameter;
        hadConverged = false;
    } else if ( !geometry.rangeHasConverged(usRange, places) && geometry.rangeHasConverged(themRange, places) ) {
        // Refine the us range since it didn't converge
        var intersectionPoint = bezierCurveDataPointAtParameter(originalThemData, geometry.rangeAverage(themRange), null, null);
        var refinedParameter = geometry.rangeAverage(usRange); // Although the range didn't converge, it should be a reasonable approximation which is all Newton needs
        for (var i = 0; i < 3; i++) {
            refinedParameter = bezierCurveDataRefineParameter(originalUsData, refinedParameter, intersectionPoint);
            refinedParameter = Math.min(usRange.maximum, Math.max(usRange.minimum, refinedParameter));
        }
        usRange.minimum = refinedParameter;
        usRange.maximum = refinedParameter;
        hadConverged = false;
    }

    // If it never converged and we stopped because of our loop max, assume overlap or something else. Bail.
    if ( (!geometry.rangeHasConverged(usRange, places) || !geometry.rangeHasConverged(themRange, places)) && iterations >= maxIterations ) {
        bezierCurveDataCheckForOverlapRange(me, intersectRange, usRange, themRange, originalUs, originalThem, us, them);
        return;
    }

    if ( !hadConverged ) {
        // Since one of them didn't converge, we need to make sure they actually intersect. Compute the point from both and compare
        var intersectionPoint = bezierCurveDataPointAtParameter(originalUsData, geometry.rangeAverage(usRange), null, null);
        var checkPoint = bezierCurveDataPointAtParameter(originalThemData, geometry.rangeAverage(themRange), null, null);
        if ( !geometry.arePointsCloseWithOptions(intersectionPoint, checkPoint, 1e-3) )
            return;
    }
    // Return the final intersection, which we represent by the original curves and the parameters where they intersect. The parameter values are useful
    //  later in the boolean operations, plus it allows us to do lazy calculations.
    outputBlock(new BezierIntersection(originalUs, geometry.rangeAverage(usRange), originalThem, geometry.rangeAverage(themRange)), stop);
}


function bezierCurveDataSet(data, endPoint1, controlPoint1, controlPoint2,  endPoint2, isStraightLine)
{
    data.endPoint1 = endPoint1;
    data.controlPoint1 = controlPoint1; 
    data.controlPoint2 = controlPoint2;
    data.endPoint2 = endPoint2; 
    data.isStraightLine = isStraightLine; 
    data.length = BezierCurveDataInvalidLength; 
    data.isPoint = BezierCurveDataInvalidIsPoint;
}
export function bezierCurveDataMake(endPoint1, controlPoint1, controlPoint2,  endPoint2, isStraightLine)
{
    return {endPoint1, controlPoint1, controlPoint2, endPoint2, isStraightLine, length:BezierCurveDataInvalidLength, isPoint:BezierCurveDataInvalidIsPoint };
}



