declare module "carbon-model" {
    import { IPoint, IRect, ICoordinate, IMatrix, ISize, OriginType } from "carbon-geometry";
    import { IEventData, IConstructor, IEvent, IConstraints, IMouseEventData, IDisposable, ChangeMode, ArtboardType, Font, IKeyboardState, Brush } from "carbon-basics";
    import { IContext } from "carbon-rendering";

    export interface IDataNodeProps {
        [key: string]: any;
        id: string;
    }

    export interface IDataNode<TProps extends IDataNodeProps = IDataNodeProps> extends IDisposable {
        props: TProps;

        parent(value?: IDataNode): IDataNode;
        primitiveRootKey(): string;

        prepareProps(changes: Partial<TProps>);
        prepareAndSetProps(props: Partial<TProps>, mode?);
        setProps(props: Partial<TProps>, mode?);
        patchProps(patchType, propName, propValue);
        selectProps(names: (keyof TProps)[]): Partial<TProps>;

        id(value?: string): string;

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
    };

    export interface IUIElementProps extends IDataNodeProps {
        name: string;
        br: IRect;
        visible: boolean;
        constraints: IConstraints;
        flags: UIElementFlags;
    }

    export interface IDecoratable {
        decorators: any[];
        addDecorator(decorator);
        removeDecorator(decorator);
        removeAllDecorators(): any[];
        removeDecoratorByType(type);
    }

    export interface IMouseEventHandler {
        mousemove(event: IMouseEventData, keys: IKeyboardState);
        mouseup(event: IMouseEventData, keys: IKeyboardState);
        mousedown(event: IMouseEventData, keys: IKeyboardState);
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
        parent(): IContainer;

        name(value?: string): string;
        drawPath?(context: IContext, w: number, h: number);

        mode(value?: any): any;
        displayName(): string;

        viewMatrix(): IMatrix;
        globalViewMatrix(): IMatrix;
        globalViewMatrixInverted(): IMatrix;
        shouldApplyViewMatrix(): boolean;

        applyScaling(vector: IPoint, origin: IPoint, options?, mode?: ChangeMode): boolean;
        applyMatrixScaling(vector: IPoint, origin: IPoint, options?, mode?: ChangeMode): void;
        applyTranslation(vector: IPoint, withReset?, mode?: ChangeMode): void;
        applyDirectedTranslation(vector: IPoint, mode?: ChangeMode): void;
        setTransform(matrix: IMatrix);
        resetTransform();

        selectFrameVisible(value?:boolean):boolean;

        boundaryRect(value?: IRect): IRect;
        getBoundingBox(): IRect;
        getBoundingBoxGlobal(): IRect;
        size(size?: ISize): ISize;
        center(global?: boolean): ICoordinate;

        getMaxOuterBorder(): number;

        invalidate();

        hitTest(point: IPoint, scale: number, boundaryRectOnly: boolean): boolean;
        hitTestGlobalRect(rect: IRect, directSelection?: boolean): boolean;

        showResizeHint(): boolean;

        each(callback: (e: IUIElement, index?: number) => boolean | void);

        fill(value?: any): any;
        stroke(value?: any): any;

        x(): number;
        y(): number;
        width(): number;
        height(): number;
        angle(): number;
        zOrder(): number;
        hasFlags(flags: UIElementFlags): boolean;
        addFlags(flags: UIElementFlags): void;
        removeFlags(flags: UIElementFlags): void;

        locked(value?: boolean): boolean;
        visible(value?: boolean): boolean;

        constraints(value?: IConstraints): IConstraints;

        clone(): IUIElement;

        drawBoundaryPath(context: IContext, round?: boolean);
    }

    export interface IContainerProps extends IUIElementProps {
    }

    export interface IContainer<TProps extends IContainerProps = IContainerProps> extends IUIElement<TProps> {
        children: IUIElement[];

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

        hitTransparent(value: boolean): boolean;

        globalMatrixToLocal(matrix: IMatrix): IMatrix;

        performArrange(arrangeEvent?, mode?: ChangeMode): void;
    }
    export const Container: IConstructor<IContainer>;

    export interface IGroupContainer extends IContainer {
        wrapSingleChild(): boolean;
        translateChildren(): boolean;
    }

    export const GroupContainer: IConstructor<IGroupContainer>;

    export interface IRepeatContainer extends IContainer {
        findMasterCounterpart(element: IUIElement): IUIElement;
        addDroppedElements(dropTarget: IContainer, elements: IUIElement[], e: IMouseEventData): void;
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

    export interface ITransformationElement extends IComposite, IGroupContainer {
        angle(): number;
        x(): number;
        y(): number;
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
        states?: ArtboardState[];
        guidesX: IGuide[];
        guidesY: IGuide[];
    }

    export interface IArtboard extends IContainer<IArtboardProps> {
    }

    export type SymbolSource = {
        pageId: string;
        artboardId: string;
    }
    export interface ISymbolProps extends IContainerProps {
        source: SymbolSource;
    }
    export interface ISymbol extends IContainer<ISymbolProps> {
        source(value?: SymbolSource): SymbolSource;
    }
    export const Symbol: IConstructor<ISymbol>;

    export interface IGuide {
        id: string;
        pos: number;
    }

    export interface ITransformationEventData extends IEventData {
        transformationElement: ITransformationElement;
        element?: IUIElement;
    }

    export interface IElementEventData extends IMouseEventData {
        element: IUIElement;
    }

    export const enum ImageSourceType {
        None = 0,
        Url = 5,
        Element = 8
    }

    export type ImageSource =
        { type: ImageSourceType.None } |
        { type: ImageSourceType.Url, url: string } |
        { type: ImageSourceType.Element, pageId: string, artboardId: string, elementId: string };

    export const enum ContentSizing {
        fill = 1,
        fit = 2,
        stretch = 3,
        center = 4,
        original = 5,
        fixed = 6
    }

    export interface IImageProps extends IContainerProps {
        source: ImageSource;
        sizing: ContentSizing;
    }

    export interface IImage extends IContainer<IImageProps> {
        source(value?: ImageSource): ImageSource;

        resizeOnLoad(value?: OriginType | null): OriginType | null;
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
        protected element:IUIElement;
        attach(element:IUIElement);
        detach();
        beforeInvoke(method:string, args:any[]):boolean|void;
        afterInvoke(method:string, args:any[]):boolean|void ;
        parent(value):any;
        visible(value:boolean):boolean;
    }

    export const enum TextMode {
        Label = 1,
        Block
    }
    export type TextContent = string | any[];//TODO: specify range format
    export interface ITextProps extends IUIElementProps {
        font: Font;
        content: TextContent;
        mode: TextMode;
        wrap: boolean;
    }
    export interface IText extends IContainer<ITextProps> {
        font(value?: Font): Font;
        content(value?: TextContent): TextContent;

        markAsDataField(): void;
    }
    export const Text: IConstructor<IText>;

    export const enum ElementState {
        Resize = 0,
        Edit = 1
    }
}