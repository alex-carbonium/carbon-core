import Selection from "framework/SelectionModel"
import Invalidate from "framework/Invalidate";

define(function () {
    var fwk = sketch.framework;

    return klass((function () {
        function changeSelectionMode(elements, mode){
            if (elements){
                for (var i = 0, l = elements.length; i < l; ++i){
                    var el = elements[i];
                    if (typeof el.mode === 'function'){
                        el.mode(mode);
                    }
                }
                Invalidate.request();
            }
        }

        function refreshSelection(mode){
            var selection = Selection.selectedElements();
            if(selection) {
                changeSelectionMode(selection, mode);
                // Selection.refreshSelection();
                Invalidate.requestUpperOnly();
            }
        };

        var insideElementSelected = false;
        var elementSelected = function(selection, oldSelection){
            if(!insideElementSelected){
                insideElementSelected = true;
                changeSelectionMode(oldSelection, this._detachMode);
                refreshSelection(this._attachMode);
                insideElementSelected = false;
            }
        };

        return {
            _constructor:function () {
                this._attachMode = "edit";
                this._detachMode = "resize";
            },
            attach:function(app, view, controller){
                this._app = app;
                this._view = view;
                this._controller = controller;
                refreshSelection(this._attachMode);
                Selection.onElementSelected.bind(this, elementSelected);
                this._attach();
            },
            detach:function(){
                Selection.onElementSelected.unbind(this, elementSelected);
                refreshSelection(this._detachMode);
                this._detach();
            },
            pause: function(){
                Selection.onElementSelected.unbind(this, elementSelected);
                this._detach();
            },
            resume: function(){
                Selection.onElementSelected.bind(this, elementSelected);
                this._attach();
            },
            _attach: function(){
                var controller = this._controller;
                if(controller) {
                    this._mouseDownBinding = controller.mousedownEvent.bindHighPriority(this, this.mousedown);
                    this._mouseUpBinding = controller.mouseupEvent.bindHighPriority(this, this.mouseup);
                    this._mouseMoveBinding = controller.mousemoveEvent.bindHighPriority(this, this.mousemove);
                    this._clickBinding = controller.clickEvent.bindHighPriority(this, this.click);
                }
                if(this._view.layer3) {
                    this._drawBinding = this._view.layer3.ondraw.bind(this, this.layerdraw);
                }
            },
            _detach: function(){
                if(this._mouseDownBinding){
                    this._mouseDownBinding.dispose();
                }
                if(this._mouseUpBinding){
                    this._mouseUpBinding.dispose();
                }
                if(this._mouseMoveBinding){
                    this._mouseMoveBinding.dispose();
                }
                if(this._drawBinding){
                    this._drawBinding.dispose();
                }
                if(this._clickBinding){
                    this._clickBinding.dispose();
                }
            },
            view:function(){
                return this._view;
            },
            mousedown: function(event){
            },
            mouseup: function(event){
            },
            mousemove: function(event){
            },
            click: function(event){
            },
            layerdraw: function(context){
            }
        }
    })());
});