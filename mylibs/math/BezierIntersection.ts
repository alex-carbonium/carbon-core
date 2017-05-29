import { normalizePoint, subtractPoint, arePointsCloseWithOptions, areValuesCloseWithOptions } from "./geometry";
import { IIntersection, IBezierCurve, ILocation, IBezierCurveData } from "carbon-core";
import { ICoordinate } from "carbon-geometry";

const PointCloseThreshold = 1e-7;
const ParameterCloseThreshold = 1e-4;

export default class BezierIntersection implements IIntersection {
    private _curve1: IBezierCurve;
    private _curve2: IBezierCurve;
    private _parameter1: number;
    private _parameter2: number;
    private _needToComputeCurve1: boolean;
    private _needToComputeCurve2: boolean;

    private _curve1LeftBezier: IBezierCurve;
    private _curve2LeftBezier: IBezierCurve;
    private _curve1RightBezier: IBezierCurve;
    private _curve2RightBezier: IBezierCurve;

    private _location: ICoordinate;

    constructor(curve1: IBezierCurve, parameter1: number, curve2: IBezierCurve, parameter2: number) {
        this._curve1 = curve1;
        this._parameter1 = parameter1;
        this._curve2 = curve2;
        this._parameter2 = parameter2;
        this._needToComputeCurve1 = true;
        this._needToComputeCurve2 = true;
    }

    get parameterRange1() {
        return this._parameter1;
    }

    get parameterRange2() {
        return this._parameter2;
    }


    get curve1() {
        return this._curve1;
    }

    get curve2() {
        return this._curve2;
    }

    get parameter1() {
        return this._parameter1;
    }


    get parameter2() {
        return this._parameter2;
    }

    get location() {
        this.computeCurve1();

        return this._location;
    }

    get isTangent() {
        // If we're at the end of a curve, it's not tangent, so skip all the calculations
        if (this.isAtEndPointOfCurve) {
            return false;
        }

        this.computeCurve1();
        this.computeCurve2();


        // Compute the tangents at the intersection.
        let curve1LeftTangent = normalizePoint(subtractPoint(this._curve1LeftBezier.controlPoint2, this._curve1LeftBezier.endPoint2));
        let curve1RightTangent = normalizePoint(subtractPoint(this._curve1RightBezier.controlPoint1, this._curve1RightBezier.endPoint1));
        let curve2LeftTangent = normalizePoint(subtractPoint(this._curve2LeftBezier.controlPoint2, this._curve2LeftBezier.endPoint2));
        let curve2RightTangent = normalizePoint(subtractPoint(this._curve2RightBezier.controlPoint1, this._curve2RightBezier.endPoint1));

        // See if the tangents are the same. If so, then we're tangent at the intersection point
        return arePointsCloseWithOptions(curve1LeftTangent, curve2LeftTangent, PointCloseThreshold)
            || arePointsCloseWithOptions(curve1LeftTangent, curve2RightTangent, PointCloseThreshold)
            || arePointsCloseWithOptions(curve1RightTangent, curve2LeftTangent, PointCloseThreshold)
            || arePointsCloseWithOptions(curve1RightTangent, curve2RightTangent, PointCloseThreshold);
    }

    get curve1LeftBezier() {
        this.computeCurve1();

        return this._curve1LeftBezier;
    }

    get curve1RightBezier() {
        this.computeCurve1();

        return this._curve1RightBezier;
    }

    get curve2LeftBezier() {
        this.computeCurve2();

        return this._curve2LeftBezier;
    }

    get curve2RightBezier() {
        this.computeCurve2();

        return this._curve2RightBezier;
    }

    get isAtStartOfCurve1() {
        return areValuesCloseWithOptions(this._parameter1, 0.0, ParameterCloseThreshold) || this._curve1.isPoint;
    }

    get isAtStopOfCurve1() {
        return areValuesCloseWithOptions(this._parameter1, 1.0, ParameterCloseThreshold) || this._curve1.isPoint;
    }

    get isAtEndPointOfCurve1() {
        return this.isAtStartOfCurve1 || this.isAtStopOfCurve1;
    }

    get isAtStartOfCurve2() {
        return areValuesCloseWithOptions(this._parameter2, 0.0, ParameterCloseThreshold) || this._curve2.isPoint;
    }

    get isAtStopOfCurve2() {
        return areValuesCloseWithOptions(this._parameter2, 1.0, ParameterCloseThreshold) || this._curve2.isPoint;
    }

    get isAtEndPointOfCurve2() {
        return this.isAtStartOfCurve2 || this.isAtStopOfCurve2;
    }

    get isAtEndPointOfCurve() {
        return this.isAtEndPointOfCurve1 || this.isAtEndPointOfCurve2;
    }

    computeCurve1() {
        if (!this._needToComputeCurve1) {
            return;
        }

        let curves = { leftCurve: null, rightCurve: null };
        this._location = this._curve1.pointAt(this._parameter1, curves);
        this._curve1LeftBezier = curves.leftCurve;
        this._curve1RightBezier = curves.rightCurve;

        this._needToComputeCurve1 = false;
    }

    computeCurve2() {
        if (!this._needToComputeCurve2) {
            return;
        }

        let curves = { leftCurve: null, rightCurve: null };
        this._curve2.pointAt(this._parameter2, curves);
        this._curve2LeftBezier = curves.leftCurve;
        this._curve2RightBezier = curves.rightCurve;

        this._needToComputeCurve2 = false;
    }
}

