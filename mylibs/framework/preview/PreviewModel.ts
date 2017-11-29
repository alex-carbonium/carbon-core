import Page from "framework/Page";
import NullPage from "framework/NullPage";
import EventHelper from "framework/EventHelper";
import DataNode from "framework/DataNode";
import Matrix from "math/matrix";
import Artboard from "framework/Artboard";
import Symbol from "framework/Symbol";
import { IApp, IEvent, IPage, PreviewDisplayMode, ISize, IPageProps, ChangeMode, IDisposable } from "carbon-core";
import { IPreviewModel } from "carbon-app";
import { IArtboard } from "carbon-model";
import { CompiledCodeProvider } from "../../code/CompiledCodeProvider";
import { Sandbox } from "../../code/Sandbox";
import { ElementProxy } from "../../code/ElementProxy";

export default class PreviewModel implements IPreviewModel, IDisposable {
    app: IApp;
    public navigateToPage: IEvent<any>;
    public onPageChanged: IEvent<IPage>;
    private _activePage: IPage<IPageProps> & { originalSize: ISize };
    private codeProvider = new CompiledCodeProvider();
    private sandbox = new Sandbox();

    public sourceArtboard: IArtboard;
    public modelFailed: boolean = false;

    constructor(app) {
        this.app = app;
        this.navigateToPage = EventHelper.createEvent(); // todo: move this out
        this.onPageChanged = EventHelper.createEvent();
    }

    get activePage() {
        return this._activePage;
    }

    set activePage(value: IPage<IPageProps> & { originalSize: ISize }) {
        if (this._activePage !== value) {
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

    _makePageFromArtboard(artboard, screenSize): Promise<IPage> {
        var page = new Page();
        var previewClone = artboard.mirrorClone();
        this.sourceArtboard = artboard;
        var oldRect = previewClone.boundaryRect();
        previewClone.setTransform(Matrix.Identity);
        previewClone.applyVisitor(e=>e.runtimeProps.ctxl = 1);

        page.add(previewClone);
        page.originalSize = oldRect;
        page.minScrollX(0);
        page.minScrollY(0);

        return this._runCodeOnPage(page);
    }

    _runCodeOnPage(page: IPage): Promise<IPage> {
        let promises = [];
        ElementProxy.clear();
        page.applyVisitor(e => {
            if (e instanceof Symbol) {
                let artboard: IArtboard = e.artboard;
                let code = artboard.code();
                if (code) {
                    promises.push(this.codeProvider.getCode(artboard).then((code) => {
                        if (code) {
                            this.sandbox.runOnElement(e, code);
                        }
                        // todo: think what to do if failed
                    }));
                }
            }
        });

        return Promise.all(promises).then(() => {
            let artboard: IArtboard = page.children[0] as any;
            if (artboard.code()) {
                return this.codeProvider.getCode(artboard).then((code) => {
                    if (code) {
                        try {
                            this.sandbox.runOnElement(artboard, code);
                            this.modelFailed = false;
                        } catch(e){
                            // todo: log to console console.error(e);
                            this.modelFailed = true;
                        }
                    } else {
                        this.modelFailed = true;
                    }
                    // todo: think what to do if failed

                    return page;
                })
            }

            return page as any;
        }) as any as Promise<IPage>;
    }

    getCurrentScreen(screenSize): Promise<IPage> {
        var activeStory = this.app.activeStory();
        if (!activeStory) {
            // TODO: return special page with instruction that you need to create at least on artboard
            return Promise.resolve(NullPage);
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

        if(!artboard) {
            artboard = this.app.activePage.getAllArtboards()[0];
        }

        if (!artboard) {
            return Promise.resolve(NullPage);
        }

        return this._makePageFromArtboard(artboard, screenSize);
    }

    getScreenById(artboardId, screenSize): Promise<IPage> {
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
            if (c.props.sourceRootId === artboard.id) {
                elementsMap[c.props.sourceElementId] = true;
            }
        });

        var res = [];

        if (artboard) {
            artboard.applyVisitor(e => {
                if (elementsMap[e.id]) {
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

    dispose() {
        if (this.codeProvider) {
            this.codeProvider.dispose();
            this.codeProvider = null;
        }
    }
}