declare module "carbon-geometry" {
    import { IConstructor } from "carbon-basics";

    export interface IRect {
        x: number;
        y: number;
        width: number;
        height: number;

        fit(bounds: IRect, noScaleUp?: boolean): IRect;
        fill(bounds: IRect, noScaleUp?: boolean): IRect;
    }
    interface IRectConstructor{
        new(x: number, y: number, width: number, height: number): IRect;
    }
    export const Rect: IRectConstructor;

    export interface ICoordinate {
        x: number;
        y: number;
    }

    export interface IPoint extends ICoordinate {
        getDistance(fromPoint: IPoint): number;
        getDirectedAngle(fromPoint: IPoint): number;
    }

    export interface IMatrix{
        a: number;
        b: number;
        c: number;
        d: number;
        tx: number;
        ty: number;
    }
    export const Matrix: IMatrix & {
        createTranslationMatrix(tx: number, ty: number): IMatrix;
    };
}