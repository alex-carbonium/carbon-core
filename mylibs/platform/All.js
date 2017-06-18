import Invalidate from "framework/Invalidate";
import Environment from "environment";
import DataNode from "framework/DataNode";
import Matrix from "math/matrix";
import EventHelper from "framework/EventHelper";

var viewId = "#viewContainer";

var elementCanvas;
function getElementCanvas() {
    if (!elementCanvas) {
        elementCanvas = document.createElement("canvas");
    }
    return elementCanvas;
}

var dialog = null;

/**
 * Handles
 */

var saveViewState = function () {
    this._viewState = {
        phoneVisible: App.Current.activePage.isPhoneVisible()
    };
};
var restoreViewState = function () {
    if (this._viewState) {
        App.Current.viewModel.phoneVisible(this._viewState.phoneVisible);
    }
};

var registerUIActions = function (app) {
    app.actionManager.registerAction("focusToolboxSearch", "Focus on toolbox search", "Focus", function () {
        var model = ko.dataFor($(".toolboxSearchDiv .search-input")[0]);
        if (model) {
            model.focus();
        }
    });
};

function findFirstSharedPage(app) {
    return null;
    //var a =1;
    // var sharedStatuses = app.viewModel.getSharedPageStatuses();
    // for (var i = 0; i < app.pages.length; i++) {
    //     var page = app.pages[i];
    //     if (sharedStatuses.indexOf(page.status()) !== -1) {
    //         return page;
    //     }
    // }
    // return null;
}

export default class PlatformAll {


    constructor(richUI) {
        this._lastPageState = {};
        this.onresized = EventHelper.createEvent();

        //scrollbars are never larger than 18x18, does it matter that this is always hardcoded?
        this._scrollbarSize = { width: 18, height: 18 };
        this._richUI = richUI;

        this.fullscreen = false;
        this.viewMode = "view";
    }

    run(/*App*/app) {
        this.app = app;

        this.setupFullScreenApi();
        this.createCanvas();

        this.platformSpecificRunCode();

        $(window).resize(function () {
            if (app.activePage) {
                Invalidate.request();
            }
        });
    }

    dispose() {
    }

    //this method depends on comments model being initialized.
    //therefore it cannot subscribe to app.loaded to avoid the implicit dependency on events order
    postLoad(app) {
        registerUIActions(app);
        this.setStartupPage();
    }

    setStartupPage() {
        var app = App.Current;
        var page;
        if (!page) {
            page = findFirstSharedPage(app);
        }
        if (page) {
            app.setActivePage(page);
        }
    }

    platformSpecificRunCode() {
    }

    setupFullScreenApi() {
        var fullScreenApi = {
            supportsFullScreen: false,
            isFullScreen() {
                return false;
            },
            requestFullScreen() {
            },
            cancelFullScreen() {
            },
            fullScreenEventName: '',
            prefix: ''
        },
            browserPrefixes = 'webkit moz o ms khtml'.split(' ');

        // check for native support
        if (typeof document.cancelFullScreen != 'undefined') {
            fullScreenApi.supportsFullScreen = true;
        } else {
            // check for fullscreen support by vendor prefix
            for (var i = 0, il = browserPrefixes.length; i < il; i++) {
                fullScreenApi.prefix = browserPrefixes[i];

                if (typeof document[fullScreenApi.prefix + 'CancelFullScreen'] != 'undefined') {
                    fullScreenApi.supportsFullScreen = true;

                    break;
                }
            }
        }
        // update methods to do something useful
        if (fullScreenApi.supportsFullScreen) {
            fullScreenApi.fullScreenEventName = fullScreenApi.prefix + 'fullscreenchange';

            fullScreenApi.isFullScreen = function () {
                switch (this.prefix) {
                    case '':
                        return document.fullScreen;
                    case 'webkit':
                        return document.webkitIsFullScreen;
                    default:
                        return document[this.prefix + 'FullScreen'];
                }
            }
            fullScreenApi.requestFullScreen = function (el) {
                return (this.prefix === '') ? el.requestFullScreen() : el[this.prefix + 'RequestFullScreen']();
            }
            fullScreenApi.cancelFullScreen = function () {
                return (this.prefix === '') ? document.cancelFullScreen() : document[this.prefix + 'CancelFullScreen']();
            }
        }

        // export api
        window.fullScreenApi = fullScreenApi;
    }

    /* from app*/
    createCanvas() {

    }

    createImage() {
        return new Image();
    }

    viewContainerElement() {
        return $(viewId)[0];
    }

    viewportSize() {
        var viewContainer;
        if (Environment.view && Environment.view.context) {
            viewContainer = Environment.view.context.canvas;
        } else {
            viewContainer = document.getElementById('app_canvas');
        }

        return {
            width: viewContainer.width / Environment.view.contextScale,
            height: viewContainer.height / Environment.view.contextScale
        }
    }

    /* view manager*/
    setViewMode(value) {
        this.viewMode = value;
        var toView = value === "view";

        if (!toView) {
            saveViewState.call(this);
        }


        if (toView) {
            switchToView.call(this);
            restoreViewState.call(this);
        }
        else {
            switchToPreview.call(this);
        }
    }

    switchViewMode() {
        App.Current.actionManager.invoke('cancel');
        if (this.viewMode == "view") {
            this.viewMode = "preview";

        } else {
            this.viewMode = "view";
        }

        this.setViewMode(this.viewMode);
    }

    switchToPreview() {
        switchToPreview.call(this);
    }

    switchToView() {
        switchToView.call(this);
    }

    showContextMenu() {

    }

    richUI() {
        return this._richUI !== undefined ? this._richUI : !!window;
    }

    registerClipboardShortcuts(app) {
    }
}