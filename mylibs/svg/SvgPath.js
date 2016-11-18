// define(["framework/Shape"], function (Shape) {
//     if (!sketch.svg){
//         sketch.svg = {};
//     }
//     var fwk = sketch.framework;
//     var svg = sketch.svg;
//
//     var commandLengths = {
//         m: 2,
//         l: 2,
//         h: 1,
//         v: 1,
//         c: 6,
//         s: 4,
//         q: 4,
//         t: 2,
//         a: 7
//     };
//
//     function drawArc(ctx, x, y, coords) {
//         var rx = coords[0];
//         var ry = coords[1];
//         var rot = coords[2];
//         var large = coords[3];
//         var sweep = coords[4];
//         var ex = coords[5];
//         var ey = coords[6];
//         var segs = arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
//         for (var i=0; i<segs.length; i++) {
//             var bez = segmentToBezier.apply(this, segs[i]);
//             ctx.bezierCurveTo.apply(ctx, bez);
//         }
//     }
//
//     var arcToSegmentsCache = { },
//         segmentToBezierCache = { },
//         _join = Array.prototype.join,
//         argsString;
//
//     // Generous contribution by Raph Levien, from libsvg-0.1.0.tar.gz
//     function arcToSegments(x, y, rx, ry, large, sweep, rotateX, ox, oy) {
//         argsString = _join.call(arguments);
//         if (arcToSegmentsCache[argsString]) {
//             return arcToSegmentsCache[argsString];
//         }
//
//         var th = rotateX * (Math.PI/180);
//         var sin_th = Math.sin(th);
//         var cos_th = Math.cos(th);
//         rx = Math.abs(rx);
//         ry = Math.abs(ry);
//         var px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5;
//         var py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5;
//         var pl = (px*px) / (rx*rx) + (py*py) / (ry*ry);
//         if (pl > 1) {
//             pl = Math.sqrt(pl);
//             rx *= pl;
//             ry *= pl;
//         }
//
//         var a00 = cos_th / rx;
//         var a01 = sin_th / rx;
//         var a10 = (-sin_th) / ry;
//         var a11 = (cos_th) / ry;
//         var x0 = a00 * ox + a01 * oy;
//         var y0 = a10 * ox + a11 * oy;
//         var x1 = a00 * x + a01 * y;
//         var y1 = a10 * x + a11 * y;
//
//         var d = (x1-x0) * (x1-x0) + (y1-y0) * (y1-y0);
//         var sfactor_sq = 1 / d - 0.25;
//         if (sfactor_sq < 0) sfactor_sq = 0;
//         var sfactor = Math.sqrt(sfactor_sq);
//         if (sweep === large) sfactor = -sfactor;
//         var xc = 0.5 * (x0 + x1) - sfactor * (y1-y0);
//         var yc = 0.5 * (y0 + y1) + sfactor * (x1-x0);
//
//         var th0 = Math.atan2(y0-yc, x0-xc);
//         var th1 = Math.atan2(y1-yc, x1-xc);
//
//         var th_arc = th1-th0;
//         if (th_arc < 0 && sweep === 1){
//             th_arc += 2*Math.PI;
//         } else if (th_arc > 0 && sweep === 0) {
//             th_arc -= 2 * Math.PI;
//         }
//
//         var segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)));
//         var result = [];
//         for (var i=0; i<segments; i++) {
//             var th2 = th0 + i * th_arc / segments;
//             var th3 = th0 + (i+1) * th_arc / segments;
//             result[i] = [xc, yc, th2, th3, rx, ry, sin_th, cos_th];
//         }
//
//         return (arcToSegmentsCache[argsString] = result);
//     }
//
//     function segmentToBezier(cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
//         argsString = _join.call(arguments);
//         if (segmentToBezierCache[argsString]) {
//             return segmentToBezierCache[argsString];
//         }
//
//         var a00 = cos_th * rx;
//         var a01 = -sin_th * ry;
//         var a10 = sin_th * rx;
//         var a11 = cos_th * ry;
//
//         var th_half = 0.5 * (th1 - th0);
//         var t = (8/3) * Math.sin(th_half * 0.5) * Math.sin(th_half * 0.5) / Math.sin(th_half);
//         var x1 = cx + Math.cos(th0) - t * Math.sin(th0);
//         var y1 = cy + Math.sin(th0) + t * Math.cos(th0);
//         var x3 = cx + Math.cos(th1);
//         var y3 = cy + Math.sin(th1);
//         var x2 = x3 + t * Math.sin(th1);
//         var y2 = y3 - t * Math.cos(th1);
//
//         return (segmentToBezierCache[argsString] = [
//             a00 * x1 + a01 * y1,      a10 * x1 + a11 * y1,
//             a00 * x2 + a01 * y2,      a10 * x2 + a11 * y2,
//             a00 * x3 + a01 * y3,      a10 * x3 + a11 * y3
//         ]);
//     }
//
//     "use strict";
//
//     //TODO: fix
//     var  //min = fabric.util.array.min,
//     //max = fabric.util.array.max,
//         _toString = Object.prototype.toString;
//
//     /**
//      * @private
//      */
//     function getX(item) {
//         if (item[0] === 'H') {
//             return item[1];
//         }
//         return item[item.length - 2];
//     }
//
//     /**
//      * @private
//      */
//     function getY(item) {
//         if (item[0] === 'V') {
//             return item[1];
//         }
//         return item[item.length - 1];
//     }
//
//     klass2("sketch.svg.Path", Shape, {
//         sourceWidth:function(/*Number*/value){
//             return this.field("_sourceWidth", value, this.width());
//         },
//         sourceHeight:function(/*Number*/value){
//             return this.field("_sourceHeight", value, this.height());
//         },
//         _constructor:function(){
//         },
//         toJSON:function(includeDefaults){
//             var data = Shape.prototype.toJSON.apply(this, arguments);
//             if(this._options.d){
//                 delete this._options.d;
//             }
//             data.path = this._path;
//             data.options = this._options;
//             return data;
//         },
//         fromJSON:function(data){
//             Shape.prototype.fromJSON.apply(this, arguments);
//             this.initFromPath(data.path, data.options);
//         },
//         initFromPath: function(path, options) {
//             this._path = path;
//             options = options || { };
//
//             // this.setOptions(options);
//             this._options = options;
//
//             if(options.width){
//                 this.width(this.width() || ~~options.width);
//                 this.sourceWidth(~~options.width);
//             }
//
//             if(options.height){
//                 this.height(this.height() || ~~options.height);
//                 this.sourceHeight(~~options.height);
//             }
//
//             if(options.fill){
//                 this.fill(fwk.Brush.createFromColor(options.fill));
//             }
//             if(options.stroke){
//                 this.stroke(fwk.Brush.createFromColor(options.stroke));
//             }
//
//             var fromArray = _toString.call(path) === '[object Array]';
//
//             this.path = fromArray
//                 ? path
//                 // one of commands (m,M,l,L,q,Q,c,C,etc.) followed by non-command characters (i.e. command values)
//                 : path.match && path.match(/[mzlhvcsqta][^mzlhvcsqta]*/gi);
//
//             if (!this.path) return;
//
//             if (!fromArray) {
//                 this.path = this._parsePath();
//             }
//             this._initializePath(options);
//
//             if (options.sourcePath) {
//                 this.setSourcePath(options.sourcePath);
//             }
//         },
//
//         /**
//          * @private
//          * @method _initializePath
//          */
//         _initializePath: function (options) {
//             var isWidthSet = 'width' in options,
//                 isHeightSet = 'height' in options;
//
//             if (!isWidthSet || !isHeightSet) {
//                 extend(this, this._parseDimensions());
//                 if (isWidthSet) {
//                     this.width(options.width);
//                     this.sourceWidth(options.width);
//                 }
//                 if (isHeightSet) {
//                     this.height(options.height);
//                     this.sourceHeight(options.height);
//                 }
//             }
//
//             //this.pathOffset = this._calculatePathOffset(isTopSet || isLeftSet); //Save top-left coords as offset
//         },
//
// //            /**
// //             * @private
// //             * @method _calculatePathOffset
// //             */
// //            _calculatePathOffset: function (positionSet) {
// //                return {
// //                    x: positionSet ? 0 :  - (this.width() / 2),
// //                    y: positionSet ? 0 :  - (this.height() / 2)
// //                };
// //            },
//
//         /**
//          * @private
//          * @method _render
//          */
//         _render: function(ctx, scaleX, scaleY) {
//             var current, // current instruction
//                 previous = null,
//                 x = 0, // current x
//                 y = 0, // current y
//                 controlX = 0, // current control point x
//                 controlY = 0, // current control point y
//                 tempX,
//                 tempY,
//                 tempControlX,
//                 tempControlY,
//                 l = 0,//this.x(),//-((this.width() / 2) + this.pathOffset.x),
//                 t = 0;//this.y();//-((this.height() / 2) + this.pathOffset.y);
//
//             for (var i = 0, len = this.path.length; i < len; ++i) {
//
//                 current = this.path[i];
//
//                 switch (current[0]) { // first letter
//
//                     case 'l': // lineto, relative
//                         x += current[1]*scaleX;
//                         y += current[2]*scaleY;
//                         ctx.lineTo(x + l, y + t);
//                         break;
//
//                     case 'L': // lineto, absolute
//                         x = current[1]*scaleX;
//                         y = current[2]*scaleY;
//                         ctx.lineTo(x + l, y + t);
//                         break;
//
//                     case 'h': // horizontal lineto, relative
//                         x += current[1]*scaleX;
//                         ctx.lineTo(x + l, y + t);
//                         break;
//
//                     case 'H': // horizontal lineto, absolute
//                         x = current[1]*scaleX;
//                         ctx.lineTo(x + l, y + t);
//                         break;
//
//                     case 'v': // vertical lineto, relative
//                         y += current[1]*scaleY;
//                         ctx.lineTo(x + l, y + t);
//                         break;
//
//                     case 'V': // verical lineto, absolute
//                         y = current[1] * scaleY;
//                         ctx.lineTo(x + l, y + t);
//                         break;
//
//                     case 'm': // moveTo, relative
//                         x += current[1]*scaleX;
//                         y += current[2]*scaleY;
//                         // draw a line if previous command was moveTo as well (otherwise, it will have no effect)
//                         ctx[(previous && (previous[0] === 'm' || previous[0] === 'M')) ? 'lineTo' : 'moveTo'](x + l, y + t);
//                         break;
//
//                     case 'M': // moveTo, absolute
//                         x = current[1]*scaleX;
//                         y = current[2]*scaleY;
//                         // draw a line if previous command was moveTo as well (otherwise, it will have no effect)
//                         ctx[(previous && (previous[0] === 'm' || previous[0] === 'M')) ? 'lineTo' : 'moveTo'](x + l, y + t);
//                         break;
//
//                     case 'c': // bezierCurveTo, relative
//                         tempX = x + current[5]*scaleX;
//                         tempY = y + current[6]*scaleY;
//                         controlX = x + current[3]*scaleX;
//                         controlY = y + current[4]*scaleY;
//                         ctx.bezierCurveTo(
//                             x + current[1]*scaleX + l, // x1
//                             y + current[2]*scaleY + t, // y1
//                             controlX + l, // x2
//                             controlY + t, // y2
//                             tempX + l,
//                             tempY + t
//                         );
//                         x = tempX;
//                         y = tempY;
//                         break;
//
//                     case 'C': // bezierCurveTo, absolute
//                         x = current[5]*scaleX;
//                         y = current[6]*scaleY;
//                         controlX = current[3]*scaleX;
//                         controlY = current[4]*scaleY;
//                         ctx.bezierCurveTo(
//                             current[1]*scaleX + l,
//                             current[2]*scaleY + t,
//                             controlX + l,
//                             controlY + t,
//                             x + l,
//                             y + t
//                         );
//                         break;
//
//                     case 's': // shorthand cubic bezierCurveTo, relative
//
//                         // transform to absolute x,y
//                         tempX = x + current[3]*scaleX;
//                         tempY = y + current[4]*scaleY;
//
//                         // calculate reflection of previous control points
//                         controlX = controlX ? (2 * x - controlX) : x;
//                         controlY = controlY ? (2 * y - controlY) : y;
//
//                         ctx.bezierCurveTo(
//                             controlX + l,
//                             controlY + t,
//                             x + current[1]*scaleX + l,
//                             y + current[2]*scaleY + t,
//                             tempX + l,
//                             tempY + t
//                         );
//                         // set control point to 2nd one of this command
//                         // "... the first control point is assumed to be the reflection of the second control point on the previous command relative to the current point."
//                         controlX = x + current[1]*scaleX;
//                         controlY = y + current[2]*scaleY;
//
//                         x = tempX;
//                         y = tempY;
//                         break;
//
//                     case 'S': // shorthand cubic bezierCurveTo, absolute
//                         tempX = current[3]*scaleX;
//                         tempY = current[4]*scaleY;
//                         // calculate reflection of previous control points
//                         controlX = 2*x - controlX;
//                         controlY = 2*y - controlY;
//                         ctx.bezierCurveTo(
//                             controlX + l,
//                             controlY + t,
//                             current[1]*scaleX + l,
//                             current[2]*scaleY + t,
//                             tempX + l,
//                             tempY + t
//                         );
//                         x = tempX;
//                         y = tempY;
//
//                         // set control point to 2nd one of this command
//                         // "... the first control point is assumed to be the reflection of the second control point on the previous command relative to the current point."
//                         controlX = current[1]*scaleX;
//                         controlY = current[2]*scaleY;
//
//                         break;
//
//                     case 'q': // quadraticCurveTo, relative
//                         // transform to absolute x,y
//                         tempX = x + current[3]*scaleX;
//                         tempY = y + current[4]*scaleY;
//
//                         controlX = x + current[1]*scaleX;
//                         controlY = y + current[2]*scaleY;
//
//                         ctx.quadraticCurveTo(
//                             controlX + l,
//                             controlY + t,
//                             tempX + l,
//                             tempY + t
//                         );
//                         x = tempX;
//                         y = tempY;
//                         break;
//
//                     case 'Q': // quadraticCurveTo, absolute
//                         tempX = current[3]*scaleX;
//                         tempY = current[4]*scaleY;
//
//                         ctx.quadraticCurveTo(
//                             current[1]*scaleX + l,
//                             current[2]*scaleY + t,
//                             tempX + l,
//                             tempY + t
//                         );
//                         x = tempX;
//                         y = tempY;
//                         controlX = current[1]*scaleX;
//                         controlY = current[2]*scaleY;
//                         break;
//
//                     case 't': // shorthand quadraticCurveTo, relative
//
//                         // transform to absolute x,y
//                         tempX = x + current[1]*scaleX;
//                         tempY = y + current[2]*scaleY;
//
//
//                         if (previous[0].match(/[QqTt]/) === null) {
//                             // If there is no previous command or if the previous command was not a Q, q, T or t,
//                             // assume the control point is coincident with the current point
//                             controlX = x;
//                             controlY = y;
//                         }
//                         else if (previous[0] === 't') {
//                             // calculate reflection of previous control points for t
//                             controlX = 2 * x - tempControlX;
//                             controlY = 2 * y - tempControlY;
//                         }
//                         else if (previous[0] === 'q') {
//                             // calculate reflection of previous control points for q
//                             controlX = 2 * x - controlX;
//                             controlY = 2 * y - controlY;
//                         }
//
//                         tempControlX = controlX;
//                         tempControlY = controlY;
//
//                         ctx.quadraticCurveTo(
//                             controlX + l,
//                             controlY + t,
//                             tempX + l,
//                             tempY + t
//                         );
//                         x = tempX;
//                         y = tempY;
//                         controlX = x + current[1]*scaleX;
//                         controlY = y + current[2]*scaleY;
//                         break;
//
//                     case 'T':
//                         tempX = current[1]*scaleX;
//                         tempY = current[2]*scaleY;
//
//                         // calculate reflection of previous control points
//                         controlX = 2 * x - controlX;
//                         controlY = 2 * y - controlY;
//                         ctx.quadraticCurveTo(
//                             controlX + l,
//                             controlY + t,
//                             tempX + l,
//                             tempY + t
//                         );
//                         x = tempX;
//                         y = tempY;
//                         break;
//
//                     case 'a':
//                         // TODO: optimize this
//                         drawArc(ctx, x + l, y + t, [
//                             current[1]*scaleX,
//                             current[2]*scaleY,
//                             current[3],
//                             current[4],
//                             current[5],
//                             current[6] *scaleX + x + l,
//                             current[7]*scaleY + y + t
//                         ]);
//                         x += current[6]*scaleX;
//                         y += current[7]*scaleY;
//                         break;
//
//                     case 'A':
//                         // TODO: optimize this
//                         drawArc(ctx, x + l, y + t, [
//                             current[1]*scaleX,
//                             current[2]*scaleY,
//                             current[3],
//                             current[4],
//                             current[5],
//                             current[6]*scaleX + l,
//                             current[7]*scaleY + t
//                         ]);
//                         x = current[6]*scaleX;
//                         y = current[7]*scaleY;
//                         break;
//
//                     case 'z':
//                     case 'Z':
//                         ctx.closePath();
//                         break;
//                 }
//                 previous = current;
//             }
//         },
//
//         drawSelf: function(ctx) {
//             var l = this.x(),
//                 t = this.y(),
//                 w = this.sourceWidth(),
//                 h = this.sourceHeight();
//
//             ctx.save();
//             var m = this.transformMatrix;
//             if (m) {
//                 ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
//             }
//
//             var scaleX = this.width() / this.sourceWidth();
//             var scaleY = this.height() / this.sourceHeight();
//
//             ctx.translate(this.x()/scaleX, this.y()/scaleY);
//
//
//             ctx.beginPath();
//
//             this._render(ctx, scaleX, scaleY);
//
//             fwk.Brush.fill(this.fill(), ctx, l, t, w, h);
//
//             //ctx.lineWidth = this.strokeWidth();
//             ctx.lineCap = ctx.lineJoin = 'round';
//             fwk.Brush.stroke(this.stroke(), ctx, l, t, w, h);
//
//             ctx.restore();
//         },
//
//         /**
//          * Returns number representation of an instance complexity
//          * @method complexity
//          * @return {Number} complexity
//          */
//         complexity: function() {
//             return this.path.length;
//         },
//
//         /**
//          * @private
//          * @method _parsePath
//          */
//         _parsePath: function() {
//             var result = [ ],
//                 currentPath,
//                 chunks,
//                 parsed;
//
//             for (var i = 0, chunksParsed, len = this.path.length; i < len; i++) {
//                 currentPath = this.path[i];
//                 chunks = currentPath.slice(1).trim().replace(/(\d)-/g, '$1###-').split(/\s|,|###/);
//                 chunksParsed = [ currentPath.charAt(0) ];
//
//                 for (var j = 0, jlen = chunks.length; j < jlen; j++) {
//                     parsed = parseFloat(chunks[j]);
//                     if (!isNaN(parsed)) {
//                         chunksParsed.push(parsed);
//                     }
//                 }
//
//                 var command = chunksParsed[0].toLowerCase(),
//                     commandLength = commandLengths[command];
//
//                 if (chunksParsed.length - 1 > commandLength) {
//                     for (var k = 1, klen = chunksParsed.length; k < klen; k += commandLength) {
//                         result.push([ chunksParsed[0] ].concat(chunksParsed.slice(k, k + commandLength)));
//                     }
//                 }
//                 else {
//                     result.push(chunksParsed);
//                 }
//             }
//
//             return result;
//         }
//
// //            /**
// //             * @method _parseDimensions
// //             */
// //            _parseDimensions: function() {
// //                var aX = [],
// //                    aY = [],
// //                    previousX,
// //                    previousY,
// //                    isLowerCase = false,
// //                    x,
// //                    y;
// //
// //                this.path.forEach(function(item, i) {
// //                    if (item[0] !== 'H') {
// //                        previousX = (i === 0) ? getX(item) : getX(this.path[i-1]);
// //                    }
// //                    if (item[0] !== 'V') {
// //                        previousY = (i === 0) ? getY(item) : getY(this.path[i-1]);
// //                    }
// //
// //                    // lowercased letter denotes relative position;
// //                    // transform to absolute
// //                    if (item[0] === item[0].toLowerCase()) {
// //                        isLowerCase = true;
// //                    }
// //
// //                    // last 2 items in an array of coordinates are the actualy x/y (except H/V);
// //                    // collect them
// //
// //                    // TODO (kangax): support relative h/v commands
// //
// //                    x = isLowerCase
// //                        ? previousX + getX(item)
// //                        : item[0] === 'V'
// //                        ? previousX
// //                        : getX(item);
// //
// //                    y = isLowerCase
// //                        ? previousY + getY(item)
// //                        : item[0] === 'H'
// //                        ? previousY
// //                        : getY(item);
// //
// //                    var val = parseInt(x, 10);
// //                    if (!isNaN(val)) aX.push(val);
// //
// //                    val = parseInt(y, 10);
// //                    if (!isNaN(val)) aY.push(val);
// //
// //                }, this);
// //
// //                var minX = min(aX),
// //                    minY = min(aY),
// //                    maxX = max(aX),
// //                    maxY = max(aY),
// //                    deltaX = maxX - minX,
// //                    deltaY = maxY - minY;
// //
// //                var o = {
// //                    top: minY + deltaY / 2,
// //                    left: minX + deltaX / 2,
// //                    bottom: max(aY) - deltaY,
// //                    right: max(aX) - deltaX
// //                };
// //
// //                o.width = deltaX;
// //                o.height = deltaY;
// //
// //                return o;
// //            }
//     });
//
//     svg.Path.ATTRIBUTE_NAMES = 'd fill fill-opacity opacity fill-rule stroke stroke-width transform'.split(' ');
//
//     svg.Path.fromSvgElement = function(element, options) {
//         var parsedAttributes = svg.parseAttributes(element, svg.Path.ATTRIBUTE_NAMES);
//         var path = new svg.Path();
//         path.initFromPath(parsedAttributes.d, extend(parsedAttributes, options));
//         return path;
//     };
// });
//
