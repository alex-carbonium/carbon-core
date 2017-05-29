import { isValueLessThanEqualWithOptions, PointClosenessThreshold, isValueGreaterThanEqualWithOptions } from "./geometry";
import { ICoordinate } from "carbon-core";

export default class LineSegment {
    constructor(public start: ICoordinate, public end: ICoordinate) {
    }

    intersects(other:LineSegment):boolean {
        let a1 = this.end.y - this.start.y;
        let b1 = this.start.x - this.end.x;
        let c1 = a1 * this.start.x + b1 * this.start.y;

        let a2 = other.end.y - other.start.y;
        let b2 = other.start.x - other.end.x;
        let c2 = a2 * other.start.x + b2 * other.start.y;

        let det = a1 * b2 - a2 * b1;
        if (det === 0) {
            return false;
        }

        let x = (b2 * c1 - b1 * c2) / det;
        let y = (a1 * c2 - a2 * c1) / det;

        return this.containsPoint2(x, y) && other.containsPoint2(x, y);
    }

    containsPoint(p:ICoordinate):boolean {
        return this.containsPoint2(p.x, p.y);
    }

    containsPoint2(x:number, y:number):boolean {
        return isValueGreaterThanEqualWithOptions(x, Math.min(this.start.x, this.end.x), PointClosenessThreshold)
            && isValueLessThanEqualWithOptions(x, Math.max(this.start.x, this.end.x), PointClosenessThreshold)
            && isValueGreaterThanEqualWithOptions(y, Math.min(this.start.y, this.end.y), PointClosenessThreshold)
            && isValueLessThanEqualWithOptions(y, Math.max(this.start.y, this.end.y), PointClosenessThreshold);
    }
}