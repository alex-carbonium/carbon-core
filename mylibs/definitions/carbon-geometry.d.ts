declare module "carbon-geometry" {
    import { IConstructor } from "carbon-basics";
    import { IContext } from "carbon-rendering";

    export interface ICoordinate {
        x: number;
        y: number;
    }

    export interface INormilizedLine2D {
        a:number;
        b:number;
        c:number;
    }

    export interface IRange {
        minimum:number;
        maximum:number;
    }

    export interface IPoint extends ICoordinate {
        subtract(point: IPoint): IPoint;
        getAngle(point: IPoint): number;
        getDistance(fromPoint: IPoint): number;
        getDirectedAngle(fromPoint: IPoint): number;
    }

    export interface ISize{
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

        withWidth(width: number): IRect;
        withHeight(width: number): IRect;
        withSize(width: number, height: number): IRect;
        clone(): IRect;
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

        applyToContext(context: IContext);

        transformPoint(point: IPoint): IPoint;

        prepended(matrix: IMatrix): IMatrix;
        appended(matrix: IMatrix): IMatrix;
        invert(): IMatrix;
        prependedWithTranslation(tx: number, ty: number): IMatrix;

        clone(): IMatrix;
        withTranslation(x: number, y: number): IMatrix;

        isTranslatedOnly(): boolean;
        isSingular(): boolean;
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