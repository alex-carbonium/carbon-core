// import Selection from "framework/SelectionModel";
//
// define(["framework/text/InplaceEditor",
//     "framework/PropertyMetadata",
//     "framework/PropertyTypes",
//     "framework/commands/CommandManager",
//     "framework/TemplatedElement"],
//     function (InplaceEditor, PropertyMetadata, PropertyTypes, CommandManager, TemplatedElement) {
//     return klass((function () {
//
//         function handleInplaceEditor(saveChanges, originalValue, newValue) {
//             //var that = this;
//             //if(this._viewData) {
//             //    var page = App.Current.activePage;
//             //    var view = App.Current.view;
//             //    page.animate({
//             //        scale:this._viewData.scale,
//             //        _scrollX:this._viewData.scrollX,
//             //        _scrollY:this._viewData.scrollY
//             //    }, 200)
//             //    .progress(function() {
//             //        var sx = page.scrollX();
//             //        var sy = page.scrollY()
//             //        view.scrollX(-1, true);
//             //        view.scrollY(-1, true);
//             //        view.scrollX(sx);
//             //        view.scrollY(sy);
//             //    })
//             //    .done(function() {
//             //        delete that._viewData;
//             //    });
//             //}
//
//             var element = this.element;
//
//             if (saveChanges) {
//                 var cmd = this.editorPropertyOwner.constructPropsChangedCommand({[this.editorPropertyName]:newValue});
//                 CommandManager.execute(cmd);
//             }
//             else {
//                 this.editorPropertyOwner.setProps({[this.editorPropertyName]:originalValue});
//             }
//
//             this.editor.onClose.unbind(this, handleInplaceEditor);
//             element.parent().releaseMouse(element);
//             this.editor = null;
//             this.editorPropertyName = null;
//             this.editorPropertyOwner = null;
//         }
//
//         function onElementDblClicked(eventData){
//             if (eventData.element !== this.currentElement){
//                 return;
//             }
//             editElement.call(this, eventData.element);
//         }
//
//         //TODO: fix if this whole thing is still needed
//         function onElementSelected(selection){
//             this.currentElement = selection;
//         }
//
//         function editElement(element, allowOnlyTextEdit){
//             if (element !== this.currentElement){
//                 return;
//             }
//             var propertyName = element.quickEditProperty();
//             if (propertyName){
//                 var type;
//                 var metadata = PropertyMetadata.find(element.systemType(), propertyName);
//                 if(metadata) {
//                     type = metadata.type;
//                 }
//
//                 if(type === PropertyTypes.text.name) {
//                     var textArea;
//                     if (element instanceof sketch.ui.common.TextArea){
//                         textArea = element;
//                     }
//                     else if (element instanceof TemplatedElement){
//                         textArea = findBoundElement(element, propertyName);
//                     }
//                     if (textArea){
//                         showInplaceEditor(element, propertyName, textArea);
//                     }
//                 } else if (!allowOnlyTextEdit){
//                     showQuickEditor.call(this, element, propertyName);
//                 }
//             }
//         }
//
//         function showInplaceEditor(element, propertyName, textArea) {
//                 // TODO: remove this code, move it somewhere from here
//                 if (App.Current.activePage.preview()) {
//                     return;
//                 }
//             this.element =element;
//             element.parent().captureMouse(element);
//                 //var page = App.Current.activePage;
//                 //var rect = this.getBoundaryRectGlobal();
//                 //var scale = this.scale();
//                 //var view = App.Current.view;
//
//                 //this._viewData = {
//                 //    scale:scale,
//                 //    scrollX:page.scrollX(),
//                 //    scrollY:page.scrollY()
//                 //};
//
//                 this.editor = textArea ? new InplaceEditor(textArea, element.getBoundaryRectGlobal(), element.angle()) :
//                     new GenericTextEditor(this.getBoundaryRectGlobal(), element.props[propertyName]);
//                 this.editorPropertyName = propertyName;
//                 this.editorPropertyOwner = element;
//
//                 this.editor.onClose.bind(this, handleInplaceEditor);
//                 this.editor.show();
//
//                 //if(scale < 1) {
//                 //    var scrollPos = page.pointToScroll(this.centerPositionGlobal(), App.Current.viewportSize(), {scale: 1});
//                 //    page.animate({
//                 //        scale:1,
//                 //        _scrollX:scrollPos.scrollX,
//                 //        _scrollY:scrollPos.scrollY
//                 //    }, 200).progress(function() {
//                 //        var sx = page.scrollX();
//                 //        var sy = page.scrollY();
//                 //
//                 //        view.scrollX(-1, true);
//                 //        view.scrollY(-1, true);
//                 //        view.scrollX(sx);
//                 //        view.scrollY(sy);
//                 //        that.invalidate();
//                 //    }).done(function () {
//                 //        setTimeout(showEditor, 0);
//                 //    });
//                 //} else {
//                 //    showEditor();
//                 //}
//             }
//
//         function findBoundElement(element, propertyName){
//             var e = element;
//             var isTemplate = false;
//             var boundElement;
//
//             do{
//                 boundElement = e.findBoundElement(propertyName);
//                 if (e === boundElement){
//                     break;
//                 }
//                 var isTemplate = boundElement instanceof fwk.TemplatedElement;
//                 if (isTemplate){
//                     e = boundElement;
//                     var binding = e.findBinding(propertyName);
//                     var p = e.findCustomProperty(binding.targetPropertyName);
//                 }
//             } while(isTemplate);
//
//             return boundElement;
//         }
//
//         function showQuickEditor(element, property) {
//             if (!element.quickEditor()) {
//                 var that = element;
//                 var editor = Registrar.createEditor(property);
//
//                 function setPosition(e) {
//                     var rect = e.getBoundaryRectGlobal();
//                     var scale = that.app.view.scale();
//                     that.quickEditorPosition({x: (rect.x + rect.width) * scale, y: ~~(rect.y + rect.height / 2) * scale });
//                 }
//
//                 setPosition(element);
//                 element.quickEditor(editor);
//
//                 //REFACTOR_NOSERIALIZE
//                 //this.quickEditorPositionSubscription = element.onresize.bind(function () {
//                 //    setPosition(element);
//                 //});
//             }
//             element.quickEditor().quickEdit();
//         }
//
//
//         return {
//             _constructor:function (app) {
//                 Selection.onElementSelected.bind(this, onElementSelected);
//                 app.controller.onElementDblClicked.bind(this, onElementDblClicked);
//                 app.actionManager.subscribe("editText", function(){
//                     var selection = Selection.getSelection();
//                     if (!selection || selection.length !== 1) {
//                         return;
//                     }
//                     onElementSelected.call(this, selection[0]);
//                     editElement.call(this, selection[0]);
//                 });
//             }
//         }
//     })());
// });