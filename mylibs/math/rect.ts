import Point from "./point";
import LineSegment from "./lineSegment";
import { isRectInRect, isPointInRect, areRectsIntersecting } from "./math";
import { IRect, ICoordinate, Origin, IPooledObject, IRectData } from "carbon-core";
import ObjectPool from "../framework/ObjectPool";
import { PooledPair } from "../framework/PooledPair";

export default class Rect implements IRect, IPooledObject {
    private static pool = new ObjectPool(() => Rect.create(), 50);

    x: number;
    y: number;
    width: number;
    height: number;

    constructor(x: number, y: number, w: number, h: number) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }

    clone() {
        return new Rect(this.x, this.y, this.width, this.height);
    }

    expand(d) {
        return new Rect(this.x - d, this.y - d, this.width + 2 * d, this.height + 2 * d);
    }

    withMargins(l, t, r, b) {
        return new Rect(this.x - l, this.y - t, this.width + l + r, this.height + t + b);
    }

    translate(dx, dy) {
        if (dx === 0 && dy === 0) {
            return this;
        }
        return new Rect(this.x + dx, this.y + dy, this.width, this.height);
    }
    scale(s: ICoordinate, o: ICoordinate) {
        return new Rect(s.x * (this.x - o.x) + o.x, s.y * (this.y - o.y) + o.y, this.width * s.x, this.height * s.y);
    }

    round() {
        let l = Math.round(this.x);
        let r = Math.round(this.x + this.width);
        let t = Math.round(this.y);
        let b = Math.round(this.y + this.height);

        if (l === this.x && r === this.x + this.width && t === this.y && b === this.y + this.height) {
            return this;
        }
        return new Rect(l, t, r - l, b - t);
    }

    roundPosition() {
        let l = Math.round(this.x);
        let t = Math.round(this.y);

        if (l === this.x && t === this.y) {
            return this;
        }
        return new Rect(l, t, this.width, this.height);
    }

    roundMutable() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        this.width = Math.round(this.width);
        this.height = Math.round(this.height);
        return this;
    }

    roundSize() {
        let w = Math.round(this.width);
        let h = Math.round(this.height);

        if (w === this.width && h === this.height) {
            return this;
        }
        return new Rect(this.x, this.y, w, h);
    }

    roundSizeMutable() {
        this.width = Math.round(this.width);
        this.height = Math.round(this.height);
    }

    containsRect(other: IRect) {
        return isRectInRect(other, this);
    }

    containsPoint(point:ICoordinate) {
        return isPointInRect(this, point);
    }

    equals(other) {
        return other === this || this.x === other.x && this.y === other.y && this.width === other.width && this.height === other.height;
    }

    combine(rect: IRect) {
        if(!rect.isValid()) {
            return this;
        }

        let x = Math.min(this.x, rect.x);
        let y = Math.min(this.y, rect.y);
        let r = Math.max(this.x + this.width, rect.x + rect.width);
        let b = Math.max(this.y + this.height, rect.y + rect.height);
        return new Rect(x, y, r - x, b - y);
    }

    combineMutable(rect) {
        let r = this.x + this.width;
        let b = this.y + this.height;
        this.x = Math.min(this.x, rect.x);
        this.y = Math.min(this.y, rect.y);
        this.width = Math.max(r, rect.x + rect.width) - this.x;
        this.height = Math.max(b, rect.y + rect.height) - this.y;
    }
    setPositionMutable(pos) {
        this.x = pos.x;
        this.y = pos.y;
    }

    updateFromPointsMutable(p1, p2) {
        let x = Math.min(p1.x, p2.x);
        let y = Math.min(p1.y, p2.y);
        let w = Math.max(p1.x, p2.x) - x;
        let h = Math.max(p1.y, p2.y) - y;
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }

    center() {
        return new Point(this.x + this.width / 2, this.y + this.height / 2);
    }
    centerLeft() {
        return new Point(this.x, this.y + this.height / 2);
    }
    centerTop() {
        return new Point(this.x + this.width / 2, this.y);
    }
    centerX() {
        return this.x + this.width / 2;
    }
    centerY() {
        return this.y + this.height / 2;
    }

    origin(origin: Origin): Readonly<Point> {
        switch (origin) {
            case Origin.Center:
                return this.center();
            case Origin.TopLeft:
                return this.topLeft();
        }
        throw new Error("wrong origin " + origin);
    }

    right(): number {
        return this.x + this.width;
    }
    bottom(): number {
        return this.y + this.height;
    }

    topLeft(): Readonly<Point> {
        if (this.x === 0 && this.y === 0) {
            return Point.Zero;
        }
        return new Point(this.x, this.y);
    }
    topRight() {
        return new Point(this.x + this.width, this.y);
    }
    bottomRight() {
        return new Point(this.x + this.width, this.y + this.height);
    }
    bottomLeft() {
        return new Point(this.x, this.y + this.height);
    }

    segments() {
        let p1 = this.topLeft();
        let p2 = this.topRight();
        let p3 = this.bottomRight();
        let p4 = this.bottomLeft();

        return [
            new LineSegment(p1, p2),
            new LineSegment(p2, p3),
            new LineSegment(p3, p4),
            new LineSegment(p4, p1)
        ]
    }

    withSize(w, h) {
        if (w === this.width && h === this.height) {
            return this;
        }
        return new Rect(this.x, this.y, w, h);
    }
    withWidth(w) {
        if (w === this.width) {
            return this;
        }
        return new Rect(this.x, this.y, w, this.height);
    }
    withHeight(h) {
        if (h === this.height) {
            return this;
        }
        return new Rect(this.x, this.y, this.width, h);
    }
    withPosition(x: number, y: number) {
        if (x === this.x && y === this.y) {
            return this;
        }
        return new Rect(x, y, this.width, this.height);
    }

    with(x: number, y: number, w: number, h: number) {
        if (x === this.x && y === this.y && w === this.width && h === this.height) {
            return this;
        }
        return new Rect(x, y, w, h);
    }

    toArray() {
        return [this.x, this.y, this.width, this.height];
    }

    intersect(other: IRect): Rect | null {
        let l = Math.max(this.x, other.x);
        let t = Math.max(this.y, other.y);
        let r = Math.min(this.x + this.width, other.x + other.width);
        let b = Math.min(this.y + this.height, other.y + other.height);
        if (l < r && t < b) {
            return new Rect(l, t, r - l, b - t);
        }
        return null;
    }

    isIntersecting(other: IRect): boolean {
        return areRectsIntersecting(this, other);
    }

    fit(bounds: IRect, noScaleUp?: boolean): Rect {
        return this.fitOrFill(bounds, noScaleUp, true);
    }
    fill(bounds: IRect, noScaleUp?: boolean): Rect {
        return this.fitOrFill(bounds, noScaleUp, false);
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
    }

    free() {
        Rect.pool.free(this);
    }

    isValid() {
        return !isNaN(this.x) && !isNaN(this.y) && !isNaN(this.width) && !isNaN(this.height);
    }

    private fitOrFill(target: IRect, noScaleUp, fit): Rect {
        let pw = target.width / this.width;
        let ph = target.height / this.height;

        let p;
        if (fit) {
            p = ph < pw ? ph : pw;
        }
        else {
            p = ph > pw ? ph : pw;
        }

        if (p > 1 && noScaleUp) {
            return this;
        }

        let w2 = this.width * p;
        let h2 = this.height * p;
        return new Rect(
            target.x + (target.width - w2) / 2,
            target.y + (target.height - h2) / 2,
            w2,
            h2
        );
    }

    static fromObject(obj) {
        return new Rect(obj.x, obj.y, obj.width, obj.height);
    }

    static create() {
        return new Rect(0, 0, 0, 0);
    }

    static fromPoints(p1, p2) {
        let rect = Rect.create();
        rect.updateFromPointsMutable(p1, p2);
        return rect;
    }

    static fromSize(width: number, height: number) {
        return new Rect(0, 0, width, height);
    }

    static allocate() {
        return Rect.pool.allocate();
    }

    static allocateFromRect(rect: IRectData) {
        let result = Rect.allocate();
        result.x = rect.x;
        result.y = rect.y;
        result.width = rect.width;
        result.height = rect.height;
        return result;
    }

    static createPair() {
        return new PooledPair(() => new Rect(0, 0, 0, 0));
    }

    static Zero: Rect;
    static Max: Rect;
}

Rect.Zero = new Rect(0, 0, 0, 0);
Rect.Max = new Rect(-Number.MAX_VALUE/2, -Number.MAX_VALUE/2, Number.MAX_VALUE, Number.MAX_VALUE);