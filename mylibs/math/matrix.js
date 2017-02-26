import Point from "./point";
import LineSegment from "./lineSegment";

/**
 * @name Matrix
 *
 * @class An affine transform performs a linear mapping from 2D coordinates
 * to other 2D coordinates that preserves the "straightness" and
 * "parallelness" of lines.
 *
 * Such a coordinate transformation can be represented by a 3 row by 3
 * column matrix with an implied last row of `[ 0 0 1 ]`. This matrix
 * transforms source coordinates `(x, y)` into destination coordinates `(x',y')`
 * by considering them to be a column vector and multiplying the coordinate
 * vector by the matrix according to the following process:
 *
 *     [ x ]   [ a  c  tx ] [ x ]   [ a * x + c * y + tx ]
 *     [ y ] = [ b  d  ty ] [ y ] = [ b * x + d * y + ty ]
 *     [ 1 ]   [ 0  0  1  ] [ 1 ]   [         1          ]
 *
 * Note the locations of b and c.
 *
 * This class is optimized for speed and minimizes calculations based on its
 * knowledge of the underlying matrix (as opposed to say simply performing
 * matrix multiplication).
 */
class Matrix {


    /**
     * Creates a 2D affine transform.
     *
     */
    constructor(a, b, c, d, tx, ty){
        this._a = a;
        this._b = b;
        this._c = c;
        this._d = d;
        this._tx = tx;
        this._ty = ty;
    }

    /**
     * Sets this transform to the matrix specified by the 6 values.
     *
     * @param {Number} a the a property of the transform
     * @param {Number} b the b property of the transform
     * @param {Number} c the c property of the transform
     * @param {Number} d the d property of the transform
     * @param {Number} tx the tx property of the transform
     * @param {Number} ty the ty property of the transform
     * @return {Matrix} this affine transform
     */
    set(a, b, c, d, tx, ty){
        this._a = a;
        this._b = b;
        this._c = c;
        this._d = d;
        this._tx = tx;
        this._ty = ty;
        return this;
    }

    /**
     * @return {Matrix} a copy of this transform
     */
    clone(){
        return new Matrix(this._a, this._b, this._c, this._d,
            this._tx, this._ty);
    }

    /**
     * Checks whether the two matrices describe the same transformation.
     *
     * @param {Matrix} matrix the matrix to compare this matrix to
     * @return {Boolean} {@true if the matrices are equal}
     */
    equals(mx){
        return mx === this || mx && this._a === mx._a && this._b === mx._b
            && this._c === mx._c && this._d === mx._d
            && this._tx === mx._tx && this._ty === mx._ty;
    }

    /**
     * @return {String} a string representation of this transform
     */
    toString(){
        return '[[' + [(this._a), (this._c),
                (this._tx)].join(', ') + '], ['
            + [(this._b), (this._d),
                (this._ty)].join(', ') + ']]';
    }

    /**
     * Resets the matrix by setting its values to the ones of the identity
     * matrix that results in no transformation.
     */
    reset(){
        this._a = this._d = 1;
        this._b = this._c = this._tx = this._ty = 0;
        return this;
    }


    /**
     * Concatenates this transform with a translate transformation.
     *
     * @name Matrix#translate
     * @function
     * @param {Point} point the vector to translate by
     * @return {Matrix} this affine transform
     */
    /**
     * Concatenates this transform with a translate transformation.
     *
     * @name Matrix#translate
     * @function
     * @param {Number} dx the distance to translate in the x direction
     * @param {Number} dy the distance to translate in the y direction
     * @return {Matrix} this affine transform
     */
    translatePoint(point){
        var x = point.x,
            y = point.y;
        this._tx += x*this._a + y*this._c;
        this._ty += x*this._b + y*this._d;
        return this;
    }

    translate(x, y){
        this._tx += x*this._a + y*this._c;
        this._ty += x*this._b + y*this._d;
        return this;
    }

    scale(sx, sy, ox, oy){
        if (ox || oy)
            this.translate(ox, oy);
        this._a *= sx;
        this._b *= sx;
        this._c *= sy;
        this._d *= sy;
        if (ox || oy)
            this.translate(-ox, -oy);
        return this;
    }


    /**
     * Concatenates this transform with a rotation transformation around an
     * anchor point.
     *
     * @name Matrix#rotate
     * @function
     * @param {Number} angle the angle of rotation measured in degrees
     * @param {Point} center the anchor point to rotate around
     * @return {Matrix} this affine transform
     */
    /**
     * Concatenates this transform with a rotation transformation around an
     * anchor point.
     *
     * @name Matrix#rotate
     * @function
     * @param {Number} angle the angle of rotation measured in degrees
     * @param {Point} center
     * @return {Matrix} this affine transform
     */
    rotatePoint(angle, center = Point.Zero){
        angle *= Math.PI/180;
        // Concatenate rotation matrix into this one
        var x = center.x,
            y = center.y,
            cos = Math.cos(angle),
            sin = Math.sin(angle),
            tx = x - x*cos + y*sin,
            ty = y - x*sin - y*cos,
            a = this._a,
            b = this._b,
            c = this._c,
            d = this._d;
        this._a = cos*a + sin*c;
        this._b = cos*b + sin*d;
        this._c = -sin*a + cos*c;
        this._d = -sin*b + cos*d;
        this._tx += tx*a + ty*c;
        this._ty += tx*b + ty*d;
        return this;
    }

    rotate(angle, cx, cy){
        angle *= Math.PI/180;
        // Concatenate rotation matrix into this one
        var x = cx || 0,
            y = cy || 0,
            cos = Math.cos(angle),
            sin = Math.sin(angle),
            tx = x - x*cos + y*sin,
            ty = y - x*sin - y*cos,
            a = this._a,
            b = this._b,
            c = this._c,
            d = this._d;
        this._a = cos*a + sin*c;
        this._b = cos*b + sin*d;
        this._c = -sin*a + cos*c;
        this._d = -sin*b + cos*d;
        this._tx += tx*a + ty*c;
        this._ty += tx*b + ty*d;
        return this;
    }


    /**
     * Concatenates this transform with a shear transformation.
     *
     * @name Matrix#shear
     * @function
     * @param {Point} shear the shear factor in x and y direction
     * @param {Point} [center] the center for the shear transformation
     * @return {Matrix} this affine transform
     */
    /**
     * Concatenates this transform with a shear transformation.
     *
     * @name Matrix#shear
     * @function
     * @param {Point} shear factor
     * @param {Point} [center] the center for the shear transformation
     * @return {Matrix} this affine transform
     */
    shear(shear, center){
        if (center)
            this.translate(center.x, center.y);
        var a = this._a,
            b = this._b;
        this._a += shear.y*this._c;
        this._b += shear.y*this._d;
        this._c += shear.x*a;
        this._d += shear.x*b;
        if (center){
            var nc = center.negate();
            this.translate(nc.x, nc.y);
        }
        return this;
    }

    /**
     * Concatenates this transform with a skew transformation.
     *
     * @name Matrix#skew
     * @function
     * @param {Point} skew the skew angles in x and y direction in degrees
     * @param {Point} [center] the center for the skew transformation
     * @return {Matrix} this affine transform
     */
    /**
     * Concatenates this transform with a skew transformation.
     *
     * @name Matrix#skew
     * @function
     * @param {Number} hor the horizontal skew angle in degrees
     * @param {Number} ver the vertical skew angle in degrees
     * @param {Point} [center] the center for the skew transformation
     * @return {Matrix} this affine transform
     */
    skew(skew, center){
        var toRadians = Math.PI/180,
            shear = new Point(Math.tan(skew.x*toRadians),
                Math.tan(skew.y*toRadians));
        return this.shear(shear, center);
    }

    /**
     * Appends the specified matrix to this matrix. This is the equivalent of
     * multiplying `(this matrix) * (specified matrix)`.
     *
     * @param {Matrix} matrix the matrix to append
     * @return {Matrix} this matrix, modified
     */
    append(mx){
        var a1 = this._a,
            b1 = this._b,
            c1 = this._c,
            d1 = this._d,
            a2 = mx._a,
            b2 = mx._c,
            c2 = mx._b,
            d2 = mx._d,
            tx2 = mx._tx,
            ty2 = mx._ty;
        this._a = a2*a1 + c2*c1;
        this._c = b2*a1 + d2*c1;
        this._b = a2*b1 + c2*d1;
        this._d = b2*b1 + d2*d1;
        this._tx += tx2*a1 + ty2*c1;
        this._ty += tx2*b1 + ty2*d1;
        return this;
    }

    /**
     * Returns a new matrix as the result of appending the specified matrix to
     * this matrix. This is the equivalent of multiplying
     * `(this matrix) * (specified matrix)`.
     *
     * @param {Matrix} matrix the matrix to append
     * @return {Matrix} the newly created matrix
     */
    appended(mx){
        return this.clone().append(mx);
    }

    /**
     * Prepends the specified matrix to this matrix. This is the equivalent of
     * multiplying `(specified matrix) * (this matrix)`.
     *
     * @param {Matrix} matrix the matrix to prepend
     * @return {Matrix} this matrix, modified
     */
    prepend(mx){
        var a1 = this._a,
            b1 = this._b,
            c1 = this._c,
            d1 = this._d,
            tx1 = this._tx,
            ty1 = this._ty,
            a2 = mx._a,
            b2 = mx._c,
            c2 = mx._b,
            d2 = mx._d,
            tx2 = mx._tx,
            ty2 = mx._ty;
        this._a = a2*a1 + b2*b1;
        this._c = a2*c1 + b2*d1;
        this._b = c2*a1 + d2*b1;
        this._d = c2*c1 + d2*d1;
        this._tx = a2*tx1 + b2*ty1 + tx2;
        this._ty = c2*tx1 + d2*ty1 + ty2;
        return this;
    }

    /**
     * Returns a new matrix as the result of prepending the specified matrix
     * to this matrix. This is the equivalent of multiplying
     * `(specified matrix) s* (this matrix)`.
     *
     * @param {Matrix} matrix the matrix to prepend
     * @return {Matrix} the newly created matrix
     */
    prepended(mx){
        return this.clone().prepend(mx);
    }

    prependedWithScale(sx, sy){
        return this.prepended(Matrix.create().scale(sx, sy));
    }

    prependedWithTranslation(tx, ty){
        return this.prepended(Matrix.create().translate(tx, ty));
    }

    /**
     * Inverts the matrix, causing it to perform the opposite transformation.
     * If the matrix is not invertible (in which case {@link #isSingular()}
     * returns true), `null` is returned.
     *
     * @return {Matrix} this matrix, or `null`, if the matrix is singular.
     */
    invert(){
        var a = this._a,
            b = this._b,
            c = this._c,
            d = this._d,
            tx = this._tx,
            ty = this._ty,
            det = a*d - b*c,
            res = null;
        if (det && !isNaN(det) && isFinite(tx) && isFinite(ty)){
            this._a = d/det;
            this._b = -b/det;
            this._c = -c/det;
            this._d = a/det;
            this._tx = (c*ty - d*tx)/det;
            this._ty = (b*tx - a*ty)/det;
            res = this;
        }
        return res;
    }

    /**
     * Creates a new matrix that is the inversion of this matrix, causing it to
     * perform the opposite transformation. If the matrix is not invertible (in
     * which case {@link #isSingular()} returns true), `null` is returned.
     *
     * @return {Matrix} this matrix, or `null`, if the matrix is singular.
     */
    inverted(){
        return this.clone().invert();
    }


    /**
     * A private helper function to create a clone of this matrix, without the
     * translation factored in.
     *
     * @return {Matrix} a clone of this matrix, with {@link #tx} and {@link #ty}
     * set to `0`.
     */
    _shiftless(){
        return new Matrix(this._a, this._b, this._c, this._d, 0, 0);
    }

    _orNullIfIdentity(){
        return this.isIdentity() ? null : this;
    }

    /**
     * @return {Boolean} whether this transform is the identity transform
     */
    isIdentity(){
        return this._a === 1 && this._b === 0 && this._c === 0 && this._d === 1
            && this._tx === 0 && this._ty === 0;
    }

    /**
     * Returns whether the transform is invertible. A transform is not
     * invertible if the determinant is 0 or any value is non-finite or NaN.
     *
     * @return {Boolean} whether the transform is invertible
     */
    isInvertible(){
        var det = this._a*this._d - this._c*this._b;
        return det && !isNaN(det) && isFinite(this._tx) && isFinite(this._ty);
    }

    /**
     * Checks whether the matrix is singular or not. Singular matrices cannot be
     * inverted.
     *
     * @return {Boolean} whether the matrix is singular
     */
    isSingular(){
        return !this.isInvertible();
    }

    isTranslatedOnly(){
        return this._a === 1 && this._b === 0 && this._c === 0 && this._d === 1;
    }

    /**
     * A faster version of transform that only takes one point and does not
     * attempt to convert it.
     */
    transformPoint(point, round){
        return this.transformPoint2(point.x, point.y, round);
    }

    transformPoint2(x, y, round){
        var px = x*this._a + y*this._c + this._tx;
        var py = x*this._b + y*this._d + this._ty;

        if (round){
            px = Math.round(px);
            py = Math.round(py);
        }
        return new Point(px, py);
    }

    transformRect(rect){
        var p1 = this.transformPoint2(rect.x, rect.y);
        var p2 = this.transformPoint2(rect.x + rect.width, rect.y);
        var p3 = this.transformPoint2(rect.x + rect.width, rect.y + rect.height);
        var p4 = this.transformPoint2(rect.x, rect.y + rect.height);

        return [
            new LineSegment(p1, p2),
            new LineSegment(p2, p3),
            new LineSegment(p3, p4),
            new LineSegment(p4, p1)
        ];
    }

    /**
     * Attempts to decompose the affine transformation described by this matrix
     * into `scaling`, `rotation` and `shearing`, and returns an object with
     * these properties if it succeeded, `null` otherwise.
     *
     * @return {Object} the decomposed matrix, or `null` if decomposition is not
     *     possible
     */
    decompose(){
        // http://dev.w3.org/csswg/css3-2d-transforms/#matrix-decomposition
        // http://www.maths-informatique-jeux.com/blog/frederic/?post/2013/12/01/Decomposition-of-2D-transform-matrices
        // https://github.com/wisec/DOMinator/blob/master/layout/style/nsStyleAnimation.cpp#L946
        var a = this._a,
            b = this._b,
            c = this._c,
            d = this._d,
            det = a*d - b*c,
            sqrt = Math.sqrt,
            atan2 = Math.atan2,
            degrees = 180/Math.PI,
            rotate,
            scale,
            skew;
        if (a !== 0 || b !== 0){
            var r = sqrt(a*a + b*b);
            rotate = Math.acos(a/r)*(b > 0 ? 1 : -1);
            scale = [r, det/r];
            skew = [atan2(a*c + b*d, r*r), 0];
        } else if (c !== 0 || d !== 0){
            var s = sqrt(c*c + d*d);
            // rotate = Math.PI/2 - (d > 0 ? Math.acos(-c/s) : -Math.acos(c/s));
            rotate = Math.asin(c/s)*(d > 0 ? 1 : -1);
            scale = [det/s, s];
            skew = [0, atan2(a*c + b*d, s*s)];
        } else{ // a = b = c = d = 0
            rotate = 0;
            skew = scale = [0, 0];
        }
        return {
            translation: this.getTranslation(),
            rotation: rotate*degrees,
            scaling: new Point(scale[0], scale[1]),
            skewing: new Point(skew[0]*degrees, skew[1]*degrees)
        };
    }

    /**
     * The value that affects the transformation along the x axis when scaling
     * or rotating, positioned at (0, 0) in the transformation matrix.
     *
     * @name Matrix#a
     * @type Number
     */

    /**
     * The value that affects the transformation along the y axis when rotating
     * or skewing, positioned at (1, 0) in the transformation matrix.
     *
     * @name Matrix#b
     * @type Number
     */

    /**
     * The value that affects the transformation along the x axis when rotating
     * or skewing, positioned at (0, 1) in the transformation matrix.
     *
     * @name Matrix#c
     * @type Number
     */

    /**
     * The value that affects the transformation along the y axis when scaling
     * or rotating, positioned at (1, 1) in the transformation matrix.
     *
     * @name Matrix#d
     * @type Number
     */

    /**
     * The distance by which to translate along the x axis, positioned at (2, 0)
     * in the transformation matrix.
     *
     * @name Matrix#tx
     * @type Number
     */

    /**
     * The distance by which to translate along the y axis, positioned at (2, 1)
     * in the transformation matrix.
     *
     * @name Matrix#ty
     * @type Number
     */

    /**
     * The transform values as an array, in the same sequence as they are passed
     * to {@link #initialize(a, b, c, d, tx, ty)}.
     *
     * @bean
     * @type Number[]
     */
    getValues(){
        return [this._a, this._b, this._c, this._d, this._tx, this._ty];
    }

    /**
     * The translation of the matrix as a vector.
     *
     * @bean
     * @type Point
     */
    getTranslation(){
        // No decomposition is required to extract translation.
        return new Point(this._tx, this._ty);
    }

    /**
     * The scaling values of the matrix, if it can be decomposed.
     *
     * @bean
     * @type Point
     * @see #decompose()
     */
    getScaling(){
        return (this.decompose() || {}).scaling;
    }

    /**
     * The rotation angle of the matrix, if it can be decomposed.
     *
     * @bean
     * @type Number
     * @see #decompose()
     */
    getRotation(){
        return (this.decompose() || {}).rotation;
    }

    /**
     * Applies this matrix to the specified Canvas Context.
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    applyToContext(ctx){
        if (!this.isIdentity()){            
            ctx.transform(this._a, this._b, this._c, this._d,
                this._tx, this._ty);
        }
    }

    /**
     * Applies this matrix to the specified Canvas Context.
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    setToContext(ctx){
        if (!this.isIdentity()){
            ctx.setTransform(this._a, this._b, this._c, this._d,
                this._tx, this._ty);
        }
    }

    static create(){
        return new Matrix(1, 0, 0, 1, 0, 0);
    }

    get a(){
        return this._a;
    }

    set a(value){
        this._a = value
    }

    get b(){
        return this._b;
    }

    set b(value){
        this._b = value
    }

    get c(){
        return this._c;
    }

    set c(value){
        this._c = value
    }


    get d(){
        return this._d;
    }

    set d(value){
        this._d = value
    }

    get tx(){
        return this._tx;
    }

    set tx(value){
        this._tx = value
    }

    get ty(){
        return this._ty;
    }

    set ty(value){
        this._ty = value
    }
}

Matrix.Identity = Object.freeze(Matrix.create());

export default Matrix;