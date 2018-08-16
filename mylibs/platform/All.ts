import Invalidate from "../framework/Invalidate";
import DataNode from "../framework/DataNode";
import Matrix from "../math/matrix";
import EventHelper from "../framework/EventHelper";

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
    [key:string]:any;

    constructor(richUI = false) {
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

    richUI() {
        return this._richUI !== undefined ? this._richUI : !!window;
    }

}