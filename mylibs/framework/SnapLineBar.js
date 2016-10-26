// import Cursor from "framework/Cursor";
// import Invalidate from "framework/Invalidate";
// import Environment from "environment";
//
// define(["framework/Rectangle"], function (Rectangle) {
//     var fwk = sketch.framework;
//
//     var BAR_BRUSH = fwk.Brush.createFromColor('rgba(109, 161, 249, 0.6)');
//     var HANDLE_SIZE2 = 5;
//
//     function getBarRect(){
//         var barRect = this.getBoundaryRectGlobal();
//         var elementRect = this._element.getBoundaryRectGlobal();
//         var scale = Environment.view.scale();
//         if (this._type === 'horizontal'){
//             return {x: barRect.x, y: elementRect.y - (barRect.height + 10) / scale, width: barRect.width, height: barRect.height / scale};
//         } else{
//             return {x: elementRect.x - (barRect.width + 10) / scale, y: elementRect.y, width: barRect.width / scale, height: barRect.height};
//         }
//     }
//
//     function drawSnapLine(context, barRect, elementRect, snapline, scale){
//         var h = barRect.height;
//         var w = barRect.width;
//
//         context.save();
//         context.lineWidth = 1 / scale;
//         if (snapline.tmp){
//             context.strokeStyle = '#EE9A00';
//             context.fillStyle = '#EE9A00';
//         } else{
//             fwk.Brush.setStroke(BAR_BRUSH, context);
//             context.fillStyle = '#fff';
//         }
//         if (this._type === 'horizontal'){
//             context.beginPath();
//             context.moveTo(snapline.pos - HANDLE_SIZE2 / scale, barRect.y);
//             context.lineTo(snapline.pos + HANDLE_SIZE2 / scale, barRect.y);
//             context.lineTo(snapline.pos, barRect.y + h);
//             context.closePath();
//             context.fill();
//             context.stroke();
//
//             context.linePath(snapline.pos, barRect.y + h, snapline.pos, elementRect.y + elementRect.height);
//             context.stroke();
//         } else{
//             context.beginPath();
//             context.moveTo(barRect.x, snapline.pos - HANDLE_SIZE2 / scale);
//             context.lineTo(barRect.x, snapline.pos + HANDLE_SIZE2 / scale);
//             context.lineTo(barRect.x + w, snapline.pos);
//             context.closePath();
//             context.fill();
//             context.stroke();
//
//             context.linePath(barRect.x + w, snapline.pos, elementRect.x + elementRect.width, snapline.pos);
//             context.stroke();
//         }
//         context.restore();
//     }
//
//     function hitSnapLineNumber(mousePos){
//         for (var i = 0; i < this._snapLines.length; ++i){
//             var pos = this._snapLines[i].pos;
//             if (Math.abs(pos - mousePos) < 2 * HANDLE_SIZE2){
//                 return i;
//             }
//         }
//
//         return -1;
//     }
//
//     function onMouseMove(event){
//         if (this._lineToMove >= 0){
//             this._snapLines.splice(this._lineToMove, 1);
//             delete this._lineToMove;
//         }
//         if (this.hitTest(event)){
//             var mousePos;
//             var cursor;
//             if (this._type === 'horizontal'){
//                 mousePos = event.x;
//                 cursor = 'col-resize';
//             } else{
//                 mousePos = event.y;
//                 cursor = 'row-resize';
//             }
//
//             if (hitSnapLineNumber.call(this, mousePos) >= 0){
//                 delete this._snapLineToAdd;
//                 Cursor.setGlobalCursor(cursor, true);
//                 this._changedCursor = true;
//                 Invalidate.requestUpperOnly();
//                 event.handled = true;
//                 return;
//             } else{
//                 Cursor.removeGlobalCursor(true);
//                 delete this._changedCursor;
//             }
//
//             this._snapLineToAdd = {pos: mousePos, tmp: true};
//             event.handled = true;
//             Invalidate.requestUpperOnly();
//             return;
//         }
//
//         if (this._changedCursor){
//             Cursor.removeGlobalCursor(true);
//             delete this._changedCursor;
//         }
//
//         if (this._snapLineToAdd){
//             delete this._snapLineToAdd;
//             Invalidate.requestUpperOnly();
//         }
//     }
//
//     function onMouseUp(event){
//         if (this.hitTest(event)){
//             if (this._type === 'horizontal'){
//                 var snapline = {pos: event.x};
//             } else{
//                 snapline = {pos: event.y};
//             }
//             event.handled = true;
//             this._snapLines.push(snapline);
//             Invalidate.requestUpperOnly();
//         }
//     }
//
//     function onClick(event){
//         if (this.hitTest(event)){
//             event.handled = true;
//         }
//     }
//
//     function onMouseDown(event){
//         if (this.hitTest(event)){
//             var mousePos;
//
//             if (this._type === 'horizontal'){
//                 mousePos = event.x;
//             } else{
//                 mousePos = event.y;
//             }
//
//             this._lineToMove = hitSnapLineNumber.call(this, mousePos);
//             event.handled = true;
//         }
//     }
//
//     return klass(Rectangle, {
//         _constructor:function (element, type) {
//             this._type = type;
//             this.fill(BAR_BRUSH);
//
//             this.canSelect(false);
//             this.canDrag(false);
//             this.crazySupported(false);
//
//
//             this._snapLines = [];
//             this._snapLineToAdd = null;
//             this._element = element;
//
//             this._mouseMoveSubscriber = Environment.controller.mousemoveEvent.bind(this, onMouseMove);
//             this._mouseUpSubscriber = Environment.controller.mouseupEvent.bind(this, onMouseUp);
//             this._mouseDownSubscriber = Environment.controller.mousedownEvent.bind(this, onMouseDown);
//             this._clickSubscriber = Environment.controller.clickEvent.bind(this, onClick);
//         },
//         dispose:function() {
//             dispose(this._mouseMoveSubscriber);
//             dispose(this._mouseUpSubscriber);
//             dispose(this._clickSubscriber);
//             dispose(this._mouseDownSubscriber);
//
//             Rectangle.prototype.dispose.apply(this, arguments);
//         },
//         displayName:function() {
//             return "SnapLineBar";
//         },
//         drawSelf:function(context,w ,h, environment) {
//             var barRect = getBarRect.call(this);
//             var elementRect = this._element.getBoundaryRectGlobal();
//             var scale = Environment.view.scale();
//
//             context.rectPath(barRect.x, barRect.y, barRect.width, barRect.height);
//             fwk.Brush.fill(this.fill(), context, barRect.x, barRect.y, barRect.width, barRect.height);
//
//             if(this._snapLineToAdd) {
//                 drawSnapLine.call(this, context, barRect, elementRect, this._snapLineToAdd, scale);
//             }
//
//             for(var i = 0; i < this._snapLines.length; ++i) {
//                 drawSnapLine.call(this, context, barRect, elementRect, this._snapLines[i], scale);
//             }
//         },
//         getLines:function(global) {
//             var barRect = this.getBoundaryRectGlobal();
//             var offset = 0;
//             if(!global) {
//                 if(this._type === 'horizontal') {
//                     offset = barRect.x;
//                 } else {
//                     offset = barRect.y;
//                 }
//             }
//
//             return map(this._snapLines, function(line) {
//                 return line.pos - offset;
//             })
//         },
//         setLines:function(lines) {
//             var barRect = this.getBoundaryRectGlobal();
//             var offset = 0;
//             if(this._type === 'horizontal') {
//                 offset = barRect.x;
//             } else {
//                 offset = barRect.y;
//             }
//             this._snapLines = map(lines, function(line){
//                 return {pos:line + offset};
//             })
//         },
//         hitTest : function(/*Point*/point) {
//             if(!this.visible()){
//                 return false;
//             }
//             var rect= getBarRect.call(this);
//             return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
//         }
//     });
// });