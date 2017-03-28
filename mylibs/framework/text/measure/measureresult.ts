    function MeasureResult(width?: any, height?: any, ascent?: any, descent?: any, miny?: any, maxy?: any) {
    	this.width = width;
    	this.height = height;
    	this.ascent = ascent;
    	this.descent = descent;
        this.minY = miny;
        this.maxY = maxy;
    }

    MeasureResult.prototype.width = 0;
    MeasureResult.prototype.height = 0;
    MeasureResult.prototype.ascent = 0;
    MeasureResult.prototype.descent = 0;
    MeasureResult.prototype.minY = 0;
    MeasureResult.prototype.maxY = 0;
    MeasureResult.prototype.minX = 0;
    MeasureResult.prototype.maxX = 0;

    export default MeasureResult;
