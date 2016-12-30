import Point from "./point";

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

    center(){
        return new Point(this.x + this.width/2, this.y + this.height/2);
    }
    topLeft(){
        if (this.x === 0 && this.y === 0){
            return Point.Zero;
        }
        return new Point(this.x, this.y);
    }

    withSize(w, h){
        return new Rect(this.x, this.y, w, h);
    }

    static fromObject(obj){
        return new Rect(obj.x, obj.y, obj.width, obj.height);
    }
}

Rect.Zero = new Rect(0, 0, 0, 0);