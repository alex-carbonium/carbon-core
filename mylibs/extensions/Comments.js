define(["comments/CommentsModel"], function (CommentsModel) {
    var fwk = sketch.framework;

    return klass((function () {
        var CommentNote = sketch.ui.common.CommentNote;
        var addCommentNote = function(comment){
            var note = new CommentNote(0, comment.number)
              , page = this._app.activePage;

            note.commentId(comment.id);
            note.x(~~comment.pageX);
            note.y(~~comment.pageY);
            page.add(note);

            return note;
        };

        function onCommentAddedFromMenu(message, event){
            var comment = {
                id:-1,
                pageX:event.x,
                pageY:event.y,
                stickerId:0 ,
                status:0,
                text:'',
                date:new Date(),
                number:0
            };
            var note =  addCommentNote.call(this, comment);
            note.dblclick({});
        }

        var appLoaded = function(){
            //this._model = CommentsModel.Instance = new CommentsModel();
            //this._model.load();

            fwk.pubSub.subscribe("comment.addFromMenu", EventHandler(this, onCommentAddedFromMenu).closure());

            this._app.releaseLoadRef();
        };

        return {
            _constructor:function (app) {
                this._app = app;
                if (!this._app.platform.richUI()){
                    return;
                }

                //appViewModel depends on this run first
                app.onLoad(appLoaded.bind(this));
                app.addLoadRef();
            }
        }
    })());
});