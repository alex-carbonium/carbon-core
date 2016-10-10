import {createUUID} from "../util";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import Environment from "environment";

define(["server/CommentsProxy", "./CommentNote"], function (CommentsProxy, CommentNote) {
    var fwk = sketch.framework;
    return klass2("sketch.comments.CommentsModel", null, (function () {

        function findFreeCommentSpot(note, left, top){
            var h2 = note.height()/2;
            var y = top;
            var x = left + note.width()/2;
            var view = Environment.view;
            while(App.Current.activePage.hitElement({x:x, y:y+h2}, view.scale()) instanceof CommentNote){
                y += note.height();
            }
            return y;
        }

        var addCommentNote = function(comment, reposition){
            if (comment.parentId != emptyUuid){
                return null;
            }
            var page = App.Current.getPageById(comment.pageId);
            if (!page){
                return;
            }

            reposition = reposition === undefined ? true : reposition;

            var note = new CommentNote(comment.status ? "resolved" : null, comment.number);
            note.commentId(comment.id);
            if (reposition){
                var rect = page.getContentContainer().getBoundaryRectGlobal();
                comment.pageX = rect.x + rect.width + 20;
                comment.pageY = findFreeCommentSpot(note, comment.pageX, rect.y);
            }
            note.x(~~comment.pageX);
            note.y(~~comment.pageY);
            page.add(note);
            note.visible(!!this.showNotes());

            this.noteReferences[comment.id] = {page:page, element:note};

            return note;
        };

        var onCommentAddedOutside = function(message, comment){
            var tmpComment = this.findById(comment.id);
            if(tmpComment){
                if(tmpComment.isTmp){
                    var note = this.findNoteElementById(comment.id);
                    if(note) {
                        note.commentId(comment.id);
                        note.commentNumber(comment.number);
                    }
                    tmpComment.number = comment.number;
                    tmpComment.date = comment.date;
                    tmpComment.userName = comment.userName;
                    this.commentChanged.raise(tmpComment);
                    return;
                } else {
                    return;
                }
            }
            comment.noteVisible = this.showNotes();
            this.comments.push(comment);
            addCommentNote.call(this, comment);
            this.commentAdded.raise(comment);
        };

        var onCommentChangedOutside = function(message, data){
            var comment = this.findById(data.id);
            if(!comment){
                return;
            }
            comment.text = data.text || comment.text;
            if(data.date) {
                comment.date = data.date;
            }
            comment.status = data.status;


            var ref = this.noteReferences[data.id];
            if(ref && ref.element){
                ref.element.changeSticker(comment.status ? "resolved" : null)
            }

            this.commentChanged.raise(comment);
        };

        var onCommentDeletedOutside = function(message, data){
            var comment = this.findById(data.id);
            if(!comment){
                return;
            }
            removeElement(this.comments, comment);
            this.commentDeleted.raise(comment);
            var ref = this.findNoteElementById(data.id);
            if (ref) {
                ref.parent().remove(ref);
            }
        };

        var onNoteAddedOutside = function(message, data){
            var note = new CommentNote(data.status ? "resolved" : null, data.number);
            function addToPage(page){
                if(!page || (this.noteReferences[data.id] && page.id() == data.pageId)){
                    return;
                }
                this._doNotNotify = true;
                note.commentId(data.id);
                note.commentNumber(data.number);
                note.x(data.pageX);
                note.y(data.pageY);
                note.disableNotifications(true);
                page.add(note);
                note.disableNotifications(false);
                var comment = this.findById(data.id);
                if(comment){
                    comment.noteVisible = false;
                    comment.pageX = data.pageX;
                    comment.pageY = data.pageY;
                    comment.page = data.pageId;
                }
                this.addNoteReference(data.id, page, note);
                this._doNotNotify = false;
            }
            var page = App.Current.activePage;
            if(data.pageId == page.id(true)){
                addToPage.call(this, page);
            }
        };

        var onNoteRemovedOutside = function(message, data){
            this._doNotNotify = true;
            var ref = this.noteReferences[data.id];
            if(ref)
            {
                ref.page.remove(ref.element);
            }
            var comment = this.findById(data.id);
            if(comment){
                delete comment.pageX;
                delete comment.pageY;
                delete comment.page;
            }
            this._doNotNotify = false;
        };

        var onNoteMovedOutside = function(message, data){
            this._doNotNotify = true;
            var ref = this.noteReferences[data.id];
            if(ref){
                ref.element.x(data.pageX);
                ref.element.y(data.pageY);
            }
            var comment = this.findById(data.id);
            if(comment){
                comment.pageX = data.pageX;
                comment.pageY = data.pageY;
            }
            this._doNotNotify = false;
        };

        function showNotesChanged(newValue){
            for (var id in this.noteReferences){
                var ref = this.noteReferences[id];
                ref.element.visible(newValue);
            }
        }

        return {
            _constructor:function () {
                this._loadingCount = 0;
                this._loaded = false;
                this.comments = [];
                this.noteReferences = {};
                this.commentAdded = fwk.EventHelper.createEvent();
                this.commentDeleted = fwk.EventHelper.createEvent();
                this.commentChanged = fwk.EventHelper.createEvent();
                this.loading = fwk.EventHelper.createEvent();
                this.loaded = fwk.EventHelper.createEvent();
                this.commentsProxy = new CommentsProxy();
                var that = this;
                this.commentsProxy.onError.bind(function(){
                    that.stopLoading();
                });
                this.commentsProxy.onSuccess.bind(function(){
                    that.stopLoading();
                });
                this.commentsProxy.onRequest.bind(function(){
                    that.startLoading();
                });

                fwk.pubSub.subscribe("comment.added", EventHandler(this, onCommentAddedOutside).closure());
                fwk.pubSub.subscribe("comment.deleted", EventHandler(this, onCommentDeletedOutside).closure());
                fwk.pubSub.subscribe("comment.changed", EventHandler(this, onCommentChangedOutside).closure());
                fwk.pubSub.subscribe("comment.note_moved", EventHandler(this, onNoteMovedOutside).closure());

                this.showNotes = ko.observable();
                this.showNotes.subscribe(proxy(this, showNotesChanged));
            },
            startLoading:function(){
                this._loadingCount++;
                this.loading.raise(true);
            },
            stopLoading:function(){
                this._loadingCount--;
                if(this._loadingCount === 0){
                    this.loading.raise(false);
                }
            },
            processCommentsList:function(comments){
                if(!comments)
                    return;
                for(var i = 0; i<comments.length; ++i){
                    var comment = comments[i];

                    if(!this.findById(comment.id)){
                        this.comments.push(comment);
                    }
                }

                this.loaded.raise();
            },
            load:function(){
                if(this._loaded){
                    return;
                }
                this._loaded = true;
                var that = this;

                var loadComments = function(data){
                    that.processCommentsList(data);
                    that.loading.raise(false);
                };

                if (!App.Current.isNew() && sketch.params.canManageComments){
                    this.loading.raise(true);
                    this.commentsProxy.getAll(loadComments);
                }
                else if (sketch.params.comments){
                    loadComments(sketch.params.comments);
                }
            },
            saveComment:function(text, parentId, note){
                var pageId = App.Current.activePage.id(true);
                var dateTime = new Date();
                var tmpId = createUUID();
                var number;
                if(parentId == emptyUuid){
                    if(note){
                       number = note.commentNumber();
                    } else {
                        number = 0;
                        each(this.comments, function(c){
                            if(c.number > number) {
                                number = c.number;
                            }
                        });
                        number++;
                    }
                }
                var tmpComment = {
                    text:text,
                    isTmp:true,
                    id:tmpId,
                    noteVisible:!note,
                    parentId:parentId,
                    date:dateTime,
                    pageId:pageId,
                    number:number
                };

                if(!note && parentId == emptyUuid){
                    note = addCommentNote.call(this, tmpComment);
                }

                this.comments.push(tmpComment);
                this.commentAdded.raise(tmpComment);
                var x, y;
                var page = App.Current.activePage;

                if(note){
                    x = note.x();
                    y = note.y();
                    tmpComment.pageX = x;
                    tmpComment.pageY = y;
                    this.noteReferences[tmpId] = {page:page, element:note};
                }

                App.Current.raiseLogEvent(fwk.sync.Primitive.comment_add(text, tmpId, parentId, pageId, dateTime.getTime(), x, y, tmpComment.number));
            },
            resurectComment:function(comment){
                var tmpId = createUUID();
                comment.isTmp = true;
                comment.id = tmpId;

                this.comments.push(comment);
                this.commentAdded.raise(comment);
                App.Current.raiseLogEvent(fwk.sync.Primitive.comment_add(comment.text, comment.id, comment.parentId, comment.pageId, parseJsonDate(comment.date).getTime(), comment.pageX, comment.pageY, comment.number));
            },
            addCommentNote:addCommentNote,
            deleteComment:function(id){
                var comment = this.findById(id);
                if(comment) {
                    App.Current.raiseLogEvent(fwk.sync.Primitive.comment_remove(id, comment.pageId));

                    removeElement(this.comments, comment);
                    this.commentDeleted.raise(comment);

                    var ref = this.findNoteElementById(id);
                    if (ref) {
                        ref.parent().remove(ref);
                    }
                }
            },
            updateComment:function(comment){
                App.Current.raiseLogEvent(fwk.sync.Primitive.comment_update(comment.id(), comment.text(), comment.pageId));
                var data = this.findById(comment.id());
                data.text = comment.text();
                this.commentChanged.raise(data);
            },
            changeStatus:function(comment, status, callback){
                App.Current.raiseLogEvent(fwk.sync.Primitive.comment_change_status(comment.id(), status, comment.pageId));
                var data = this.findById(comment.id());
                data.status = status;

                var ref = this.noteReferences[data.id];
                if (ref && ref.element) {
                    ref.element.changeSticker(data.status ? "resolved" : null)
                }
                this.commentChanged.raise(data);
                callback();

            },
            findById:function(id){
                var comments = this.comments;
                for(var i = 0; i < comments.length; ++i){
                    if(comments[i].id === id){
                        return comments[i];
                    }
                }
                return null;
            },
            addNoteReference:function(id, page, element){
                var comment = this.findById(id);
                if(comment)
                {
                    if(!this.noteReferences[id])
                    {
                        comment.noteVisible = false;
                        this.commentChanged.raise(comment);
                        this.noteReferences[id] = {page:page, element:element};
                    }
                }
            },
            selectComment:function(comment){
                if(comment){
                    var page = App.Current.getPageById(comment.comment.pageId);
                    App.Current.setActivePage(page);
                    var ref = this.noteReferences[comment.id()];
                    if(ref){
                        Selection.makeSelection([ref.element]);
                        Environment.view.ensureVisible(ref.element);
                    }
                }else
                {
                    Selection.makeSelection([]);
                }
            },
            noteMoved: function(id, x, y) {
                var comment = this.findById(id);
                if(comment){
                    comment.pageX = x;
                    comment.pageY = y;
                    if(!this._doNotNotify){
                        App.Current.raiseLogEvent(fwk.sync.Primitive.comment_move_note(id, x, y));
                    }
                }
            },
            clearNotes:function(page){
                this.noteReferences = {};
                page.applyVisitor(function(element){
                    if(element instanceof CommentNote){
                        element.disableNotifications(true);
                        element.parent().remove(element);
                    }
                });
                Invalidate.request();
            },
            findNoteElementById:function(id){
                var ret;
                App.Current.activePage.applyVisitor(function(element){
                    if(element instanceof CommentNote && element.commentId() === id){
                        ret = element;
                    }
                });
                return ret;
            }
        }
    })());
});