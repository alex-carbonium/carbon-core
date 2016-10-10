export var PointClosenessThreshold = 1e-10;
export var TangentClosenessThreshold = 1e-12;
export var BoundsClosenessThreshold = 1e-9;

export function removeObject(arr, obj) {
    var i = arr.indexOf(obj);
    if(i >= 0){
        arr.splice(i, 1);
    }
}

export function distanceBetweenPoints(point1, point2)
{
    var xDelta = point2.x - point1.x;
    var yDelta = point2.y - point1.y;
    return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
}

export function distancePointToLine(point, lineStartPoint, lineEndPoint)
{
    var lineLength = distanceBetweenPoints(lineStartPoint, lineEndPoint);
    if ( lineLength == 0 )
        return 0;
    var u = ((point.x - lineStartPoint.x) * (lineEndPoint.x - lineStartPoint.x) + (point.y - lineStartPoint.y) * (lineEndPoint.y - lineStartPoint.y)) / (lineLength * lineLength);
    var intersectionPoint = {x:lineStartPoint.x + u * (lineEndPoint.x - lineStartPoint.x), y:lineStartPoint.y + u * (lineEndPoint.y - lineStartPoint.y)};
    return distanceBetweenPoints(point, intersectionPoint);
}

export function addPoint(point1, point2)
{
    return {x:point1.x + point2.x, y:point1.y + point2.y};
}

export function unitScalePoint( point, scale)
{
    var result = point;
    var length = pointLength(point);
    if ( length != 0.0 ) {
        result.x *= scale/length;
        result.y *= scale/length;
    }
    return result;
}

export function scalePoint( point,  scale)
{
    return {x:point.x * scale, y:point.y * scale};
}

export function dotMultiplyPoint( point1,  point2)
{
    return point1.x * point2.x + point1.y * point2.y;
}

export function subtractPoint( point1,  point2)
{
    return {x:point1.x - point2.x, y:point1.y - point2.y};
}

export function pointLength( point)
{
    return Math.sqrt((point.x * point.x) + (point.y * point.y));
}

export function pointSquaredLength( point)
{
    return (point.x * point.x) + (point.y * point.y);
}

export function normalizePoint( point)
{
    var result = point;
    var length = pointLength(point);
    if ( length != 0.0 ) {
        result.x /= length;
        result.y /= length;
    }
    return result;
}

export function negatePoint( point)
{
    return {x:-point.x, y:-point.y};
}

export function roundPoint( point)
{
    return { x:Math.round(point.x), y:Math.round(point.y) };
}

export function lineNormal( lineStart,  lineEnd)
{
    return normalizePoint({x:-(lineEnd.y - lineStart.y), y:lineEnd.x - lineStart.x});
}

export function lineMidpoint( lineStart,  lineEnd)
{
    var distance = distanceBetweenPoints(lineStart, lineEnd);
    var tangent = normalizePoint(subtractPoint(lineEnd, lineStart));
    return addPoint(lineStart, unitScalePoint(tangent, distance / 2.0));
}

export function rectGetTopLeft( rect)
{
    return {x:rect.x, y:rect.y};
}

export function rectGetTopRight(rect)
{
    return {x:rect.x+rect.width, y:rect.y};
}

export function rectGetBottomLeft( rect)
{
    return {x:rect.x, y:rect.y+rect.height};
}

export function rectGetBottomRight( rect)
{
    return {x:rect.x+rect.width, y:rect.y+rect.height};
}

export  function expandBoundsByPoint( topLeft,  bottomRight,  point)
{
    if ( point.x < topLeft.x )
        topLeft.x = point.x;
    if ( point.x > bottomRight.x )
        bottomRight.x = point.x;
    if ( point.y < topLeft.y )
        topLeft.y = point.y;
    if ( point.y > bottomRight.y )
        bottomRight.y = point.y;
}

export function unionRect(rect1,  rect2)
{
    var topLeft = clone(rectGetTopLeft(rect1));
    var bottomRight = clone(rectGetBottomRight(rect1));
    expandBoundsByPoint(topLeft, bottomRight, rectGetTopLeft(rect2));
    expandBoundsByPoint(topLeft, bottomRight, rectGetTopRight(rect2));
    expandBoundsByPoint(topLeft, bottomRight, rectGetBottomRight(rect2));
    expandBoundsByPoint(topLeft, bottomRight, rectGetBottomLeft(rect2));
    return {x:topLeft.x, y:topLeft.y, width:bottomRight.x - topLeft.x, height:bottomRight.y - topLeft.y};
}

export function arePointsClose( point1,  point2)
{
    return arePointsCloseWithOptions(point1, point2, PointClosenessThreshold);
}

export function arePointsCloseWithOptions( point1,  point2,  threshold)
{
    return areValuesCloseWithOptions(point1.x, point2.x, threshold) && areValuesCloseWithOptions(point1.y, point2.y, threshold);
}

export function areValuesClose( value1,  value2)
{
    return areValuesCloseWithOptions(value1, value2, PointClosenessThreshold);
}

export function areValuesCloseWithOptions( value1,  value2,  threshold)
{
    var delta = value1 - value2;
    return (delta <= threshold) && (delta >= -threshold);
}

//////////////////////////////////////////////////////////////////////////
// Helper methods for angles
//
var M_2PI = 2.0 * Math.PI;
var M_PI_2 = 0.5 * Math.PI;

// Normalize the angle between 0 and 2pi
export function normalizeAngle( value)
{
    while ( value < 0.0 )
        value += M_2PI;
    while ( value >= M_2PI )
        value -= M_2PI;
    return value;
}

// Compute the polar angle from the cartesian point
export function polarAngle(point)
{
    var value = 0.0;
    if ( point.x > 0.0 )
        value = Math.atan(point.y / point.x);
    else if ( point.x < 0.0 ) {
        if ( point.y >= 0.0 )
            value = Math.atan(point.y / point.x) + Math.PI;
        else
            value = Math.atan(point.y / point.x) - Math.PI;
    } else {
        if ( point.y > 0.0 )
            value =  M_PI_2;
        else if ( point.y < 0.0 )
            value =  -M_PI_2;
        else
            value = 0.0;
    }
    return normalizeAngle(value);
}


export function angleRangeMake( minimum,  maximum)
{
    return { minimum, maximum };
}

export function isValueGreaterThanWithOptions( value,  minimum,  threshold)
{
    if ( areValuesCloseWithOptions(value, minimum, threshold) )
        return false;
    return value > minimum;
}

export function isValueGreaterThan( value,  minimum)
{
    return isValueGreaterThanWithOptions(value, minimum, TangentClosenessThreshold);
}

export function isValueLessThan( value,  maximum)
{
    if ( areValuesCloseWithOptions(value, maximum, TangentClosenessThreshold) )
        return false;
    return value < maximum;
}

export function isValueGreaterThanEqual( value,  minimum)
{
    if ( areValuesCloseWithOptions(value, minimum, TangentClosenessThreshold) )
        return true;
    return value >= minimum;
}

export function isValueLessThanEqualWithOptions( value,  maximum,  threshold)
{
    if ( areValuesCloseWithOptions(value, maximum, threshold) )
        return true;
    return value <= maximum;
}

export function isValueLessThanEqual( value,  maximum)
{
    return isValueLessThanEqualWithOptions(value, maximum, TangentClosenessThreshold);
}

export function angleRangeContainsAngle( range,  angle)
{
    if ( range.minimum <= range.maximum )
        return isValueGreaterThan(angle, range.minimum) && isValueLessThan(angle, range.maximum);

    // The range wraps around 0. See if the angle falls in the first half
    if ( isValueGreaterThan(angle, range.minimum) && angle <= M_2PI )
        return true;

    return angle >= 0.0 && isValueLessThan(angle, range.maximum);
}

//////////////////////////////////////////////////////////////////////////////////
// Parameter ranges
//
export function rangeMake( minimum,  maximum)
{
    return { minimum, maximum };
}

export function rangeHasConverged( range,  places)
{
    var factor = Math.pow(10.0, places);
    var minimum = ~~(range.minimum * factor);
    var maxiumum = ~~(range.maximum * factor);
    return minimum == maxiumum;
}

export function rangeGetSize( range)
{
    return range.maximum - range.minimum;
}

export function rangeAverage( range)
{
    return (range.minimum + range.maximum) / 2.0;
}

export function rangeScaleNormalizedValue( range,  value)
{
    return (range.maximum - range.minimum) * value + range.minimum;
}

export function rangeUnion( range1,  range2)
{
    return { minimum:Math.min(range1.minimum, range2.minimum), maximum:Math.max(range1.maximum, range2.maximum) };
}

export function areTangentsAmbigious( edge1Tangents,  edge2Tangents)
{
    var normalEdge1 = [ normalizePoint(edge1Tangents[0]), normalizePoint(edge1Tangents[1]) ];
    var normalEdge2 = [ normalizePoint(edge2Tangents[0]), normalizePoint(edge2Tangents[1]) ];

    return arePointsCloseWithOptions(normalEdge1[0], normalEdge2[0], TangentClosenessThreshold) || 
        arePointsCloseWithOptions(normalEdge1[0], normalEdge2[1], TangentClosenessThreshold) || 
        arePointsCloseWithOptions(normalEdge1[1], normalEdge2[0], TangentClosenessThreshold) || 
        arePointsCloseWithOptions(normalEdge1[1], normalEdge2[1], TangentClosenessThreshold);
}

export function tangentsCross( edge1Tangents,  edge2Tangents)
{
    // Calculate angles for the tangents
    var edge1Angles = [ polarAngle(edge1Tangents[0]), polarAngle(edge1Tangents[1]) ];
    var edge2Angles = [ polarAngle(edge2Tangents[0]), polarAngle(edge2Tangents[1]) ];

    // Count how many times edge2 angles appear between the self angles
    var range1 = angleRangeMake(edge1Angles[0], edge1Angles[1]);
    var rangeCount1 = 0;
    if ( angleRangeContainsAngle(range1, edge2Angles[0]) )
        rangeCount1++;
    if ( angleRangeContainsAngle(range1, edge2Angles[1]) )
        rangeCount1++;

    // Count how many times self angles appear between the edge2 angles
    var range2 = angleRangeMake(edge1Angles[1], edge1Angles[0]);
    var rangeCount2 = 0;
    if ( angleRangeContainsAngle(range2, edge2Angles[0]) )
        rangeCount2++;
    if ( angleRangeContainsAngle(range2, edge2Angles[1]) )
        rangeCount2++;

    // If each pair of angles split the other two, then the edges cross.
    return rangeCount1 == 1 && rangeCount2 == 1;
}


export function lineBoundsMightOverlap( bounds1,  bounds2)
{
    var left = Math.max(bounds1.x, bounds2.x);
    var right = Math.min(bounds1.x+bounds1.width, bounds2.x+bounds2.width);
    if ( isValueGreaterThanWithOptions(left, right, BoundsClosenessThreshold) )
        return false; // no horizontal overlap
    var top = Math.max(bounds1.y, bounds2.y);
    var bottom = Math.min(bounds1.y+bounds1.height, bounds2.y+bounds2.height);
    return isValueLessThanEqualWithOptions(top, bottom, BoundsClosenessThreshold);
}
