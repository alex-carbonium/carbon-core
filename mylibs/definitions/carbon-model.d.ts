declare module "carbon-model" {
    import { IPoint, IRect } from "carbon-geometry";
    import { IEventData, IConstructor } from "carbon-basics";

    export interface IPropsOwner<TProps>{
        props: TProps;

        setProps(props: Partial<TProps>, mode?);
        patchProps(patchType, propName, propValue);
        setProps(props, mode?);
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
    }

    export interface IUIElementProps extends IDataNodeProps {
        visible: boolean;
    }

    export interface IUIElement extends IDataNode, IPropsOwner<IUIElementProps> {
        parent(): IContainer;

        name(): string;

        shouldApplyViewMatrix(): boolean;

        getBoundingBox(): IRect;
        getBoundingBoxGlobal(): IRect;

        getMaxOuterBorder(): number;

        invalidate();

        hitTest(point: IPoint, scale: number, boundaryRectOnly: boolean): boolean;
        hitTestGlobalRect(rect: IRect, directSelection?: boolean): boolean;

        showResizeHint(): boolean;

        each(callback:(e:IUIElement, index?:number)=>boolean|void);

        fill(value?: any):any;
        stroke(value?: any):any;

        x(): number;
        y(): number;
        width(): number;
        height(): number;
        angle(): number;
        zOrder(): number;

        clone(): IUIElement;
    }

    export interface IContainerProps extends IUIElementProps{
    }

    export interface IContainer extends IUIElement, IPropsOwner<IContainerProps> {
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

        applyVisitor(callback:(IUIElement)=>boolean|void);

        hitTransparent(value:boolean):boolean;
    }

    export interface IGroupContainer extends IContainer {
        wrapSingleChild(): boolean;
        translateChildren(): boolean;
    }

    export interface IPage extends IContainer {
        getAllArtboards(): IArtboard[];
        getActiveArtboard() : IArtboard;

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
        angle():number;
        x():number;
        y():number;
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

    export interface IArtboard extends IContainer {

    }

    export interface IGuide {
        id: string;
        pos: number;
    }

    export interface ITransformationEventData extends IEventData {
        transformationElement: ITransformationElement;
        element?:IUIElement;
    }

    export const NullContainer:IContainer;
}