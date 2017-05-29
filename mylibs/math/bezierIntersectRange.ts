import { areValuesCloseWithOptions, rangeUnion } from "./geometry";
import BezierIntersection from "./BezierIntersection"
import { IIntersectionRange, IBezierCurve, IIntersection } from "carbon-core";
import { IRange } from "carbon-geometry";

const ParameterCloseThreshold = 1e-4;

export default class BezierIntersectRange implements IIntersectionRange {
    private _needToComputeCurve1: boolean;
    private _needToComputeCurve2: boolean;

    private _curve1LeftBezier: IBezierCurve;
    private _curve2LeftBezier: IBezierCurve;
    private _curve1MiddleBezier: IBezierCurve;
    private _curve2MiddleBezier: IBezierCurve;
    private _curve1RightBezier: IBezierCurve;
    private _curve2RightBezier: IBezierCurve;

    constructor(
        public curve1: IBezierCurve,
        public parameterRange1: IRange,
        public curve2: IBezierCurve,
        public parameterRange2: IRange,
        public reversed: boolean) {
        this._needToComputeCurve1 = false;
        this._needToComputeCurve2 = false;
    }

    get curve1LeftBezier(): IBezierCurve {
        this.computeCurve1();

        return this._curve1LeftBezier;
    }

    get curve1OverlappingBezier(): IBezierCurve {
        this.computeCurve1();

        return this._curve1MiddleBezier;
    }

    get curve1RightBezier(): IBezierCurve {
        this.computeCurve1();

        return this._curve1RightBezier;
    }

    get curve2LeftBezier(): IBezierCurve {
        this.computeCurve2();

        return this._curve2LeftBezier;
    }

    get curve2OverlappingBezier(): IBezierCurve {
        this.computeCurve2();

        return this._curve2MiddleBezier;
    }

    get curve2RightBezier(): IBezierCurve {
        this.computeCurve2();

        return this._curve2RightBezier;
    }

    computeCurve1(): void {
        if (!this._needToComputeCurve1) {
            return;
        }

        let curves = { leftCurve: null, middleCurve: null, rightCurve: null };
        this.curve1.splitSubcurvesWithRange(this.parameterRange1, curves);
        this._curve1LeftBezier = curves.leftCurve;
        this._curve1MiddleBezier = curves.middleCurve;
        this._curve1RightBezier = curves.rightCurve;

        this._needToComputeCurve1 = false;
    }

    computeCurve2(): void {
        if (!this._needToComputeCurve2) {
            return;
        }

        let curves = { leftCurve: null, middleCurve: null, rightCurve: null };
        this.curve2.splitSubcurvesWithRange(this.parameterRange2, curves);
        this._curve2LeftBezier = curves.leftCurve;
        this._curve2MiddleBezier = curves.middleCurve;
        this._curve2RightBezier = curves.rightCurve;

        this._needToComputeCurve2 = false;
    }

    get isAtStartOfCurve1(): boolean {
        return areValuesCloseWithOptions(this.parameterRange1.minimum, 0.0, ParameterCloseThreshold);
    }

    get isAtStopOfCurve1(): boolean {
        return areValuesCloseWithOptions(this.parameterRange1.maximum, 1.0, ParameterCloseThreshold);
    }

    get isAtStartOfCurve2(): boolean {
        return areValuesCloseWithOptions(this.parameterRange2.minimum, 0.0, ParameterCloseThreshold);
    }

    get isAtStopOfCurve2(): boolean {
        return areValuesCloseWithOptions(this.parameterRange2.maximum, 1.0, ParameterCloseThreshold);
    }

    get middleIntersection(): IIntersection {
        return new BezierIntersection(this.curve1, (this.parameterRange1.minimum + this.parameterRange1.maximum) / 2.0,
            this.curve2, (this.parameterRange2.minimum + this.parameterRange2.maximum) / 2.0);
    }

    merge(other: IIntersectionRange): void {
        let o = (other as any) as BezierIntersectRange;
        // We assume the caller already knows we're talking about the same curves
        this.parameterRange1 = rangeUnion(this.parameterRange1, o.parameterRange1);
        this.parameterRange2 = rangeUnion(this.parameterRange2, o.parameterRange2);

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

