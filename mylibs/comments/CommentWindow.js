define(["./CommentsViewModel", "./CommentsModel"], function (CommentsViewModel, CommentsModel) {
    var fwk = sketch.framework;
    return klass2("sketch.comments.CommentWindow", null, (function () {
        var defaults;

        function initDefaults(){
            if (!defaults){
                defaults = {
                    show: { event: "click", solo: true },
                    hide: { event: "unfocus" },
                    position: {
                        viewport: $(window),
                        adjust: { method: "shift" }
                    },
                    style: {
                        tip: {
                            height: 16,
                            width: 16
                        }
                    }
                }
            }
        }

        var renderComments = function(){
            this._model = new CommentsViewModel(CommentsModel.Instance);
            this._model.load();
            this._model.loadNotes();

            this._content = $(fwk.Resources['commentWindow']);
            return this._content;
        };

        return {
            _constructor: function(){
                initDefaults();
            },
            init:function (element) {
                this.commentPannel = $("<div></div>")
                        .hide()
                        .appendTo("body");
                var that = this;
                this.initInternal({
                    position: {
                        my: "top left", at: "bottom center"
                    },
                    content:{
                        text:this.commentPannel
                    },
                    events:{
                        render:function(event, api){
                            that.commentPannel.html(renderComments.call(that).html());
                            ko.applyBindings(that._model, that.commentPannel[0]);
                        }
                    }
                }, element);
            },
            initInternal: function(opt, element){
                var e = this.element = element || $('#comments');
                var options = $.extend(true, {}, defaults);
                options = $.extend(true, options, opt);

                var onVisible = function(){
                    fwk.pubSub.publishSync("html.added");
                };

                if (!options.events){
                    options.events = {};
                }
                if (options.events.visible){
                    var orig = options.events.visible;
                    options.events.visible = function(){
                        orig.apply(this, arguments);
                        onVisible();
                    };
                }
                else {
                    options.events.visible = onVisible;
                }

                e.qtip(options);
            },
            dispose: function(){
                this.element.qtip("destroy");
            }
        }
    })());
});