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

export default class PlatformAll {


    constructor(richUI) {
        this._lastPageState = {};
        this.onresized = EventHelper.createEvent();

        //scrollbars are never larger than 18x18, does it matter that this is always hardcoded?
        this._scrollbarSize = { width: 18, height: 18 };
        this._richUI = richUI;

        this.viewMode = "view";
    }

    run(/*App*/app) {
        this.app = app;

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

    platformSpecificRunCode() {
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