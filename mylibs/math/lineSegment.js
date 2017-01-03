import {isValueLessThanEqualWithOptions, PointClosenessThreshold, isValueGreaterThanEqualWithOptions} from "./geometry";

export default class LineSegment {
    constructor(start, end){
        this.start = start;
        this.end = end;
    }

    intersects(other){
        var a1 = this.end.y - this.start.y;
        var b1 = this.start.x - this.end.x;
        var c1 = a1*this.start.x + b1*this.start.y;

        var a2 = other.end.y - other.start.y;
        var b2 = other.start.x - other.end.x;
        var c2 = a2*other.start.x + b2*other.start.y;

        var det = a1*b2 - a2*b1;
        if (det == 0){
            return false;
        }

        var x = (b2*c1 - b1*c2)/det;
        var y = (a1*c2 - a2*c1)/det;

        return this.containsPoint2(x, y) && other.containsPoint2(x, y);
    }

    containsPoint(p){
        return this.containsPoint2(p.x, p.y);
    }

    containsPoint2(x, y){
        return isValueGreaterThanEqualWithOptions(x, Math.min(this.start.x, this.end.x), PointClosenessThreshold)
            && isValueLessThanEqualWithOptions(x, Math.max(this.start.x, this.end.x), PointClosenessThreshold)
            && isValueGreaterThanEqualWithOptions(y, Math.min(this.start.y, this.end.y), PointClosenessThreshold)
            && isValueLessThanEqualWithOptions(y, Math.max(this.start.y, this.end.y), PointClosenessThreshold);
    }
}