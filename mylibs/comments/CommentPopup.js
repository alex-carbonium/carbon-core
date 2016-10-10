define(["./CommentWindow", "./CommentsModel", "./CommentsViewModel"], function (CommentWindow, CommentsModel, CommentsViewModel) {
    var fwk = sketch.framework;

    return klass2("sketch.comments.CommentPopup", CommentWindow, (function () {

        var renderComments = function(){

            this._model = new CommentsViewModel(CommentsModel.Instance, this._commentId);
            if(this._commentId!=emptyUuid) {
                this._model.load();
            }

            this._content = $(fwk.Resources['commentWindow']);
            return this._content;
        };

        return {
            _constructor:function () {
            },
            show:function (/*CommentNote*/element) {
                this._commentId = element.commentId();

                var scale = Environment.view.scale();
                var x = ~~(element.x()*scale) + element.width();
                var y = ~~(element.y()*scale + element.height()/2);
                var el = this._popup = $('<div style="position:absolute;left:'+x+'px; top:'+y+'px"></div>');
                el.width(1);
                el.height(1);
                $('#htmlPanel').append(el);

                this.commentPannel = $("<div></div>")
                    .hide()
                    .appendTo("body");

                var that = this;
                //TODO: use qtip binding
                this.initInternal({
                    content:{
                        text:this.commentPannel
                    },
                    position:{
                        my: "center left", at: "right center",
                        adjust:{ method:"flip" }
                    },
                    events:{
                        render:function(event, api){
                            that.commentPannel.html(renderComments.call(that).html());
                            that._model.note = element;
                            var id = element.commentId();
                            that._model.onCommentSaved.bind(function(){
                                that._saved = true;
                                if(id === -1){
                                    api.hide();
                                }
                            });
                            that._model.onCommentCanceled.bind(function(){
                                if(id === -1){
                                    api.hide();
                                }
                            });
                            ko.applyBindings(that._model, that.commentPannel[0]);
                            if(that._commentId === -1){
                                setTimeout(function(){
                                    that._model.focused(true);
                                },100);
                            }
                        },
                        hide:function(){
                            if (element.commentId() === -1 && !that._saved){
                                element.parent().remove(element);
                            }
                            if (that._model){
                                that._model.dispose();
                            }
                            that.commentPannel.remove();
                            el.remove();
                            delete that._saved;
                        }
                    },
                    style: {
                        classes: "comments",
                        width: "350px"
                    }
                }, el);

                el.qtip('show');
            },
            hide:function(){
                this._popup.qtip('hide');
            }
        }
    })());
});