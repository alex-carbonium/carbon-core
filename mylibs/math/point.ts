import { IPoint } from "carbon-geometry";

const EPSILON = 1e-12;
const TRIGONOMETRIC_EPSILON = 1e-7;

function isZero(val) {
    return val >= -EPSILON && val <= EPSILON;
}
/**
 * @name Point
 *
 * @class The Point object represents a point in the two dimensional space
 * of the Paper.js project. It is also used to represent two dimensional
 * vector objects.
 *
 * @classexample
 * // Create a point at x: 10, y: 5
 * let point = new Point(10, 5);
 * console.log(point.x); // 10
 * console.log(point.y); // 5
 */
export default class Point implements IPoint {
    x: number;
    y: number;

    private _angle: number;
    /**
     * Creates a Point object with the given x and y coordinates.
     *
     * @name Point#initialize
     * @param {Number} x the x coordinate
     * @param {Number} y the y coordinate
     *
     * @example
     * // Create a point at x: 10, y: 5
     * let point = new Point(10, 5);
     * console.log(point.x); // 10
     * console.log(point.y); // 5
     */
    /**
     * Creates a Point object using the numbers in the given array as
     * coordinates.
     *
     * @name Point#initialize
     * @param {array} array
     *
     * @example
     * // Creating a point at x: 10, y: 5 using an array of numbers:
     * let array = [10, 5];
     * let point = new Point(array);
     * console.log(point.x); // 10
     * console.log(point.y); // 5
     *
     * @example
     * // Passing an array to a functionality that expects a point:
     *
     * // Create a circle shaped path at x: 50, y: 50
     * // with a radius of 30:
     * let path = new Path.Circle([50, 50], 30);
     * path.fillColor = 'red';
     *
     * // Which is the same as doing:
     * let path = new Path.Circle(new Point(50, 50), 30);
     * path.fillColor = 'red';
     */
    /**
     * Creates a Point object using the properties in the given object.
     *
     * @name Point#initialize
     * @param {Object} object the object describing the point's properties
     *
     * @example
     * // Creating a point using an object literal with length and angle
     * // properties:
     *
     * let point = new Point({
     *     length: 10,
     *     angle: 90
     * });
     * console.log(point.length); // 10
     * console.log(point.angle); // 90
     *
     * @example
     * // Creating a point at x: 10, y: 20 using an object literal:
     *
     * let point = new Point({
     *     x: 10,
     *     y: 20
     * });
     * console.log(point.x); // 10
     * console.log(point.y); // 20
     *
     * @example
     * // Passing an object to a functionality that expects a point:
     *
     * let center = {
     *     x: 50,
     *     y: 50
     * };
     *
     * // Creates a circle shaped path at x: 50, y: 50
     * // with a radius of 30:
     * let path = new Path.Circle(center, 30);
     * path.fillColor = 'red';
     */
    /**
     * Creates a Point object using the width and height values of the given
     * Size object.
     *
     * @name Point#initialize
     * @param {Size} size
     *
     * @example
     * // Creating a point using a size object.
     *
     * // Create a Size with a width of 100pt and a height of 50pt
     * let size = new Size(100, 50);
     * console.log(size); // { width: 100, height: 50 }
     * let point = new Point(size);
     * console.log(point); // { x: 100, y: 50 }
     */
    /**
     * Creates a Point object using the coordinates of the given Point object.
     *
     * @param {Point} point
     * @name Point#initialize
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * The x coordinate of the point
     *
     * @name Point#x
     * @type Number
     */

    /**
     * The y coordinate of the point
     *
     * @name Point#y
     * @type Number
     */

    set(x: number, y: number) {
        this.x = x;
        this.y = y;

        return this;
    }

    /**
     * Checks whether the coordinates of the point are equal to that of the
     * supplied point.
     *
     * @param {Point} point
     * @return {Boolean} {@true if the points are equal}
     *
     * @example
     * let point = new Point(5, 10);
     * console.log(point == new Point(5, 10)); // true
     * console.log(point == new Point(1, 1)); // false
     * console.log(point != new Point(1, 1)); // true
     */
    equals(point) {
        return this === point || point
            && (this.x === point.x && this.y === point.y
                || Array.isArray(point)
                && this.x === point[0] && this.y === point[1])
            || false;
    }

    /**
     * Returns a copy of the point.
     *
     * @example
     * let point1 = new Point();
     * let point2 = point1;
     * point2.x = 1; // also changes point1.x
     *
     * let point2 = point1.clone();
     * point2.x = 1; // doesn't change point1.x
     *
     * @return {Point} the cloned point
     */
    clone() {
        return new Point(this.x, this.y);
    }

    /**
     * @return {String} a string representation of the point
     */
    toString() {
        return '{ x: ' + (this.x) + ', y: ' + (this.y) + ' }';
    }

    /**
     * The length of the vector that is represented by this point's coordinates.
     * Each point can be interpreted as a vector that points from the origin (`x
     * = 0`, `y = 0`) to the point's location. Setting the length changes the
     * location but keeps the vector's angle.
     *
     * @bean
     * @type Number
     */
    getLength() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    setLength(length) {
        // Whenever chaining both x & y, use #set() instead of direct
        // assignment, so LinkedPoint does not report changes twice.
        if (this.isZero()) {
            let angle = this._angle || 0;
            this.set(
                Math.cos(angle) * length,
                Math.sin(angle) * length
            );
        } else {
            let scale = length / this.getLength();
            // Force calculation of angle now, so it will be preserved even when
            // x and y are 0
            if (isZero(scale)) {
                this.getAngle(Point.Zero);
            }
            this.set(
                this.x * scale,
                this.y * scale
            );
        }
    }

    /**
     * Returns the smaller angle between two vectors. The angle is unsigned, no
     * information about rotational direction is given.
     *
     * @name Point#getAngle
     * @function
     * @param {Point} point
     * @return {Number} the angle in degrees
     */
    /**
     * The vector's angle in degrees, measured from the x-axis to the vector.
     *
     * @bean
     * @name Point#getAngle
     * @type Number
     */
    getAngle(point) {
        return this.getAngleInRadians(point) * 180 / Math.PI;
    }

    setAngle(angle) {
        this.setAngleInRadians.call(this, angle * Math.PI / 180);
        return this;
    }

    /**
     * Returns the smaller angle between two vectors in radians. The angle is
     * unsigned, no information about rotational direction is given.
     *
     * @name Point#getAngleInRadians
     * @function
     * @param {Point} point
     * @return {Number} the angle in radians
     */
    /**
     * The vector's angle in radians, measured from the x-axis to the vector.
     *
     * @bean
     * @name Point#getAngleInRadians
     * @type Number
     */
    getAngleInRadians(point) {
        if (!arguments.length) {
            return this.isZero()
                // Return the preserved angle in case the vector has no
                // length, and update the internal _angle in case the
                // vector has a length. See #setAngle() for more
                // explanations.
                ? this._angle || 0
                : this._angle = Math.atan2(this.y, this.x);
        } else {
            let div = this.getLength() * point.getLength();
            if (isZero(div)) {
                return NaN;
            } else {
                let a = this.dot(point) / div;

                return Math.acos(a < -1 ? -1 : a > 1 ? 1 : a);
            }
        }
    }

    setAngleInRadians(angle) {
        // We store a reference to _angle internally so we still preserve it
        // when the vector's length is set to zero, and then anything else.
        // Note that we cannot rely on it if x and y are something else than 0,
        // since updating x / y does not automatically change _angle!
        this._angle = angle;
        if (!this.isZero()) {
            let length = this.getLength();
            // Use #set() instead of direct assignment of x/y, so LinkedPoint
            // does not report changes twice.
            this.set(
                Math.cos(angle) * length,
                Math.sin(angle) * length
            );
        }

        return this;
    }

    /**
     * The quadrant of the {@link #angle} of the point.
     *
     * Angles between 0 and 90 degrees are in quadrant `1`. Angles between 90
     * and 180 degrees are in quadrant `2`, angles between 180 and 270 degrees
     * are in quadrant `3` and angles between 270 and 360 degrees are in
     * quadrant `4`.
     *
     * @bean
     * @type Number
     *
     * @example
     * let point = new Point({
     *     angle: 10,
     *     length: 20
     * });
     * console.log(point.quadrant); // 1
     *
     * point.angle = 100;
     * console.log(point.quadrant); // 2
     *
     * point.angle = 190;
     * console.log(point.quadrant); // 3
     *
     * point.angle = 280;
     * console.log(point.quadrant); // 4
     */
    getQuadrant() {
        return this.x >= 0 ? this.y >= 0 ? 1 : 4 : this.y >= 0 ? 2 : 3;
    }

    /**
     * Returns the angle between two vectors. The angle is directional and
     * signed, giving information about the rotational direction.
     *
     * Read more about angle units and orientation in the description of the
     * {@link #angle} property.
     *
     * @param {Point} point
     * @return {Number} the angle between the two vectors
     */
    getDirectedAngle(point) {
        return Math.atan2(this.cross(point), this.dot(point)) * 180 / Math.PI;
    }

    /**
     * Returns the distance between the point and another point.
     *
     * @param {Point} point
     * @return {Number}
     */
    getDistance(point) {
        return Math.sqrt(this.getDistanceSquared(point));
    }

    getDistanceSquared(point) {
        let x = point.x - this.x,
            y = point.y - this.y,
            d = x * x + y * y;

        return d;
    }

    getDistance2(x, y) {
        return Math.sqrt(this.getDistanceSquared2(x, y));
    }

    getDistanceSquared2(x, y) {
        let dx = x - this.x,
            dy = y - this.y,
            d = dx * dx + dy * dy;

        return d;
    }

    /**
     * Normalize modifies the {@link #length} of the vector to `1` without
     * changing its angle and returns it as a new point. The optional `length`
     * parameter defines the length to normalize to. The object itself is not
     * modified!
     *
     * @param {Number} [length=1] The length of the normalized vector
     * @return {Point} the normalized vector of the vector that is represented
     *     by this point's coordinates
     */
    normalize(length) {
        if (length === undefined) {
            length = 1;
        }

        let current = this.getLength(),
            scale = current !== 0 ? length / current : 0,
            point = new Point(this.x * scale, this.y * scale);
        // Preserve angle.
        if (scale >= 0) {
            point._angle = this._angle;
        }

        return point;
    }

    /**
     * Rotates the point by the given angle around an optional center point.
     * The object itself is not modified.
     *
     * Read more about angle units and orientation in the description of the
     * {@link #angle} property.
     *
     * @param {Number} angle the rotation angle
     * @param {Point} center the center point of the rotation
     * @return {Point} the rotated point
     */
    rotate(angle, center) {
        if (angle === 0) {
            return this.clone();
        }

        angle = angle * Math.PI / 180;
        let point = center ? this.subtract(center) : this,
            sin = Math.sin(angle),
            cos = Math.cos(angle);
        point = new Point(
            point.x * cos - point.y * sin,
            point.x * sin + point.y * cos
        );
        return center ? point.add(center) : point;
    }

    /**
     * Transforms the point by the matrix as a new point. The object itself is
     * not modified!
     *
     * @param {Matrix} matrix
     * @return {Point} the transformed point
     */
    transform(matrix) {
        return matrix ? matrix._transformPoint(this) : this;
    }

    /**
     * Returns the addition of the supplied value to both coordinates of
     * the point as a new point.
     * The object itself is not modified!
     *
     * @name Point#add
     * @function
     * @operator
     * @param {Number} number the number to add
     * @return {Point} the addition of the point and the value as a new point
     *
     * @example
     * let point = new Point(5, 10);
     * let result = point + 20;
     * console.log(result); // {x: 25, y: 30}
     */
    /**
     * Returns the addition of the supplied point to the point as a new
     * point.
     * The object itself is not modified!
     *
     * @name Point#add
     * @function
     * @operator
     * @param {Point} point the point to add
     * @return {Point} the addition of the two points as a new point
     *
     * @example
     * let point1 = new Point(5, 10);
     * let point2 = new Point(10, 20);
     * let result = point1 + point2;
     * console.log(result); // {x: 15, y: 30}
     */
    add(point) {
        return new Point(this.x + point.x, this.y + point.y);
    }

    add2(x, y) {
        return new Point(this.x + x, this.y + y);
    }

    addMutable(point) {
        return this.addMutable2(point.x, point.y);
    }

    addMutable2(x, y) {
        this.x += x;
        this.y += y;
        return this;
    }

    /**
     * Returns the subtraction of the supplied value to both coordinates of
     * the point as a new point.
     * The object itself is not modified!
     *
     * @name Point#subtract
     * @function
     * @operator
     * @param {Number} number the number to subtract
     * @return {Point} the subtraction of the point and the value as a new point
     *
     * @example
     * let point = new Point(10, 20);
     * let result = point - 5;
     * console.log(result); // {x: 5, y: 15}
     */
    /**
     * Returns the subtraction of the supplied point to the point as a new
     * point.
     * The object itself is not modified!
     *
     * @name Point#subtract
     * @function
     * @operator
     * @param {Point} point the point to subtract
     * @return {Point} the subtraction of the two points as a new point
     *
     * @example
     * let firstPoint = new Point(10, 20);
     * let secondPoint = new Point(5, 5);
     * let result = firstPoint - secondPoint;
     * console.log(result); // {x: 5, y: 15}
     */
    subtract(point) {
        return new Point(this.x - point.x, this.y - point.y);
    }

    subtractMutable(point) {
        this.x -= point.x;
        this.y -= point.y;
        return this;
    }

    /**
     * Returns the multiplication of the supplied value to both coordinates of
     * the point as a new point.
     * The object itself is not modified!
     *
     * @name Point#multiply
     * @function
     * @operator
     * @param {Number} number the number to multiply by
     * @return {Point} the multiplication of the point and the value as a new
     *     point
     *
     * @example
     * let point = new Point(10, 20);
     * let result = point * 2;
     * console.log(result); // {x: 20, y: 40}
     */
    /**
     * Returns the multiplication of the supplied point to the point as a new
     * point.
     * The object itself is not modified!
     *
     * @name Point#multiply
     * @function
     * @operator
     * @param {Point} point the point to multiply by
     * @return {Point} the multiplication of the two points as a new point
     *
     * @example
     * let firstPoint = new Point(5, 10);
     * let secondPoint = new Point(4, 2);
     * let result = firstPoint * secondPoint;
     * console.log(result); // {x: 20, y: 20}
     */
    multiply(point) {
        return new Point(this.x * point.x, this.y * point.y);
    }

    /**
     * Returns the division of the supplied value to both coordinates of
     * the point as a new point.
     * The object itself is not modified!
     *
     * @name Point#divide
     * @function
     * @operator
     * @param {Number} number the number to divide by
     * @return {Point} the division of the point and the value as a new point
     *
     * @example
     * let point = new Point(10, 20);
     * let result = point / 2;
     * console.log(result); // {x: 5, y: 10}
     */
    /**
     * Returns the division of the supplied point to the point as a new
     * point.
     * The object itself is not modified!
     *
     * @name Point#divide
     * @function
     * @operator
     * @param {Point} point the point to divide by
     * @return {Point} the division of the two points as a new point
     *
     * @example
     * let firstPoint = new Point(8, 10);
     * let secondPoint = new Point(2, 5);
     * let result = firstPoint / secondPoint;
     * console.log(result); // {x: 4, y: 2}
     */
    divide(point) {
        return new Point(this.x / point.x, this.y / point.y);
    }

    /**
     * The modulo operator returns the integer remainders of dividing the point
     * by the supplied value as a new point.
     *
     * @name Point#modulo
     * @function
     * @operator
     * @param {Number} value
     * @return {Point} the integer remainders of dividing the point by the value
     * as a new point
     *
     * @example
     * let point = new Point(12, 6);
     * console.log(point % 5); // {x: 2, y: 1}
     */
    /**
     * The modulo operator returns the integer remainders of dividing the point
     * by the supplied value as a new point.
     *
     * @name Point#modulo
     * @function
     * @operator
     * @param {Point} point
     * @return {Point} the integer remainders of dividing the points by each
     * other as a new point
     *
     * @example
     * let point = new Point(12, 6);
     * console.log(point % new Point(5, 2)); // {x: 2, y: 0}
     */
    modulo(point) {
        return new Point(this.x % point.x, this.y % point.y);
    }

    negate() {
        return new Point(-this.x, -this.y);
    }


    /**
     * Checks if the point is within a given distance of another point.
     *
     * @param {Point} point the point to check against
     * @param {Number} tolerance the maximum distance allowed
     * @return {Boolean} {@true if it is within the given distance}
     */
    isClose(point, tolerance) {
        return this.getDistance(point) < tolerance;
    }

    /**
     * Checks if the vector represented by this point is collinear (parallel) to
     * another vector.
     *
     * @param {Point} point the vector to check against
     * @return {Boolean} {@true it is collinear}
     */
    isCollinear(point) {
        return Point.isCollinear(this.x, this.y, point.x, point.y);
    }

    /**
     * Checks if the vector represented by this point is orthogonal
     * (perpendicular) to another vector.
     *
     * @param {Point} point the vector to check against
     * @return {Boolean} {@true it is orthogonal}
     */
    isOrthogonal(point) {
        return Point.isOrthogonal(this.x, this.y, point.x, point.y);
    }

    /**
     * Checks if this point has both the x and y coordinate set to 0.
     *
     * @return {Boolean} {@true if both x and y are 0}
     */
    isZero() {
        return isZero(this.x) && isZero(this.y);
    }

    /**
     * Checks if this point has an undefined value for at least one of its
     * coordinates.
     *
     * @return {Boolean} {@true if either x or y are not a number}
     */
    isNaN() {
        return isNaN(this.x) || isNaN(this.y);
    }

    /**
     * {@grouptitle Vector Math Functions}
     * Returns the dot product of the point and another point.
     *
     * @param {Point} point
     * @return {Number} the dot product of the two points
     */
    dot(point) {
        return this.x * point.x + this.y * point.y;
    }

    /**
     * Returns the cross product of the point and another point.
     *
     * @param {Point} point
     * @return {Number} the cross product of the two points
     */
    cross(point) {
        return this.x * point.y - this.y * point.x;
    }

    /**
     * Returns the projection of the point onto another point.
     * Both points are interpreted as vectors.
     *
     * @param {Point} point
     * @return {Point} the projection of the point onto another point
     */
    project(point) {
        let scale = point.isZero() ? 0 : this.dot(point) / point.dot(point);

        return new Point(
            point.x * scale,
            point.y * scale
        );
    }


    /**
     * Returns a new point object with the smallest {@link #x} and
     * {@link #y} of the supplied points.
     *
     * @static
     * @param {Point} point1
     * @param {Point} point2
     * @return {Point} the newly created point object
     *
     * @example
     * let point1 = new Point(10, 100);
     * let point2 = new Point(200, 5);
     * let minPoint = Point.min(point1, point2);
     * console.log(minPoint); // {x: 10, y: 5}
     *
     * @example
     * // Find the minimum of multiple points:
     * let point1 = new Point(60, 100);
     * let point2 = new Point(200, 5);
     * let point3 = new Point(250, 35);
     * [point1, point2, point3].reduce(Point.min) // {x: 60, y: 5}
     */
    static min(point1, point2) {
        return new Point(
            Math.min(point1.x, point2.x),
            Math.min(point1.y, point2.y)
        );
    }

    /**
     * Returns a new point object with the largest {@link #x} and
     * {@link #y} of the supplied points.
     *
     * @static
     * @param {Point} point1
     * @param {Point} point2
     * @return {Point} the newly created point object
     *
     * @example
     * let point1 = new Point(10, 100);
     * let point2 = new Point(200, 5);
     * let maxPoint = Point.max(point1, point2);
     * console.log(maxPoint); // {x: 200, y: 100}
     *
     * @example
     * // Find the maximum of multiple points:
     * let point1 = new Point(60, 100);
     * let point2 = new Point(200, 5);
     * let point3 = new Point(250, 35);
     * [point1, point2, point3].reduce(Point.max) // {x: 250, y: 100}
     */
    static max(point1, point2) {
        return new Point(
            Math.max(point1.x, point2.x),
            Math.max(point1.y, point2.y)
        );
    }

    /**
     * Returns a point object with random {@link #x} and {@link #y} values
     * between `0` and `1`.
     *
     * @return {Point} the newly created point object
     * @static
     *
     * @example
     * let maxPoint = new Point(100, 100);
     * let randomPoint = Point.random();
     *
     * // A point between {x:0, y:0} and {x:100, y:100}:
     * let point = maxPoint * randomPoint;
     */
    static random() {
        return new Point(Math.random(), Math.random());
    }

    static isCollinear(x1, y1, x2, y2) {
        // NOTE: We use normalized vectors so that the epsilon comparison is
        // reliable. We could instead scale the epsilon based on the vector
        // length. But instead of normalizing the vectors before calculating
        // the cross product, we can scale the epsilon accordingly.
        return Math.abs(x1 * y2 - y1 * x2)
            <= Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2))
            * /*#=*/TRIGONOMETRIC_EPSILON;
    }

    static isOrthogonal(x1, y1, x2, y2) {
        // See Point.isCollinear()
        return Math.abs(x1 * x2 + y1 * y2)
            <= Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2))
            * /*#=*/TRIGONOMETRIC_EPSILON;
    }

    round() {
        return new Point(Math.round(this.x), Math.round(this.y));
    }
    roundMutable() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }

    roundMutableBy(m) {
        this.x = Math.round(this.x * m) / m;
        this.y = Math.round(this.y * m) / m;
        return this;
    }

    ceil() {
        return new Point(Math.ceil(this.x), Math.ceil(this.y));
    }

    floor() {
        return new Point(Math.floor(this.x), Math.floor(this.y));
    }

    abs() {
        if (this.x >= 0 && this.y >= 0) {
            return this;
        }
        return new Point(Math.abs(this.x), Math.abs(this.y));
    }

    static create(x, y) {
        if (x === 0 && y === 0) {
            return Point.Zero;
        }
        return new Point(x, y);
    }

    static Zero: Point;
    static BasisX: Point;
    static BasisY: Point;
}

Point.Zero = new Point(0, 0);
Point.BasisX = new Point(1, 0);
Point.BasisY = new Point(0, 1);