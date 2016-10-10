// define(["framework/Page", "framework/commands/CommandManager", "decorators/ResizeFrame", "commands/EditTemplate", "commands/SaveTemplate"], function(Page, commandManager, ResizeFrame, EditTemplate, SaveTemplate){
//     var fwk = sketch.framework;
//
//     var TemplateEditorPage = klass2("sketch.ui.pages.TemplateEditorPage", Page, {
//         _constructor: function(element){
//             this.properties.name.editable(false).value("Asset editor");
//             this.isTemporary(true);
//             this.editedTempalteId = element.templateId();
//
//             this._element = element;
//
//             this._element.properties.x.isEditable = false;
//             this._element.properties.y.isEditable = false;
//             this._element.hideActionCategories = true;
//             this._element.canMultiselectChildren = true;
//             this._element.multiselectTransparent = true;
//
//         },
//         element: function(){
//             return this._element;
//         },
//         prepare: function(){
//             this.add(this._element);
//
//             this._element.setProps({
//                 x: ~~((this.width() - this._element.width()) / 2),
//                 top: ~~((this.height() - this._element.height()) / 2)
//             });
//         },
//         getContentContainer: function(){
//             return this._element;
//         },
//         getPagePoint:function(anchorX, anchorY) {
//             var x, y;
//             switch(anchorX){
//                 case "center":  x = this.width() / 2; break;
//                 case "x":    x = 0; break;
//                 case "right":   x = this.width(); break;
//             }
//             switch(anchorY){
//                 case "center":  y = this.height() / 2; break;
//                 case "y":     y = 0; break;
//                 case "bottom":  y = this.height(); break;
//             }
//             return {x:~~x, y:~~y};
//         },
//         initPage:function(view){
//             Page.prototype.initPage.apply(this, arguments);
//
//             var rect = this.viewportRect();
//             this.resize(rect);
//         },
//         activating: function(previousPage){
//             this.app.propertyDesigner.defaultElement = this._element;
//         },
//         deactivating: function(nextPage){
//             if (!this.app.templatePropertyDesigner.isValid()){
//                 return false;
//             }
//
//             this.app.propertyDesigner.defaultElement = null;
//             this.app.templatePropertyDesigner.detach(true);
//
//             this._element.save();
//             this._element.removeDecoratorByType(ResizeFrame);
//         },
//
//         activated: function(){
//             this.app.viewModel.showWorkplaceMessage("templateWorkplaceMessage", this);
//             this._viewFillStyle = this._view.layer2.fillStyle();
//             this.app.viewModel.viewBackgroundColor("#f3f3f3");
//
//             if (!this._activated){
//                 this.prepare();
//                 this._activated = true;
//             }
//
//             this._element.edit();
//             this._element.properties.angle.editable(false);
//             this._element.addDecorator(new ResizeFrame());
//             this.app.templatePropertyDesigner.attach(this._element);
//
// //            enableNameProperty.call(this, true);
//         },
//         deactivated: function(){
// //            enableNameProperty.call(this, false);
//             this.app.viewModel.hideWorkplaceMessage();
//             this.app.viewModel.viewBackgroundColor(this._viewFillStyle);
//             sketch.ui.pages.TemplateEditorPage.prototype.SuperKlass.deactivated.apply(this, arguments);
//         },
//
//         saveAndClose: function(){
//             this.app.setActivePage(this._lastActivePage);
//             this.app.removePage(this);
//         },
//
//         displayName: function(){
//             return "Asset template";
//         },
//         displaySize: function() {
//             return {
//                 width: this._element.width(),
//                 height: this._element.height()
//             }
//         },
//         viewportRect:function(){
//             var size = this.getContentOuterSize();
//             var width = 3000;
//             var height = 2000;
//
//             return {x:0, y:0, width:Math.max(width, size.width + width - 320), height:Math.max(height, size.height + height - 480)};
//         },
//         showGrid:function(){
//             return false;
//         }
//     });
//
//     var findEditorPage = function(templateId){
//         return sketch.util.singleOrDefault(App.Current.pages, function(p){
//             return p.editedTempalteId === templateId;
//         });
//     };
//
//     var init = function(element){
//         var app = App.Current;
//
//         var page = findEditorPage(element.templateId());
//         var isNewPage = !page;
//         if (isNewPage){
// //            var clone = element.clone();
// //
// //            each(clone.properties.getEditableProperties(false), function(p){
// //                p.resetToDefault();
// //            });
//
//             page = new TemplateEditorPage(element);
//
//
//
//             app.addPage(page);
//         }
//
//         //working with clone now
//         element.cancelEditing();
//         page._lastActivePage = app.activePage;
//
//         app.setActivePage(page);
//     };
//
//     fwk.commandManager.subscribe(EditTemplate, function(cmd){
//         init(cmd.element());
//     });
//     fwk.commandManager.subscribeRolledBack(EditTemplate, function(cmd){
//         var page = findEditorPage(cmd.element().templateId());
//         if (page){
//             App.Current.removePage(page);
//             Selection.makeSelection([cmd.element()]);
//         }
//     });
//     fwk.commandManager.subscribe(SaveTemplate, function(cmd){
//         var page = findEditorPage(cmd.element.templateId());
//         page.saveAndClose();
//     });
//
//     return TemplateEditorPage;
// });