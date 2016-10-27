// /*
// define(["framework/Container", "framework/SnapLineBar", "commands/ElementPropsChanged"], function (Container, SnapLineBar, ElementPropsChanged) {
//     var fwk = sketch.framework;
//
//     var SCROLL_INTENT = 5;
//
//     function getScrollOffset(){
//         var maxScrollX = this.areaWidth() - this.width();
//         var maxScrollY = this.areaHeight() - this.height();
//         var scrollOffsetX = this.scrollOffsetX();
//         var scrollOffsetY = this.scrollOffsetY();
//
//         var scrollX = scrollOffsetX - this._offsetX + this._startX;
//         var scrollY = scrollOffsetY - this._offsetY + this._startY;
//
//         if (scrollX > maxScrollX){
//             scrollX = maxScrollX;
//         }
//         if (scrollY > maxScrollY){
//             scrollY = maxScrollY;
//         }
//         if (scrollX < 0){
//             scrollX = 0;
//         }
//         if (scrollY < 0){
//             scrollY = 0;
//         }
//
//         return {x: scrollX, y: scrollY};
//     };
//
//     function onMouseDown(event){
//         if (this._isolatedMode && !this.hitTest(event, App.Current.view.scale())){
//             event.handler = true;
//         }
//     }
//
//     function updateOffsetToSnapLines(offset){
//         var newOffset = {x: offset.x, y: offset.y};
//         var xs = this._verticalSnapLines;
//         var ys = this._horizontalSnapLines;
//
//         var snapValue = 0;
//         var min = offset.x;
//
//         if (xs && xs.length){
//             for (var i = 0; i < xs.length; ++i){
//                 var v = Math.abs(xs[i] - offset.x);
//                 if (v < min){
//                     min = v;
//                     snapValue = xs[i];
//                 }
//             }
//             newOffset.x = snapValue;
//         }
//
//         snapValue = 0;
//         min = offset.y;
//
//         if (ys && ys.length){
//             for (i = 0; i < ys.length; ++i){
//                 v = Math.abs(ys[i] - offset.y);
//                 if (v < min){
//                     min = v;
//                     snapValue = ys[i];
//                 }
//             }
//             newOffset.y = snapValue;
//         }
//
//         return newOffset;
//     }
//
//     function disableIsolatedMode(){
//         this._isolatedMode = false;
//         dispose(this._mouseDownHandler);
//         dispose(this._mouseDblClickHandler);
//         dispose(this._cancelHandler);
//
//         this._verticalSnapLines = this._topSnapLineBar.getLines();
//         this._horizontalSnapLines = this._leftSnapLineBar.getLines();
//
//         if (this._topSnapLineBar){
//             this._topSnapLineBar.parent().remove(this._topSnapLineBar);
//             dispose(this._topSnapLineBar);
//         }
//
//         if (this._leftSnapLineBar){
//             this._leftSnapLineBar.parent().remove(this._leftSnapLineBar);
//             dispose(this._leftSnapLineBar);
//         }
//
//         var view = App.Current.view;
//         view.unregisterForLayerDraw(1, this);
//         view.layer2.unregisterHitFirstElement(this);
//         view.unselectAll();
//         this.canSelect(true);
//         this.canDrag(true);
//         this.enableGroupLocking(true);
//         view.makeSelection([this]);
//         view.layer3.remove(this._resizerH);
//         view.layer3.remove(this._resizerV);
//         if (App.Current.activePage.hideHandles){
//             App.Current.activePage.hideHandles(false);
//         }
//         App.Current.viewModel.hideWorkplaceMessage();
//         this.invalidate();
//     }
//
//     function updateSnapBarPosition(){
//         var rect = this.getBoundaryRectGlobal();
//
//         this._topSnapLineBar.setProps({
//             width: rect.width,
//             height: 8,
//             y: rect.y - 30,
//             x: rect.x
//         });
//
//         this._leftSnapLineBar.setProps({
//             width: 8,
//             height: rect.height,
//             y: rect.y,
//             x: rect.x - 30
//         });
//     }
//
//     function enableIsolatedMode(dontChangeSelection){
//
//         if (this._isolatedMode){
//             return;
//         }
//
//         // raise command to remove inplace editors, smart tags etc for the container itself
//         App.Current.actionManager.invoke("cancel");
//
//         this._isolatedMode = true;
//         var view = App.Current.view;
//         view.registerForLayerDraw(1, this);
//         view.layer2.registerHitFirstElement(this);
//         this._mouseDownHandler = view.mousedownEvent.bind(this, onMouseDown);
//         this._mouseDblClickHandler = view.dblclickEvent.bind(this, onMouseDown);
//         this._cancelHandler = App.Current.actionManager.subscribe('cancel', EventHandler(this, disableIsolatedMode));
//         this.canSelect(false);
//         this.canDrag(false);
//         this.enableGroupLocking(false);
//         if (!dontChangeSelection){
//             view.unselectAll();
//         }
//
//         attachResizers.call(this);
//         if (App.Current.activePage.hideHandles){
//             App.Current.activePage.hideHandles(true);
//         }
//
//         App.Current.viewModel.showWorkplaceMessage("scrollContainerWorkplaceMessage", this);
//
//         this._topSnapLineBar = new SnapLineBar(this, 'horizontal');
//         this._leftSnapLineBar = new SnapLineBar(this, 'vertical');
//
//         updateSnapBarPosition.call(this);
//
//         view.layer3.add(this._topSnapLineBar);
//         view.layer3.add(this._leftSnapLineBar);
//
//         // need to set lines after bar is added, because line pos is local
//         this._topSnapLineBar.setLines(this._verticalSnapLines);
//         this._leftSnapLineBar.setLines(this._horizontalSnapLines);
//
//         this.invalidate();
//     }
//
//     function adjustHandlesPosition(){
//         if (this._isolatedMode){
//             var rect = this.getBoundaryRectGlobal();
//             this._resizerH.x(rect.x + this.width());
//             this._resizerH.y(rect.y + (this.height() - this._resizerH.height()) / 2);
//
//             this._resizerV.y(rect.y + this.height());
//             this._resizerV.x(rect.x + (this.width() - this._resizerV.width()) / 2);
//         }
//     }
//
//     function attachResizers(){
//
//         var view = App.Current.view;
//
//         this._resizerH = new sketch.ui.common.PortableDeviceResizePanel("horizontal", this, this.viewportWidth(), this.viewportHeight());
//         this._resizerH.cursor('e-resize');
//         this._resizerV = new sketch.ui.common.PortableDeviceResizePanel("vertical", this, this.viewportWidth(), this.viewportHeight());
//         this._resizerV.cursor('s-resize');
//
//         view.layer3.add(this._resizerH);
//         view.layer3.add(this._resizerV);
//         adjustHandlesPosition.call(this);
//     }
//
//     function onResize(){
//         if (!this._isolatedMode){
//             if (this.width() > this.areaWidth()){
//                 this.areaWidth(this.width());
//             }
//             if (this.height() > this.areaHeight()){
//                 this.areaHeight(this.height());
//             }
//         } else{
//             updateSnapBarPosition.call(this);
//         }
//     }
//
//     fwk.PropertyMetadata.extend("sketch.framework.Container", {
//          "sketch.framework.ScrollContainer": {
//              areaHeight:{
//                  displayName:"Area height",
//                  defaultValue:0,
//                  type:"spinner",
//                  useInModel:true
//              },
//              areaWidth:{
//                  displayName:"Area width",
//                  defaultValue:0,
//                  type:"spinner",
//                  useInModel:true
//              }
//          }
//        });
//
//
//
//     klass2('sketch.framework.ScrollContainer', Container, {
//         _constructor : function() {
//             this.fill(fwk.Brush.White);
//             this.activeInPreview(true);
//
//             this._startX = 0;
//             this._startY = 0;
//
//             this._offsetX = 0;
//             this._offsetY = 0;
//
//             this._isolatedMode = false;
//             this.enableGroupLocking(true);
//         },
//
//         propsUpdated:function(props, oldProps){
//             Container.prototype.propsUpdated.apply(this, arguments);
//             if(props.areaHeight !== undefined || props.areaWidth !== undefined) {
//                 adjustHandlesPosition.call(this);
//             }
//
//             if(props.width !== undefined || props.height !== undefined) {
//                 onResize.call(this);
//             }
//         },
//
//         scrollStarted: function(event) {
//             App.Current.actionManager.invoke("cancel");
//             this._startX = event.x;
//             this._startY = event.y;
//         },
//         scrolling: function(event) {
//             this._offsetX = event.x;
//             this._offsetY = event.y;
//             this.invalidate();
//         },
//         scrollEnded: function(event) {
//             this.lockInvalidate();
//             var offset = getScrollOffset.call(this);
//             var newOffset = updateOffsetToSnapLines.call(this, offset);
//             this.scrollOffsetX(offset.x);
//             this.scrollOffsetY(offset.y);
//             this.unlockInvalidate();
//             var that = this;
//             that._startX = 0;
//             that._startY = 0;
//             that._offsetX = 0;
//             that._offsetY = 0;
//
//             this.animate({
//                 _scrollOffsetX:newOffset.x,
//                 _scrollOffsetY:newOffset.y
//             }, 200).progress(function() {
//                 that.invalidate();
//             }).done(function () {
//
//             });
//         },
//
//         hitElement : function(/!*Point*!/position, scale, predicate) {
//             var newPosition = getScrollOffset.call(this);
//             newPosition.x += position.x;
//             newPosition.y += position.y;
//             return Container.prototype.hitElement.call(this, newPosition, scale, predicate);
//         },
//         hitTest : function(/!*Point*!/point, scale) {
//             if(!this.visible()){
//                 return false;
//             }
//             point = {x:point.x, y:point.y};
//             var rect= this.getBoundaryRectGlobal();
//             var offset = getScrollOffset.call(this);
//             point.x -= offset.x;
//             point.y -= offset.y;
//             return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
//         },
//         dblclick:function(event){
//             if(!this._isolatedMode && !this.scrollingEnabled()){
//                 enableIsolatedMode.call(this);
//             }
//             event.handled = true;
//         },
//         mousedown: function(event) {
//             if (this.scrollingEnabled()){
//                 this._mousedownEvent = event;
//                 event.handled = true;
//             }
//             else {
//                 Container.prototype.mousedown.apply(this, arguments);
//             }
//         },
//         mousemove: function(event) {
//             if (!this._isScrolling && this._mousedownEvent){
//                 if (Math.abs(event.x - this._mousedownEvent.x) >= SCROLL_INTENT || Math.abs(event.y - this._mousedownEvent.y) >= SCROLL_INTENT){
//                     this._isScrolling = true;
//                     this.captureMouse(this);
//                     event.handled = true;
//                     this.scrollStarted(this._mousedownEvent);
//                 }
//             }
//
//             if (this._isScrolling){
//                 this.scrolling(event);
//                 event.handled = true;
//             }
//             else {
//                 Container.prototype.mousemove.apply(this, arguments);
//             }
//         },
//         mouseup: function(event) {
//             this._mousedownEvent = null;
//
//             if (this._isScrolling){
//                 this._isScrolling = false;
//                 this._isScrollingEnded = true;
//                 this.scrollEnded(event);
//
//                 event.handled = true;
//                 this.releaseMouse(this);
//             }
//             else {
//                 Container.prototype.mouseup.apply(this, arguments);
//             }
//         },
//         click: function(event) {
//             if (this._isScrollingEnded){
//                 this._isScrollingEnded = false;
//                 event.handled = true;
//             }
//                 else if (this.scrollingEnabled()){
//                     event.handled = true;
//                 }
//             else {
//                 this.updateEventAccordingToScroll(event);
//                 Container.prototype.click.apply(this, arguments);
//             }
//         },
//         updateEventAccordingToScroll: function(event){
//             event.x += this.scrollOffsetX();
//             event.y += this.scrollOffsetY();
//         },
//         onLayerDraw:function(layer, context){
//             context.save();
//             var parentRect = this.parent().getBoundaryRectGlobal();
//
//             context.save();
//             context.setTransform(1, 0, 0, 1, 0, 0);
//             var canvas = context.canvas;
//             context.fillStyle = 'rgba(0,0,0,0.3)';
//             context.fillRect(0,0,canvas.width, canvas.height);
//             context.restore();
//
//             context.translate(parentRect.x, parentRect.y);
//
//
//             this.SuperKlass.drawSelf.call(this, context, this.width(), this.height());
//
//             var x = this.x(),
//                 y = this.y(),
//                 x2 = x + this.width(),
//                 y2 = y + this.height();
//             context.strokeStyle = "#79736E";
//             context.beginPath();
//             context.setLineDash([1, 5]);
//             context.lineTo(x, y,x2, y, );
//             context.lineTo(x2, y, x2, y2);
//             context.lineTo(x2, y2, x, y2);
//             context.lineTo(x, y2, x, y);
//             context.closePath();
//             context.stroke();
//
//             context.restore();
//         },
//         width:function(value){
//             if(this._isolatedMode){
//                 if(value !== undefined){
//                     this.setProps({areaWidth:value})
//                 }
//                 return this.props.areaWidth;
//             }
//             if(value !== undefined){
//                 this.setProps({width:value})
//             }
//             return this.props.width;
//         },
//         height:function(value){
//             if(this._isolatedMode){
//                 if(value !== undefined){
//                     this.setProps({areaHeight:value})
//                 }
//                 return this.props.areaHeight;
//             }
//             if(value !== undefined){
//                 this.setProps({height:value})
//             }
//             return this.props.height;
//         },
//         drawSelf: function(context) {
//             if(this._isolatedMode){
//                 return;
//             }
//
//             var l = this.x(),
//                 t = this.y(),
//                 w = this.width(),
//                 h = this.height(),
//                 sw = this.areaWidth(),
//                 sh = this.areaHeight();
//
//             context.save();
//
//             context.rectPath(l, t, w, h);
//             context.clip();
//
//             context.rectPath(l, t, w, h, true);
//
//             fwk.Brush.fill(this.fill(), context, l, t, sw, sh);
//             context.lineWidth = this.strokeWidth();
//             fwk.Brush.stroke(this.stroke(), context, l, t, sw, sh);
//
//             var offset = getScrollOffset.call(this);
//             context.translate(-offset.x , -offset.y);
//
//             this.drawChildren(context, w, h);
//
//             context.restore();
//         },
//         areaHeight: function(value){
//             if(value !== undefined) {
//                 this.setProps({areaHeight:value});
//             }
//             return this.props.areaHeight;
//         },
//         areaWidth: function(value){
//             if(value !== undefined) {
//                 this.setProps({areaWidth:value});
//             }
//             return this.props.areaWidth;
//         },
//         viewportHeight: function(value){
//             if(value !== undefined) {
//                 this.setProps({height:value});
//             }
//             return this.props.height;
//         },
//         viewportWidth: function(value){
//             if(value !== undefined) {
//                 this.setProps({width:value});
//             }
//             return this.props.width;
//         },
//         scrollOffsetX: function(value){
//             return this.field("_scrollOffsetX", value, 0);
//         },
//         scrollOffsetY: function(value){
//             return this.field("_scrollOffsetY", value, 0);
//         },
//         scrollingEnabled: function(value){
//             return App.Current.isPreviewMode();
//         },
//         unlockGroup:function(){
//             enableIsolatedMode.call(this, true);
//             Container.prototype.unlockGroup.apply(this, arguments);
//         },
//         cancel:function(){
//             disableIsolatedMode.call(this);
//         },
//         getSnapPoints : function() {
//
//             var res = Container.prototype.getSnapPoints.apply(this, arguments);
//             if(!this._isolatedMode) {
//                 return res;
//             }
//
//             var xs = this._topSnapLineBar.getLines(true);
//             var ys = this._leftSnapLineBar.getLines(true);
//
//             return {
//                 xs:res.xs.concat(xs),
//                 ys:res.ys.concat(ys),
//                 center:res.center
//             };
//         },
//         toJSON:function(includeDefaults) {
//             var data = Container.prototype.toJSON.apply(this, arguments);
//             data.verticalSnapLines = this._verticalSnapLines;
//             data.horizontalSnapLines = this._horizontalSnapLines;
//             return data;
//         },
//
//         fromJSON:function(data) {
//             Container.prototype.fromJSON.apply(this, arguments);
//             this._verticalSnapLines = data.verticalSnapLines;
//             this._horizontalSnapLines = data.horizontalSnapLines;
//         },
//TODO: fix if still needed
//         constructMoveCommand:function(newParent, newIndex) {
//             if(!this._isolatedMode) {
//                 return Container.prototype.constructMoveCommand.apply(this, arguments);
//             } else {
//                 return new sketch.commands.Composite([
//                     new ElementPropsChanged(this, {areaWidth:newSize.width, areaHeight:newSize.height}, {areaWidth:this.areaWidth(), areaHeight:this.areaHeight()})
//                 ], this.view());
//             }
//         }
//     });
// });*/
