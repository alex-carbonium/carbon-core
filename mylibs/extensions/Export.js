define(["server/ContentProxy", "viewmodels/DialogViewModel", "text!../../../templates/dialogs.exportToMyImages.jshtml.html"], function (ContentProxy, DialogViewModel, exportToMyImagesTemplate) {
    var fwk = sketch.framework;

    var Export = klass((function () {
        var renderToMyImages = function(selection){
            var viewModel = new sketch.viewmodels.ExportToMyImagesViewModel(selection);
            var dialog = new wnd.Dialog(viewModel, {
                modal:true, width: 630, canClose: true
            },
            viewModel);

            dialog.show();
        };


        var onBuildMenu = function(context, menu){
            var selection = context.selectComposite.elements;
            menu.items.push('-');
            menu.items.push({
                name:"Export selection to",
                items:[
                    {
                        name:"My images...",
                        callback:function(){
                            renderToMyImages(selection);
                        },
                        disabled:!selection || selection.length === 0 || this.app.isInOfflineMode()
                    }
                ]
            })
        };

        return {
            _constructor:function (app) {
                this.app = app;
                app.onBuildMenu.bind(this, onBuildMenu);
            }
        }
    })());

    klass2("sketch.viewmodels.ExportToMyImagesViewModel", null, (function() {
            return {
                template: exportToMyImagesTemplate,
                _constructor: function(selection){
                    var canvas = document.createElement("canvas");
                    var x = sketch.util.min(selection, function(e){return e.x();});
                    var y = sketch.util.min(selection, function(e){return e.y();});
                    var bottom = sketch.util.max(selection, function(e){return e.y()+e.height();}) + 1;
                    var right = sketch.util.max(selection, function(e){return e.x()+ e.width();}) + 1;
                    canvas.width = right-x;
                    canvas.height = bottom-y;
                    var context = canvas.getContext('2d');
                    context.translate(-x, -y);
                    each(selection, function(el){
                        el.draw(context);
                    });

                    this.canvasElement = canvas;
                },

                init:function(dialog, options){
                    this._dialog = dialog;
                    options.title = "Save image to my collection";
                },

                saveImage:function(){
                    var data = this.canvasElement.toDataURL("image/png");
                    var proxy = new ContentProxy();
                    var that = this;
                    proxy.uploadExportedImage(data).then(function(response){
                        if(!response.error){
                            that._dialog.close();
                        }
                        else{
                            that.error = response.error;
                        }
                    });
                },

                cancel:function(){
                    this._dialog.close();
                }
            };
        })());

    return Export;
});