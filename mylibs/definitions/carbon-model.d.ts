declare module "carbon-model" {
    import { IPoint, IRect, ICoordinate, IMatrix } from "carbon-geometry";
    import { IEventData, IConstructor, IEvent } from "carbon-basics";

    export interface IPropsOwner<TProps> {
        props: TProps;

        prepareProps(changes: Partial<TProps>);
        prepareAndSetProps(props: Partial<TProps>, mode?);
        setProps(props: Partial<TProps>, mode?);
        patchProps(patchType, propName, propValue);
    }

    export interface IDataNodeProps {
        [key: string]: any;
        id: string;
    }

    export interface IDataNode {
        id(value?: string): string;

        findNodeByIdBreadthFirst<T extends IDataNode>(predicate: (node: T) => boolean): T | null;
        findAllNodesDepthFirst<T extends IDataNode>(predicate: (node: T) => boolean): T[];

        findNodeByIdBreadthFirst<T extends IDataNode>(id: string): T | null;

        enablePropsTracking();
        disablePropsTracking();

        toJSON(): any;
        fromJSON(json: any): IDataNode;
    }

    export interface IUIElementProps extends IDataNodeProps {
        visible: boolean;
    }

    export interface IUIElement extends IDataNode, IPropsOwner<IUIElementProps> {
        parent(): IContainer;

        name(): string;
        displayName(): string;

        shouldApplyViewMatrix(): boolean;

        getBoundingBox(): IRect;
        getBoundingBoxGlobal(): IRect;
        setSize(width: number, height: number);
        setTransform(matrix: IMatrix);

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

        clone(): IUIElement;
    }

    export interface IContainerProps extends IUIElementProps {
    }

    export interface IContainer extends IUIElement, IPropsOwner<IContainerProps> {
        props: IContainerProps;
        children: IUIElement[];

        canAccept(elements: IUIElement[], autoInsert: boolean, allowMoveIn: boolean): boolean;

        /**
         * Adds an element and returns the element which has been actually inserted.
         */
        add(element: IUIElement, mode?: number): IUIElement;
        /**
         * Adds an element and returns the element which has been actually inserted.
         */
        insert(element: IUIElement, index: number, mode?: number): IUIElement;
        remove(element: IUIElement, mode?: number): number;

        hitElement<T extends IUIElement>(event, scale: number, predicate?, directSelection?): T;

        autoPositionChildren(): boolean;

        applyVisitor(callback: (IUIElement) => boolean | void);

        hitTransparent(value: boolean): boolean;

        globalMatrixToLocal(matrix: IMatrix): IMatrix;
    }

    export interface IGroupContainer extends IContainer {
        wrapSingleChild(): boolean;
        translateChildren(): boolean;
    }

    export interface IPage extends IContainer {
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

    export const Page: IPage & IConstructor<IPage>;

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

    export interface ILayer extends IContainer {
    }

    export interface IDataElement {
        initFromData(content: any): void;
    }

    export interface IArtboardProps extends IContainerProps {
        guidesX: IGuide[];
        guidesY: IGuide[];
    }

    export interface IArtboard extends IContainer, IPropsOwner<IArtboardProps> {
        props: IArtboardProps;

        prepareProps(changes: Partial<IArtboardProps>);
        setProps(props: Partial<IArtboardProps>, mode?);
        prepareAndSetProps(props: Partial<IArtboardProps>, mode?);
    }

    export interface IGuide {
        id: string;
        pos: number;
    }

    export interface ITransformationEventData extends IEventData {
        transformationElement: ITransformationElement;
        element?: IUIElement;
    }

    export const NullContainer: IContainer;

    export const enum ImageSourceType {
        None = 0,
        Font = 1,
        Url = 5
    }

    export type ImageSource =
        { type: ImageSourceType.None } |
        { type: ImageSourceType.Url, url: string } |
        { type: ImageSourceType.Font, icon: string };

    export const enum ContentSizing {
        fill = 1,
        fit = 2,
        stretch = 3,
        center = 4,
        original = 5,
        manual = 6
    }

    export interface IImageProps extends IContainerProps{
        source: ImageSource;
        sizing: ContentSizing;
    }
    export interface IImage extends IContainer, IPropsOwner<IImageProps> {
        props: IImageProps;
        source(value?: ImageSource): ImageSource;

        prepareProps(changes: Partial<IImageProps>);
        setProps(props: Partial<IImageProps>, mode?);
        prepareAndSetProps(props: Partial<IImageProps>, mode?);

        resizeOnLoad(value?: boolean): boolean;
    }
    export const Image: IConstructor<IImage> & IPropsOwner<IImageProps> & {
        createUrlSource(url: string): ImageSource;
        createFontSource(iconName: string): ImageSource;

        readonly uploadRequested: IEvent<{done: Promise<void>}>;
        readonly EmptySource: ImageSource;
        readonly NewImageSize: number;
    };
}