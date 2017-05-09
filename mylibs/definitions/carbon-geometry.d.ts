declare module "carbon-geometry" {
    import { IConstructor } from "carbon-basics";

    export interface ICoordinate {
        x: number;
        y: number;
    }

    export interface IPoint extends ICoordinate {
        getDistance(fromPoint: IPoint): number;
        getDirectedAngle(fromPoint: IPoint): number;
    }

    export interface ISize{
        width: number;
        height: number;
    }

    export interface IRect extends ICoordinate, ISize {
        fit(bounds: IRect, noScaleUp?: boolean): IRect;
        fill(bounds: IRect, noScaleUp?: boolean): IRect;

        topLeft(): IPoint;
        right(): number;
        bottom(): number;

        centerX(): number;
        centerY(): number;
    }
    interface IRectConstructor{
        new(x: number, y: number, width: number, height: number): IRect;
    }
    export const Rect: IRectConstructor;

    export interface IMatrix{
        a: number;
        b: number;
        c: number;
        d: number;
        tx: number;
        ty: number;

        withTranslation(x: number, y: number): IMatrix;
    }
    export const Matrix: IMatrix & {
        createTranslationMatrix(tx: number, ty: number): IMatrix;
    }

    export const enum OriginType{
        TopLeft = 1,
        Center
        //more
    }
}