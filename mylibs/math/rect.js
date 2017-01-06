import Point from "./point";
import LineSegment from "./lineSegment";

export default class Rect{
    constructor(x, y, w, h){
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }

    clone(){
        return new Rect(this.x, this.y, this.width, this.height);
    }

    expand(d){
        return new Rect(this.x - d, this.y - d, this.width + 2*d, this.height + 2*d);
    }
    translate(dx, dy){
        if (dx === 0 && dy === 0){
            return this;
        }
        return new Rect(this.x + dx, this.y + dy, this.width, this.height);
    }

    combineMutable(rect){
        var r = this.x + this.width;
        var b = this.y + this.height;
        this.x = Math.min(this.x, rect.x);
        this.y = Math.min(this.y, rect.y);
        this.width = Math.max(r, rect.x + rect.width) - this.x;
        this.height = Math.max(b, rect.y + rect.height) - this.y;
    }
    setPositionMutable(pos){
        this.x = pos.x;
        this.y = pos.y;
    }

    center(){
        return new Point(this.x + this.width/2, this.y + this.height/2);
    }
    topLeft(){
        if (this.x === 0 && this.y === 0){
            return Point.Zero;
        }
        return new Point(this.x, this.y);
    }
    topRight(){
        return new Point(this.x + this.width, this.y);
    }
    bottomRight(){
        return new Point(this.x + this.width, this.y + this.height);
    }
    bottomLeft(){
        return new Point(this.x, this.y + this.height);
    }

    segments(){
        var p1 = this.topLeft();
        var p2 = this.topRight();
        var p3 = this.bottomRight();
        var p4 = this.bottomLeft();

        return [
            new LineSegment(p1, p2),
            new LineSegment(p2, p3),
            new LineSegment(p3, p4),
            new LineSegment(p4, p1)
        ]
    }

    withSize(w, h){
        if (w === this.width && h === this.height){
            return this;
        }
        return new Rect(this.x, this.y, w, h);
    }
    withPosition(x, y){
        if (x === this.x && y === this.y){
            return this;
        }
        return new Rect(x, y, this.width, this.height);
    }

    static fromObject(obj){
        return new Rect(obj.x, obj.y, obj.width, obj.height);
    }
}

Rect.Zero = new Rect(0, 0, 0, 0);