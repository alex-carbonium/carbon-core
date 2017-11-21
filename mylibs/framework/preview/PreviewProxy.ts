import Page from "framework/Page";
import NullPage from "framework/NullPage";
import EventHelper from "framework/EventHelper";
import DataNode from "framework/DataNode";
import Matrix from "math/matrix";
import { IApp, IEvent, IPage, PreviewDisplayMode, ISize, IPageProps, ChangeMode } from "carbon-core";
import { IPreviewModelProxy } from "carbon-app";
import { IArtboard } from "carbon-model";

export default class PreviewProxy implements IPreviewModelProxy {
    app: IApp;
    public navigateToPage: IEvent<any>;
    public onPageChanged:IEvent<IPage>;
    _activePage: IPage<IPageProps> & { originalSize: ISize };

    constructor(app) {
        this.app = app;
        this.navigateToPage = EventHelper.createEvent();
        this.onPageChanged = EventHelper.createEvent();
    }

    get activePage() {
        return this._activePage;
    }

    set activePage(value:IPage<IPageProps> & { originalSize: ISize }) {
        if(this._activePage !== value) {
            this._activePage = value;
            this.onPageChanged.raise(value);
        }
    }

    get activeArtboard(): IArtboard {
        if (!this.activePage) {
            return null;
        }

        if (!this.activePage.children.length) {
            return null;
        }

        return this.activePage.children[0] as IArtboard;
    }

    _makePageFromArtboard(artboard, screenSize) {
        var page = new Page();
        var previewClone = artboard.mirrorClone();
        var oldRect = previewClone.boundaryRect();
        previewClone.setTransform(Matrix.Identity);


        page.add(previewClone);
        page.originalSize = oldRect;
        page.minScrollX(0);
        page.minScrollY(0);
        return page;
    }

    getCurrentScreen(screenSize) {
        var activeStory = this.app.activeStory();
        if (!activeStory) {
            // TODO: return special page with instruction that you need to create at least on artboard
            return NullPage;
        }
        if (activeStory.props.homeScreen) {
            var page = DataNode.getImmediateChildById(this.app, activeStory.props.homeScreen[0]);
            var artboard = DataNode.getImmediateChildById(page, activeStory.props.homeScreen[1], true);
            if (!artboard) {
                artboard = page.getAllArtboards()[0];
            }
        } else {
            artboard = this.app.activePage.getActiveArtboard();
        }

        if (!artboard) {
            return NullPage;
        }

        return this._makePageFromArtboard(artboard, screenSize);
    }

    getScreenById(artboardId, screenSize) {
        var artboard = DataNode.getImmediateChildById(this.app.activePage, artboardId, true);

        return this._makePageFromArtboard(artboard, screenSize);
    }

    allElementsWithActions() {
        let page = this.activePage;
        var artboard = page.children[0];
        var elementsMap = {};
        var activeStory = this.app.activeStory();
        if (!activeStory) {
            return [];
        }

        activeStory.children.forEach(c => {
            if (c.props.sourceRootId === artboard.id()) {
                elementsMap[c.props.sourceElementId] = true;
            }
        });

        var res = [];

        if (artboard) {
            artboard.applyVisitor(e => {
                if (elementsMap[e.id()]) {
                    res.push(e);
                }
            });
        }

        return res;
    }

    resizeActiveScreen(screenSize: ISize, scale: number, previewDisplayMode: PreviewDisplayMode) {
        var page = this.activePage;
        if ((page as any) === NullPage) {
            return;
        }
        var artboard = page.children[0];
        if (!artboard) {
            return;
        }

        let oldRect = artboard.boundaryRect();
        let width = this.activePage.originalSize.width;
        let height = this.activePage.originalSize.height;
        if (previewDisplayMode === PreviewDisplayMode.Responsive) {
            width = screenSize.width;
            height = Math.max(screenSize.height, height);
        }

        artboard.setProps({ width: width, height: height }, ChangeMode.Self);
        artboard.performArrange({ oldRect }, ChangeMode.Self);
        artboard.props.m = Matrix.Identity;

        page.maxScrollX(Math.max(0, (artboard.width * scale - screenSize.width)));
        page.maxScrollY(Math.max(0, (artboard.height * scale - screenSize.height)));
    }
}