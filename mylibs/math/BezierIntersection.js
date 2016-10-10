import {normalizePoint, subtractPoint, arePointsCloseWithOptions, areValuesCloseWithOptions} from "./geometry";

const PointCloseThreshold = 1e-7;
const ParameterCloseThreshold = 1e-4;

export default class BezierIntersection
{
    constructor(curve1, parameter1, curve2, parameter2)
    {
        this._curve1 = curve1;
        this._parameter1 = parameter1;
        this._curve2 = curve2;
        this._parameter2 = parameter2;
        this._needToComputeCurve1 = true;
        this._needToComputeCurve2 = true;
    }

    get parameterRange1(){
        return this._parameter1;
    }

    get parameterRange2(){
        return this._parameter2;
    }


    get curve1(){
        return this._curve1;
    }

    get curve2(){
        return this._curve2;
    }

    get parameter1(){
        return this._parameter1;
    }


    get parameter2(){
        return this._parameter2;
    }

    get location()
    {
        this.computeCurve1();
        return this._location;
    }
    
    get isTangent()
    {
        // If we're at the end of a curve, it's not tangent, so skip all the calculations
        if ( this.isAtEndPointOfCurve )
            return false;
    
        this.computeCurve1();
        this.computeCurve2();
    
    
        // Compute the tangents at the intersection.
        var curve1LeftTangent =  normalizePoint(subtractPoint(this._curve1LeftBezier.controlPoint2,  this._curve1LeftBezier.endPoint2));
        var curve1RightTangent = normalizePoint(subtractPoint(this._curve1RightBezier.controlPoint1, this._curve1RightBezier.endPoint1));
        var curve2LeftTangent =  normalizePoint(subtractPoint(this._curve2LeftBezier.controlPoint2,  this._curve2LeftBezier.endPoint2));
        var curve2RightTangent = normalizePoint(subtractPoint(this._curve2RightBezier.controlPoint1, this._curve2RightBezier.endPoint1));
    
        // See if the tangents are the same. If so, then we're tangent at the intersection point
        return arePointsCloseWithOptions(curve1LeftTangent, curve2LeftTangent, PointCloseThreshold) 
            || arePointsCloseWithOptions(curve1LeftTangent, curve2RightTangent, PointCloseThreshold)
            || arePointsCloseWithOptions(curve1RightTangent, curve2LeftTangent, PointCloseThreshold)
            || arePointsCloseWithOptions(curve1RightTangent, curve2RightTangent, PointCloseThreshold);
    }
    
    get curve1LeftBezier()
    {
        this.computeCurve1();
        return this._curve1LeftBezier;
    }
    
    get curve1RightBezier()
    {
        this.computeCurve1();
        return this._curve1RightBezier;
    }
    
    get curve2LeftBezier()
    {
        this.computeCurve2();
        return this._curve2LeftBezier;
    }
    
    get curve2RightBezier()
    {
        this.computeCurve2();
        return this._curve2RightBezier;
    }
    
    get isAtStartOfCurve1()
    {
        return areValuesCloseWithOptions(this._parameter1, 0.0, ParameterCloseThreshold) || this._curve1.isPoint;
    }
    
    get isAtStopOfCurve1()
    {
        return areValuesCloseWithOptions(this._parameter1, 1.0, ParameterCloseThreshold) || this._curve1.isPoint;
    }
    
    get isAtEndPointOfCurve1()
    {
        return this.isAtStartOfCurve1 || this.isAtStopOfCurve1;
    }
    
    get isAtStartOfCurve2()
    {
        return areValuesCloseWithOptions(this._parameter2, 0.0, ParameterCloseThreshold) || this._curve2.isPoint;
    }
    
    get isAtStopOfCurve2()
    {
        return areValuesCloseWithOptions(this._parameter2, 1.0, ParameterCloseThreshold) || this._curve2.isPoint;
    }

    get isAtEndPointOfCurve2()
    {
        return this.isAtStartOfCurve2 || this.isAtStopOfCurve2;
    }

    get isAtEndPointOfCurve()
    {
        return this.isAtEndPointOfCurve1 || this.isAtEndPointOfCurve2;
    }

    computeCurve1()
    {
        if ( !this._needToComputeCurve1 )
            return;

        var curves = {leftBezierCurve:null, rightBezierCurve:null};
        this._location = this._curve1.pointAt(this._parameter1, curves);
        this._curve1LeftBezier = curves.leftBezierCurve;
        this._curve1RightBezier = curves.rightBezierCurve;

        this._needToComputeCurve1 = false;
    }

    computeCurve2()
    {
        if ( !this._needToComputeCurve2 )
            return;

        var curves = {leftBezierCurve:null, rightBezierCurve:null};
        this._curve2.pointAt(this._parameter2, curves);
        this._curve2LeftBezier = curves.leftBezierCurve;
        this._curve2RightBezier = curves.rightBezierCurve;

        this._needToComputeCurve2 = false;
    }
}

