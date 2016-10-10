define(["framework/Deferred"], function(Deferred){
    var fwk = sketch.framework;

    var Dialog = klass2("sketch.windows.Dialog", null, (function(){
        var dialogQueue = []; //dialog queue. used for showing multiple dialogs one by one
        var displaying = false;

        return {
            _constructor:function(moduleOrModuleName, options){
                var that = this;
                if (typeof moduleOrModuleName === "string"){
                    this._viewModelPromise = Deferred.create();

                    //require([moduleOrModuleName], function(ViewModel){
                    //    this._viewModelPromise.resolve(new ViewModel());
                    //}.bind(this));
                }
                else if (typeof moduleOrModuleName === "object"){
                    this._viewModelPromise = Deferred.createResolvedPromise(moduleOrModuleName);
                }
                else {
                    throw new Error("Unknown parameter type " + moduleOrModuleName);
                }

                this._options = $.extend({
                    // default dialog options
                    canClose:true,
                    resizable:false,
                    minWidth:300,
                    maxWidth:700,
                    width: "auto"
                }, options);

                if (!this._options.canClose){
                    this._options.closeOnEscape = false;
                }

                this._options.open = function(event, ui){
                    if (!that._options.canClose){
                        $(".ui-dialog-titlebar-close", ui.dialog).hide();
                    }

                    if(that._options.hasHeader === false) {
                        $(".ui-dialog-titlebar").hide();
                    }
                    //hack to remove animations once opened
                    setTimeout(function(){
                        $(".ui-dialog", ui.dialog).addClass("open");
                    }, 1500);
                };

                this._options.close = function (){
                    this._viewModelPromise.then(function(viewModel){
                        if (typeof viewModel.dispose === "function"){
                            viewModel.dispose();
                        }
                        if (viewModel.html){
                            viewModel.html.dialog("destroy");
                        }
                        $(this).remove();
                        displaying = false;
                        that.processQueue();
                    });
                }.bind(this);
            },
            showDialog: function(){
                var options = this._options;
                this._viewModelPromise.then(function(viewModel){
                    var html = $(viewModel.template);
                    viewModel.init(this, options);
                    viewModel.html = html;

                    if (typeof viewModel.onShowing === 'function'){
                        viewModel.onShowing(viewModel.html[0]);
                    }

                    viewModel.html.dialog(options);
                    //bindings must be applied after the html has been added to the DOM, otherwise, many UI bindings will not work.
                    ko.applyBindingsWithValidation(viewModel, viewModel.html[0]);
                }.bind(this));
            },
            show:function(){
                dialogQueue.push(this); //add dialog to queue and process it
                this.processQueue();
            },
            processQueue: function(){
                if(!displaying){
                    if(dialogQueue.length > 0){
                        (dialogQueue.shift()).showDialog(); // show first in queue
                        displaying = true;
                    }
                }
            },
            close: function(){
                this._viewModelPromise.then(function(viewModel){
                    if (viewModel.html){
                        viewModel.html.dialog("close");
                    }
                });
            },
            viewModelPromise: function() {
                return this._viewModelPromise;
            },
            options: function() {
                return this._options;
            }
        }
    })());

    return Dialog;
});