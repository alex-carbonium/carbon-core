declare module "carbon-app" {
    import { IDataNode, ITransformationEventData, IUIElement, IDataNodeProps, IUIElementProps, IArtboard, IContainer, IComposite, IElementEventData, IIsolatable, IMouseEventHandler, IContainerProps } from "carbon-model";
    import { IEvent, IEventData, IEvent2, IMouseEventData, IKeyboardState, Brush, IEvent3, IConstructor, ViewState, IDisposable, IJsonNode, IPrimitive, ArtboardType, FontStyle, FontWeight } from "carbon-basics";
    import { IRect, ICoordinate, ISize } from "carbon-geometry";
    import { IContext, IContextPool } from "carbon-rendering";

    export interface IPlatform{
        attachEvents(htmlElement: HTMLElement);
        detachEvents();
    }

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

    export interface IAppProps extends IDataNodeProps{
        customGuides: any;
        fontMetadata: FontMetadata[];
    }

    export interface IApp extends IDataNode<IAppProps> {
        isLoaded: boolean;
        props:IAppProps;

        changed: IEvent<IPrimitive[]>;

        activePage: IPage;
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
        initializeWithResource(url:string);


        activeStory: any;
        stories: any[];
        activeStoryChanged: IEvent<any>;
        storyInserted: IEvent<any>;
        storyRemoved: IEvent<any>;
        resourceAdded: IEvent2<ArtboardType, IArtboard>;
        resourceChanged: IEvent2<ArtboardType, IArtboard>;
        resourceDeleted: IEvent3<ArtboardType, IArtboard, IPage>;

        setActiveStoryById(id);
        removeStory(story);

        isolationActive():boolean;

        currentTool: string;
        currentToolChanged: IEvent<string>;

        onBuildMenu: any;
        shortcutManager: IShortcutManager;
        actionManager: IActionManager;
        dataManager: IDataManager;
        fontManager: IFontManager;
        styleManager: IStyleManager;

        modelSyncProxy: any;
        platform: IPlatform;
        environment: IEnvironment;

        init(): void;
        run(): Promise<void>;

        onLoad(callback: () => void): void;
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

        saveWorkspaceState(): void;
        restoreWorkspaceState(): void;

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
        getUserSetting<T>(name: string): T;
        setUserSetting(name: string, value: null | string | number | boolean | object): void;

        assignNewName(element: IUIElement);

        resetCurrentTool();

        importPage(json: IJsonNode): IPage;
        importExternalPage(data:any) : IPage;

        isElectron(): boolean;
    }

    export interface ILayer<TProps extends IContainerProps = IContainerProps> extends IContainer<TProps> {
        type: LayerTypes;
        isActive: boolean;

        activate();
        deactivate();

        dropToLayer(x, y, element);

        canChangeNodeTree(): boolean;
    }

    export interface IIsolationLayer extends ILayer {
        findDropToPageData(x, y, element);
        isActivatedFor(owner: IIsolatable): boolean;
        isolateGroup(owner: IIsolatable, clippingParent?: IUIElement, e?: IMouseEventData) :void;
    }

    export interface IPageProps extends IContainerProps {
        galleryId?: string;
    }
    export interface IPage extends ILayer<IPageProps> {
        getAllArtboards(): IArtboard[];
        getActiveArtboard(): IArtboard;
        getArtboardAtPoint(point: ICoordinate): IArtboard;

        saveWorkspaceState(): any;
        restoreWorkspaceState(data: any): void;

        scrollX(): number;
        scrollY(): number;

        deactivating(nextPage: IPage): boolean;
        deactivated(): void;
        activating(prevPage: IPage): void;
        activated(): void;

        insertArtboards(artboards: IArtboard[]);
    }

    export const Page: IConstructor<IPage>;

    export interface IArtboardPage extends IPage {
        setActiveArtboard(artboard: IArtboard): void;
        setActiveArtboardById(id: string): void;
    }

    export interface IView {
        //TODO encapsulate
        _highlightTarget: any;

        viewContainerElement: HTMLElement;
        page: IPage;
        animationController: IAnimationController;
        contextScale: number;

        scaleChanged: IEvent<number>;
        isolationLayer: IIsolationLayer;

        activeLayer: ILayer;
        activeLayerChanged: IEvent<ILayer>;

        viewState: ViewState;

        setActivePage(page: IPage);

        scale(value?: number): number;
        zoom(value? :number, norefresh?: boolean):void;
        zoomToFit(): void;
        scrollX(value?: number): number;
        scrollY(value?: number): number;

        viewportRect(): IRect;
        pointToScreen(point: ICoordinate): ICoordinate;
        logicalCoordinateToScreen(point: ICoordinate) : ICoordinate;

        ensureScale(elements: IUIElement[]);
        ensureVisible(elements: IUIElement[]);
        scrollToCenter(): void;

        getLayer(layerType: LayerTypes) : ILayer;

        setActivePage(page: IPage);

        draw();
        renderElementToContext(element: IUIElement, context: IContext, x?: number, y?: number, zoom?: number, dpr?: number);
        renderElementToDataUrl(element: IUIElement, bounds?: IRect, dpr?: number): string;
        invalidate();

        showPixels(value?: boolean): boolean;
        showPixelGrid(value?: boolean): boolean;
    }

    export interface IDropElementData{
        e: MouseEvent;
        keys: IKeyboardState;
        elements: IUIElement[];
    }

    export interface IController {
        onmousemove(eventData: IMouseEventData, keys: IKeyboardState);

        draggingEvent: IEvent<ITransformationEventData>;
        startResizingEvent: IEvent<ITransformationEventData>;
        resizingEvent: IEvent<ITransformationEventData>;
        stopResizingEvent: IEvent<ITransformationEventData>;
        startRotatingEvent: IEvent<ITransformationEventData>;
        rotatingEvent: IEvent<ITransformationEventData>;
        stopRotatingEvent: IEvent<ITransformationEventData>;
        startDrawingEvent: IEvent<IEventData>;

        onArtboardChanged: IEvent2<IArtboard, IArtboard>;

        clickEvent: IEvent2<IMouseEventData, IKeyboardState>;
        dblclickEvent: IEvent2<IMouseEventData, IKeyboardState>;
        mousedownEvent: IEvent2<IMouseEventData, IKeyboardState>;
        mouseupEvent: IEvent2<IMouseEventData, IKeyboardState>;
        mousemoveEvent: IEvent2<IMouseEventData, IKeyboardState>;

        onElementDblClicked: IEvent2<IElementEventData, IKeyboardState>;

        startDraggingEvent: IEvent2<IMouseEventData, IKeyboardState>;
        stopDraggingEvent: IEvent2<IMouseEventData, IKeyboardState>;

        inlineEditModeChanged: IEvent2<boolean, any>;

        interactionActive: boolean;

        actionManager: IActionManager;

        createEventData(e): IMouseEventData;

        updateCursor(eventData: IMouseEventData): void;
        defaultCursor(): string;
        captureMouse(element: IMouseEventHandler): void;
        releaseMouse(element: IMouseEventHandler): void;

        keyboardStateFromEvent(e: MouseEvent, mutableState?: IKeyboardState): IKeyboardState;
        beginDragElement(e: MouseEvent, element: IUIElement, dropPromise: Promise<IDropElementData>);
        choosePasteLocation(elements: IUIElement[], allowMoveIn?: boolean): {parent: IContainer, x: number, y: number}
        insertAndSelect(element: IUIElement[], parent: IContainer, x: number, y: number);
        getCurrentlyDraggedElements(): IUIElement[];
        getCurrentDropTarget(eventData: IMouseEventData, keys: IKeyboardState): IContainer | null;
    }

    //TODO: rename to Workspace
    export interface IEnvironment {
        view: IView;
        controller: IController;
        detaching: IEvent2<IView, IController>;
        attached: IEvent2<IView, IController>;

        contextPool: IContextPool;

        set(view: IView, controller: IController);
    }
    export const Environment: IEnvironment;
    export const workspace: IEnvironment;

    export interface IAction {
        id: string;
        name: string;
        callback: (selection: ISelection) => any; //TODO: replace with void when action do not return commands
        condition?: (selection: ISelection) => boolean;
    }

    export interface IAnimationController {
        registerAnimationGroup(group: any);
    }

    export interface IActionManager {
        actionPerformed: IEvent<any>;

        invoke(action: string, callback?: (success: boolean, result?: any) => void): void | Promise<void>;
        subscribe(action: string, cb: (action: string, result: any) => void):IDisposable;
        registerAction(name: string, description: string, category: string, callback: (selection?: ISelection, app?: IApp) => any): IAction;

        getActionFullDescription(name: string, translate?: (value: string) => string): string;
        getActionDescription(action: string): string;

        hasAction(action: string): boolean;
        getAction(action:string): IAction;
    }

    export interface IShortcutManager {
        mapDefaultScheme(): void;
        mapScheme(scheme: IShortcutScheme): void;

        getActionHotkey(actionName: string): string;
        getActionHotkeyDisplayLabel(actionName: string): string;
    }

    export interface IShortcut {
        key: string;
        action: string;
        options?: {
            type?: string,
            repeatable?: boolean
        };
    }

    export interface IShortcutScheme {
        windows: IShortcut[],
        mac: IShortcut[]
    }

    export interface IFontManager {
        getPendingTasks(): Promise<boolean>[];
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

    export const enum LayerTypes{
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

    export const enum AlignMode {
        Selection,
        Parent
    }

    export interface IInvalidate {
        requested:IEvent2<LayerTypes, IRect>;
        request(layer?, rect?);
        requestInteractionOnly(rect?);
    }


    export interface ISelectComposite extends IComposite{
        updateDisplayProps(changes);
    }

    export interface ISelection{
        elements: IUIElement[];

        makeSelection(elements: IUIElement[]);
        selectComposite(): ISelectComposite;
        clearSelection();
        refreshSelection();

        isElementSelected(element: IUIElement): boolean;
        selectionMode(mode?: string): string;

        lock();
        unlock();
        show();
        hide();

        modeChangedEvent: IEvent<boolean>;
        onElementSelected: IEvent3<IUIElement, IUIElement[], boolean>;
    }

    export interface IRenderLoop {
        mount(element: HTMLElement);
        unmount();
        attachDesignerView(app: IApp);

        isAttached(): boolean;

        viewContainer: HTMLElement;
    }
    export const RenderLoop: IConstructor<IRenderLoop>;

    export interface IDataProviderConfig {
        groups: any[];
    }
    export interface IDataProvider {
        id: string;
        name: string;

        fetch(fields: string[], rowCount: number);
        getConfig(): IDataProviderConfig;
        createElement(app: IApp, field: string, templateId?: string): IUIElement;
    }
    export interface ICustomDataProvider extends IDataProvider {
        format: string;
    }

    export interface IDataManager {
        getProvider(id: string) : IDataProvider;
        getBuiltInProvider() : IDataProvider;

        createCustomProvider(name: string, text: string): IDataProvider;
        getCustomProviders(): ICustomDataProvider[];

        generateForSelection(): void;
    }

    export const app: IApp;
    export const ActionManager: IActionManager;
    export const Selection: ISelection;
    export const Invalidate: IInvalidate;
}