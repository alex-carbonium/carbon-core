import Invalidate from "framework/Invalidate";
import Environment from "environment";

define([ "math/matrix", "framework/Deferred"], function (Matrix, Deferred) {
    var fwk = sketch.framework, platform = sketch.platform;
    var viewId = "#viewContainer";

    var elementCanvas;
    function getElementCanvas(){
        if (!elementCanvas){
            elementCanvas = document.createElement("canvas");
        }
        return elementCanvas;
    }

    return klass2("PlatformAll", null, (function () {
        var dialog = null;

        /**
         * Handles
         */
        var toggleFullscreenApi = function(){
            var that = this;
            if(!window) {
                return;
            }
            //in preview mode.
            var fApi = window.fullScreenApi;
            if (!fApi.supportsFullScreen) {
                return;
            }
            if(this.viewMode == "view") {
                //In view mode. Remove button and detect if in fullscreen
                $("#right_bottom_corner div.fullscreenButton").remove();

                if(fApi.isFullScreen()){ //if we clicked link which turns off preview move and we are in fullscreen, exit it
                    fApi.cancelFullScreen();
                }
                return;
            }


            var button = $("#right_bottom_corner").find(".fullscreenButton");
            if(button.length == 0)
                button = $("#right_bottom_corner").prepend('<div class="switch_group button fullscreenButton" ></div>').find(".fullscreenButton");

            document.addEventListener(fApi.fullScreenEventName, function(e) {
                button.toggleClass("checked");
                that.fullscreen = !that.fullscreen;
            }, true);

            button.bind("click", function(){
                if(!that.fullscreen){ //we are going to show fullscreen
                    var el = $("#container")[0];
                    fApi.requestFullScreen(el);
                } else {
                    fApi.cancelFullScreen();
                }
            });
        };
        var saveViewState = function(){
            this._viewState = {
                phoneVisible: App.Current.activePage.isPhoneVisible()
            };
        };
        var restoreViewState = function(){
            if (this._viewState){
                App.Current.viewModel.phoneVisible(this._viewState.phoneVisible);
            }
        };

        var registerUIActions = function(app){
            app.actionManager.registerAction("focusToolboxSearch", "Focus on toolbox search", "Focus", function(){
                var model = ko.dataFor($(".toolboxSearchDiv .search-input")[0]);
                if (model){
                    model.focus();
                }
            });
        };

        function findFirstSharedPage(app){
            return null;
            var sharedStatuses = app.viewModel.getSharedPageStatuses();
            for (var i = 0; i < app.pages.length; i++) {
                var page = app.pages[i];
                if (sharedStatuses.indexOf(page.status()) !== -1){
                    return page;
                }
            }
            return null;
        }

        return {
            fullscreen:false,
            viewMode: "view",
            _constructor:function () {
                this._lastPageState = {};
                this.onresized = fwk.EventHelper.createEvent();

                //scrollbars are never larger than 18x18, does it matter that this is always hardcoded?
                this._scrollbarSize = {width: 18, height: 18};
            },
            run:function (/*App*/app) {
                this.app = app;

                this.setupFullScreenApi();
                this.createCanvas();

                this.platformSpecificRunCode();

                $(window).resize(function(){
                    if (app.activePage){
                        Invalidate.request();
                    }
                });

                if(sketch.params.shareMode){
                    this.disableShortcut("save");
                }

            },
            dispose: function(){
                if (this.viewManagertoken){
                    fwk.pubSub.unsubscribe(this.viewManagertoken);
                }
            },


            setupConnection: function(app){
            },
            //this method depends on comments model being initialized.
            //therefore it cannot subscribe to app.loaded to avoid the implicit dependency on events order
            postLoad: function(app){
                registerUIActions(app);
                this.setStartupPage();
                if (sketch.params.shareMode){
                    app.viewModel.switchPreviewMode();
                }
            },
            setStartupPage: function() {
                var app = App.Current;
                var page;
                if (sketch.params.shareMode){
                    var pageId = app.viewModel.shareStartupPage.value();
                    if (pageId){
                        page = app.getPageById(pageId + "");
                    }
                }
                else if (sketch.params.startupPage){
                    page = sketch.util.firstOrDefault(app.pages, function (p) {
                        return sketch.params.startupPage === p.encodedName();
                    });
                }
                if (!page){
                    page = findFirstSharedPage(app);
                }
                if (page){
                    app.setActivePage(page);
                }
            },
            platformSpecificRunCode: function(){
            },

            setupFullScreenApi: function(){
                var fullScreenApi = {
                    supportsFullScreen: false,
                    isFullScreen: function(){
                        return false;
                    },
                    requestFullScreen: function(){
                    },
                    cancelFullScreen: function(){
                    },
                    fullScreenEventName: '',
                    prefix: ''
                },
                browserPrefixes = 'webkit moz o ms khtml'.split(' ');

                // check for native support
                if (typeof document.cancelFullScreen != 'undefined'){
                    fullScreenApi.supportsFullScreen = true;
                } else{
                    // check for fullscreen support by vendor prefix
                    for (var i = 0, il = browserPrefixes.length; i < il; i++){
                        fullScreenApi.prefix = browserPrefixes[i];

                        if (typeof document[fullScreenApi.prefix + 'CancelFullScreen' ] != 'undefined'){
                            fullScreenApi.supportsFullScreen = true;

                            break;
                        }
                    }
                }
                // update methods to do something useful
                if (fullScreenApi.supportsFullScreen){
                    fullScreenApi.fullScreenEventName = fullScreenApi.prefix + 'fullscreenchange';

                    fullScreenApi.isFullScreen = function(){
                        switch (this.prefix){
                            case '':
                                return document.fullScreen;
                            case 'webkit':
                                return document.webkitIsFullScreen;
                            default:
                                return document[this.prefix + 'FullScreen'];
                        }
                    }
                    fullScreenApi.requestFullScreen = function(el){
                        return (this.prefix === '') ? el.requestFullScreen() : el[this.prefix + 'RequestFullScreen']();
                    }
                    fullScreenApi.cancelFullScreen = function(){
                        return (this.prefix === '') ? document.cancelFullScreen() : document[this.prefix + 'CancelFullScreen']();
                    }
                }

                // export api
                window.fullScreenApi = fullScreenApi;
            },
            /* from app*/
            createCanvas: function(){

            },
            createImage: function(){
                return new Image();
            },
            viewContainerElement: function(){
                return $(viewId)[0];
            },
            viewportSize:function(){
                var viewContainer;
                if(Environment.view && Environment.view.context) {
                    viewContainer = Environment.view.context.canvas;
                } else {
                    viewContainer = document.getElementById('app_canvas');
                }

                return {
                    width:viewContainer.width / Environment.view.contextScale,
                    height:viewContainer.height / Environment.view.contextScale
                }
            },
            /* view manager*/
            initViewManager: function() {

            },
            setViewMode:function(value){
                this.viewMode = value;
                var toView = value === "view";

                if(!toView) {
                    saveViewState.call(this);
                }

                toggleFullscreenApi.call(this);

                if (toView){
                    switchToView.call(this);
                    restoreViewState.call(this);
                }
                else{
                    switchToPreview.call(this);
                }

            },
            switchViewMode: function(){
                App.Current.actionManager.invoke('cancel');
                if(this.viewMode == "view") {
                    this.viewMode = "preview";

                } else {
                    this.viewMode = "view";
                }

                this.setViewMode(this.viewMode);
            },
            toggleFullscreenApi: function(){
                toggleFullscreenApi.call(this);
            },
            switchToPreview: function(){
                switchToPreview.call(this);
            },
            switchToView: function(){
                switchToView.call(this);
            },
            showContextMenu:function(){

            },
            richUI:function(){
                return !!window;
            },
            registerClipboardShortcuts: function(app){
            },
            renderElement: function(e, scale, w, h){
                var actualScale = scale || 1;
                var width = w || e.width();
                var height = h || e.height();
                var canvas = getElementCanvas();
                canvas.width = ~~(width * actualScale);
                canvas.height = ~~(height * actualScale);

                var context = canvas.getContext("2d");
                context.save();
                context.scale(actualScale || 1, actualScale);
                e.drawSelf(context, width, height, {});
                context.restore();

                return canvas.toDataURL("image/png");
            }
        };
    })());
});
