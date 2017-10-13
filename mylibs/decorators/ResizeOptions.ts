export default class ResizeOptions {
    constructor(public sameDirection: boolean, public reset: boolean, public round: boolean, public final: boolean){
    }

    withRounding(round){
        if (this.round === round){
            return this;
        }
        return new ResizeOptions(this.sameDirection, this.reset, round, this.final);
    }
    withSameDirection(sameDirection){
        if (this.sameDirection === sameDirection){
            return this;
        }
        return new ResizeOptions(sameDirection, this.reset, this.round, this.final);
    }
    withReset(reset){
        if (this.reset === reset){
            return this;
        }
        return new ResizeOptions(this.sameDirection, reset, this.round, this.final);
    }
    withFinal(final){
        if (this.final === final){
            return this;
        }
        return new ResizeOptions(this.sameDirection, this.reset, this.round, final);
    }
    forChildResize(round){
        if (!this.sameDirection && this.round === round){
            return this;
        }
        return new ResizeOptions(false, this.reset, round, this.final);
    }

    static Default: ResizeOptions;
    static Once: ResizeOptions;
}

ResizeOptions.Default = new ResizeOptions(true, true, true, false);
ResizeOptions.Once = new ResizeOptions(true, false, true, true);