import Rectangle from "framework/Rectangle";
import ModifyFramePoint from "decorators/ModifyFramePoint";
import {PointDirection} from "framework/Defs";

define([], function() {

    var fwk = sketch.framework;
    var ui = sketch.ui;
    fwk.PropertyMetadata.extend("sketch.framework.ImageElement", {
              "sketch.ui.common.PopupContainer": {
                  calloutPoint:{
                      defaultValue:[0,0],
                      useInModel:true
                  },
                  cornerRadius:{
                      defaultValue:fwk.QuadAndLock.Default,
                      displayName:"Corner radius",
                      type:"quadAndLock"
                  }

              }
          });
    klass2('sketch.ui.common.PopupContainer', fwk.Container, {
    _constructor: function() {
        //this.properties.createProperty("calloutPoint", [0,0]).useInModel(true);
        //this.properties.createProperty("cornerRadius", "Corner radius", fwk.QuadAndLock.Default).
        //                editorTemplate("#editor-roundedCorners");
        //this.properties.borderBrush.setDefaultValue(fwk.Brush.Black).value(fwk.Brush.Black);

        //this.properties.backgroundBrush.changeDescription("Fill brush");
        //this.properties.borderBrush.changeDescription("Stroke brush");
        //this.properties.borderWidth.changeDescription("Stroke width");
        this.setProps({
            borderBrush:fwk.Brush.Black,
            clipSelf:true
        });

        this.minWidth(20);
        this.minHeight(20);

        this.enableGroupLocking(true);
    },
    calloutPoint:function(value) {
        return this.properties.calloutPoint.value(value);
    },
    cornerRadius: function(value){
        return this.properties.cornerRadius.value(value);
    },
    drawSelf:function(context, width, height, environment) {
        var x = 0, y = 0;
        context.save();
        var cornerRadius = this.cornerRadius();
        var upperLeft = cornerRadius.upperLeft,
            upperRight = cornerRadius.upperRight,
            bottomLeft = cornerRadius.bottomLeft,
            bottomRight = cornerRadius.bottomRight;

        context.beginPath();
        var crazy = fwk.CrazyScope.isCrazy;
        var xul = x + upperLeft;
        var xur = x + width - upperRight;
        var tw = (xur - xul) * 0.2;
        var dtw = (xur - xul) * 0.21;
        var twl = xul + dtw;
        var twr = xur - dtw - tw;

        var xbl = x + bottomLeft;
        var xbr = x + width - bottomRight;
        var bw = (xbr - xbl) * 0.2;
        var dbw = (xbr - xbl) * 0.21;
        var bwl = xbl + dbw;
        var bwr = xbr - dbw - bw;

        var yrt = y + upperRight;
        var yrb = y + height - bottomRight;
        var rh = (yrb - yrt) * 0.2;
        var drh = (yrb - yrt) * 0.21;
        var rhu = yrt + drh;
        var rhb = yrb -  drh - rh;

        var ylt = y + upperLeft;
        var ylb = y + height - bottomLeft;
        var lh =  (ylb - ylt) * 0.2;
        var dlh = (ylb - ylt) * 0.21;
        var lhu = ylt + dlh;
        var lhb = ylb -  dlh - lh;

        var right = x + width;
        var bottom = y + height;

        var callout = this.calloutPoint();
        var cx = callout[0]*width + x;
        var cy = callout[1]*height + y;

        var pts = [
            {x:twl+tw/2, y:y},
            {x:twr + tw/2, y:y},
            {x:right, y:rhu + rh / 2},
            {x:right, y:rhb + rh / 2},
            {x:bwr + bw/2, y:bottom},
            {x:bwl+bw/2, y:bottom},
            {x:x, y:lhb + lh / 2},
            {x:x, y:lhu + lh / 2}
        ];

        var minIdx = 0;
        var min = Number.MAX_VALUE;
        for(var i = 0; i < pts.length; ++i) {
            var x2 = (pts[i].x - cx);
            x2 = x2*x2;
            var y2 = (pts[i].y - cy);
            y2 = y2*y2;
            if((x2 + y2) < min) {
                minIdx = i;
                min = x2+y2;
            }
        }

        pts[minIdx].x = cx;
        pts[minIdx].y = cy;

        if(crazy) {
            context.crazyLine(xul, y, twl, y);
            if (minIdx === 0) {
                context.crazyLine(twl, y, pts[0].x, pts[0].y, true);
                context.crazyLine(pts[0].x, pts[0].y, twl + tw, y, true);
                context.crazyLine(twl + tw, y, twr, y, true);
            } else {
                context.crazyLine(twl, y, twr, y, true);
            }

            if(minIdx === 1) {
                context.crazyLine(twr, y, pts[1].x, pts[1].y, true);
                context.crazyLine(pts[1].x, pts[1].y, twr + tw, y, true);
                context.crazyLine(twr + tw, y, xur, y, true);
            } else {
                context.crazyLine(twr, y, xur, y, true);
            }
        } else {
            context.moveTo(xul, y);
            context.lineTo(twl, y);
            context.lineTo(pts[0].x, pts[0].y);
            context.lineTo(twl + tw, y);
            context.lineTo(twr, y);
            context.lineTo(pts[1].x, pts[1].y);
            context.lineTo(twr + tw, y);

            context.lineTo(xur, y);
        }
        context.quadraticCurveTo(right, y, right, yrt);

        if(crazy){
            if(minIdx === 2) {
                context.crazyLine(right, yrt, right, rhu, true);
                context.crazyLine(right, rhu, pts[2].x, pts[2].y, true);
                context.crazyLine(pts[2].x, pts[2].y, right, rhu + rh, true);
                context.crazyLine(right, rhu + rh, right, rhb, true);
            } else {
                context.crazyLine(right, yrt, right, rhb, true);
            }

            if(minIdx === 3) {
                context.crazyLine(right, rhb, pts[3].x, pts[3].y, true);
                context.crazyLine(pts[3].x, pts[3].y, right, rhb + rh, true);
                context.crazyLine(right, rhb + rh, right, yrb, true);
            } else {
                context.crazyLine(right, rhb, right, yrb, true);
            }
        } else {
            context.lineTo(right, rhu);
            context.lineTo(pts[2].x, pts[2].y);
            context.lineTo(right, rhu + rh);
            context.lineTo(right, rhb);
            context.lineTo(pts[3].x, pts[3].y);
            context.lineTo(right, rhb + rh);
            context.lineTo(right, yrb);
        }
        context.quadraticCurveTo(right, bottom, xbr, bottom);

        if(crazy){
            if(minIdx === 4) {
                context.crazyLine(xbr, bottom, bwr + bw, bottom, true);
                context.crazyLine(bwr + bw, bottom, pts[4].x, pts[4].y, true);
                context.crazyLine(pts[4].x, pts[4].y, bwr, bottom, true);
                context.crazyLine(bwr, bottom, bwl + bw, bottom, true);
            } else {
                context.crazyLine(xbr, bottom, bwl + bw, bottom, true);
            }

            if(minIdx === 5) {
                context.crazyLine(bwl + bw, bottom, pts[5].x, pts[5].y, true);
                context.crazyLine(pts[5].x, pts[5].y, bwl, bottom, true);
                context.crazyLine(bwl, bottom, xbl, bottom, true);
            } else {
                context.crazyLine(bwl + bw, bottom, xbl, bottom, true);
            }
        } else {
            context.lineTo(bwr + bw, bottom);
            context.lineTo(pts[4].x, pts[4].y);
            context.lineTo(bwr, bottom);
            context.lineTo(bwl+bw, bottom);
            context.lineTo(pts[5].x, pts[5].y);
            context.lineTo(bwl, bottom);
            context.lineTo(xbl, bottom);
        }
        context.quadraticCurveTo(x, y + height, x, y + height - bottomLeft);

        if(crazy){
            if(minIdx === 6) {
                context.crazyLine(x, ylb, x, lhb + lh, true);
                context.crazyLine(x, lhb + lh, pts[6].x, pts[6].y, true);
                context.crazyLine(pts[6].x, pts[6].y, x, lhb, true);
                context.crazyLine(x, lhb, x, lhu + lh, true);
            } else {
                context.crazyLine(x, ylb, x, lhu + lh, true);
            }

            if(minIdx === 7) {
                context.crazyLine(x, lhu + lh, pts[7].x, pts[7].y, true);
                context.crazyLine(pts[7].x, pts[7].y, x, lhu, true);
                context.crazyLine(x, lhu, x, ylt, true);
            } else {
                context.crazyLine(x, lhu + lh, x, ylt, true);
            }

        } else {
            context.lineTo(x, lhb + lh);
            context.lineTo(pts[6].x, pts[6].y);
            context.lineTo(x, lhb);
            context.lineTo(x, lhu + lh);
            context.lineTo(pts[7].x, pts[7].y);
            context.lineTo(x, lhu);
            context.lineTo(x, ylt);
        }
        context.quadraticCurveTo(x, y, x + upperLeft, y);

        context.closePath();

        fwk.Brush.fill(this.backgroundBrush(), context, x, y, width, height);
        // context.lineWidth = this.borderWidth();
        fwk.Brush.stroke(this.borderBrush(), context, x, y, width, height);
        if(this.clipSelf()) {
            context.clip();
        }

        this.drawChildren(context, width, height);
        context.restore();
    },
    createSelectionFrame:function(view) {
        var frame = Rectangle.prototype.createSelectionFrame.apply(this, arguments);
        var that = this;

        frame.points.splice(0,0, {type:ModifyFramePoint, moveDirection:PointDirection.Any, x:0, y:0, cursor:9,
            update:function(p, x, y, w, h) {
                var pt = that.calloutPoint();
                p.x = x + pt[0] * w;
                p.y = y + pt[1] * h;
            },
            change:function(frame, dx, dy, point, event) {
                if(!frame.resizingElement) {
                    return;
                }
                var w = frame.element.width();
                var h = frame.element.height();

                frame.resizingElement._clone.calloutPoint([(point.x+dx - frame.element.x())/w, (point.y + dy - frame.element.y())/h]);
            },
            capture:function(frame) {

            },
            release:function(frame) {
                var cmd = that.constructPropsChangedCommand({calloutPoint: frame.resizingElement._clone.calloutPoint()}, {calloutPoint:that.calloutPoint()});
                fwk.commandManager.execute(cmd);
            }
        });

        return frame;
    }
});

});