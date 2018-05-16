import Page from "framework/Page";
import NullPage from "framework/NullPage";
import EventHelper from "framework/EventHelper";
import DataNode from "framework/DataNode";
import Matrix from "math/matrix";
import Artboard from "framework/Artboard";
import Symbol from "framework/Symbol";
import { IApp, IEvent, IPage, PreviewDisplayMode, ISize, IPageProps, ChangeMode, IDisposable, IEvent3, INavigationAnimationOptions, AnimationType, ICustomTransition } from "carbon-core";
import { IPreviewModel, IController, IView, IModuleResolver } from "carbon-app";
import { IArtboard } from "carbon-model";
import { Sandbox } from "../../code/Sandbox";
import { RuntimeContext } from "../../code/runtime/RuntimeContext";
import { ActionType } from "../Defs";
import { IAnimationOptions, DataBag } from "carbon-runtime";
import { NavigationController } from "../../code/runtime/NavigationController";
import { AutoDisposable } from "../../AutoDisposable";
import { ModelFactory } from "../../code/runtime/ModelFactory";
import Services from "Services";
import { RuntimeScreen } from "../../code/runtime/RuntimeScreen";
import { BrushFactory } from "../../code/runtime/BrushFactory";
import { CompiledCodeProvider } from "../../code/CompiledCodeProvider";
import { NameProvider } from "../../code/NameProvider";
import StateBoard from "../StateBoard";
import AnimationGroup from "../animation/AnimationGroup";
import AnimationController from "../animation/AnimationController";

export default class PreviewModel implements IPreviewModel, IDisposable, IModuleResolver {
    private _activePage: IPage<IPageProps> & { originalSize: ISize } = NullPage;
    private sandbox = new Sandbox();
    private disposables = new AutoDisposable();
    private runtimeContext: RuntimeContext;
    private navigationController: NavigationController;
    private modulesCode = new Map<string, string>();
    private modules = new Map<string, any>()

    public app: IApp;
    public onPageChanged: IEvent<IPage>;
    public sourceArtboard: IArtboard;
    public modelFailed: boolean = false;

    public refreshVersion = 0;

    public static current:PreviewModel;

    constructor(app, public view:IView, public controller:IController) {
        this.app = app;
        this.navigationController = new NavigationController(this);
        this.onPageChanged = EventHelper.createEvent();
        this.runtimeContext = new RuntimeContext();

        this.runtimeContext.register("navigationController", this.navigationController);
        this.runtimeContext.register("Model", new ModelFactory((a)=>{
            return this.runCodeOnArtboard(a);
        }));
        this.runtimeContext.register("Brush", BrushFactory);

        this.disposables.add(this.navigationController);
        PreviewModel.current = this;
    }

    _releaseCurrentPage() {
        if (this.activePage) {
            this.view.setActivePage(NullPage);
            this.recycleCurrentPage();
            this.recycleModules();
        }
    }

    _getStateTransition(artboardId) {
        var artboard = DataNode.getImmediateChildById(this.app.activePage, artboardId, true);
        if(artboard instanceof StateBoard) {
            let source = artboard.artboard;
            let stateId = artboard.stateId;

            return stateId;
        }

        return null;
    }

    navigateToArtboard(artboardId: string, options?: IAnimationOptions, data?: DataBag) {
        if (!artboardId) {
            return;
        }

        AnimationController.reset();
        let stateId = this._getStateTransition(artboardId);

        if(stateId) {
            this.activeArtboard.setProps({stateId:stateId});
            return;
        }

        this.getScreenById(artboardId).then((nextPage) => {
            return this._changeActivePage(nextPage, options);
        })
    }

    _animateTransition(newPage, animation: INavigationAnimationOptions&ICustomTransition) {
        // 1. take artboard from newPage, and add it to an oldPage
        // 2. set initial position
        // 3. run animation
        // 4. on end, return to the newPage and resolve promise
        let oldPage = this.activePage;
        let newArtboard = newPage.children[0];
        let oldArtboard = oldPage.children[0];
        oldPage.add(newArtboard);

        let oldPropsAfter;
        let newPropsAfter;
        let promise;
        if(animation.hasOwnProperty('transitionFunction')) {
            promise = (animation as ICustomTransition).transitionFunction(oldArtboard as any, newArtboard as any);
            if(!promise) {
                promise = Promise.resolve(null);
            }
        } else if ((animation as INavigationAnimationOptions).type === AnimationType.Dissolve) {
            oldPropsAfter = { opacity: 1 }
            newPropsAfter = { opacity: 1 };
            newArtboard.opacity = 0;
            promise = Promise.all([
                oldArtboard.animate(oldPropsAfter, animation as IAnimationOptions),
                newArtboard.animate(newPropsAfter, animation as IAnimationOptions)
            ])
        } else {
            let progress: () => void;

            if ((animation as INavigationAnimationOptions).type === AnimationType.SlideLeft) {
                oldPropsAfter = { x: -oldArtboard.width }
                progress = () => {
                    newArtboard.x = oldArtboard.x + newArtboard.width;
                }
            } else if ((animation as INavigationAnimationOptions).type === AnimationType.SlideRight) {
                oldPropsAfter = { x: newArtboard.width }
                progress = () => {
                    newArtboard.x = oldArtboard.x - newArtboard.width;
                }
            } else if ((animation as INavigationAnimationOptions).type === AnimationType.SlideDown) {
                oldPropsAfter = { y: newArtboard.height }
                progress = () => {
                    newArtboard.y = oldArtboard.y - oldArtboard.height;
                }
            } else if ((animation as INavigationAnimationOptions).type === AnimationType.SlideUp) {
                oldPropsAfter = { y: -oldArtboard.height }
                progress = () => {
                    newArtboard.y = oldArtboard.y + oldArtboard.height;
                }
            }
            progress();
            promise = Promise.all([
                oldArtboard.animate(oldPropsAfter, animation as IAnimationOptions, progress)
            ])
        }

        return promise.then(() => {
            newPage.add(newArtboard);
            return newPage;
        })
    }

    _changeActivePage(page, animation?): Promise<any> {
        let promise;

        if (this.activePage && animation && animation.hasOwnProperty('type')) {
            promise = this._animateTransition(page, animation);
        } else {
            promise = Promise.resolve(page);
        }

        return promise.then(() => {
            this._releaseCurrentPage();
            this.activePage = page;
            page.invalidate();
            return page;
        })
    }

    get activePage() {
        return this._activePage;
    }

    set activePage(value: IPage<IPageProps> & { originalSize: ISize }) {
        if (this._activePage !== value) {
            this._activePage = value;
            this.view.setActivePage(value);
            this.onPageChanged.raise(value);
        }
    }

    recycleModules() {
        this.modules.clear();
    }

    recycleCurrentPage() {
        this.activePage.dispose();
        this._activePage = NullPage;
    }

    requireModuleInstance(name) {
        let module = this.modules.get(name);
        if (module) {
            return module;
        }

        let code = this.modulesCode.get(name);
        if (!code) {
            code = Services.compiler.getStaticCode(name);
            if (!code) {
                throw "unknown module name: " + name;
            }
        }
        module = {};
        this.sandbox.runOnModule(this.runtimeContext, this, module, code);
        this.modules.set(name, module);

        return module;
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

    _makePageFromArtboard(artboard): Promise<IPage> {
        if (!artboard) {
            return Promise.resolve(NullPage);
        }

        var page = new Page();
        var previewClone = new Symbol();
        previewClone.setProps({source:{pageId:artboard.parent.id, artboardId:artboard.id}});

        previewClone.id = artboard.id;
        previewClone.applyVisitor(p => {
            p.props.__temp = true;
            p.runtimeProps.ctxl = 1
        });
        previewClone.runtimeProps.sourceArtboard = artboard;
        var oldRect = previewClone.boundaryRect();
        previewClone.setTransform(Matrix.Identity);

        page.add(previewClone);
        page.originalSize = oldRect;
        page.minScrollX(0);
        page.minScrollY(0);
        let parentCode = artboard.parent.code();
        if (parentCode) {
            page.runtimeProps.refs = {
                ["./" + NameProvider.escapeName(artboard.parent.name) + ".ts"]: parentCode
            }
        }

        return this._runCodeOnPage(page);
    }

    _runCodeOnPage(page: IPage): Promise<IPage> {
        let promises = [];

        return this.runCodeOnArtboard(page.children[0] as any).then(() => page);
    }

    runCodeOnArtboard(artboard: IArtboard): Promise<void> {
        let promises = [];

        artboard.applyVisitor(e => {
            if (e instanceof Symbol && artboard as any !== e) {
                let artboard: IArtboard = e.artboard;
                let code = artboard.code();
                if (code) {
                    promises.push(this.runCodeOnArtboard(e as any));
                }
            }
        });

        let parent = (artboard.parent as any);
        if (parent.runtimeProps.refs) {
            for (var ref of Object.keys(parent.runtimeProps.refs)) {
                promises.push(Services.compiler.codeProvider.getModuleCode(ref, parent.runtimeProps.refs[ref]).
                    then(code => {
                        this.modulesCode.set(ref.substr(0, ref.lastIndexOf('.')), code);
                    }).catch(reason=>{
                        console.error(reason);
                    }));
            }
        }

        return Promise.all(promises).then(() => {
            if (artboard.code()) {
                return Services.compiler.codeProvider.getArtboardCode(artboard).then((code) => {
                    if (code) {
                        try {
                            this.sandbox.runOnElement(this.runtimeContext, this, artboard, code);
                            // artboard.invalidate();
                            this.modelFailed = false;
                        } catch (e) {
                            // todo: log to console console.error(e);
                            this.modelFailed = true;
                        }
                    } else {
                        this.modelFailed = true;
                    }
                    // todo: think what to do if failed
                }).catch(reason=>{
                    console.error(reason);
                })
            }
        }).catch(reason=>{
            console.error(reason);
        });
    }

    getCurrentScreen(): Promise<IPage> {
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
            if (artboard instanceof StateBoard) {
                artboard = artboard.artboard;
            }
        }

        if (!artboard) {
            artboard = this.app.activePage.getAllArtboards(true)[0];
        }

        if (!artboard) {
            return Promise.resolve(NullPage);
        }

        return this._makePageFromArtboard(artboard);
    }

    getScreenById(artboardId): Promise<IPage> {
        var artboard = DataNode.getImmediateChildById(this.app.activePage, artboardId, true);

        return this._makePageFromArtboard(artboard);
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

    initialize() {
        return this.getCurrentScreen().then(page => {
            return this._changeActivePage(page);
        })
    }

    restart() {
        let id;
        if (this.activePage) {
            id = this.activePage.children[0].id;
        }

        AnimationController.reset();

        if (id) {
            return this.getScreenById(id).then(page => {
                return this._changeActivePage(page);
            })
        }

        return Promise.resolve(null);
    }

    invokeAction(action) {
        if (action.props.type === ActionType.GoToPage) {
            this.navigationController.navigateToId(action.props.targetArtboardId, action.props.animation);
            return;
        }

        throw "Unknown action";
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
        this.disposables.dispose();
        PreviewModel.current = null;
    }
}