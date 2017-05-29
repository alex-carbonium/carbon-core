import Rect from "./rect";
import { IRect, ICoordinate } from "carbon-geometry";
import { IRange, IRectData } from "carbon-core";

export const PointClosenessThreshold = 1e-10;
export const TangentClosenessThreshold = 1e-12;
export const BoundsClosenessThreshold = 1e-9;

export function removeObject<T>(arr: T[], obj: T) {
    let i = arr.indexOf(obj);
    if (i >= 0) {
        arr.splice(i, 1);
    }
}

export function distanceBetweenPoints(point1: ICoordinate, point2: ICoordinate): number {
    let xDelta = point2.x - point1.x;
    let yDelta = point2.y - point1.y;

    return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
}

export function distancePointToLine(point: ICoordinate, lineStartPoint: ICoordinate, lineEndPoint: ICoordinate): number {
    let lineLength = distanceBetweenPoints(lineStartPoint, lineEndPoint);
    if (lineLength === 0) {
        return 0;
    }

    let u = ((point.x - lineStartPoint.x) * (lineEndPoint.x - lineStartPoint.x) + (point.y - lineStartPoint.y) * (lineEndPoint.y - lineStartPoint.y)) / (lineLength * lineLength);
    let intersectionPoint = { x: lineStartPoint.x + u * (lineEndPoint.x - lineStartPoint.x), y: lineStartPoint.y + u * (lineEndPoint.y - lineStartPoint.y) };

    return distanceBetweenPoints(point, intersectionPoint);
}

export function pointToLineDistance(point: ICoordinate, x1: number, y1: number, x2: number, y2: number): number {
    let dx = x2 - x1;
    let dy = y1 - y2;

    return (dy * point.x + dx * point.y + (x1 * y2 - x2 * y1)) / Math.sqrt(dx * dx + dy * dy);
}

export function addPoint(point1: ICoordinate, point2: ICoordinate): ICoordinate {
    return { x: point1.x + point2.x, y: point1.y + point2.y };
}

export function unitScalePoint(point: ICoordinate, scale: number): ICoordinate {
    let result = point;
    let length = pointLength(point);
    if (length !== 0.0) {
        result.x *= scale / length;
        result.y *= scale / length;
    }

    return result;
}

export function scalePoint(point: ICoordinate, scale: number): ICoordinate {
    return { x: point.x * scale, y: point.y * scale };
}

export function dotMultiplyPoint(point1: ICoordinate, point2: ICoordinate): number {
    return point1.x * point2.x + point1.y * point2.y;
}

export function subtractPoint(point1: ICoordinate, point2: ICoordinate): ICoordinate {
    return { x: point1.x - point2.x, y: point1.y - point2.y };
}

export function pointLength(point: ICoordinate): number {
    return Math.sqrt((point.x * point.x) + (point.y * point.y));
}

export function pointSquaredLength(point: ICoordinate): number {
    return (point.x * point.x) + (point.y * point.y);
}

export function normalizePoint(point: ICoordinate): ICoordinate {
    let result = point;
    let length = pointLength(point);
    if (length !== 0.0) {
        result.x /= length;
        result.y /= length;
    }

    return result;
}

export function negatePoint(point: ICoordinate): ICoordinate {
    return { x: -point.x, y: -point.y };
}

export function roundPoint(point: ICoordinate): ICoordinate {
    return { x: Math.round(point.x), y: Math.round(point.y) };
}

export function lineNormal(lineStart: ICoordinate, lineEnd: ICoordinate): ICoordinate {
    return normalizePoint({ x: -(lineEnd.y - lineStart.y), y: lineEnd.x - lineStart.x });
}

export function lineMidpoint(lineStart: ICoordinate, lineEnd: ICoordinate): ICoordinate {
    let distance = distanceBetweenPoints(lineStart, lineEnd);
    let tangent = normalizePoint(subtractPoint(lineEnd, lineStart));

    return addPoint(lineStart, unitScalePoint(tangent, distance / 2.0));
}

export function rectGetTopLeft(rect: IRectData): ICoordinate {
    return { x: rect.x, y: rect.y };
}

export function rectGetTopRight(rect: IRectData): ICoordinate {
    return { x: rect.x + rect.width, y: rect.y };
}

export function rectGetBottomLeft(rect: IRectData): ICoordinate {
    return { x: rect.x, y: rect.y + rect.height };
}

export function rectGetBottomRight(rect: IRectData): ICoordinate {
    return { x: rect.x + rect.width, y: rect.y + rect.height };
}

export function expandBoundsByPoint(topLeft: ICoordinate, bottomRight: ICoordinate, point: ICoordinate): void {
    if (point.x < topLeft.x) {
        topLeft.x = point.x;
    }
    if (point.x > bottomRight.x) {
        bottomRight.x = point.x;
    }
    if (point.y < topLeft.y) {
        topLeft.y = point.y;
    }
    if (point.y > bottomRight.y) {
        bottomRight.y = point.y;
    }
}

export function unionRect(rect1: IRectData, rect2: IRectData): Rect {
    let topLeft = clone(rectGetTopLeft(rect1));
    let bottomRight = clone(rectGetBottomRight(rect1));
    expandBoundsByPoint(topLeft, bottomRight, rectGetTopLeft(rect2));
    expandBoundsByPoint(topLeft, bottomRight, rectGetTopRight(rect2));
    expandBoundsByPoint(topLeft, bottomRight, rectGetBottomRight(rect2));
    expandBoundsByPoint(topLeft, bottomRight, rectGetBottomLeft(rect2));

    return new Rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
}

export function arePointsClose(point1: ICoordinate, point2: ICoordinate): boolean {
    return arePointsCloseWithOptions(point1, point2, PointClosenessThreshold);
}

export function arePointsCloseWithOptions(point1: ICoordinate, point2: ICoordinate, threshold: number): boolean {
    return areValuesCloseWithOptions(point1.x, point2.x, threshold) && areValuesCloseWithOptions(point1.y, point2.y, threshold);
}

export function areValuesClose(value1: number, value2: number): boolean {
    return areValuesCloseWithOptions(value1, value2, PointClosenessThreshold);
}

export function areValuesCloseWithOptions(value1: number, value2: number, threshold: number): boolean {
    let delta = value1 - value2;

    return (delta <= threshold) && (delta >= -threshold);
}

//////////////////////////////////////////////////////////////////////////
// Helper methods for angles
//
const M_2PI = 2.0 * Math.PI;
const M_PI_2 = 0.5 * Math.PI;

// Normalize the angle between 0 and 2pi
export function normalizeAngle(value: number): number {
    while (value < 0.0) {
        value += M_2PI;
    }
    while (value >= M_2PI) {
        value -= M_2PI;
    }

    return value;
}

// Compute the polar angle from the cartesian point
export function polarAngle(point: ICoordinate): number {
    let value = 0.0;
    if (point.x > 0.0) {
        value = Math.atan(point.y / point.x);
    }
    else if (point.x < 0.0) {
        if (point.y >= 0.0) {
            value = Math.atan(point.y / point.x) + Math.PI;
        }
        else {
            value = Math.atan(point.y / point.x) - Math.PI;
        }
    } else {
        if (point.y > 0.0) {
            value = M_PI_2;
        }
        else if (point.y < 0.0) {
            value = -M_PI_2;
        }
        else {
            value = 0.0;
        }
    }

    return normalizeAngle(value);
}


export function rangeMake(minimum: number, maximum: number): IRange {
    return { minimum, maximum };
}

export function isValueGreaterThanWithOptions(value: number, minimum: number, threshold: number): boolean {
    if (areValuesCloseWithOptions(value, minimum, threshold)) {
        return false;
    }

    return value > minimum;
}

export function isValueGreaterThan(value, minimum) {
    return isValueGreaterThanWithOptions(value, minimum, TangentClosenessThreshold);
}

export function isValueLessThan(value: number, maximum: number): boolean {
    if (areValuesCloseWithOptions(value, maximum, TangentClosenessThreshold)) {
        return false;
    }

    return value < maximum;
}

export function isValueGreaterThanEqual(value, minimum) {
    if (areValuesCloseWithOptions(value, minimum, TangentClosenessThreshold)) {
        return true;
    }

    return value >= minimum;
}

export function isValueGreaterThanEqualWithOptions(value: number, minimum: number, threshold: number): boolean {
    if (areValuesCloseWithOptions(value, minimum, threshold)) {
        return true;
    }

    return value >= minimum;
}

export function isValueLessThanEqualWithOptions(value: number, maximum: number, threshold: number): boolean {
    if (areValuesCloseWithOptions(value, maximum, threshold)) {
        return true;
    }

    return value <= maximum;
}

export function isValueLessThanEqual(value: number, maximum: number): boolean {
    return isValueLessThanEqualWithOptions(value, maximum, TangentClosenessThreshold);
}

export function angleRangeContainsAngle(range: IRange, angle: number): boolean {
    if (range.minimum <= range.maximum) {
        return isValueGreaterThan(angle, range.minimum) && isValueLessThan(angle, range.maximum);
    }
    // The range wraps around 0. See if the angle falls in the first half
    if (isValueGreaterThan(angle, range.minimum) && angle <= M_2PI) {
        return true;
    }

    return angle >= 0.0 && isValueLessThan(angle, range.maximum);
}

//////////////////////////////////////////////////////////////////////////////////
// Parameter ranges
//

export function rangeHasConverged(range: IRange, places: number): boolean {
    let factor = Math.pow(10.0, places);
    let minimum = ~~(range.minimum * factor);
    let maxiumum = ~~(range.maximum * factor);

    return minimum === maxiumum;
}

export function rangeGetSize(range: IRange): number {
    return range.maximum - range.minimum;
}

export function rangeAverage(range: IRange): number {
    return (range.minimum + range.maximum) / 2.0;
}

export function rangeScaleNormalizedValue(range: IRange, value: number): number {
    return (range.maximum - range.minimum) * value + range.minimum;
}

export function rangeUnion(range1: IRange, range2: IRange): IRange {
    return { minimum: Math.min(range1.minimum, range2.minimum), maximum: Math.max(range1.maximum, range2.maximum) };
}

export function areTangentsAmbigious(edge1Tangents: ICoordinate[], edge2Tangents: ICoordinate[]): boolean {
    let normalEdge1 = [normalizePoint(edge1Tangents[0]), normalizePoint(edge1Tangents[1])];
    let normalEdge2 = [normalizePoint(edge2Tangents[0]), normalizePoint(edge2Tangents[1])];

    return arePointsCloseWithOptions(normalEdge1[0], normalEdge2[0], TangentClosenessThreshold) ||
        arePointsCloseWithOptions(normalEdge1[0], normalEdge2[1], TangentClosenessThreshold) ||
        arePointsCloseWithOptions(normalEdge1[1], normalEdge2[0], TangentClosenessThreshold) ||
        arePointsCloseWithOptions(normalEdge1[1], normalEdge2[1], TangentClosenessThreshold);
}

export function tangentsCross(edge1Tangents:ICoordinate[], edge2Tangents:ICoordinate[]):boolean {
    // Calculate angles for the tangents
    let edge1Angles = [polarAngle(edge1Tangents[0]), polarAngle(edge1Tangents[1])];
    let edge2Angles = [polarAngle(edge2Tangents[0]), polarAngle(edge2Tangents[1])];

    // Count how many times edge2 angles appear between the self angles
    let range1 = rangeMake(edge1Angles[0], edge1Angles[1]);
    let rangeCount1 = 0;
    if (angleRangeContainsAngle(range1, edge2Angles[0])) {
        rangeCount1++;
    }
    if (angleRangeContainsAngle(range1, edge2Angles[1])) {
        rangeCount1++;
    }

    // Count how many times self angles appear between the edge2 angles
    let range2 = rangeMake(edge1Angles[1], edge1Angles[0]);
    let rangeCount2 = 0;
    if (angleRangeContainsAngle(range2, edge2Angles[0])) {
        rangeCount2++;
    }
    if (angleRangeContainsAngle(range2, edge2Angles[1])) {
        rangeCount2++;
    }

    // If each pair of angles split the other two, then the edges cross.
    return rangeCount1 === 1 && rangeCount2 === 1;
}


export function lineBoundsMightOverlap(bounds1:IRectData, bounds2:IRectData):boolean {
    let left = Math.max(bounds1.x, bounds2.x);
    let right = Math.min(bounds1.x + bounds1.width, bounds2.x + bounds2.width);
    if (isValueGreaterThanWithOptions(left, right, BoundsClosenessThreshold)) {
        return false; // no horizontal overlap
    }
    let top = Math.max(bounds1.y, bounds2.y);
    let bottom = Math.min(bounds1.y + bounds1.height, bounds2.y + bounds2.height);

    return isValueLessThanEqualWithOptions(top, bottom, BoundsClosenessThreshold);
}
