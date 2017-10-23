declare module "carbon-geometry" {
    import { IConstructor } from "carbon-basics";
    import { IContext } from "carbon-rendering";

    export interface ICoordinate {
        x: number;
        y: number;
    }

    export interface INormilizedLine2D {
        a: number;
        b: number;
        c: number;
    }

    export interface IRange {
        minimum: number;
        maximum: number;
    }

    export interface IPoint extends ICoordinate {
        add(point: IPoint): IPoint;
        add2(x: number, y: number): IPoint;
        subtract(point: IPoint): IPoint;
        getAngle(point: IPoint): number;
        getDistance(fromPoint: IPoint): number;
        getDirectedAngle(fromPoint: IPoint): number;
    }
    export const Point: (new (x: number, y: number) => IPoint) & {
        create(x: number, y: number): IPoint;

        Zero: IPoint;
    };

    export interface ISize {
        width: number;
        height: number;
    }

    export type IRectData = ICoordinate & ISize;

    export interface IRect extends IRectData {
        fit(bounds: IRect, noScaleUp?: boolean): IRect;
        fill(bounds: IRect, noScaleUp?: boolean): IRect;

        topLeft(): IPoint;
        right(): number;
        bottom(): number;

        center(): IPoint;
        centerLeft(): IPoint;
        centerTop(): IPoint;
        centerX(): number;
        centerY(): number;

        updateFromPointsMutable(p1: IPoint, p2: IPoint);
        roundMutable();

        withWidth(width: number): IRect;
        withHeight(width: number): IRect;
        withSize(width: number, height: number): IRect;
        clone(): IRect;

        reset(): void;

        isValid(): boolean;

        containsPoint(point: IPoint): boolean;
        isIntersecting(other: IRect): boolean;
    }
    interface IRectConstructor {
        new(x: number, y: number, width: number, height: number): IRect;
    }
    export const Rect: IRectConstructor & {
        readonly Max: IRect;
        fromSize(width: number, height: number): IRect;
    };

    export interface IMatrix {
        a: number;
        b: number;
        c: number;
        d: number;
        tx: number;
        ty: number;

        translate(x: number, y: number): IMatrix;
        scale(sx: number, sy: number): IMatrix;

        applyToContext(context: IContext);

        transformPoint(point: ICoordinate): ICoordinate;
        transformPoint2(x:number, y:number): ICoordinate;

        prepended(matrix: IMatrix): IMatrix;
        append(matrix: IMatrix): IMatrix;
        appended(matrix: IMatrix): IMatrix;
        invert(): IMatrix;
        prependedWithTranslation(tx: number, ty: number): IMatrix;

        clone(): IMatrix;
        withTranslation(x: number, y: number): IMatrix;

        isTranslatedOnly(): boolean;
        isSingular(): boolean;

        equals(other: IMatrix): boolean;
    }
    export const Matrix: IMatrix & {
        create(): IMatrix;
        createTranslationMatrix(tx: number, ty: number): IMatrix;
        Identity: IMatrix;
    }

    export const enum OriginType {
        TopLeft = 1,
        Center
        //more
    }

    export const enum PointType {
        Straight,
        Mirrored,
        Disconnected,
        Assymetric
    }

    export interface IPathPoint extends ICoordinate {
        type?: PointType,
        moveTo?: boolean;
        closed?: boolean;
        x: number;
        y: number;
        cp1x?: number;
        cp1y?: number;
        cp2x?: number;
        cp2y?: number;
        idx?: number;
    }

    export interface IBezierCoordinate extends ICoordinate {
        t?:number;
    }

    export const AngleAdjuster: {
        adjust(startPoint: ICoordinate, endPoint: ICoordinate): ICoordinate;
    }

    export class NearestPoint {
        static onCurve(p1: ICoordinate, cp1: ICoordinate, cp2: ICoordinate, p2: ICoordinate, pa: ICoordinate, pn: IBezierCoordinate):number;
        /***
        * Returns the nearest point (pn) on line p1 - p2 nearest to point pa.
        *
        * @param p1 start point of line
        * @param p2 end point of line
        * @param pa arbitrary point
        * @param pn nearest point (return param)
        * @param calclulateOutsideSegment if true, then pn point can be outside of line segment [p1, p2].
        * @return distance squared between pa and nearest point (pn)
        */
        static onLine(p1: ICoordinate, p2: ICoordinate, pa: ICoordinate, pn: ICoordinate, calclulateOutsideSegment?):number;
    }
}