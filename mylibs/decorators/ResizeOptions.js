export default class ResizeOptions{
    constructor(sameDirection, reset, round){
        this.sameDirection = sameDirection;
        this.reset = reset;
        this.round = round;
    }

    withRounding(round){
        if (this.round === round){
            return this;
        }
        return new ResizeOptions(this.sameDirection, this.reset, round);
    }
    withSameDirection(sameDirection){
        if (this.sameDirection === sameDirection){
            return this;
        }
        return new ResizeOptions(sameDirection, this.reset, this.round);
    }
    withReset(reset){
        if (this.reset === reset){
            return this;
        }
        return new ResizeOptions(this.sameDirection, reset, this.round);
    }
    forChildResize(round){
        if (!this.sameDirection && this.round === round){
            return this;
        }
        return new ResizeOptions(false, this.reset, round);
    }
}

ResizeOptions.Default = new ResizeOptions(true, true, true);