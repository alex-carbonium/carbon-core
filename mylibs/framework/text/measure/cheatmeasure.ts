import {cssProperty} from "../util/util";
import MeasureResult from "./measureresult";

    function CheatMeasure(text, style) {
    	var metrics = new MeasureResult();
    	var fontFamily = cssProperty(style,"font-family");
        var fontSize = cssProperty(style,"font-size");
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        if (fontSize && fontFamily) {
        	ctx.font = fontSize + " " + fontFamily;
        } else {
        	ctx.font = cssProperty(style,"font");
        }
        
        metrics.width = ctx.measureText(text).width;
        metrics.ascent = ctx.measureText("m").width;
        metrics.height = metrics.ascent*2;
        metrics.descent = metrics.height - metrics.ascent;

        // var cm = BitmapMeasure(text, style);
        return metrics;
    }

    export default CheatMeasure;
