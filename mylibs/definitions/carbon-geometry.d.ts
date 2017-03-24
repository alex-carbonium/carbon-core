declare module "carbon-geometry"{
    export interface IRect {
        x: number;
        y: number;
        width: number;
        height: number;
    }

    export interface ICoordinate {
        x: number;
        y: number;
    }

    export interface IPoint extends ICoordinate {
        getDistance(fromPoint: IPoint): number;
        getDirectedAngle(fromPoint: IPoint): number;
    }
}