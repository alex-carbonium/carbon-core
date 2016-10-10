import {areValuesCloseWithOptions, rangeUnion} from "./geometry";
import BezierIntersection from "./BezierIntersection"

const ParameterCloseThreshold = 1e-4;


export default class BezierIntersectRange {

    constructor(curve1, parameterRange1, curve2, parameterRange2, reversed) {
        this.curve1 = curve1;
        this.parameterRange1 = parameterRange1;
        this.curve2 = curve2;
        this.parameterRange2 = parameterRange2;
        this.reversed = reversed;
        this.needToComputeCurve1 = false;
        this.needToComputeCurve2 = false;
    }

    get curve1LeftBezier() {
        this.computeCurve1();
        return this._curve1LeftBezier;
    }

    get curve1OverlappingBezier() {
        this.computeCurve1();
        return this._curve1MiddleBezier;
    }

    get curve1RightBezier() {
        this.computeCurve1();
        return this._curve1RightBezier;
    }

    get curve2LeftBezier() {
        this.computeCurve2();
        return this._curve2LeftBezier;
    }

    get curve2OverlappingBezier() {
        this.computeCurve2();
        return this._curve2MiddleBezier;
    }

    get curve2RightBezier() {
        this.computeCurve2();
        return this._curve2RightBezier;
    }

    computeCurve1() {
        if (!this._needToComputeCurve1)
            return;

        var curves = {leftCurve:null, middleCurve:null, rightCurve:null};
        this._curve1.splitSubcurvesWithRange(this._parameterRange1, curves);
        this._curve1LeftBezier = curves.leftCurve;
        this._curve1MiddleBezier = curves.middleCurve;
        this._curve1RightBezier = curves.rightCurve;

        this._needToComputeCurve1 = false;
    }

    computeCurve2() {
        if (!this._needToComputeCurve2)
            return;

        var curves = {leftCurve:null, middleCurve:null, rightCurve:null};
        this._curve2.splitSubcurvesWithRange(this._parameterRange2, curves);
        this._curve2LeftBezier = curves.leftCurve;
        this._curve2MiddleBezier = curves.middleCurve;
        this._curve2RightBezier = curves.rightCurve;

        this._needToComputeCurve2 = false;
    }

    get isAtStartOfCurve1() {
        return areValuesCloseWithOptions(this._parameterRange1.minimum, 0.0, ParameterCloseThreshold);
    }

    get isAtStopOfCurve1() {
        return areValuesCloseWithOptions(this._parameterRange1.maximum, 1.0, ParameterCloseThreshold);
    }

    get isAtStartOfCurve2() {
        return areValuesCloseWithOptions(this._parameterRange2.minimum, 0.0, ParameterCloseThreshold);
    }

    get isAtStopOfCurve2() {
        return areValuesCloseWithOptions(this._parameterRange2.maximum, 1.0, ParameterCloseThreshold);
    }

    get middleIntersection() {
         return new BezierIntersection(this._curve1,(this._parameterRange1.minimum + this._parameterRange1.maximum) / 2.0,
             this._curve2,(this._parameterRange2.minimum + this._parameterRange2.maximum) / 2.0);
    }

    merge(other) {
        // We assume the caller already knows we're talking about the same curves
        this._parameterRange1 = rangeUnion(this._parameterRange1, other._parameterRange1);
        this._parameterRange2 = rangeUnion(this._parameterRange2, other._parameterRange2);

        this.clearCache();
    }

    clearCache() {
        this._needToComputeCurve1 = true;
        this._needToComputeCurve2 = true;
        delete this._curve1LeftBezier;
        delete this._curve1MiddleBezier;
        delete this._curve1RightBezier;
        delete this._curve2LeftBezier;
        delete this._curve2MiddleBezier;
        delete this._curve2RightBezier;
    }

}

