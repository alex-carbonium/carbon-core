import ViewBase from "./ViewBase"
import Invalidate from "framework/Invalidate"
import Page from "framework/Page";
import { Types, MirrorViewMode } from "framework/Defs";
import PropertyMetadata from "framework/PropertyMetadata";
import { IMirroringProxyPage } from "carbon-app";
import { ChangeMode } from "carbon-core";

function fitRectToRect(outer, inner) {
    let scale = outer.width / inner.width;

    let newHeight = inner.height * scale;
    if (newHeight > outer.height) {
        scale = outer.height / inner.height;
    }

    return Math.min(1, scale);
}

export class ArtboardProxyPage extends Page implements IMirroringProxyPage {
    constructor(app, view, controller) {
        super();
        this.view = view;
        this.fitMode = MirrorViewMode.Fit;
        this._pageChnagedToken = null;
        this._onArtboardChangedToken = null;

        this._pageChnagedToken = app.pageChanged.bind(this, () => {
            this._onArtboardChanged(app.activePage.getActiveArtboard());
        });

        this._onArtboardChangedToken = controller.onArtboardChanged.bind(this, () => {
            this._onArtboardChanged(app.activePage.getActiveArtboard());
        })

        view.scaleChanged.bind(() => {
            this.updateScrollRanges();
        })

        this._version = null;
        this._sX = null;
        this._sY = null;
        this._ss = null;
        this.minScrollX(0);
        this.minScrollY(0);
    }

    resetVersion(): void {
        this._version = null;
    }

    _onArtboardChanged(artboard) {
        this._artboard = artboard;
        if (artboard) {
            this.children = [artboard];
            artboard.resetTransform(ChangeMode.Self);
            this.setProps({ br: artboard.props.br });

            this.updateScrollRanges();
        }
        this._version = null;
        this.view.setActivePage(this);

        if (this.view.fitMode === 1) {
            this.fitToViewport();
        } else {
            this.view.scale(1);
        }
    }

    updateScrollRanges() {
        let artboard = this.children[0];
        if (!artboard) {
            return;
        }
        let screenSize = this.view.viewportSize();
        let scale = this.view.scale();
        this.maxScrollX(Math.max(0, (artboard.width * scale - screenSize.width)));
        this.maxScrollY(Math.max(0, (artboard.height * scale - screenSize.height)));
    }

    fitToViewport() {
        let artboard = this.view.page.children[0];
        if (!artboard) {
            return;
        }
        this.view.page.scrollX = (0);
        this.view.page.scrollY = (0);
        var rect = clone(artboard.boundaryRect());
        var scale = fitRectToRect(this.view.viewportSize(), rect);
        this.view.scale(scale);
    }

    isInvalidateRequired() {
        let artboard = this.children[0];
        if (!artboard) {
            return false;
        }

        return this.invalidateRequired = (this._version !== artboard.version
            || this.scrollX !== this._sX
            || this.scrollY !== this._sY
            || this.pageScale() !== this._ss);
    }

    draw() {
        super.draw.apply(this, arguments);
        let artboard = this.children[0];
        if (artboard) {
            this._version = artboard.version;
        }
        this._sX = this.scrollX;
        this._sY = this.scrollY;
        this._ss = this.pageScale();
    }

    dispose() {
        if (this._pageChnagedToken) {
            this._pageChnagedToken.dispose();
            this._pageChnagedToken = null;
        }

        if (this._onArtboardChangedToken) {
            this._onArtboardChangedToken.dispose();
            this._onArtboardChangedToken = null;
        }
    }
}
ArtboardProxyPage.prototype.t = Types.ArtboardProxyPage;

PropertyMetadata.registerForType(ArtboardProxyPage, {});

export class MirroringView extends ViewBase {
    constructor(app) {
        super(app);
        this._invalidateRequestedToken = Invalidate.requested.bind(this, this.invalidate);
    }

    setup(deps) {
        super.setup(deps);
    }

    invalidate() {
        this.requestRedraw();
    }

    detach() {
        super.detach();
        this._page.dispose();

        if (this._invalidateRequestedToken) {
            this._invalidateRequestedToken.dispose();
            this._invalidateRequestedToken = null;
        }
    }
}