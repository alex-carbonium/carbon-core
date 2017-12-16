declare module "carbon-model" {
    import { IPoint, IRect, ICoordinate, IMatrix, ISize, Origin } from "carbon-geometry";
    import { IEventData, IConstructor, IEvent, IConstraints, IMouseEventData, ChangeMode, ArtboardType, Font, KeyboardState, ResizeDimension } from "carbon-basics";

    import { IContext } from "carbon-rendering";
    import { AnimationProps, Brush, IDisposable, DataBag, TextContent } from "carbon-runtime";

    export interface IDataNodeProps {
        [key: string]: any;
        id: string;
    }

    export interface IDataNode<TProps extends IDataNodeProps = IDataNodeProps> extends IDisposable {
        props: TProps;

        parent: IDataNode;
        primitiveRootKey(): string;

        prepareProps(changes: Partial<TProps>, mode?: ChangeMode);
        prepareAndSetProps(props: Partial<TProps>, mode?: ChangeMode);
        setProps(props: Partial<TProps>, mode?);
        patchProps(patchType, propName, propValue);
        selectProps(names: (keyof TProps)[]): Partial<TProps>;

        id: string;

        applyVisitorDepthFirst(callback: (element: IDataNode) => boolean | void);
        applyVisitorBreadthFirst(callback: (element: IDataNode) => boolean | void);

        getImmediateChildById<T extends IDataNode>(id: string, materialize?: boolean): T | null;
        findAllNodesDepthFirst<T extends IDataNode>(predicate: (node: T) => boolean): T[];
        findNodeBreadthFirst<T extends IDataNode>(predicate: (node: T) => boolean): T | null;
        findNodeByIdBreadthFirst<T extends IDataNode>(id: string): T | null;
        findAncestorOfType<T extends IDataNode>(type: IConstructor<T>): T | null;

        enablePropsTracking();
        disablePropsTracking();

        toJSON(): any;
        fromJSON(json: any): IDataNode;
    }

    export const DataNode: {
        getImmediateChildById<T extends IDataNode>(container: any, id: string, materialize?: boolean): T | null;
    }

    export type LayoutProps = {
        br: IRect,
        m: IMatrix
    }

    export interface IUIElementProps extends IDataNodeProps {
        name: string;
        br: IRect;
        visible: boolean;
        constraints: IConstraints;
        flags: UIElementFlags;
        opacity:number;
    }

    export interface IDecoratable {
        decorators: any[];
        addDecorator(decorator);
        removeDecorator(decorator);
        removeAllDecorators(): any[];
        removeDecoratorByType(type);
    }

    export interface IMouseEventHandler {
        mousemove(event: IMouseEventData);
        mouseup(event: IMouseEventData);
        mousedown(event: IMouseEventData);
        dblclick(event: IMouseEventData, scale: number);
        click(event: IMouseEventData);
    }

    export const enum UIElementFlags {
        None = 0,
        SymbolBackground = 1,
        SymbolText = 1 << 1,
        PaletteItem = 1 << 2,
        Icon = 1 << 3
    }

    export interface IUIElement<TProps extends IUIElementProps = IUIElementProps> extends IDataNode<TProps>, IMouseEventHandler, IDecoratable {
        parent: IContainer;
        name:string;
        x: number;
        y: number;
        width: number;
        height: number;
        visible: boolean;
        angle: number;
        fill:Brush;
        stroke:Brush;
        opacity:number;

        drawPath?(context: IContext, w: number, h: number);

        mode(value?: any): any;
        displayName(): string;

        hasParent():boolean;

        viewMatrix(): IMatrix;
        globalViewMatrix(): IMatrix;
        globalViewMatrixInverted(): IMatrix;
        shouldApplyViewMatrix(): boolean;

        applyVisitor(callback: (IUIElement) => boolean | void);

        translate(deltaX: number, deltaY: number, mode?: ChangeMode);
        translateInWorld(deltaX: number, deltaY: number, mode?: ChangeMode);
        translateInRotationDirection(deltaX: number, deltaY: number, mode?: ChangeMode);
        scale(scaleX: number, scaleY: number, origin: Origin, mode?: ChangeMode);
        rotate(angle: number, origin: Origin, mode?: ChangeMode);

        applyScaling(vector: IPoint, origin: IPoint, options?, mode?: ChangeMode): boolean;
        applyMatrixScaling(vector: IPoint, origin: IPoint, options?, mode?: ChangeMode): void;
        applyTranslation(vector: IPoint, withReset?, mode?: ChangeMode): void;
        applyDirectedTranslation(vector: IPoint, mode?: ChangeMode): void;
        applyGlobalTranslation(vector: IPoint, withReset?: boolean, mode?: ChangeMode);
        applyTransform(matrix: IMatrix, append?: boolean, mode?: ChangeMode);
        setTransform(matrix: IMatrix, mode?: ChangeMode);
        resetTransform();

        resizeDimensions(value?: ResizeDimension): ResizeDimension;

        selectFrameVisible(value?: boolean): boolean;

        boundaryRect(value?: IRect): IRect;
        getBoundingBox(): IRect;
        getBoundingBoxGlobal(): IRect;
        size(size?: ISize): ISize;
        center(global?: boolean): ICoordinate;
        roundBoundingBoxToPixelEdge(mode?: ChangeMode): boolean;

        getMaxOuterBorder(): number;

        invalidate(mask?:number);

        hitTest(point: IPoint, scale: number, boundaryRectOnly?: boolean): boolean;
        hitTestGlobalRect(rect: IRect, directSelection?: boolean): boolean;

        showResizeHint(): boolean;

        registerEventHandler(name:string, callback: (data: DataBag) => (void | Promise<void>)): IDisposable;

        each(callback: (e: IUIElement, index?: number) => boolean | void);

        canFill(): boolean;
        canStroke(): boolean;

        zOrder(): number;
        hasFlags(flags: UIElementFlags): boolean;
        addFlags(flags: UIElementFlags): void;
        removeFlags(flags: UIElementFlags): void;

        locked(value?: boolean): boolean;

        constraints(value?: IConstraints): IConstraints;

        clone(): IUIElement;

        drawBoundaryPath(context: IContext, round?: boolean);

        selectLayoutProps(global?: boolean): LayoutProps;

        performArrange(arrangeEvent?, mode?: ChangeMode): void;

        activeGroup(): boolean;
        lockedGroup(): boolean;

        animate(props: AnimationProps, duration?: number, options?: any, progress?: () => void): Promise<void>;

        findPropertyDescriptor(propName): PropDescriptor;

        isInTree(): boolean;
        isInViewport(): boolean;
    }

    export const UIElement: IConstructor<IUIElement>;

    export interface IContainerProps extends IUIElementProps {
    }

    export interface IContainer<TProps extends IContainerProps = IContainerProps> extends IUIElement<TProps> {
        children: IUIElement[];

        parent:IContainer;

        canAccept(elements: IUIElement[], autoInsert: boolean, allowMoveIn: boolean): boolean;

        /**
         * Adds an element and returns the element which has been actually inserted.
         */
        add(element: IUIElement, mode?: number): IUIElement;
        /**
         * Adds an element and returns the element which has been actually inserted.
         */
        insert(element: IUIElement, index: number, mode?: ChangeMode): IUIElement;

        remove(element: IUIElement, mode?: ChangeMode): number;

        changePosition(element: IUIElement, index: number, mode?: ChangeMode);

        hitElement(event, scale: number, predicate?, directSelection?): IUIElement;

        autoPositionChildren(): boolean;

        applyVisitor(callback: (IUIElement) => boolean | void);

        globalMatrixToLocal(matrix: IMatrix): IMatrix;

        allowRearrange(): boolean;
        performArrange(arrangeEvent?, mode?: ChangeMode): void;

        getDropData(event: IMouseEventData, element: IUIElement): DropData;
    }

    export type DropData = {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
        index: number;
    }

    export const Container: IConstructor<IContainer>;

    export interface IGroupContainer extends IContainer {
        wrapSingleChild(): boolean;
        translateChildren(): boolean;
    }

    export const GroupContainer: IConstructor<IGroupContainer>;

    export interface IUIElementProps extends IDataNodeProps {
        /**
         * Common ID for repeated elements.
         */
        rid?: string;
        fill:Brush;
        stroke:Brush;
    }

    export interface IRepeatCell extends IContainer { }
    export const RepeatCell: IConstructor<IRepeatCell>;

    export interface IRepeatContainer extends IContainer {
        activeCell(): IRepeatCell;
        findMasterCounterpart(element: IUIElement): IUIElement;
        addDroppedElements(dropTarget: IContainer, elements: IUIElement[], e: IMouseEventData): IUIElement[];
        findSelectionTarget(element: IUIElement): IUIElement;
    }
    export interface IRepeaterProps extends IContainerProps {
    }
    export const RepeatContainer: IConstructor<IRepeatContainer> & {
        tryFindRepeaterParent(element: IUIElement): IRepeatContainer | null;
    }

    export interface IComposite extends IUIElement {
        elements: IUIElement[];

        register(element: IUIElement): void;
        unregister(element: IUIElement): void;
        unregisterAll(): void;

        allHaveSameParent(): boolean;
        autoPositionChildren(): boolean;
    }

    export interface IIsolatable extends IContainer {
        onIsolationExited();
    }

    export interface IDataElement {
        initFromData(content: any): void;
    }

    export const enum TileSize {
        Auto = 0,
        Small = 1,
        Large = 2,
        XLarge = 3,
        Icon = -1
    }

    export type ArtboardState = {
        id: string;
        name: string;
        data: object;
    }

    export interface IArtboardProps extends IContainerProps {
        type: ArtboardType | null;
        insertAsContent?: boolean;
        states?: ArtboardState[];
        guidesX: IGuide[];
        guidesY: IGuide[];
    }

    export interface IArtboard<TProps extends IArtboardProps = IArtboardProps> extends IContainer<TProps>, IElementWithCode {
        getStateboards(): IStateboard[];
        version:number;
        id:string;
        code(value?:string):string;
        screenSize():ISize;
        isDisposed():boolean;
    }

    export interface IStateboardProps extends IArtboardProps {
        masterId: string;
        stateId: string;
    }
    //TODO: follow the same approach everywhere by defining an interface and a const with the same name.
    // this way all consumers can both use "let a: IStateboard" and "a instanceof IStateboard"
    export interface IStateboard extends IArtboard<IStateboardProps> {
        readonly artboard: IArtboard;
    }
    export const IStateboard: IConstructor<IStateboard>;

    export type SymbolSource = {
        pageId: string;
        artboardId: string;
    }
    export interface ISymbolProps extends IContainerProps {
        source: SymbolSource;
        stateId?: string;
    }

    export interface ISymbol extends IContainer<ISymbolProps> {
        source(value?: SymbolSource): SymbolSource;
        fill:Brush;
        stroke:Brush;
        parent:IContainer;
        name:string;
        readonly artboard:IArtboard;
    }
    export const Symbol: IConstructor<ISymbol>;

    export interface IGuide {
        id: string;
        pos: number;
    }

    export const enum ImageSourceType {
        None = 0,
        Loading = 1,
        Url = 5,
        Element = 8
    }

    export type ImageSource =
        { type: ImageSourceType.None } |
        { type: ImageSourceType.Url, url: string } |
        { type: ImageSourceType.Loading, dataUrl: string } |
        { type: ImageSourceType.Element, pageId: string, artboardId: string, elementId: string };

    export const enum ContentSizing {
        fill = 1,
        fit = 2,
        stretch = 3,
        center = 4,
        original = 5,
        fixed = 6
    }

    export const enum StoryType {
        Flow = 0,
        Prototype = 1
    }

    export interface IImageProps extends IContainerProps {
        source: ImageSource;
        sizing: ContentSizing;
    }

    export interface IImage extends IContainer<IImageProps> {
        source(value?: ImageSource): ImageSource;
        isEmpty(): boolean;

        resizeOnLoad(value?: Origin | null): Origin | null;
    }

    export const Image: IConstructor<IImage> & {
        createUrlSource(url: string): ImageSource;
        createFontSource(iconName: string): ImageSource;
        createElementSource(pageId: string, artboardId: string, elementId: string): ImageSource;

        readonly uploadRequested: IEvent<{ done: Promise<void> }>;
        readonly EmptySource: ImageSource;
        readonly NewImageSize: number;
    };

    export class UIElementDecorator {
        protected element: IUIElement;
        attach(element: IUIElement);
        detach();
        beforeInvoke(method: string, args: any[]): boolean | void;
        afterInvoke(method: string, args: any[]): boolean | void;
        parent: any;
        visible: boolean;
    }

    export const enum TextMode {
        Label = 1,
        Block
    }

    export interface ITextProps extends IUIElementProps {
        font: Font;
        content: TextContent;
        mode: TextMode;
        wrap: boolean;
        editable: boolean;
    }
    export interface IText extends IContainer<ITextProps> {
        font(value?: Font): Font;

        markAsDataField(): void;
    }
    export const Text: IConstructor<IText>;

    export const enum ElementState {
        Resize = 0,
        Edit = 1
    }

    export interface IShapeProps extends IContainerProps {
    }
    export interface IShape<T extends IShapeProps> extends IContainer<T> {
        convertToPath(): IPath;
    }

    export interface IPathProps extends IShapeProps {

    }
    export interface IPath extends IShape<IPathProps> {
    }

    export interface IArtboardFrameControlProps extends IUIElementProps {
        source?:{pageId:string, artboardId:string}
    }

    export interface IArtboardFrameControl extends IUIElement {

    }

    export interface IPathProps extends IShapeProps {
    }

    export interface ILineProps extends IShapeProps {
    }
    export interface ILine extends IShape<ILineProps> {
    }

    export interface IRectangleProps extends IShapeProps {
    }
    export interface IRectangle extends IShape<IRectangleProps> {
    }
    export const Rectangle: IConstructor<IRectangle>;

    export interface ICircleProps extends IShapeProps { }
    export interface ICircle extends IShape<ICircleProps> {
    }
    export const Circle: IConstructor<ICircle>;

    export interface IStarProps extends IShapeProps { }
    export interface IStar extends IShape<IStarProps> {
    }
    export const Star: IConstructor<IStar>;

    export interface IPolygonProps extends IShapeProps { }
    export interface IPolygon extends IShape<IPolygonProps> {
    }
    export const Polygon: IConstructor<IPolygon>;

    export interface IElementWithCode {
        code():string;
        declaration(module:boolean):string;
        exports:{[key:string]:string};
        readonly codeVersion:number;
        readonly id:string;
    }

    export type FileType = "image/jpeg" | "image/png" | "image/svg+xml";
    export interface FileProps extends IUIElementProps {
        type: FileType;
        url?: string;
    }

    /**
    * An element which represents an external file being dropped on the canvas.
    * The file itself cannot be added to the model, however it has a link to the actual model element
    * created based on the file (image, path, group, etc).
    */
    export interface IFileElement extends IUIElement<FileProps> {
        readonly linkedElement: IUIElement;

        isImage(): boolean;
        isSvg(): boolean;

        drop(file: File): Promise<void>;
        setExternalUrl(url: string): void;
    }

    export const enum StrokePosition {
        Center = 0,
        Inside = 1,
        Outside = 2
    }

    export const enum LineCap {
        Butt,
        Round,
        Square
    }

    export const enum LineJoin {
        Miter,
        Bevel,
        Round
    }

    export interface PropDescriptor {
        displayName: string,
        type: string,
        defaultValue: any,
        size?: number,
        computed?: boolean,
        options?: any;
    }

    export interface IModel {
        createText(size?: ISize, props?: Partial<ITextProps>): IText;
        createImage(size?: ISize, props?: Partial<IImageProps>): IImage;
        createRectangle(size?: ISize, props?: Partial<IRectangleProps>): IRectangle;
        createOval(size?: ISize, props?: Partial<ICircleProps>): ICircle;
        createStar(size?: ISize, props?: Partial<IStarProps>): IStar;
        createLine(props?: Partial<ILineProps>): ILine;
        createCanvas(size?: ISize, props?: Partial<IUIElementProps>): IContainer;
        createArtboard(size?: ISize, props?: Partial<IArtboardProps>): IArtboard;
        createStateboard(size?: ISize, props?: Partial<IStateboardProps>): IStateboard;
        createFile(props?: Partial<FileProps>): IFileElement;
    }
    export const model: IModel;
}