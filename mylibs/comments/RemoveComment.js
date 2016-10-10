define(["framework/commands/Command", "./CommentsModel"], function(Command, CommentsModel){
    return klass2("sketch.comments.RemoveComment", Command, {
        _constructor: function(commentId){
            this._comment = CommentsModel.Instance.findById(commentId)
        },
        execute: function(){
            CommentsModel.Instance.deleteComment(this._comment.id);
        },
        rollback: function(){
            CommentsModel.Instance.resurectComment(this._comment);
        }
    });
});