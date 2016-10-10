export default class EdgeCrossing {

    get edge(){
        return this._edge;
    }

    set edge(value){
        this._edge = value;
    }

    get counterpart(){
        return this._counterpart;
    }

    set counterpart(value){
        this._counterpart = value;
    }

    get isEntry(){
        return this._entry;
    }

    set entry(value){
        this._entry = value;
    }

    get isProcessed(){
        return this._processed;
    }

    set processed(value) {
        this._processed = value;
    }


    get isSelfCrossing(){
        return this._selfCrossing;
    }

    set selfCrossing(value){
        this._selfCrossing = value;
    }

    get index(){
        return this._index;
    }

    set index(value){
        this._index = value;
    }
    get fromCrossingOverlap(){
        return this._fromCrossingOverlap;
    }

    set fromCrossingOverlap(value){
        this._fromCrossingOverlap = value;
    }

    static crossingWithIntersection(intersection) {
        var c = new EdgeCrossing();
        c._intersection = intersection;
        return c;
    }

    removeFromEdge() {
        this._edge.removeCrossing(this);
    }

    get order() {
        return this.parameter;
    }

    get next() {
        return this.edge.nextCrossing(this);
    }

    get previous() {
        return this.edge.previousCrossing(this);
    }

    get nextNonself() {
        var next = this.next;
        while (next != null && next.isSelfCrossing)
            next = next.next;
        return next;
    }

    get previousNonself() {
        var previous = this.previous;
        while (previous != null && previous.isSelfCrossing)
            previous = previous.previous;
        return previous;
    }

    get parameter() {
        if (this.edge == this._intersection.curve1)
            return this._intersection.parameter1;

        return this._intersection.parameter2;
    }

    get location() {
        return this._intersection.location;
    }

    get curve() {
        return this.edge;
    }

    get leftCurve() {
        if (this.isAtStart)
            return null;

        if (this.edge == this._intersection.curve1)
            return this._intersection.curve1LeftBezier;

        return this._intersection.curve2LeftBezier;
    }

    get rightCurve() {
        if (this.isAtEnd)
            return null;

        if (this.edge == this._intersection.curve1)
            return this._intersection.curve1RightBezier;

        return this._intersection.curve2RightBezier;
    }

    get isAtStart() {
        if (this.edge == this._intersection.curve1)
            return this._intersection.isAtStartOfCurve1;

        return this._intersection.isAtStartOfCurve2;
    }

    get isAtEnd() {
        if (this.edge == this._intersection.curve1)
            return this._intersection.isAtStopOfCurve1;

        return this._intersection.isAtStopOfCurve2;
    }

}