import {cssProperty} from "../util/util";
import MeasureResult from "./measureresult";
import CheatMeasure from "./cheatmeasure";

    function BitmapMeasure(text, style) {
        var metrics = new MeasureResult(),
            fontFamily = cssProperty(style,"font-family"),
            fontSize = cssProperty(style,"font-size", true),
            fontString,
            canvas = document.createElement("canvas"),
            padding = 100;

        if (canvas.width === 0 || canvas.height === 0) {
            return metrics;
        }
        var ctx = canvas.getContext("2d");
        var regspace = /^\s+$/g;
        if (regspace.test(text)) {
            text = text.replace(" ", "|");
        }
        if (!fontSize || !fontFamily) {
            fontString = cssProperty(style,"font");

            var parts = fontString.split(" ");
            if (parts.length > 1) {
                var regnum = /([0-9]*)\.?[0-9]+/;
                var m = regnum.exec(parts[2]);
                if (m) {
                    fontSize = m[0];
                }
                parts.shift();
                // fontFamily = parts.join(' ');
            }
            ctx.font = fontString;
        } else {
            ctx.font = fontSize + "px " + (fontFamily||'') +
                        (cssProperty(style,"font-style")  || '') +
                        (cssProperty(style,"font-weight") || '');
        }

        metrics.width = ctx.measureText(text).width;

        // canvas.style.fontFamily = fontFamily;
        // canvas.style.fontSize = fontSize + "pt";
        canvas.width = metrics.width + padding;
        canvas.height = 3*parseFloat(fontSize);
        canvas.style.opacity = "1";

        var w = canvas.width,
            h = canvas.height,
            baseline = h/2;

        // Set all canvas pixeldata values to 255, with all the content
        // data being 0. This lets us scan for data[i] != 255.
        ctx.fillStyle = "white";
        ctx.fillRect(-1, -1, w+2, h+2);
        ctx.fillStyle = "black";
        ctx.fillText(text, padding/2, baseline);
        var pixelData = ctx.getImageData(0, 0, w, h).data;
        var i = 0,
            w4 = w * 4,
            len = pixelData.length;

        while (++i < len && pixelData[i] === 255);
        var ascent = (i/w4)|0;

        i = len - 1;
        while (--i > 0 && pixelData[i] === 255);
        var descent = (i/w4)|0;

        // set font metrics
        if (descent < ascent) { /* blank*/
            return CheatMeasure(text, style);
        } else {
            metrics.ascent = (baseline - ascent);
            metrics.descent = (descent - baseline);
        }
        metrics.height = 10+(descent - ascent);

        return metrics;
    }

    export default BitmapMeasure;
