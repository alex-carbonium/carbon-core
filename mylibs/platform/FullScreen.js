import NullPage from "framework/NullPage";
import Invalidate from "framework/Invalidate";
import Environment from "environment";

define(["platform/All", "utils/dom"], function(All, domUtil){
    var fwk = sketch.framework;
    //TODO: refactor to use base class method
    var switchMode = function(){
        this.viewMode = "preview";
        switchToPreview.call(this);
    };
    var switchToPreview = function(){
        var pages = [].concat(App.Current.pages);
        App.Current.hideAllPages();

        var previewPages = [];
        var size = App.Current.viewportSize();
        var view = Environmentt.view;
        var activePage = App.Current.activePage;
        var newActivePage;
        App.Current.viewModel.phoneVisible(false);

        for (var i = 0, len = pages.length; i < len; i++){
            var previewPage = new PreviewPage();
            var page = pages[i];
                page._previewOptions = page.previewOptions();
                page.previewOptions = function(){
                    if (this._previewOptions){
                        this._previewOptions.addZoomFitGutters = false;
                    }
                    return this._previewOptions;
                };
            previewPage.setOriginalPage(page);
            previewPage.initPage(view, size);
            previewPage.orientation(page.orientation());

            previewPages.push(previewPage);

            if (page === activePage){
                newActivePage = previewPage;
            }
        }

        if (!newActivePage){
            newActivePage = previewPages[0];
        }
        App.Current.replaceAllPages(previewPages);
    };

    function pageChanged(oldPage, newPage){
        newPage.scale(1);
        newPage.scrollTo({scrollX: 0, scrollY: 0});
        resizeView.call(this);
    }

    function getNextPageGroup(app, group){
        var i = app.pageGroups.indexOf(group);
        if (++i === app.pageGroups.length){
            i = 0;
        }
        return app.pageGroups[i];
    }

    function getPreviousPageGroup(app, group){
        var i = app.pageGroups.indexOf(group);
        if (--i < 0){
            i = app.pageGroups.length - 1;
        }
        return app.pageGroups[i];
    }

    function globalContextModifier(context){
        var platform = App.Current.platform;
        var view = Environmentt.view;

        if (view.page().orientation() !== platform.orientation){
            var w = view.width(),
                h = view.height();
            var offset = 0|((Math.max(w, h) - Math.min(w, h)) / 2);
            var translate = Math.min(w, h) + offset;

            if (platform.orientation === "landscape"){
                context.translate(0, translate);
                context.rotate(-Math.PI / 2);
            }
            else{
                context.translate(translate, 0);
                context.rotate(Math.PI / 2);
            }

            platform.orientationOffset = offset;
        }
    }

    function resizeView(){
        var page = App.Current.activePage;
        if (!page || page === NullPage){
            return;
        }
        var rect = page.getContentContainer().getBoundaryRect();
        App.Current.platform.orientationMatches = page.orientation() === App.Current.platform.orientation;
        if (App.Current.platform.orientationMatches){
            Environment.view.resize({x: 0, y: 0, width: rect.width, height: rect.height});
        } else{
            Environment.view.resize({x: 0, y: 0, width: rect.height, height: rect.width});
        }
    }

    function changeOrientation(e){
        if (Environment.view && window){
            var $window = $(window);
            var portrait = $window.width() < $window.height();
            App.Current.platform.orientation = portrait ? "portrait" : "landscape";
            resizeView();
            updateMsViewportIfNeeded.call(App.Current.platform);
            Invalidate.request();
        }
    }

    function preventDefault(e){
        if (e.gesture){
            e.gesture.preventDefault();
        }
        e.preventDefault();
        return false;
    }

    function createAppEvent(e){
        preventDefault(e);
        var appEvent = e.gesture ? sketch.util.createEvent(e.gesture.srcEvent) : e;
        var platform = App.Current.platform;

        if (!platform.orientationMatches){
            var view = Environment.view;
            var x = domUtil.layerX(appEvent);
            var y = domUtil.layerY(appEvent);

            if (platform.orientation === "landscape"){
                domUtil.layerX(appEvent, view.height() - y + platform.orientationOffset);
                domUtil.layerY(appEvent, x);
            }
            else{
                domUtil.layerX(appEvent, y);
                domUtil.layerY(appEvent, view.width() - x + platform.orientationOffset);
            }
        }

        return appEvent;
    }

    function bindTouches(app){
        var options = {
            //default option touchAction:none makes content unscrollable in ie10
            stop_browser_behavior: {touchAction: 'auto'},
            drag_min_distance: 1
        };
        require(["hammer"], function(Hammer){
            Hammer(app.platform.htmlPanel, options)
                .on("tap", function(e){
                    Environment.controller.onmousedown(createAppEvent(e));
                    app.controller.onclick(createAppEvent(e));
                })
                .on("hold", preventDefault)
                .on("swipeleft", function(e){
                    preventDefault(e);
                    Environment.platform.switchPage(true);
                })
                .on("swiperight", function(e){
                    preventDefault(e);
                    Environment.platform.switchPage(false);
                });
        });
    }

    function addMsViewportIfNeeded(){
        var browser = $.browser;
        if (browser.msie && parseInt(browser.version) >= 10){
            var msViewportStyle = document.createElement("style");
            msViewportStyle.appendChild(document.createTextNode(""));
            document.getElementsByTagName("head")[0].appendChild(msViewportStyle);
            this.msViewportStyle = msViewportStyle;
        }
    }

    function updateMsViewportIfNeeded(){
        if (this.msViewportStyle){
            var view = Environment.view;
            this.msViewportStyle.textContent = "@-ms-viewport{width: " + view.width() + "px}";
        }
    }

    return klass(All, {
        _constructor: function(){
        },
        postLoad: function(app){
            this._app = app;

            Environment.view.registerGlobalContextModifier(globalContextModifier);
            app.pageChanged.bind(this, pageChanged);

            switchMode.call(this);
            this.setStartupPage();

            addMsViewportIfNeeded.call(this);
            bindTouches(app);
            $(window).resize(changeOrientation);
            setTimeout(changeOrientation, 0);
        },
        switchPage: function(prev){
            var group = this._app.getPageGroupById(this._app.activePage.groupId());
            var pageIds = group.pageIds();
            var i = pageIds.indexOf(this._app.activePage.id());

            var newPage;
            do{
                if (prev){
                    if (--i < 0){
                        group = getPreviousPageGroup(this._app, group);
                        pageIds = group.pageIds();
                        i = pageIds.length - 1;
                    }
                } else{
                    if (++i === pageIds.length){
                        group = getNextPageGroup(this._app, group);
                        pageIds = group.pageIds();
                        i = 0;
                    }
                }

                var newId = pageIds[i];
                newPage = this._app.getPageById(newId);
            } while (!newPage);

            this._app.setActivePage(newPage);
        },
        platformSpecificRunCode: function(){
        },
        richUI: function(){
            return false;
        },
        ensureCanvasSize: function(){
            var viewContainer = this.viewContainerElement();

            var view = this.view
                , width = ~~(view.width() )
                , height = ~~(view.height())
                , resized = false;

            if (this.canvas.width !== width){
                this.canvas.width = width;
                this.upperCanvas.width = width;
            }

            var wpx = width + 'px'
                , hpx = height + 'px';

            this.htmlPanel.style.top = 0;
            this.htmlPanel.style.left = 0;

            if (this.htmlPanel.style.width !== wpx){
                this.htmlPanel.style.width = wpx;
                viewContainer.style.width = wpx; //view needs to be resized for horizontal scrolling to work
                resized = true;
            }

            if (this.canvas.height !== height){
                this.upperCanvas.height = height;
                this.canvas.height = height;
            }
            if (this.htmlPanel.style.height !== hpx){
                this.htmlPanel.style.height = hpx;
                viewContainer.style.height = hpx; //view needs to be resized for horizontal scrolling to work
                resized = true;
            }

            if (resized){
                this.onresized.raise();
                Invalidate.request();
            }

            viewContainer.scrollLeft = 0;
            viewContainer.scrollTop = 0;

        }
    });
});
