import { ICoordinate } from "carbon-core";

function B1(t:number) { return t * t * t }
function B2(t:number) { return 3 * t * t * (1 - t) }
function B3(t:number) { return 3 * t * (1 - t) * (1 - t) }
function B4(t:number) { return (1 - t) * (1 - t) * (1 - t) }

function distanceSq(p1:ICoordinate, p2:ICoordinate) {
    let x = p1.x - p2.x
        , y = p1.y - p2.y;

    return x * x + y * y;
}

const DEGREE = 3;
const MAXDEPTH = 64;                        // Maximum depth for recursion
const EPSILON = Math.pow(2, -MAXDEPTH - 1);  // Flatness control value
const W_DEGREE = 5;

const cubicZ = [
    /* Precomputed "z" for cubics   */
    [1.0, 0.6, 0.3, 0.1],
    [0.4, 0.6, 0.6, 0.4],
    [0.1, 0.3, 0.6, 1.0]
];


/*
*  ControlPolygonFlatEnough :
*  Check if the control polygon of a Bezier curve is flat enough
*  for recursive subdivision to bottom out.
*
*/
function controlPolygonFlatEnough(v:ICoordinate[], degree:number):boolean {

    // Find the  perpendicular distance
    // from each interior control point to
    // line connecting v[0] and v[degree]

    // Derive the implicit equation for line connecting first
    // and last control points
    let a = v[0].y - v[degree].y;
    let b = v[degree].x - v[0].x;
    let c = v[0].x * v[degree].y - v[degree].x * v[0].y;

    let abSquared = (a * a) + (b * b);
    let distance = [];      // Distances from pts to line

    for (let i = 1; i < degree; i++) {
        // Compute distance from each of the points to that line
        distance[i] = a * v[i].x + b * v[i].y + c;
        if (distance[i] > 0.0) {
            distance[i] = (distance[i] * distance[i]) / abSquared;
        }
        if (distance[i] < 0.0) {
            distance[i] = -((distance[i] * distance[i]) / abSquared);
        }
    }

    // Find the largest distance
    let maxDistanceAbove = 0.0;
    let maxDistanceBelow = 0.0;
    for (let i = 1; i < degree; i++) {
        if (distance[i] < 0.0) {
            maxDistanceBelow = Math.min(maxDistanceBelow, distance[i]);
        }
        if (distance[i] > 0.0) {
            maxDistanceAbove = Math.max(maxDistanceAbove, distance[i]);
        }
    }

    // Implicit equation for zero line
    let a1 = 0.0;
    let b1 = 1.0;
    let c1 = 0.0;

    // Implicit equation for "above" line
    let a2 = a;
    let b2 = b;
    let c2 = c + maxDistanceAbove;

    let det = a1 * b2 - a2 * b1;
    let dInv = 1.0 / det;

    let intercept1 = (b1 * c2 - b2 * c1) * dInv;

    //  Implicit equation for "below" line
    a2 = a;
    b2 = b;
    c2 = c + maxDistanceBelow;

    det = a1 * b2 - a2 * b1;
    dInv = 1.0 / det;

    let intercept2 = (b1 * c2 - b2 * c1) * dInv;

    // Compute intercepts of bounding box
    let leftIntercept = Math.min(intercept1, intercept2);
    let rightIntercept = Math.max(intercept1, intercept2);

    let error = 0.5 * (rightIntercept - leftIntercept);

    return error < EPSILON;
}



/*
*  ComputeXIntercept :
*  Compute intersection of chord from first control point to last
*      with 0-axis.
*
*/
function computeXIntercept(v:ICoordinate[], degree:number):number {
    let XNM = v[degree].x - v[0].x;
    let YNM = v[degree].y - v[0].y;
    let XMK = v[0].x;
    let YMK = v[0].y;

    let detInv = - 1.0 / YNM;

    return (XNM * YMK - YNM * XMK) * detInv;
}

export interface IBezierCoordinate extends ICoordinate {
    t?:number;
}

function bezier(c:ICoordinate[], degree:number, t:number, left:ICoordinate[], right:ICoordinate[]):IBezierCoordinate{
    // FIXME WIRED-252, move outside the method and make static
    let p = [[], [], [], [], [], []];

    /* Copy control points  */
    for (let j = 0; j <= degree; j++) {
        p[0][j] = { x: c[j].x, y: c[j].y };
    }

    /* Triangle computation */
    for (let i = 1; i <= degree; i++) {
        for (let j = 0; j <= degree - i; j++) {
            p[i][j] = {
                x: (1.0 - t) * p[i - 1][j].x + t * p[i - 1][j + 1].x,
                y: (1.0 - t) * p[i - 1][j].y + t * p[i - 1][j + 1].y
            };
        }
    }

    if (left !== null) {
        for (let j = 0; j <= degree; j++) {
            left[j] = p[j][0];
        }
    }

    if (right !== null) {
        for (let j = 0; j <= degree; j++) {
            right[j] = p[degree - j][j];
        }
    }

    return p[degree][0];
}

/***
* CrossingCount :
*  Count the number of times a Bezier control polygon
*  crosses the 0-axis. This number is >= the number of roots.
*
*/
function crossingCount(v:ICoordinate[], degree:number) {
    let nCrossings = 0;
    let sign = v[0].y < 0 ? -1 : 1;
    let oldSign = sign;
    for (let i = 1; i <= degree; i++) {
        sign = v[i].y < 0 ? -1 : 1;
        if (sign !== oldSign) {
            nCrossings++;
        }
        oldSign = sign;
    }

    return nCrossings;
}

/**
*  FindRoots :
*  Given a 5th-degree equation in Bernstein-Bezier form, find
*  all of the roots in the interval [0, 1].  Return the number
*  of roots found.
*/
function findRoots(w:ICoordinate[], degree:number, t:number[], depth:number) {
    switch (crossingCount(w, degree)) {
        case 0: { // No solutions here
            return 0;
        }
        case 1: { // Unique solution
            // Stop recursion when the tree is deep enough
            // if deep enough, return 1 solution at midpoint
            if (depth >= MAXDEPTH) {
                t[0] = (w[0].x + w[W_DEGREE].x) / 2.0;

                return 1;
            }
            if (controlPolygonFlatEnough(w, degree)) {
                t[0] = computeXIntercept(w, degree);

                return 1;
            }
            break;
        }
    }

    // Otherwise, solve recursively after
    // subdividing control polygon
    let left:ICoordinate[] = [];    // New left and right
    let right:ICoordinate[] = [];   // control polygons
    let leftT:number[] = [];   // Solutions from kids
    let rightT:number[] = [];

    bezier(w, degree, 0.5, left, right);
    let leftCount = findRoots(left, degree, leftT, depth + 1);
    let rightCount = findRoots(right, degree, rightT, depth + 1);

    // Gather solutions together
    for (let i = 0; i < leftCount; i++) {
        t[i] = leftT[i];
    }
    for (let i = 0; i < rightCount; i++) {
        t[i + leftCount] = rightT[i];
    }

    // Send back total number of solutions  */
    return leftCount + rightCount;
}


/***
*  ConvertToBezierForm :
*      Given a point and a Bezier curve, generate a 5th-degree
*      Bezier-format equation whose solution finds the point on the
*      curve nearest the user-defined point.
*/
function convertToBezierForm(v:ICoordinate[], pa:ICoordinate):ICoordinate[] {
    let c = [];   // v(i) - pa
    let d = [];     // v(i+1) - v(i)
    let cdTable = [[], [], [], []];         // Dot product of c, d
    let w = []; // Ctl pts of 5th-degree curve

    // Determine the c's -- these are vectors created by subtracting
    // point pa from each of the control points
    for (let i = 0; i <= DEGREE; i++) {
        c[i] = { x: v[i].x - pa.x, y: v[i].y - pa.y };
    }

    // Determine the d's -- these are vectors created by subtracting
    // each control point from the next
    let s = 3;
    for (let i = 0; i <= DEGREE - 1; i++) {
        d[i] = { x: s * (v[i + 1].x - v[i].x), y: s * (v[i + 1].y - v[i].y) };
    }

    // Create the c,d table -- this is a table of dot products of the
    // c's and d's                          */
    for (let row = 0; row <= DEGREE - 1; row++) {
        for (let column = 0; column <= DEGREE; column++) {
            cdTable[row][column] = (d[row].x * c[column].x) + (d[row].y * c[column].y);
        }
    }

    // Now, apply the z's to the dot products, on the skew diagonal
    // Also, set up the x-values, making these "points"
    for (let i = 0; i <= W_DEGREE; i++) {
        w[i] = { x: (i * 1.0) / W_DEGREE, y: 0.0 };
    }

    let n = DEGREE;
    let m = DEGREE - 1;
    for (let k = 0; k <= n + m; k++) {
        let lb = Math.max(0, k - m);
        let ub = Math.min(k, n);
        for (let i = lb; i <= ub; i++) {
            let j = k - i;
            w[i + j] = { x: w[i + j].x, y: w[i + j].y + cdTable[j][i] * cubicZ[j][i] };
        }
    }

    return w;
}

export default {
    onCurve: function (p1:ICoordinate, cp1:ICoordinate, cp2:ICoordinate, p2:ICoordinate, pa:ICoordinate, pn:IBezierCoordinate) {
        let tCandidate = [];
        let v = [p1, cp1, cp2, p2];

        // Convert problem to 5th-degree Bezier form
        let w = convertToBezierForm(v, pa);

        // Find all possible roots of 5th-degree equation
        let nSolutions = findRoots(w, W_DEGREE, tCandidate, 0);

        // Compare distances of P5 to all candidates, and to t=0, and t=1
        // Check distance to beginning of curve, where t = 0
        let minDistance = distanceSq(pa, p1);
        let t = 0.0;

        // Find distances for candidate points
        for (let i = 0; i < nSolutions; i++) {
            let p = bezier(v, DEGREE, tCandidate[i], null, null);
            let distance = distanceSq(pa, p);
            if (distance < minDistance) {
                minDistance = distance;
                t = tCandidate[i];
            }
        }

        // Finally, look at distance to end point, where t = 1.0
        let distance = distanceSq(pa, p2);
        if (distance < minDistance) {
            minDistance = distance;
            t = 1.0;
        }


        //  Return the point on the curve at parameter value t
        let res = bezier(v, DEGREE, t, null, null);
        pn.x = res.x;
        pn.y = res.y;
        pn.t = t;

        return distanceSq(pn, pa);
    },
    getBezierPoint: function (t, C1, C2, C3, C4) {
        let pos = {
            x: C1.x * B1(t) + C2.x * B2(t) + C3.x * B3(t) + C4.x * B4(t),
            y: C1.y * B1(t) + C2.y * B2(t) + C3.y * B3(t) + C4.y * B4(t)
        }

        return pos;
    },
    /***
    * Returns the nearest point (pn) on line p1 - p2 nearest to point pa.
    *
    * @param p1 start point of line
    * @param p2 end point of line
    * @param pa arbitrary point
    * @param pn nearest point (return param)
    * @return distance squared between pa and nearest point (pn)
    */
    onLine: function (p1, p2, pa, pn, nolimit?) {
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        let dsq = dx * dx + dy * dy;
        if (dsq === 0) {
            pn.x = p1.x;
            pn.y = p1.y;
        } else {
            let u = ((pa.x - p1.x) * dx + (pa.y - p1.y) * dy) / dsq;
            if (u <= 0 && !nolimit) {
                pn.x = p1.x;
                pn.y = p1.y;
            } else if (u >= 1 && !nolimit) {
                pn.x = p2.x;
                pn.y = p2.y;
            } else {
                pn.x = p1.x + u * dx;
                pn.y = p1.y + u * dy;
            }
            pn.t = u;
        }

        return distanceSq(pn, pa);
    },

    segmentParameter: function (p1, p2, pt) {
        let t = 0;

        if (p1.x === pt.x) {
            let m = p2.y - p1.y;
            t = (pt.y - p1.y) / m;
        } else {
            let l = p2.x - p1.x;
            t = (pt.x - p1.x) / l;
        }

        return t;
    },

    pointDistance: function (p1, p2) {
        return Math.sqrt(distanceSq(p1, p2));
    }
}