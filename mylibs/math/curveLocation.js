export default class CurveLocation
{
    get graph(){
        return this._graph;
    }

    set graph(value) {
        this._graph = value;
    }

    get contour(){
        return this._contour;
    }

    set contour(value) {
        this._contour = value;
    }

    get edge(){
        return this._edge;
    }

    set edge(value) {
        this._edge = value;
    }

    get parameter(){
        return this._parameter;
    }

    set parameter(value) {
        this._parameter = value;
    }

    get distance(){
        return this._distance;
    }

    set distance(value) {
        this._distance= value;
    }

    constructor(edge, parameter, distance) {
        this.edge = edge;
        this.parameter = parameter;
        this.distance = distance;
    }
}
