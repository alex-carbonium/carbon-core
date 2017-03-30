import Environment from "environment";
import EventHelper from "framework/EventHelper";

define("bootloader", ["logger", "App"], function(logger){
    var fwk = sketch.framework;
    var ui = sketch.ui;
    var exp = sketch["export"];

    klass2("sketch.export.View", null, {
        _constructor: function(){
            this._scale = 1;
            this._width = 793;
            this._height = 1122;
        },
        interactionLayer: {
            ondraw: EventHelper.createEvent(),
            add: function(){

            }
        },
        width: function(value){
            if (value !== undefined){
                this._width = value;
            }
            return this._width;
        },
        height: function(value){
            if (value !== undefined){
                this._height = value;
            }
            return this._height;
        },
        scale: function(value){
            if (value !== undefined){
                this._scale = value;
            }
            return this._scale;
        },
        resize: function(){
        },
        invalidate: function(){

        },
        isCrazy: function(/*bool*/value){
            return App.Current.isCrazy(value);
        },
        view: function(){
            return this;
        },
        scrollX: function(){
            return 0;
        },
        scrollY: function(){
            return 0;
        },
        setActivePage: function(){
        },
        requestRedraw: function(){
        }
    });

    klass2("sketch.export.ImageRender", sketch.Application, (function(){
        function renderCommentNotes(context, comments){
            context.font = "12px Arial";
            context.lineHeight = "12px";
            context.strokeStyle = "black";
            context.strokeWidth = 2;
            context.textBaseline = "top";
            each(comments, function(comment){
                if (comment.pageX && comment.pageY){
                    var m = context.measureText(comment.number);
                    context.beginPath();
                    context.rectPath(comment.pageX - 2, comment.pageY - 2, m.width + 4, 16, false);
                    context.fillStyle = "white";

                    context.fill();
                    context.stroke();
                    context.fillStyle = "black";
                    context.textAlign = "center";
                    context.fillText(comment.number, comment.pageX + ~~(m.width / 2), comment.pageY, m.width);
                }
            });
        }

        function getLinks(page, scroll, scale){
            var linkMapping = {};
            page.applyVisitor(function(element){
                var link = element.pageLink();
                if (link){
                    var controls = linkMapping[link] = linkMapping[link] || [];
                    var rect = element.getBoundaryRectGlobal();
                    rectTranslate(rect, scroll.x, scroll.y);
                    rectScale(rect, scale, scale);
                    controls.push(rect);
                }
            });

            return linkMapping;
        }

        return {
            _constructor: function(){
                this.isExporting = true;
            },

            theme: function(value){
                if (value !== undefined){
                    this._theme = value;
                }
                return this._theme;
            },
            addLoadRef: function(){
            },
            releaseLoadRef: function(){

            },
            nextPageId: function(){
                return ++this._pageId;
            },
            setActivePage: function(page){
                this.pageChanged.raise(this.activePage, page);
                this.activePage = page;
            },
            viewportSize: function(){
                return {
                    width: this.view.width(),
                    height: this.view.height()
                }
            },
            pagesExportData: function(app, showDevice, projectComments, showLinks, actualSize){
                var canvas = $('<canvas></canvas>')[0];
                var context = canvas.getContext('2d');
                var exportData = [];
                var includeGroupName = app.pageGroups.length > 1;
                var view = Environment.view;

                //TODO: walk through children
                app.iteratePages(function(page, group){
                    page.isPhoneVisible(showDevice);
                    app.setActivePage(page); //hook up ActivePageTracker
                    var container = page.device;
                    if (typeof container.displayShadow === 'function'){
                        container.displayShadow(false);
                    }

                    //TODO: iterate
                    page.children.each(function(_, el){
                        if (el !== container){
                            el.visible(false);
                        }
                    });

                    var rect = page.getContentOuterSize();

                    if (actualSize){
                        view.width(rect.width);
                        view.height(rect.height);
                    }
                    var size = {width: view.width(), height: view.height()};

                    if (sketch.params.exportType === 'pdf' && page.orientation() === 'landscape'){
                        var tmp = size.width;
                        size.width = size.height;
                        size.height = tmp;
                    }

                    canvas.width = size.width;
                    canvas.height = size.height;

                    var scale = page.scaleToSize(size, {addGutters: false});
                    var scroll = {x: (size.width / scale - rect.width) / 2 - rect.x, y: (size.height / scale - rect.height) / 2 - rect.y};

                    function draw(){
                        context.save();

                        context.scale(scale, scale);
                        context.translate(scroll.x, scroll.y);

                        page.invalidateRequired = true;
                        page.draw(context);

                        context.restore();
                    }

                    var redraw = true;
                    page.invalidate = function(){
                        redraw = true;
                    };
                    while (redraw){
                        redraw = false;
                        draw();
                    }

                    context.save();

                    var comments = [];
                    if (projectComments){
                        comments = sketch.util.where(projectComments, function(c){
                            return c.parentId === emptyUuid && c.pageId === page.id();
                        });
                        var childComments = sketch.util.where(projectComments, function(c){
                            return sketch.util.indexOf(comments, function(parent){
                                return parent.id === c.parentId;
                            }) != -1;
                        });
                        childComments.sort(function(a, b){
                            return a.parentId > b.parentId;
                        });
                        comments = comments.concat(childComments);
                        renderCommentNotes(context, comments);
                    }


                    var links = null;
                    if (showLinks){
                        links = getLinks(page, scroll, scale);
                    }

                    context.restore();

                    var imageData = canvas.toDataURL('image/png');

                    exportData.push({
                        id: page.id(),
                        name: includeGroupName ? group.name() + " - " + page.name() : page.name(),
                        imageData: imageData,
                        comments: comments,
                        links: links
                    });

                });
                return exportData;
            },
            run: function(){
                sketch.framework.initializeContextExtensions(C2S.prototype);
                var that = this;
                this.projectType('iPhoneProject');

                if (sketch.params && sketch.params.projectType){
                    this.projectType(sketch.params.projectType);
                }

                var canvas = $('<canvas></canvas>')[0];
                var context = canvas.getContext('2d');

                this.view = new exp.View();
                this.view.context = context;

                var projectLoaded = this.loadMainProject();
                var fontsLoaded = this.waitForWebFonts();
                var dataLoaded = this.loadData();

                fwk.Deferred.when(dataLoaded, projectLoaded, fontsLoaded).then(function(data){
                    that.initExtensions();
                    that.initFromJsonParameters(data);

                    that.loadPersistedSatelliteProjects().then(function(){
                        that.fromJSON(data);

                        that.raiseLoaded();

                        that.releaseLoadRef();

                        each(that.children, function(page){
                            page.resize(page.getBoundaryRect());
                        });

                        function doExport(){
                            if (sketch.params.pageId){
                                var imageExport = new exp.OnePageExport();
                                imageExport.exportProject(that);
                            } else{
                                if (sketch.params.exportType === 'pdf'){
                                    var pdf = new exp.PdfExport();
                                    pdf.exportProject(that, sketch.params.showDevice, sketch.params.comments, sketch.params.showLinks, false);
                                } else if (sketch.params.exportType === 'png' || sketch.params.exportType === 'jpeg'){
                                    var imageExport = new exp.ImageExport();
                                    imageExport.exportProject(that, sketch.params.showDevice, sketch.params.exportType);
                                }
                                else if (sketch.params.exportType === "html"){
                                    require(["js/mylibs/export/html/Generator"], function(generator){
                                        generator.generate(that).then(function(data){
                                            window.top.sketch.htmlExportEntryUrl(data.entryUri);
                                        });
                                    });
                                }
                            }
                        }

                        if (fwk.ImageSource.loadCount){
                            fwk.ImageSource.loadCompleted.bind(doExport);
                        } else{
                            doExport();
                        }
                    }).fail(function(){
                        logger.fatal("Loading satellite projects failed", arguments);
                    });
                }).fail(function(){
                    logger.fatal("Loading project failed", arguments);
                });
            }
        }
    })());

    App = {};
    App.Current = new exp.ImageRender();
    App.Current.id(sketch.params.appId);
    App.Current.initFromJsonParameters(sketch.params);
    App.Current.run();
});