declare module "carbon-app" {
    import { IDataNode, IUIElement, IDataNodeProps, IUIElementProps, IArtboard, IContainer, IComposite, IIsolatable, IMouseEventHandler, IContainerProps, PropDescriptor, StoryType, IElementWithCode } from "carbon-model";
    import { IEvent, IEventData, IEvent2, IMouseEventData, KeyboardState, IEvent3, IConstructor, ViewState, IJsonNode, IPrimitive, ArtboardType, FontStyle, FontWeight, ChangeMode, Primitive, IPointerEventData } from "carbon-basics";
    import { IRect, ICoordinate, ISize, Origin } from "carbon-geometry";
    import { IContext, IContextPool, RenderEnvironment, RenderFlags } from "carbon-rendering";
    import { DataBag, IAnimationOptions } from "carbon-runtime";
    import { Brush, IDisposable } from "carbon-runtime";

    export interface IPlatform{
        attachEvents(htmlElement: HTMLElement, app:IApp, view:IView, controller:IController);
        detachEvents();
    }

    export interface IProxySource {
        proxyDefinition():ProxyDefinition;
    }

    export interface IRuntimeMixin extends IDisposable {
        set(target: any, name: PropertyKey, value: any):boolean;
        get(target: any, name: PropertyKey):any|undefined;
        has(target:any, name:PropertyKey):boolean;
    }

    export type ProxyDefinition = { props: string[]; rprops: string[]; methods: string[]; mixins:string[]}

    export type FontMetadata = {
        name: string;
        path: string;
        fonts: {
            style: FontStyle;
            weight: FontWeight;
            filename: string;
        }[];
        subsets?: string[];
    }

    export interface AppSettings {
        name: string;
        avatar?: string;
    }

    export interface IAppProps extends IDataNodeProps, AppSettings {
        customGuides: any;
        fontMetadata: FontMetadata[];
    }

    export interface IStory {
        name: string,
        description?: string,
        type: StoryType,
        pageName: string,
        pageId: string
    }

    export class SystemExtensions {
        initExtensions(app:IApp, view:IView, controller:IController);
        detachExtensions();
    }

    export interface IApp extends IDataNode<IAppProps> {
        isLoaded: boolean;
        props:IAppProps;

        changed: IEvent<Primitive[]>;

        activePage: IPage;
        pageChanging: IEvent2<IPage, IPage>;
        pageChanged: IEvent2<IPage, IPage>;
        pageAdded: IEvent<IPage>;
        pageRemoved: IEvent<IPage>;

        pages: IPage[];
        addPage(page: IPage);
        addNewPage(): void;
        removePage(page: IPage);
        setActivePage(page: IPage);
        setActivePageById(id: string);
        pagesWithSymbols(): IPage[];
        getAllResourceArtboards(type: ArtboardType): IArtboard[];
        initializeWithResource(resourceId: string);

        addStory(story: IStory);
        removeStoryById(id:string);

        activeStory: any;
        stories: any[];
        activeStoryChanged: IEvent<any>;
        storyInserted: IEvent<any>;
        storyRemoved: IEvent<any>;
        onsplash: IEvent<any>;
        resourceAdded: IEvent2<ArtboardType, IArtboard>;
        resourceChanged: IEvent2<ArtboardType, IArtboard>;
        resourceDeleted: IEvent3<ArtboardType, IArtboard, IPage>;
        resourcePageChanged: IEvent<IPage>;
        recentColorsChanged: IEvent<any[]>;

        setActiveStoryById(id);
        removeStory(story);

        isPrototypeMode():boolean;

        onBuildMenu: any;
        actionManager: IActionManager;
        dataManager: IDataManager;
        fontManager: IFontManager;
        styleManager: IStyleManager;

        modelSyncProxy: any;

        init(): void;
        run(): Promise<void>;

        onLoad(callback: () => void, sync?:boolean): void;
        onUnload(callback: () => void): IDisposable;
        /**
         * Notifies that the app will perform a heavy update, for example, an import of the page, or a restore of the specific version.
         * The typical reaction should be to unsubscribe from frequent events (like resourceAdded, etc).
         */
        updating: IEvent<void>;
        /**
         * Notifies that the app has been heavily updated. The required data needs to be fully re-read from the app.
         */
        updated: IEvent<void>;
        beginUpdate(): void;
        endUpdate(): void;

        unload(): void;

        serverless(value?: boolean): boolean;
        isDirty(): boolean;

        companyId(value?: string): string;
        name(value?: string): string;
        /**
         * An event is raised when the name is changed to avoid listening to all changes
         * just to update the UI.
         */
        settingsChanged: IEvent<AppSettings>;

        showFrames(value?: boolean): boolean;

        addNewPage(option?: any): void;

        relayout(): void;

        getFontMetadata(family: string): FontMetadata;
        saveFontMetadata(metadata: FontMetadata): void;
        loadFont(family: string, style: number, weight: number): Promise<void>;

        updateStyle(styleType, styleId, style);

        setMode(mode);
        modeChanged: IEvent<any>;

        getAllArtboards(): IArtboard[];
        getAllFrames(): IArtboard[];
        getAllTemplateResourceArtboards(): IArtboard[];

        defaultFill(fill?: Brush, mode?: any): Brush;
        defaultStroke(stroke?: Brush, mode?: any): Brush;
        useRecentColor(color: Brush);
        recentColors(): string[];
        clipArtboards(value?: boolean): boolean;
        getCurrentUserSetting<T>(name: string): T;
        getUserSetting<T>(userId: string, name: string): T;
        setUserSetting(name: string, value: null | string | number | boolean | object): void;

        assignNewName(element: IUIElement);

        importPage(json: IJsonNode): IPage;
        importExternalPage(data:any) : IPage;

        isElectron(): boolean;
        mirroringCode(code?: string) : string;
    }

    type CompilationResult = {text:string, exports:{[name:string]:string}};
    export interface ICompilerService {
        compile(fileName:string, text?:string):Promise<CompilationResult>;
        addLib(fileName:string, text:string);
        getStaticCode(fileName:string):string;
        clear();
        codeProvider:any;
    }

    export interface ILayer<TProps extends IContainerProps = IContainerProps> extends IContainer<TProps> {
        type: LayerType;
        isActive: boolean;

        activate();
        deactivate();

        dropElement(element: IUIElement, mode?: ChangeMode);

        getElementsInRect(rect: IRect) : IUIElement[];

        canChangeNodeTree(): boolean;
    }

    export interface IIsolationLayer extends ILayer {
        isActivatedFor(owner: IIsolatable): boolean;
        isolateGroup(owner: IIsolatable, clippingParent?: IUIElement, e?: IMouseEventData) :void;
        getOwner():IIsolatable;
    }

    export interface IPageProps extends IContainerProps {
        galleryId?: string;
    }

    export interface IPage<TProps extends IPageProps = IPageProps> extends ILayer<IPageProps> {
        getAllArtboards(excludeStateboards?): IArtboard[];
        getActiveArtboard(): IArtboard;
        getArtboardAtPoint(point: ICoordinate, view:IView): IArtboard;
        setActiveArtboard(artboard: IArtboard, doNotTrack?: boolean): void;
        setActiveArtboardById(id: string): void;

        saveWorkspaceState(): any;
        restoreWorkspaceState(data: any): void;

        scrollX: number;
        scrollY: number;

        maxScrollX(value?:number):number;
        maxScrollY(value?:number):number;

        deactivating(nextPage: IPage): boolean;
        deactivated(): void;
        activating(prevPage: IPage): void;
        activated(): void;

        insertArtboards(artboards: IArtboard[]);

        readonly nameProvider: INameProvider;
    }

    export const Page: IConstructor<IPage>;

    export interface INameProvider {
        assignNewName(element: IUIElement, separator?: string);
        createNewName(elementName: string, separator?: string);
    }

    export type SymbolGroup = { id: string, name: string };

    export interface IArtboardPageProps extends IPageProps {
        symbolGroups?: SymbolGroup[];
    }
    export interface IArtboardPage extends IPage<IArtboardPageProps> {
        props: IArtboardPageProps;
    }

    export interface ILayerDrawHandlerObject {
        onLayerDraw(layer: ILayer, context: IContext, environment: RenderEnvironment):void;
    }

    export type WorkspaceTool =
        "pointerTool" |
        "sectionTool" |
        "textTool" |
        "pathTool" |
        "rectangleTool" |
        "starTool" |
        "triangleTool" |
        "polygonTool" |
        "artboardTool" |
        "circleTool" |
        "lineTool" |
        "protoTool" |
        "pencilTool" |
        "handTool" |
        "zoomTool" |
        "pointerDirectTool" |
        "imageTool" |
        "artboardViewerTool";

    export interface IView {
        //TODO encapsulate
        _highlightTarget: any;

        snapController:any;
        viewContainerElement: HTMLElement;
        page: IPage;
        contextScale: number;

        scaleChanged: IEvent<number>;
        isolationLayer: IIsolationLayer;

        activeLayer: ILayer;
        activeLayerChanged: IEvent<ILayer>;

        viewState: ViewState;
        viewStateChanged: IEvent<ViewState>;
        isAtViewState(state: ViewState): boolean;
        changeViewState(viewState: ViewState, silent?: boolean);

        setActivePage(page: IPage);

        scale(value?: number): number;
        zoom(value? :number, norefresh?: boolean):void;
        zoomToFit(): void;
        scrollX: number;
        scrollY: number;

        viewportSize(): ISize;
        viewportRect(): IRect;
        logicalCoordinateToScreen(point: ICoordinate) : ICoordinate;
        fitToViewportIfNeeded(element: IUIElement, origin?: Origin, mode?: ChangeMode);

        ensureScale(elements: IUIElement[]);
        ensureCentered(elements: IUIElement[]);
        ensureVisibleRect(rect: IRect);
        scrollToCenter(): void;

        getLayer(layerType: LayerType) : ILayer;

        setActivePage(page: IPage);

        hitElement(eventData, includeInteractionLayer?: boolean): IUIElement;
        hitElementDirect(e?, cb?, includeInteractionLayer?: boolean);

        updateViewportSize(size:ISize);

        draw();
        invalidate();

        showPixels(value?: boolean): boolean;
        showPixelGrid(value?: boolean): boolean;

        registerForLayerDraw(layerType:number, element:ILayerDrawHandlerObject, index?);
        unregisterForLayerDraw(layerType:number, element:ILayerDrawHandlerObject);

        dispose();
    }

    export const enum InteractionType {
        Dragging,
        Resizing,
        Rotation,
        RadiusChange
    }

    export interface IController {
        readonly id?:string;
        onmousedown(eventData: IMouseEventData);
        onmousemove(eventData: IMouseEventData);
        onmouseup(eventData: IMouseEventData);

        startDrawingEvent: IEvent<IEventData>;

        interactionStarted: IEvent3<InteractionType, IMouseEventData, IComposite>;
        interactionProgress: IEvent3<InteractionType, IMouseEventData, IComposite>;
        interactionStopped: IEvent3<InteractionType, IMouseEventData, IComposite>;
        raiseInteractionStarted(type: InteractionType, event: IMouseEventData);
        raiseInteractionProgress(type: InteractionType, event: IMouseEventData);
        raiseInteractionStopped(type: InteractionType, event: IMouseEventData);

        onArtboardChanged: IEvent2<IArtboard, IArtboard>;

        clickEvent: IEvent<IMouseEventData>;
        dblclickEvent: IEvent<IMouseEventData>;
        mousedownEvent: IEvent<IMouseEventData>;
        mouseupEvent: IEvent<IMouseEventData>;
        mousemoveEvent: IEvent<IMouseEventData>;

        panStartEvent: IEvent<IPointerEventData>;
        panMoveEvent: IEvent<IPointerEventData>;
        panEndEvent: IEvent<IPointerEventData>;
        pinchMoveEvent: IEvent<IPointerEventData>;
        pinchStartEvent: IEvent<IPointerEventData>;
        pinchEndEvent: IEvent<IPointerEventData>;
        doubletapEvent: IEvent<IPointerEventData>;
        tapEvent: IEvent<IPointerEventData>;



        onElementDblClicked: IEvent2<IMouseEventData, IUIElement>;

        inlineEditModeChanged: IEvent2<boolean, any>;

        interactionActive: boolean;

        actionManager: IActionManager;

        createEventData(e): IMouseEventData;

        updateCursor(eventData: IMouseEventData): void;
        defaultCursor(): string;
        captureMouse(element: IMouseEventHandler): void;
        releaseMouse(element: IMouseEventHandler): void;

        beginDragElements(e: MouseEvent, elements: IUIElement[], dropPromise: Promise<void>);
        isDragging(): boolean;

        choosePasteLocation(elements: IUIElement[], allowMoveIn?: boolean): {parent: IContainer, x: number, y: number}
        insertAndSelect(element: IUIElement[], parent: IContainer);
        getCurrentDropTarget(): IContainer;

        currentTool: WorkspaceTool;
        currentToolChanged: IEvent<WorkspaceTool>;
        resetCurrentTool();
    }

    export type WorkspaceSettings = {
        general: {
            pageFill: string;
            boundaryDash: number[];
            boundaryStroke: string;
        }
    }

    export interface IWorkspace {
        fatalErrorOccurred: IEvent<void>;

        shortcutManager: IShortcutManager;
        settings: WorkspaceSettings;
        keyboard: IKeyboard;
    }
    export const Workspace: IWorkspace;

    export interface IPlatformSpecificHandler extends IDisposable {
        attachEvents(container:HTMLElement, app:IApp, view:IView, controller:IController);
        detachEvents();
    }

    export function createPlatformHandler():IPlatformSpecificHandler;

    export interface ICommand {
        flushRedoStack();
        execute(redo?: boolean);
        rollback();
    }

    export interface IAction {
        id: string;
        name: string;
        icon?: string;
        callback: (selection: ISelection, arg?: any) => any; //TODO: replace with void when action do not return commands
        condition?: (selection: ISelection) => boolean;
    }

    export interface IAnimationController {
        registerAnimationGroup(group: any);
        reset();
    }

    export interface IActionManager {
        actionPerformed: IEvent<any>;

        isEnabled(action:string, selection:ISelection):boolean;
        invoke(action: string, actionArg?: any): Promise<void>;
        subscribe(action: string, cb: (action: string, result: any, reserved:any, args:any) => void):IDisposable;
        registerAction(name: string, description: string, category: string, callback: (selection?: ISelection, arg?: string) => any): IAction;

        hasAction(action: string): boolean;
        getAction(action:string): IAction;
        getActionLabel(actionId: string): string;

        attach(view:IView, controller:IController);
        detach();
    }

    class IsolationContextImpl {
        readonly isActive:boolean;
        isActivatedFor(element:IUIElement):boolean;
        readonly isolationLayer:IIsolationLayer;
    }

    export const IsolationContext:IsolationContextImpl;

    export class AutoDisposable implements IDisposable {
        add(disposable:IDisposable);
        dispose();
    }

    export interface IShortcutManager {
        actionShortcuts: {
            [action: string]: IShortcut[]
        };

        mapScheme(scheme: IShortcutScheme): void;
        clear(): void;

        getActionHotkey(actionId: string): string;
    }

    export interface IShortcut {
        key: string;
        action: string;
        display?: string;
        type?: string;
        repeatable?: boolean;
    }

    export interface IShortcutScheme {
        windows: IShortcut[],
        mac: IShortcut[]
    }

    export interface IFontInfo {
        readonly family: string;
        readonly style: FontStyle;
        readonly weight: FontWeight;

        getFontScale(size: number): number;
    }    
    export interface IFontManager {
        add(fontInfo: IFontInfo);
        getPendingTasks(): Promise<boolean>[];
        tryLoad(family: string, style: FontStyle, weight: FontWeight): Promise<boolean>;
    }

    export interface IAreaConstraint {
        l?: number;
        r?: number;
        t?: number;
        b?: number;
        w?: number;
        h?: number;
    }

    export interface IMirroringProxyPage extends IPage {
        resetVersion(): void;
    }

    export interface IStyle {
        id: string;
        name: string;
        props: any;
    }

    export interface IStyleManager {
        registerStyle(style: IStyle, type: StyleType);
        getStyle(id: string, type: StyleType): IStyle | null;
        getStyles(type: StyleType): IStyle[];
    }

    export const enum StyleType {
        Visual = 1,
        Text = 2
    }

    export const enum LayerType {
        Content = 0,
        Isolation = 1,
        Interaction = 2
    }

    export const enum LayoutDockPosition {
        Left   = 1,
        Top    = 2,
        Right  = 3,
        Bottom = 4,
        Fill   = 5
    }

    export const enum LayoutDirection {
        Row = 1,
        Column = 0
    }

    export const enum PreviewDisplayMode {
        OriginalSize = 0,
        Fit = 1,
        Fill = 2,
        Responsive = 3
    }

    export const enum AlignMode {
        Selection,
        Parent
    }

    export interface IInvalidate {
        requested:IEvent2<LayerType, number>;
        requestedViewRedraw:IEvent<void>;
        draftMode:boolean;
        request(layer?, mask?);
        requestInteractionOnly(mask?);
        requestDraftWithDebounce();
    }


    export interface ISelectComposite extends IComposite{
        getDisplayPropValue(propertyName: string, descriptor?: PropDescriptor): any;
        updateDisplayProps(changes);
    }

    export type SelectionMode = "new" | "add" | "toggle" | "remove";

    export interface ISelection{
        readonly elements: IUIElement[];
        readonly previousElements: IUIElement[];
        readonly latestGlobalBoundingBox: IRect;

        makeSelection(elements: IUIElement[], mode?: SelectionMode);
        getSelectionMode(keys: KeyboardState, extended: boolean): SelectionMode;
        requestProperties(elements: IUIElement[]);

        selectComposite(): ISelectComposite;
        clearSelection();
        refreshSelection(elements?: IUIElement[], raiseEvents?:boolean);

        isElementSelected(element: IUIElement): boolean;

        lock();
        unlock();
        show();
        hide();
        useInCode(value:boolean);

        readonly modeChangedEvent: IEvent<boolean>;
        readonly onElementSelected: IEvent3<ISelectComposite, IUIElement[], boolean>;
        readonly propertiesRequested: IEvent<ISelectComposite>;
    }

    export interface IRenderLoop {
        mountDesignerView(app: IApp, element: HTMLElement);

        unmount();

        isAttached(): boolean;

        viewContainer: HTMLElement;
        view:IView;
        controller:IController;
    }
    export const RenderLoop: IConstructor<IRenderLoop>;

    export interface IDataProvider {
        id: string;
        name: string;

        fetch(fields: string[], rowCount: number);
        createElement(app: IApp, field: string, templateId?: string): IUIElement;
    }

    export interface IDataManager {
        registerProvider(id: string, provider: IDataProvider): void;
        generateForSelection(): void;
    }

    export const app: IApp;
    export const ActionManager: IActionManager;
    export const Selection: ISelection;
    export const Invalidate: IInvalidate;

    export var Services : {
        compiler:ICompilerService;
    }

    export interface IKeyboard {
        readonly state: KeyboardState;
        readonly changed: IEvent2<KeyboardState, KeyboardState>;

        attach();
        detach();

        change(ctrlKey: boolean, shiftKey: boolean, altKey: boolean);
        reset();
    }

    export interface IPreviewModel {
        onPageChanged:IEvent<IPage>;
        navigateToArtboard(artboardId:string, options?:IAnimationOptions, data?:DataBag);
        activePage:IPage;
        readonly activeArtboard:IArtboard;
    }

    export interface IModuleResolver {
        requireModuleInstance(name:string):any;
    }
}