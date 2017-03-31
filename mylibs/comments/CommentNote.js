import Selection from "framework/SelectionModel";

define(["./CommentPopup", "./CommentsModel", "./RemoveComment", "framework/commands/CommandManager"], function (CommentPopup, CommentsModel, RemoveComment, commandManager) {
    var fwk = sketch.framework;;

    // fwk.PropertyMetadata.extend("sketch.framework.ImageElement", {
    //     "sketch.ui.common.CommentNote": {
    //         commentId:{
    //             displayName:"Comment id",
    //             defaultValue:0,
    //             useInModel:true
    //         }
    //     }
    // });

    var CommentNote = klass2("sketch.ui.common.CommentNote", null, (function () {


        return {
            _constructor:function (stickerId, number) {
                var stickerId = stickerId || 0;
                this._number = number || 0;
                var stickerName = "stickers.sticker_" + stickerId;
                this._disableNotifications = false;
                this.setProps({
                    source: fwk.ImageSource.createFromSprite("stickers", stickerName),
                    width:CommentNote.width,
                    height:CommentNote.height
                });

                this.isTemporary(true);
                this.activeInPreview(true);
                this.scalableX(false);
                this.scalableY(false);
                this.allowSnapping(false);
            },
            canRotate: function(){
                return false;
            },
            commentNumber:function(value){
                if(value !== undefined){
                    this._number = value;
                }

                return this._number;
            },
            disableNotifications:function(value){
                this._disableNotifications = value;
            },
            changeSticker: function(stickerId) {
                var newName = "stickers.sticker_" + (stickerId || 0);
                this.source(fwk.ImageSource.createFromSprite("stickers", newName));
            },
            commentId:function(value){
                if(value !== undefined){
                    this.setProps({commentId:value})
                }
                return this.props.commentId;
            },
            resizeDimensions:function() {
                return 0;
            },
            removed:function(){
                if(this._popup){
                    this._popup.hide();
                }
            },
            dblclick:function(event){
                event.handled = true;
                this._popup = new CommentPopup();
                this._popup.show(this);
            },
            canBeAccepted:function(element){
                return false;
            },
            resize:function(value){
                //ImageElement.prototype.resize.apply(this, arguments);
                CommentsModel.Instance.noteMoved(this.commentId(), this.x(), this.y());
            },
            drawSelf:function(context, w, h, environment){
                //ImageElement.prototype.drawSelf.apply(this, arguments);
                context.save();
                context.fillStyle = "#fff";
                context.globalAlpha = 0.7;
                context.textAlign = "center";
                context.font = '10px Arial';

                if (this._number){
                    context.fillText(this._number, 0 + w / 2 - 1, 0 + 11, 23);
                }

                context.restore();
            },
            canBeRemoved:function(){
                if(confirm("Are you sure you want to delete comment?")){
                    var cmd = new RemoveComment(this.commentId());
                    Selection.makeSelection([]);
                    commandManager.execute(cmd);
                }

                return false;
            }
        }
    })());

    CommentNote.width = 34;
    CommentNote.height = 38;

      return CommentNote;
});