define(["./CommentsModel", "./RemoveComment"], function (CommentsModel, RemoveComment) {
    var fwk = sketch.framework;
    var DefaultComment = _("Add a new comment");
    var DefaultChildComment = _("Reply to this comment...");
    var nullId = "00000000-0000-0000-0000-000000000000";

    return klass2("sketch.comments.CommentsViewModel", null, (function () {
        var newCommentObject = function(comment){
            var date = parseJsonDate(comment.date);
            return {
                id:ko.observable(comment.id),
                userName: ko.observable(comment.userName),
                date: ko.observable(date),
                text:ko.observable(comment.text),
                selected:ko.observable(false),
                children:ko.observableArray([]),
                childrenVisible: ko.observable(false),
                newComment:ko.observable(''),
                editComment:ko.observable(''),
                canPostComment:ko.observable(false),
                focused:ko.observable(false),
                noteVisible:ko.observable(!this._commentId),
                editing:ko.observable(false),
                isNotEmptyComment:ko.observable(false),
                status:ko.observable(comment.status),
                number:ko.observable(comment.number),
                DefaultComment:DefaultChildComment,
                comment:comment,
                pageId:comment.pageId
            };
        };

        var newChildCommentObject = function(comment){
            var date = parseJsonDate(comment.date);
            return {
                id:ko.observable(comment.id),
                parentId:comment.parentId,
                userName:ko.observable(comment.userName),
                date:ko. observable(date),
                text:ko.observable(comment.text),
                editing:ko.observable(false),
                canPostComment:ko.observable(false),
                isNotEmptyComment:ko.observable(false),
                focused:ko.observable(false),
                newComment:ko.observable(DefaultChildComment),
                type:ko.observable(comment.type),
                DefaultComment:DefaultChildComment,
                comment:comment,
                pageId:comment.pageId
            };
        };

        function replaceTempComment(commentModels, comment, commentModel){
            each(commentModels(), function(c, index){
                if(c.comment === comment.tmpComment) {
                    commentModels.splice(index, 1, commentModel);
                    return false;
                }
            });
        }

        function commentSortDelegate(a, b){
            if(a.status() === 1 && b.status() !== 1){
                return 1;
            }
            if (b.status() === 1 && a.status() !== 1){
                return -1;
            }

            if(a.comment.pageId === b.comment.pageId){
                return b.date().getTime() - a.date().getTime();
            }
            return a.comment.pageId - b.comment.pageId;
        }

        var onCommentAdded = function(comment){
            var that = this;
            if(!this.showAll() && App.Current.activePage.id() !== comment.pageId){
                return;
            }
            if(!comment.hasOwnProperty('parentId') || comment.parentId == nullId) {
                if(this._commentId && comment.id !== this._commentId){
                    return;
                }
                var commentModel = newCommentObject.call(this, comment);
                commentModel.focused.subscribe(function onFocused(value){
                    if(value){
                        that.gotFocus(commentModel);
                    } else {
                        that.lostFocus(commentModel);
                    }
                });
                if(comment.tmpComment){
                    replaceTempComment(this.commentModels, comment, commentModel);
                    delete comment.tmpComment;
                } else {
                    this.commentModels.push(commentModel);
                }

                this.commentModels.sort(commentSortDelegate);
            } else {
                if(this._commentId && comment.parentId !== this._commentId){
                    return;
                }
                var parent = this.findById(comment.parentId);
                if(parent){
                    var child = newChildCommentObject(comment);
                    child.focused.subscribe(function onFocused(value){
                        if(value){
                            that.gotFocus(child);
                        } else {
                            that.lostFocus(child);
                        }
                    });
                    if(comment.tmpComment){
                        replaceTempComment(parent.children, comment, commentModel);
                        delete comment.tmpComment;
                    } else {
                        parent.children.push(child);
                    }
                    parent.children.sort(function(a, b){
                        return a.date().getTime() > b.date().getTime();
                    });
                }
            }
        };

        var onCommentDeleted = function(comment){
            var elements;
            if(comment.parentId == nullId){
                elements = this.commentModels;
            }else{
                var parent = this.findById(comment.parentId);
                elements = parent.children;
            }

            for(var i = 0; i<elements().length;++i){
                if(elements()[i].id() === comment.id){
                    elements.splice(i, 1);
                    return;
                }
            }
        };

        var onCommentChanged = function(comment){
            var elements;
            if(comment.parentId == nullId){
                elements = this.commentModels;
            }else{
                var parent = this.findById(comment.parentId);
                elements = parent.children;
            }

            var sort = false;
            for(var i = 0; i<elements().length;++i){
                var commentModel = elements()[i];
                if(commentModel.id() === comment.id){
                    if(comment.id){
                        commentModel.id(comment.id);
                        //different objects come here depending whether this is root or not
                        if (typeof commentModel.number === "function"){
                            commentModel.number(comment.number);
                        }
                    }
                    if(comment.text !== undefined){
                        commentModel.text(comment.text);
                    }
                    commentModel.date(parseJsonDate(comment.date));
                    if(commentModel.status){
                        var statusChanged = comment.status !== commentModel.status();
                        if (statusChanged){
                            sort = true;
                        }
                        commentModel.status(comment.status);
                    }
                    if(commentModel.type){
                        commentModel.type(comment.type);
                    }
                    if (commentModel.userName){
                        commentModel.userName(comment.userName);
                    }

                    break;
                }
            }

            if (sort){
                this.commentModels.sort(commentSortDelegate);
            }
        };

        return {
            DefaultComment:DefaultComment,
            _constructor:function(model, commentId){
                var that = this;
                this._model = model;
                if(!model){
                    return;
                }
                this._subscriptions = [];
                this.commentModels = ko.observableArray([]);
                this.newComment = ko.observable(DefaultComment);
                this.canPostComment = ko.observable(false);
                this.isNotEmptyComment = ko.observable(false);
                this.loading = ko.observable(false);
                this.canAddNew = ko.observable(true);
                this.showAll = ko.observable(false);
                this.commentsMode = ko.observable(false);
                var s = this.showAll.subscribe(function(){
                    that.load();
                });
                this._subscriptions.push(s);
                this.note = null;
                this.onCommentSaved = EventHelper.createEvent();
                this.onCommentCanceled = EventHelper.createEvent();
                this.focused = ko.observable(false);
                this.commentsMode = ko.observable(false);
                s = this.focused.subscribe(function onFocused(value){
                    if(value || commentId == -1){
                        that.gotFocus(that);
                    } else {
                        that.lostFocus(that);
                    }
                });
                this._subscriptions.push(s);

                this.filterVisible = ko.computed(function(){
                    var len1 = that.commentModels().length;
                    var len2 = that._model.comments.length;
                    return (len1 > 0 || len2 > 0) && !commentId;
                });

                this._commentId = commentId;
                this.canAddNew(commentId === undefined || commentId < 0);

                s = this.newComment.subscribe(function(newValue){
                   that.isNotEmptyComment(newValue !== '' && newValue !== DefaultComment);
                });
                this._subscriptions.push(s);

                s = model.commentAdded.bind(this, onCommentAdded);
                this._subscriptions.push(s);

                s = model.commentDeleted.bind(this, onCommentDeleted);
                this._subscriptions.push(s);

                s = model.commentChanged.bind(this, onCommentChanged);
                this._subscriptions.push(s);

                s = model.loading.bind(function(value){
                    that.loading(value);
                });
                this._subscriptions.push(s);

                s = model.loaded.bind(function(){
                    that.load();
                    that.loadNotes();
                });
                this._subscriptions.push(s);

                // TODO: refactor to make computable value
                s = this.commentModels.subscribe(function(comments){
                    each(comments, function(commentModel){
                        commentModel.newComment.subscribe(function(newValue){
                            commentModel.isNotEmptyComment(newValue !== '' && newValue !== DefaultChildComment);
                        });
                    });
                });
                this._subscriptions.push(s);
            },
            load:function(){
                var page = App.Current.activePage;
                var pageId = page.id();
                var pageComments = this._pageComments = [];
                var that = this;
                if(!this._model){
                    return;
                }

                each(this._model.comments, function(comment){
                    if(comment.pageId === pageId || that.showAll()){
                        pageComments.push(comment);
                        return;
                    }
                    var parent = that.findById(comment.parentId);
                    if(parent && parent.comment.pageId === pageId){
                        pageComments.push(comment);
                    }
                });

                pageComments = pageComments.sort(function(a, b){
                    if (a.parentId === nullId && b.parentId === nullId){
                        return 0;
                    }
                    if (a.parentId === nullId){
                        return -1;
                    }
                    return 1;
                });

                this.commentModels([]);
                for(var i=0; i < pageComments.length; ++i){
                    var comment = pageComments[i];
                    onCommentAdded.call(this, comment);
                }
            },
            loadNotes:function(){
                var page = App.Current.activePage;
                var pageComments = this._pageComments;
                var pageId = page.id();

                this._model.clearNotes(page);

                if(!this.commentsMode()){
                    return;
                }

                if(this.commentsMode()) {
                    for (var i = 0; i < pageComments.length; ++i) {
                        var comment = pageComments[i];
                        if (comment.parentId == nullId && comment.pageId === pageId && comment.pageX) {
                            this._model.addCommentNote(comment, false);
                        }
                    }
                }
            },
            findById:function(id){
                for(var i = 0; i < this.commentModels().length; ++i){
                    var c = this.commentModels()[i];
                    if(c.id() === id){
                        return c;
                    }
                }
                return null;
            },
            addComment:function(doNotReset){
                this._model.saveComment(this.newComment(), nullId, this.note);
                if(!doNotReset) {
                    this.newComment(DefaultComment);
                } else {
                    this.newComment('');
                }
                this.onCommentSaved.raise();
                this.note = null;
                $(".comment_input").trigger('input');// this is workaround, since change event is not triggered when value change in the code
            },
            addChildComment:function(comment, doNotReset){
                this._model.saveComment(comment.newComment(), comment.id());
                if(doNotReset) {
                    comment.newComment('');
                } else {
                    comment.newComment(DefaultChildComment);
                }
                $(".comment_input").trigger('input');// this is workaround, since change event is not triggered when value change in the code
            },
            deleteComment:function(comment){
                var cmd = new RemoveComment(comment.id());
                fwk.commandManager.execute(cmd);
            },
            startEditComment:function(comment){
                comment.editing(true);
                if(comment.hasOwnProperty('editComment')){
                    comment.editComment(comment.text());
                } else {
                    comment.newComment(comment.text());
                }
                comment.focused(true);
            },
            resolveComment:function(comment){
                var that = this;
                this._model.changeStatus(comment, 1, function(){
                    that.commentModels.sort(commentSortDelegate);
                });
            },
            reopenComment:function(comment){
                var that = this;
                this._model.changeStatus(comment, 0, function(){
                    that.commentModels.sort(commentSortDelegate);
                });
            },
            cancelEditComment:function(comment){
                comment.editing(false);
                comment.newComment('');
            },
            editComment:function(comment){
                if(comment.hasOwnProperty('editComment')){
                    comment.text(comment.editComment());
                    comment.editComment('');
                } else {
                    comment.text(comment.newComment());
                    comment.newComment('');
                }

                comment.editing(false);
                this._model.updateComment(comment);
            },
            gotFocus:function(comment){

                comment.canPostComment(true);
                if(comment.newComment()===comment.DefaultComment){
                    comment.newComment('');
                }
                return true;
            },
            lostFocus:function(comment){
                if(comment.newComment()===''){
                    comment.newComment(comment.DefaultComment);
                }
                comment.canPostComment(false);
                return true;
            },
            focusComment:function(comment){
                if(comment.newComment() === ''){
                    comment.newComment(comment.DefaultComment);
                }
                comment.childrenVisible(!comment.childrenVisible());
                this.selectComment(comment);
            },
            cancelComment:function(comment){
                comment.newComment(comment.DefaultComment);
                this.onCommentCanceled.raise();
            },
            formatDate: function(date){
                return dateFormat.date(date, "HH:mm ddd, MMM dd");
            },
            ensureVisible:function(comment) {
                this._model.selectComment(comment);
                this.selectComment(comment);
            },
            selectComment:function(comment){
                var comments = this.commentModels();
                for(var i = 0; i<comments.length; ++i){
                    var c = comments[i];
                    if(c === comment){
                        c.selected(true);
                    } else {
                        c.selected(false);
                    }
                }
            },
            linesCount:function(value){
                return (value.split("\n").length);
            },
            dispose: function(){
                each(this._subscriptions, function(s){
                    s.dispose();
                });
                this._subscriptions = [];
                this.onCommentSaved.clearSubscribers();
                this.onCommentCanceled.clearSubscribers();
            },
            getModel: function() {
                return this._model;
            }
        }
    })());
});