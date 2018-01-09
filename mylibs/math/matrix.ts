import Point from "./point";
import LineSegment from "./lineSegment";
import { ICoordinate, IPooledObject, IMatrix } from "carbon-core";
import ObjectPool from "../framework/ObjectPool";

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
class Matrix implements IMatrix, IPooledObject {
    private _m = [1,0,0, 0,1,0, 0,0,1];

    private static pool = new ObjectPool<Matrix>(() => Matrix.create(), 50);

    /**
     * Creates a 2D affine transform.
     *
     */
    constructor(a, b, c, d, tx, ty) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.tx = tx;
        this.ty = ty;
    }

    // /**
    //  * Sets this transform to the matrix specified by the 6 values.
    //  *
    //  * @param {Number} a the a property of the transform
    //  * @param {Number} b the b property of the transform
    //  * @param {Number} c the c property of the transform
    //  * @param {Number} d the d property of the transform
    //  * @param {Number} tx the tx property of the transform
    //  * @param {Number} ty the ty property of the transform
    //  * @return {Matrix} this affine transform
    //  */
    // set(a, b, c, d, tx, ty) {
    //     this.a = a;
    //     this.b = b;
    //     this.c = c;
    //     this.d = d;
    //     this.tx = tx;
    //     this.ty = ty;

    //     return this;
    // }

    /**
     * @return {Matrix} a copy of this transform
     */
    clone() {
        return new Matrix(this.a, this.b, this.c, this.d,
            this.tx, this.ty);
    }

    /**
     * Checks whether the two matrices describe the same transformation.
     *
     * @param {Matrix} matrix the matrix to compare this matrix to
     * @return {Boolean} {@true if the matrices are equal}
     */
    equals(mx) {
        return mx === this || mx && this.a === mx.a && this.b === mx.b
            && this.c === mx.c && this.d === mx.d
            && this.tx === mx.tx && this.ty === mx.ty;
    }

    /**
     * @return {String} a string representation of this transform
     */
    toString() {
        return '[[' + [(this.a), (this.c),
        (this.tx)].join(', ') + '], ['
            + [(this.b), (this.d),
            (this.ty)].join(', ') + ']]';
    }

    /**
     * Resets the matrix by setting its values to the ones of the identity
     * matrix that results in no transformation.
     */
    reset() {
        this._m = [1,0,0,0,1,0,0,0,1];

        return this;
    }

    free() {
        Matrix.pool.free(this);
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
    translatePoint(point) {
        let x = point.x,
            y = point.y;
        this.tx += x * this.a + y * this.c;
        this.ty += x * this.b + y * this.d;

        return this;
    }

    translate(x, y) {
        this.tx += x * this.a + y * this.c;
        this.ty += x * this.b + y * this.d;

        return this;
    }

    scale(sx, sy, ox = undefined, oy = undefined) {
        if (ox || oy) {
            this.translate(ox, oy);
        }

        this.a *= sx;
        this.b *= sx;
        this.c *= sy;
        this.d *= sy;
        if (ox || oy) {
            this.translate(-ox, -oy);
        }

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
    rotatePoint(angle, center = Point.Zero) {
        angle *= Math.PI / 180;
        // Concatenate rotation matrix into this one
        let x = center.x,
            y = center.y,
            cos = Math.cos(angle),
            sin = Math.sin(angle),
            tx = x - x * cos + y * sin,
            ty = y - x * sin - y * cos,
            a = this.a,
            b = this.b,
            c = this.c,
            d = this.d;
        this.a = cos * a + sin * c;
        this.b = cos * b + sin * d;
        this.c = -sin * a + cos * c;
        this.d = -sin * b + cos * d;
        this.tx += tx * a + ty * c;
        this.ty += tx * b + ty * d;

        return this;
    }

    rotate(angle, cx?, cy?) {
        angle *= Math.PI / 180;
        // Concatenate rotation matrix into this one
        let x = cx || 0,
            y = cy || 0,
            cos = Math.cos(angle),
            sin = Math.sin(angle),
            tx = x - x * cos + y * sin,
            ty = y - x * sin - y * cos,
            a = this.a,
            b = this.b,
            c = this.c,
            d = this.d;
        this.a = cos * a + sin * c;
        this.b = cos * b + sin * d;
        this.c = -sin * a + cos * c;
        this.d = -sin * b + cos * d;
        this.tx += tx * a + ty * c;
        this.ty += tx * b + ty * d;

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
    shear(shear, center) {
        if (center) {
            this.translate(center.x, center.y);
        }

        let a = this.a,
            b = this.b;
        this.a += shear.y * this.c;
        this.b += shear.y * this.d;
        this.c += shear.x * a;
        this.d += shear.x * b;
        if (center) {
            let nc = center.negate();
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
    skew(skew, center) {
        let toRadians = Math.PI / 180,
            shear = new Point(Math.tan(skew.x * toRadians),
                Math.tan(skew.y * toRadians));

        return this.shear(shear, center);
    }

    /**
     * Appends the specified matrix to this matrix. This is the equivalent of
     * multiplying `(this matrix) * (specified matrix)`.
     *
     * @param {Matrix} matrix the matrix to append
     * @return {Matrix} this matrix, modified
     */
    append(mx) {
        let a1 = this.a,
            b1 = this.b,
            c1 = this.c,
            d1 = this.d,
            a2 = mx.a,
            b2 = mx.c,
            c2 = mx.b,
            d2 = mx.d,
            tx2 = mx.tx,
            ty2 = mx.ty;
        this.a = a2 * a1 + c2 * c1;
        this.c = b2 * a1 + d2 * c1;
        this.b = a2 * b1 + c2 * d1;
        this.d = b2 * b1 + d2 * d1;
        this.tx += tx2 * a1 + ty2 * c1;
        this.ty += tx2 * b1 + ty2 * d1;

        return this;
    }

    add(mx) {
        for(var i = 0; i < this._m.length; ++i) {
            this._m[i] += mx._m[i];
        }

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
    appended(mx) {
        return this.clone().append(mx);
    }

    /**
     * Prepends the specified matrix to this matrix. This is the equivalent of
     * multiplying `(specified matrix) * (this matrix)`.
     *
     * @param {Matrix} matrix the matrix to prepend
     * @return {Matrix} this matrix, modified
     */
    prepend(mx) {
        let a1 = this.a,
            b1 = this.b,
            c1 = this.c,
            d1 = this.d,
            tx1 = this.tx,
            ty1 = this.ty,
            a2 = mx.a,
            b2 = mx.c,
            c2 = mx.b,
            d2 = mx.d,
            tx2 = mx.tx,
            ty2 = mx.ty;
        this.a = a2 * a1 + b2 * b1;
        this.c = a2 * c1 + b2 * d1;
        this.b = c2 * a1 + d2 * b1;
        this.d = c2 * c1 + d2 * d1;
        this.tx = a2 * tx1 + b2 * ty1 + tx2;
        this.ty = c2 * tx1 + d2 * ty1 + ty2;

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
    prepended(mx) {
        return this.clone().prepend(mx);
    }

    prependedWithScale(sx, sy) {
        return this.prepended(Matrix.create().scale(sx, sy));
    }

    prependedWithTranslation(tx, ty) {
        return this.prepended(Matrix.create().translate(tx, ty));
    }

    /**
     * Inverts the matrix, causing it to perform the opposite transformation.
     * If the matrix is not invertible (in which case {@link #isSingular()}
     * returns true), `null` is returned.
     *
     * @return {Matrix} this matrix, or `null`, if the matrix is singular.
     */
    invert() {
        let a = this.a,
            b = this.b,
            c = this.c,
            d = this.d,
            tx = this.tx,
            ty = this.ty,
            det = a * d - b * c,
            res = null;
        if (det && !isNaN(det) && isFinite(tx) && isFinite(ty)) {
            this.a = d / det;
            this.b = -b / det;
            this.c = -c / det;
            this.d = a / det;
            this.tx = (c * ty - d * tx) / det;
            this.ty = (b * tx - a * ty) / det;
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
    inverted() {
        return this.clone().invert();
    }


    /**
     * A private helper function to create a clone of this matrix, without the
     * translation factored in.
     *
     * @return {Matrix} a clone of this matrix, with {@link #tx} and {@link #ty}
     * set to `0`.
     */
    _shiftless() {
        return new Matrix(this.a, this.b, this.c, this.d, 0, 0);
    }

    _orNullIfIdentity() {
        return this.isIdentity() ? null : this;
    }

    /**
     * @return {Boolean} whether this transform is the identity transform
     */
    isIdentity() {
        return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1
            && this.tx === 0 && this.ty === 0;
    }

    /**
     * Returns whether the transform is invertible. A transform is not
     * invertible if the determinant is 0 or any value is non-finite or NaN.
     *
     * @return {Boolean} whether the transform is invertible
     */
    isInvertible() {
        let det = this.a * this.d - this.c * this.b;

        return det && !isNaN(det) && isFinite(this.tx) && isFinite(this.ty);
    }

    /**
     * Checks whether the matrix is singular or not. Singular matrices cannot be
     * inverted.
     *
     * @return {Boolean} whether the matrix is singular
     */
    isSingular() {
        return !this.isInvertible();
    }

    isTranslatedOnly() {
        return (this.a === 1) && this.b === 0 && this.c === 0 && (this.d === 1);
    }

    /**
     * A faster version of transform that only takes one point and does not
     * attempt to convert it.
     */
    transformPoint(point: ICoordinate, round?: boolean) {
        return this.transformPoint2(point.x, point.y, round);
    }

    transformPoint2(x, y, round = false): Point {
        let point = new Point(x, y);

        return this.transformPointMutable(point, round);
    }

    transformPointMutable(point: Point, round?: boolean) {
        let x = point.x * this.a + point.y * this.c + this.tx;
        let y = point.x * this.b + point.y * this.d + this.ty;

        if (round) {
            x = Math.round(x);
            y = Math.round(y);
        }
        point.set(x, y);

        return point;
    }

    withTranslation(tx, ty): Matrix {
        if (tx === this.tx && ty === this.ty) {
            return this;
        }

        return new Matrix(this.a, this.b, this.c, this.d, tx, ty);
    }
    withRoundedTranslation(): Matrix {
        let ttx = Math.round(this.tx);
        let tty = Math.round(this.ty);

        if (ttx === this.tx && tty === this.ty) {
            return this;
        }

        return new Matrix(this.a, this.b, this.c, this.d, ttx, tty);
    }

    transformRect(rect) {
        let p1 = this.transformPoint2(rect.x, rect.y);
        let p2 = this.transformPoint2(rect.x + rect.width, rect.y);
        let p3 = this.transformPoint2(rect.x + rect.width, rect.y + rect.height);
        let p4 = this.transformPoint2(rect.x, rect.y + rect.height);

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
    decompose() {
        // http://dev.w3.org/csswg/css3-2d-transforms/#matrix-decomposition
        // http://www.maths-informatique-jeux.com/blog/frederic/?post/2013/12/01/Decomposition-of-2D-transform-matrices
        // https://github.com/wisec/DOMinator/blob/master/layout/style/nsStyleAnimation.cpp#L946
        let a = this.a,
            b = this.b,
            c = this.c,
            d = this.d,
            det = a * d - b * c,
            sqrt = Math.sqrt,
            atan2 = Math.atan2,
            degrees = 180 / Math.PI,
            rotate,
            scale,
            skew;
        if (a !== 0 || b !== 0) {
            let r = sqrt(a * a + b * b);
            rotate = Math.acos(a / r) * (b > 0 ? 1 : -1);
            scale = [r, det / r];
            skew = [atan2(a * c + b * d, r * r), 0];
        } else if (c !== 0 || d !== 0) {
            let s = sqrt(c * c + d * d);
            // rotate = Math.PI/2 - (d > 0 ? Math.acos(-c/s) : -Math.acos(c/s));
            rotate = Math.asin(c / s) * (d > 0 ? 1 : -1);
            scale = [det / s, s];
            skew = [0, atan2(a * c + b * d, s * s)];
        } else { // a = b = c = d = 0
            rotate = 0;
            skew = scale = [0, 0];
        }

        return {
            translation: this.getTranslation(),
            rotation: rotate * degrees,
            scaling: new Point(scale[0], scale[1]),
            skewing: new Point(skew[0] * degrees, skew[1] * degrees)
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
    getValues() {
        return [this.a, this.b, this.c, this.d, this.tx, this.ty];
    }

    /**
     * The translation of the matrix as a vector.
     *
     * @bean
     * @type Point
     */
    getTranslation() {
        // No decomposition is required to extract translation.
        return new Point(this.tx, this.ty);
    }

    /**
     * The scaling values of the matrix, if it can be decomposed.
     *
     * @bean
     * @type Point
     * @see #decompose()
     */
    getScaling() {
        return this.decompose().scaling;
    }

    /**
     * The rotation angle of the matrix, if it can be decomposed.
     *
     * @bean
     * @type Number
     * @see #decompose()
     */
    getRotation() {
        return this.decompose().rotation;
    }

    /**
     * Applies this matrix to the specified Canvas Context.
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    applyToContext(ctx) {
        if (!this.isIdentity()) {
            ctx.transform(this.a, this.b, this.c, this.d,
                this.tx, this.ty);
        }
    }

    /**
     * Applies this matrix to the specified Canvas Context.
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    setToContext(ctx) {
        if (!this.isIdentity()) {
            ctx.setTransform(this.a, this.b, this.c, this.d,
                this.tx, this.ty);
        }
    }

    toArray2() {
        return [[this.a, this.b, this.tx], [this.c, this.d, this.ty], [0, 0, 1]];
    }

    static create() {
        return new Matrix(1, 0, 0, 1, 0, 0);
    }

    static allocate() {
        return Matrix.pool.allocate();
    }

    get a() {
        return this._m[0];
    }

    set a(value) {
        this._m[0] = value
    }

    get b() {
        return this._m[3];
    }

    set b(value) {
        this._m[3] = value
    }

    get c() {
        return this._m[1];
    }

    set c(value) {
        this._m[1] = value
    }


    get d() {
        return this._m[4];
    }

    set d(value) {
        this._m[4] = value
    }

    get tx() {
        return this._m[2];
    }

    set tx(value) {
        this._m[2] = value
    }

    get ty() {
        return this._m[5];
    }

    set ty(value) {
        this._m[5] = value
    }

    get(i,j) {
        return this._m[i+j*3];
    }

    set(i,j, value) {
        this._m[i+j*3] = value;
    }

    static fromObject(value): Matrix {
        if(value.hasOwnProperty("_m")) {
            var m = new Matrix(value._m[0], value._m[3], value._m[1], value._m[4], value._m[2], value._m[5]);
            return m;
        }
        else if(value.hasOwnProperty("a"))
        {
            return new Matrix(value.a, value.b, value.c, value.d, value.tx, value.ty);
        } else {
            return new Matrix(value._a,value._b, value._c,value._d, value._tx, value._ty);
        }
    }

    static createTranslationMatrix(tx: number, ty: number) {
        return Matrix.create().translate(tx, ty);
    }

    static Identity: Matrix;
}

Matrix.Identity = Object.freeze(Matrix.create()) as any;

export default Matrix;