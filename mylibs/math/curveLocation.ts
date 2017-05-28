import { IContour, IBezierGraph, IBezierCurve, ILocation } from "carbon-core";

export default class CurveLocation implements ILocation {
    private _graph: IBezierGraph;
    private _contour: IContour;
    private _edge: IBezierCurve;
    private _parameter: number;
    private _distance: number;

    get graph(): IBezierGraph {
        return this._graph;
    }

    set graph(value: IBezierGraph) {
        this._graph = value;
    }

    get contour(): IContour {
        return this._contour;
    }

    set contour(value: IContour) {
        this._contour = value;
    }

    get edge(): IBezierCurve {
        return this._edge;
    }

    set edge(value: IBezierCurve) {
        this._edge = value;
    }

    get parameter(): number {
        return this._parameter;
    }

    set parameter(value: number) {
        this._parameter = value;
    }

    get distance(): number {
        return this._distance;
    }

    set distance(value: number) {
        this._distance = value;
    }

    constructor(edge: IBezierCurve, parameter: number, distance: number) {
        this.edge = edge;
        this.parameter = parameter;
        this.distance = distance;
    }
}
