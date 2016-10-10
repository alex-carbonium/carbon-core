// define(["framework/Page", "math/math", "ui/common/PortableDevice"], function (Page, math) {
//     var fwk = sketch.framework;
//
//
//     fwk.PropertyMetadata.extend("Page", {
//       "sketch.ui.pages.PortableDevicePage": {
//           masterPageId:{
//               displayName:"Master page",
//               type:"pageLink",  //masterPageEditorOptions
//           },
//           screenType:{
//               displayName:"Device",
//               type:"choice",
//               possibleValues:fwk.devicesLookupValues,
//               useInModel:true
//           }
//       }
//     });
//
//
//     return klass2("sketch.ui.pages.PortableDevicePage", Page, (function () {
//         var DIMMED_OPACITY = .2;
//         var masterPageEditorOptions = {
//             canCreateNewPage: true,
//             createPageInGroup: "Page masters",
//             newPageName: "Master",
//             expandedGroupName: "Page masters"
//         };
//
//
//         function onViewElementClicked(eventData){
//             var element = eventData.element;
//             var isMasterElement = false;
//             do{
//                 if (element.__isMasterPageElement){
//                     isMasterElement = true;
//                     break;
//                 }
//                 element = element.parent();
//             } while(element);
//
//             if (!isMasterElement){
//                 this.exitMasterEditMode();
//                 eventData.handled = true;
//             }
//         }
//         function performMasterPageAction(action){
//             var page = this.app.getPageById(this.masterPageId());
//             if (!page || page.isDeleted()){
//                 return;
//             }
//             var masterPageContainer = page.getContentContainer();
//             var contentContainer = this.getContentContainer();
//             var originalSize = masterPageContainer.getBoundaryRect();
//             masterPageContainer.resize({x: 0, y: 0, width: contentContainer.width(), height: contentContainer.height()});
//             action.call(this, masterPageContainer, contentContainer, page);
//             masterPageContainer.resize(originalSize);
//         }
//         function validateMasterPageCircularity(newMasterPageId){
//             var edges = [];
//             var that = this;
//             this.app.eachDesignerPage(function(page){
//                 var masterPageId = page.masterPageId();
//                 if (page !== that && masterPageId){
//                     edges.push([masterPageId, page.id()]);
//                 }
//             });
//             edges.push([newMasterPageId, this.id()]);
//             var result = math.tsort(edges);
//             if (!result.success){
//                 notify("error", {title: "Circular master pages", text: "Setting master page on page " + this.name() + " would result in circular references."});
//             }
//             return result.success;
//         }
//         function onPageModified(pageId){
//             var masterPageId;
//             var current = this;
//             while (masterPageId = current.masterPageId()){
//                 if(masterPageId == pageId) {
//                     this._applyMasterPageRequired = true;
//                     return;
//                 }
//                 current = this.app.getPageById(masterPageId);
//             }
//         }
//         function dimElement(element){
//             if (element.opacity() !== 1){
//                 element.__originalOpacity = element.opacity();
//             }
//             element.opacity(DIMMED_OPACITY);
//         }
//         function restoreOpacity(element){
//             element.opacity(element.__originalOpacity === undefined ? 1 : element.__originalOpacity);
//             delete element.__originalOpacity;
//         }
//         function toggleElementState(element, isMasterEditMode){
//             if (element.__isMasterPageElement){
//                 if (isMasterEditMode && !element.__isMasterPageElementOnOtherPage){
//                     restoreOpacity(element);
//                 }
//                 else{
//                     dimElement(element);
//                 }
//                 element.applyVisitor(function(e){
//                     e.canSelect(isMasterEditMode);
//                     e.canDrag(isMasterEditMode);
//                     e.acceptDisabled(!isMasterEditMode);
//                 });
//             }
//             else{
//                 if (isMasterEditMode){
//                     dimElement(element);
//                 }
//                 else{
//                     restoreOpacity(element);
//                 }
//             }
//         }
//         function onViewDblClick(eventData){
//             if (this.canEditMasterPage !== false){
//                 var element = this.hitElement(eventData, App.Current.view.scale());
//                 if (element && element.__isMasterPageElement){
//                     this.app.setActivePageById(element.__masterPageId);
//                     eventData.handled = true;
//                 }
//             }
//         }
//         function contentContainerChildrenChanged(e){
//             if (!this._masterEditMode){
//                 return;
//             }
//             switch (e.action){
//                 case "added":
//                 case "inserted":
//                     e.element.__isMasterPageElement = true;
//                     this._masterPageElements.push(e.element);
//                     break;
//                 case "removed":
//                     delete e.element.__isMasterPageElement;
//                     removeElement(this._masterPageElements, e.element);
//                     break;
//                 case "clearing":
//                     for (var i = 0, l = e.elements.length; i < l; ++i){
//                         var element = e.elements[i];
//                         delete element.__isMasterPageElement;
//                         removeElement(this._masterPageElements, element);
//                     }
//                     break;
//             }
//         }
//
//         return {
//             _constructor: function(){
//
//                 //this.properties.createProperty("masterPageId", "Master page", null)
//                 //    .ofType(fwk.PropertyTypes.pageLink, masterPageEditorOptions);
//                 //
//                 //var deviceProperty = this.properties.createProperty("screenType", "Device", this.app.project.defaultScreenType)
//                 //    .possibleValues(fwk.devicesLookupValues, true)
//                 //    .useInModel(true);
//                 //
//                 //deviceProperty.editorTemplate("#editor-dropdown");
//
//                 this.setProps({screenType:this.app.project.defaultScreenType})
//             },
//             refreshSize:function(){
//                 this._view.resize(this.viewportRect());
//             },
//             toJSON: function(includeDefaults, opts){
//                 var parentDump = Page.prototype.toJSON.apply(this, arguments);
//                 if (this.masterPageId() !== null){
//                     parentDump.masterPageId = this.masterPageId();
//                 }
//                 if (opts && opts.includeMasterElements && this._masterPageElements){
//                     var deviceId = this.device.id();
//                     var device;
//                     for (var i = 0, l = parentDump.children.length; i < l; ++i){
//                         var child = parentDump.children[i];
//                         if (child.id === deviceId){
//                             device = child;
//                             break;
//                         }
//                     }
//                     for (var i = 0, l = this._masterPageElements.length; i < l; ++i){
//                         var element = this._masterPageElements[i];
//                         var clone = element.clone();
//                         clone.__originalOpacity = element.__originalOpacity;
//                         restoreOpacity(clone);
//                         device.children.push(clone.toJSON(includeDefaults, opts));
//                     }
//                 }
//                 parentDump.screenType = this.screenType();
//                 return parentDump;
//             },
//             fromJSON: function(data, defaults){
//                 Page.prototype.fromJSON.apply(this, arguments);
//                 if (data.masterPageId){
//                     //in-place page id type upgrade
//                     data.masterPageId = data.masterPageId + "";
//                     this.requestedMasterPageId = data.masterPageId;
//                 }
//                 if(data.screenType) {
//                     this.screenType(data.screenType);
//                 }
//             },
//             initPage:function(view){
//                 Page.prototype.initPage.apply(this, arguments);
//
//                 var addDevice = false;
//
//                 if(!this.device) {
//                     this.device = new sketch.ui.common.PortableDevice();
//                     addDevice = true;
//                     this.isPhoneVisible(this._isPhoneVisible);
//                 }
//
//                 this.device.setProps({
//                     orientation:this.orientation(),
//                     screenType:this.screenType()
//                 });
//                     this.device.initialize();
//
//                 if(addDevice) {
//                     this.add(this.device);
//                 }
//
//                 var rect = this.viewportRect();
//                 this.resize(rect);
//                 this.device.parentResized(rect);
//             },
//             arrange:function(event){
//                 Page.prototype.arrange.apply(this, arguments);
//                 if(this.device){
//                     this.device.parentResized(this.getBoundaryRect());
//                 }
//             },
//             deviceCreated: function(device) {
//                 device.setPage(this);
//                 if (device.orientation){
//                     this.orientation(device.orientation());
//                 } else{
//                     //this.properties.orientation.editable(false);
//                 }
//
//                 if(device.background) {
//                     this.background(device.background());
//                 } else {
//                     //this.properties.background.editable(false);
//                 }
//
//                 this.device.parentResized(this.getBoundaryRect());
//             },
//             deviceDeleted: function(device) {
//                 device.dispose();
//             },
//             acquiringChild:function(element){
//                 var isDevice = element instanceof sketch.ui.common.Device;
//                 if (isDevice){
//                     this.device = element;
//                 }
//
//                 Page.prototype.acquiringChild.apply(this, arguments);
//
//                 if (isDevice){
//                     this.deviceCreated(element);
//                 }
//             },
//             releasingChild: function(element) {
//                 Page.prototype.releasingChild.apply(this, arguments);
//                 if (element instanceof sketch.ui.common.Device){
//                     delete this.device;
//                     this.deviceDeleted(element);
//                 }
//             },
//             autoInsert:function(element){
//                 if(typeof element.orientation === 'function'){
//                     element.orientation(this.orientation());
//                 }
//
//                 return Page.prototype.autoInsert.apply(this, arguments);
//             },
//             isPhoneVisible:function(visible){
//                 if(!this.device) {
//                     this._isPhoneVisible = visible;
//                     return;
//                 }
//                 if(!this.device.isFrameVisible){
//                     return false;
//                 }
//                 return this.device.isFrameVisible(visible);
//             },
//             screenType:function(value){
//                 if(value !== undefined){
//                     this.setProps({screenType:value});
//                 }
//                 return this.props.screenType;
//             },
//             hideHandles:function(value) {
//                 this.device.hideHandles(value);
//             },
//             getContentContainer: function(){
//                 if (this.device){
//                     return this.device.getContentContainer();
//                 }
//                 return null;
//             },
//             getContentOuterSize: function(){
//                 if(!this.device){
//                     return {width:0, height:0, x:0, y:0};
//                 }
//                 return this.device.getContentOuterSize();
//             },
//             getPagePoint:function(anchorX, anchorY) {
//                 return this.device.devicePoint(anchorX, anchorY);
//             },
//             viewportRect:function(){
//                 var contentContainer = this.getContentContainer();
//                 var width = 3000;
//                 var height = 2000;
//
//                 return {
//                     x:0, y:0,
//                     width:Math.max(width, contentContainer.width() + width - 320),
//                     height:Math.max(height, contentContainer.height() + height - 480)
//                 };
//             },
//             displaySize:function() {
//                 return this.device.displaySize();
//             },
//             previewOptions: function(){
//                 return fwk.devices[this.screenType()].previewOptions;
//             },
//             propsUpdated:function(props, oldProps){
//                 var that = this;
//                 if (props.masterPageId !== undefined && props.masterPageId !== this.id()){
//                     if (validateMasterPageCircularity.call(this, props.masterPageId)){
//                         this.applyMasterPage();
//                         if (props.masterPageId){
//                             if (!this.app.isExporting){
//                                 if (!this._pageModifiedSubscription){
//                                 this._pageModifiedSubscription = this.app.state.pageModified.bindAsync(this, onPageModified);
//                             }
//                                 if (this.app.isLoaded){
//                                     this.subscribeToViewDblClick();
//                                 }
//                             }
//                         }
//                         else {
//                             if (this._pageModifiedSubscription){
//                                 this._pageModifiedSubscription.dispose();
//                                 delete this._pageModifiedSubscription;
//                             }
//                             this.unsubscribeFromViewDblClick();
//                         }
//                     }
//                     else {
//                         //to reset the property in the editor which fires this event
//                         setTimeout(function(){ that.masterPageId(null); }, 1);
//                     }
//                 }
//
//                 if(this.device) {
//                     if (props.orientation && oldProps.orientation !== props.orientation) {
//                         this.device.setProps({orientation: props.orientation});
//                     }
//
//                     if (props.background && oldProps.background !== props.background) {
//                         this.device.setProps({background: props.background});
//                     }
//
//                     if (props.screenType !== undefined) {
//                         this.device.setProps({screenType: props.screenType});
//                     }
//                 }
//
//                 Page.prototype.propsUpdated.apply(this, arguments);
//             },
//             applyMasterPage: function(){
//                 if (this._masterPageElements){
//                     for (var i = 0, l = this._masterPageElements.length; i < l; ++i){
//                         var element = this._masterPageElements[i];
//                         element.parent().remove(element);
//                         //TODO: CompositeElement keeps element when it is removed and disposed
//                         //element.dispose();
//                     }
//                 }
//                 delete this._masterPageElements;
//
//                 performMasterPageAction.call(this, function(masterPageContainer, contentContainer){
//                     var masterPageElements = [];
//                     var that = this;
//                     masterPageContainer.getChildren().each(function(i, child){
//                         var isMasterElement = child.__isMasterPageElement;
//                         var originalOpacity = child.__originalOpacity;
//                         var originalMasterPageId = child.__masterPageId;
//                         child = child.clone();
//                         child.__isMasterPageElement = true;
//                         child.__isMasterPageElementOnOtherPage = isMasterElement;
//                         child.__originalOpacity = originalOpacity;
//                         child.isTemporary(true);
//                         if (isMasterElement){
//                             restoreOpacity(child);
//                             child.__masterPageId = originalMasterPageId;
//                         }
//                         else{
//                             child.__masterPageId = masterPageContainer.page().id();
//                         }
//                         if (!that.app.isExporting && that.dimMasterElements !== false){
//                             toggleElementState(child, false);
//                         }
//                         masterPageElements.push(child);
//                         contentContainer.insert(child, i);
//                     });
//                     this._masterPageElements = masterPageElements;
//                 });
//             },
//             switchToMasterEditMode: function(event){
//                 this.getContentContainer().getChildren().each(function(i, child){
//                     toggleElementState(child, true);
//                     if (child.__isMasterPageElement){
//                         delete child.dblclick;
//                     }
//                 });
//                 this.app.viewModel.showWorkplaceMessage("editingMasterPageWorkplaceMessage", this);
//                 this.app.view.onElementClicked.bind(this, onViewElementClicked);
//
//                 this.getContentContainer().getChildren().changed.bind(this, contentContainerChildrenChanged);
//                 if (event){
//                     event.handled = true;
//                 }
//                 this._masterEditMode = true;
//             },
//             exitMasterEditMode: function(){
//                 this.app.viewModel.hideWorkplaceMessage();
//                 this.app.view.onElementClicked.unbind(this, onViewElementClicked);
//                 this.getContentContainer().getChildren().changed.unbind(this, contentContainerChildrenChanged);
//
//                 performMasterPageAction.call(this, function(masterPageContainer, contentContainer, masterPage){
//                     var switchHandler = EventHandler(this, this.switchToMasterEditMode).closure();
//                     contentContainer.getChildren().each(function(i, child){
//                         toggleElementState(child, false);
//                         if (child.__isMasterPageElement && !child.__isMasterPageElementOnOtherPage){
//                             child.dblclick = switchHandler;
//                         }
//                     });
//
//                     masterPageContainer.clear();
//                     for (var i = 0, l = this._masterPageElements.length; i < l; ++i){
//                         var element = this._masterPageElements[i];
//                         if (!element.__isMasterPageElementOnOtherPage){
//                             element = element.clone();
//                             element.__isMasterPageElement = true;
//                             toggleElementState(element, true);
//                             delete element.__isMasterPageElement;
//                             masterPageContainer.add(element);
//                         }
//                     }
//                     masterPage.applyMasterPage();
//                 });
//                 delete this._masterEditMode;
//             },
//             activated: function() {
//                 Page.prototype.activated.apply(this, arguments);
//                 if (this.device) {
//                     this.device.bindPageToResize(this);
//                 }
//                 this.applyMasterPageIfRequired();
//                 if (this.masterPageId()){
//                     this.subscribeToViewDblClick();
//                 }
//             },
//             deactivated: function(){
//                 if (this._masterEditMode){
//                     this.exitMasterEditMode();
//                 }
//                 this.unsubscribeFromViewDblClick();
//                 if (this.device) {
//                     this.device.bindPageToResize(null);
//                 }
//                 Page.prototype.deactivated.apply(this, arguments);
//             },
//             applyMasterPageIfRequired: function(){
//                 if (this._applyMasterPageRequired){
//                     var master = this.app.getPageById(this.masterPageId());
//                     if (master){
//                         master.applyMasterPageIfRequired();
//                     }
//                     this.applyMasterPage();
//                     delete this._applyMasterPageRequired;
//                 }
//             },
//             subscribeToViewDblClick: function(){
//                 if (!this._viewDblClickSubscription){
//                     this._viewDblClickSubscription = this.app.view.dblclickEvent.bind(this, onViewDblClick);
//                 }
//             },
//             unsubscribeFromViewDblClick: function(){
//                 if (this._viewDblClickSubscription){
//                     this._viewDblClickSubscription.dispose();
//                     delete this._viewDblClickSubscription;
//                 }
//             },
//             masterPageId: function(value){
//                 if(value !== undefined){
//                    this.setProps({masterPageId:value});
//                }
//                return this.props.masterPageId;
//             },
//             getSnapPoints:function() {
//                 return this.device.getSnapPoints();
//             }
//         }
//     })());
// });