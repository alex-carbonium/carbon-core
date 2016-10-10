// define(["ui/pages/PortableDevicePage", "framework/Page"], function(PortableDevicePage){
//     var fwk = sketch.framework;
//     var _lastViewData = {};
//
//     return klass2("sketch.ui.pages.PreviewPage", PortableDevicePage, (function(){
//         function removeElementsOutsideDevice(){
//             var contentRect = this.device.getContentContainer().getBoundaryRectGlobal();
//
//             for (var i = this.children.items.length-1; i >=0 ; --i) {
//                 var child = this.children.items[i];
//                 if (child !== this.device && !areRectsIntersect(child.getBoundaryRectGlobal(), contentRect)){
//                     this.remove(child);
//                     child.dispose();
//                 }
//             }
//         }
//
//         function viewStateKey(){
//             var previewOptions = this._originalPage.previewOptions();
//             if (previewOptions){
//                 if (previewOptions.keepPosition){
//                     return this._originalPage.id();
//                 }
//                 return previewOptions.screenType + "#" + this.orientation();
//             }
//             return "";
//         }
//
//         function restoreViewState() {
//             var res = false;
//             if(this.isPhoneVisible()){
//                 var data = _lastViewData[viewStateKey.call(this)];
//                 if(data) {
//                     if(data.scrollX !== undefined) {
//                         this.scrollX(data.scrollX);
//                         res = true;
//                     }
//                     if(data.scrollY !== undefined) {
//                         this.scrollY(data.scrollY);
//                         res = true;
//                     }
//                     if(data.scale !== undefined) {
//                         this.scale(data.scale);
//                         res = true;
//                     }
//                 }
//             }
//
//             return res;
//         }
//
//         return {
//             _constructor: function(){
//                 this._subscriptions = [];
//             },
//             propsUpdated:function(props, oldProps){
//                 PortableDevicePage.prototype.propsUpdated.apply(this, arguments);
//                 if(props.status !== undefined) {
//                     if (this._originalPage.status() !== props.status){
//                         this._originalPage.status(props.status);
//                     }
//                 }
//             },
//             setOriginalPage: function(originalPage) {
//                 this._originalPage = originalPage;
//                 this.name(this._originalPage.name());
//                 this.width(this._originalPage.width());
//                 this.height(this._originalPage.height());
//                 this.status(this._originalPage.status());
//                 this.screenType(this._originalPage.screenType());
//
//
//                 //REFACTOR_NOSERIALIZE status global notification
//                 //s = this._originalPage.properties.status.getChangedEvent().bind(this, function(event){
//                 //    if (this.status() !== event.newValue){
//                 //        this.status(event.newValue);
//                 //    }
//                 //});
//                 //this._subscriptions.push(s);
//             },
//             initId: function(){
//             },
//             preview:function(){
//                 return true;
//             },
//             id: function(){
//                 if (this._originalPage){
//                     return this._originalPage.id();
//                 }
//                 return 0;
//             },
//             deviceCreated: function(device){
//                 PortableDevicePage.prototype.deviceCreated.apply(this, arguments);
//
//                 device.removeResizers();
//                 device.adjustPanelSize();
//
//                 var contentContainer = device.getContentContainer();
//                 contentContainer.useDefaultActionsOnly = true;
//             },
//             toJSON: function() {
//                 return null;
//             },
//             isPhoneVisible:function(visible){
//                 if (!this.device.isFrameVisible) {
//                     return false;
//                 }
//                 return this.device.isFrameVisible(visible);
//             },
//             getContentContainer: function(){
//                 if (!this._activated){
//                     return this._originalPage.getContentContainer();
//                 }
//                 return this.device.getContentContainer();
//             },
//             getContentOuterSize: function(){
//                 if (!this._activated){
//                     return this._originalPage.getContentOuterSize();
//                 }
//                 return this.device.getContentOuterSize();
//             },
//             activated: function(previousPage){
//                 if (!this._activated){
//                     this._activated = true;
//
//                     this.dimMasterElements = false;
//                     this.canEditMasterPage = false;
//                     this.fromJSON(this._originalPage.toJSON());
//
//                     this.masterPageId(this._originalPage.masterPageId());
//                     removeElementsOutsideDevice.call(this);
//                     this.isPhoneVisible(true);//this.app.viewModel.phoneVisible());
//                     this.screenType(this._originalPage.screenType());
//
//                     this.initPage(App.Current.view, App.Current.viewportSize());
//
//                     if(!restoreViewState.call(this)) {
//                         var previewOptions = this._originalPage.previewOptions();
//                         if (previewOptions){
//                             var size = this.app.viewportSize();
//                             this.zoomToFit(size, {
//                                 addGutters: previewOptions.addZoomFitGutters,
//                                 widthOnly: previewOptions.fitWidthOnly,
//                                 maxScale: previewOptions.maxAutoScale
//                             });
//                             var anchorPoint = this.getPagePoint(previewOptions.anchorX, previewOptions.anchorY);
//                             var scroll = this.pointToScroll(anchorPoint, size, {
//                                 anchorX: previewOptions.anchorX,
//                                 anchorY: previewOptions.anchorY,
//                                 gutterX: previewOptions.gutterX,
//                                 gutterY: previewOptions.gutterY
//                             });
//                             this.scrollTo(scroll);
//                         }
//                     }
//
//                     PortableDevicePage.prototype.activated.apply(this, arguments);
//                 }
//                 else {
//                     PortableDevicePage.prototype.activated.apply(this, arguments);
//                     restoreViewState.call(this);
//                 }
//
//                 this._view.updateCursor(null);
//             },
//             scrollX: function(value){
//                 if(value !== undefined) {
//                     var data = _lastViewData[viewStateKey.call(this)] || {};
//                     _lastViewData[viewStateKey.call(this)] = data;
//                     data.scrollX = value;
//                 }
//                 return PortableDevicePage.prototype.scrollX.apply(this, arguments);
//             },
//             scrollY: function(value){
//                 if(value !== undefined) {
//                     var data = _lastViewData[viewStateKey.call(this)] || {};
//                     _lastViewData[viewStateKey.call(this)] = data;
//                     data.scrollY = value;
//                 }
//                 return PortableDevicePage.prototype.scrollY.apply(this, arguments);
//             },
//             scale:function(value) {
//                 if(value !== undefined) {
//                     var data = _lastViewData[viewStateKey.call(this)] || {};
//                     _lastViewData[viewStateKey.call(this)] = data;
//                     data.scale = value;
//                 }
//                 return PortableDevicePage.prototype.scale.apply(this, arguments);
//             },
//             isActivated: function(){
//                 return !!this._activated;
//             },
//             renderTile: function(canvas, options) {
//                 this._originalPage.renderTile(canvas, options);
//             },
//             viewportRect:function(){
//                 return this._originalPage.viewportRect();
//             },
//             displaySize: function() {
//                 return this._originalPage.displaySize();
//             },
//             showGrid:function(){
//                 return false;
//             },
//             dispose: function(){
//                 //TODO: check why super is not called - there was a crash
//                 //PortableDevicePage.prototype.dispose.apply(this, arguments);
//                 each(this._subscriptions, function(s){
//                     s.dispose();
//                 });
//                 delete this._originalPage;
//             }
//         }
//     })());
// });