    //TODO: replace with math/rect
    function Rect(l, t, w, h) {
        this.l = l;
        this.t = t;
        this.w = w;
        this.h = h;
        this.r = l + w;
        this.b = t + h;
    }

    Rect.prototype.l = null;
    Rect.prototype.t = null;
    Rect.prototype.w = null;
    Rect.prototype.h = null;
    Rect.prototype.r = null;
    Rect.prototype.b = null;

    Rect.prototype.contains = function(x, y) {
        return x >= this.l && x < (this.l + this.w) &&
            y >= this.t && y < (this.t + this.h);

    };

    Rect.prototype.stroke = function(ctx) {
        ctx.strokeRect(this.l, this.t, this.w, this.h);
    };

    Rect.prototype.fill = function(ctx, scaleW = 1) {
        ctx.fillRect(this.l, this.t, this.w * scaleW, this.h);
    };

    Rect.prototype.offset = function(x, y) {
        return new Rect(this.l + x, this.t + y, this.w, this.h);
    };

    Rect.prototype.equals = function(other) {
        return this.l === other.l && this.t === other.t &&
               this.w === other.w && this.h === other.h;
    }

    Rect.prototype.center = function() {
        return { x: this.l + this.w/2, y: this.t + this.h/2 };
    }

export default Rect;
