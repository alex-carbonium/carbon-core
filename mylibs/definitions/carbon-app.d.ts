declare module "carbon-app" {
    import { IDataNode, ITransformationEventData, IUIElement, IDataNodeProps, IUIElementProps, IArtboard, IContainer, IComposite, IElementEventData, IIsolatable, IMouseEventHandler, IContainerProps } from "carbon-model";
    import { IEvent, IEventData, IEvent2, IMouseEventData, IKeyboardState, Brush, IEvent3, IConstructor, ViewState, IDisposable } from "carbon-basics";
    import { IRect, ICoordinate, ISize } from "carbon-geometry";
    import { IContext } from "carbon-rendering";

    export interface IPlatform{
        attachEvents(htmlElement: HTMLElement);
        detachEvents();
    }

    export interface IFontMetadata{
        name: string;
        weight: number;
        style: number;
    }

    export interface IAppProps extends IDataNodeProps{
        customGuides: any;
    }

    export interface IApp extends IDataNode<IAppProps> {
        isLoaded: boolean;
        props:IAppProps;

        changed: IEvent<any>;
        restoredLocally: IEvent<void>;

        activePage: IPage;
        pageChanged: IEvent2<IPage, IPage>;
        pageAdded: IEvent<IPage>;
        pageRemoved: IEvent<IPage>;
        changeToolboxPage: IEvent<void>;

        pages: IPage[];
        addPage(page: IPage);
        addNewPage(): void;
        removePage(page: IPage);
        setActivePage(page: IPage);
        setActivePageById(id: string);
        pagesWithSymbols(): IPage[];

        activeStory: any;
        stories: any[];
        activeStoryChanged: IEvent<any>;
        storyInserted: IEvent<any>;
        storyRemoved: IEvent<any>;
        resourceChanged: IEvent2<any, any>;
        resourceDeleted: IEvent2<any, any>;
        setActiveStoryById(id);
        removeStory(story);

        currentTool: string;
        currentToolChanged: IEvent<string>;

        onBuildMenu: any;
        shortcutManager: IShortcutManager;
        actionManager: IActionManager;

        modelSyncProxy: any;
        platform: IPlatform;
        environment: IEnvironment;

        init(): void;
        run(): Promise<void>;
        onLoad(callback: () => void): void;
        unload(): void;
        serverless(value?: boolean): boolean;

        isDirty(): boolean;

        companyId(value?: string): string;

        saveWorkspaceState(): void;
        restoreWorkspaceState(): void;

        showFrames(value?: boolean): boolean;

        addNewPage(option?: any): void;

        relayout(): void;

        getFontMetadata(family: string): IFontMetadata;
        saveFontMetadata(metadata: IFontMetadata): void;
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

        assignNewName(element: IUIElement);

        resetCurrentTool();

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

        export(): Promise<object>;
    }

    export const Page: IConstructor<IPage>;

    export interface IView {
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

        ensureScale(element: IUIElement);
        ensureVisible(element: IUIElement);
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

        set(view: IView, controller: IController);
    }
    export const Environment: IEnvironment;
    export const Workspace: IEnvironment;

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

    export interface IShortcutScheme{
        windows: IShortcut[],
        mac: IShortcut[]
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

        lock();
        unlock();

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

    export const app: IApp;
    export const ActionManager: IActionManager;
    export const Selection: ISelection;
    export const Invalidate: IInvalidate;

    export const UserSettings:any;
}