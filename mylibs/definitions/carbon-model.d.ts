declare module "carbon-model" {
    import { IPoint, IRect } from "carbon-geometry";
    import { IEventData } from "carbon-basics";

    export interface IDataNodeProps {
        [key: string]: any;
        id: string;
    }
    export interface IDataNode<TProps> {
        id(value?: string): string;

        props: TProps;
    }

    export interface IUIElementProps extends IDataNodeProps {
        visible: boolean;
    }
    export interface IUIElement<TProps extends IUIElementProps> extends IDataNode<TProps> {
        name(): string;

        shouldApplyViewMatrix(): boolean;

        getBoundingBox(): IRect;
        getBoundingBoxGlobal(): IRect;

        getMaxOuterBorder(): number;

        hitTest(point: IPoint, scale: number, boundaryRectOnly: boolean): boolean;
        hitTestGlobalRect(rect: IRect, directSelection: boolean): boolean;

        showResizeHint(): boolean;
    }

    export interface IContainerProps extends IUIElementProps{

    }
    export interface IContainer extends IUIElement<IContainerProps> {
        children: IUIElement<IUIElementProps>[];

        canAccept(elements: IUIElement[], autoInsert: boolean, allowMoveIn: boolean): boolean;

        /**
         * Adds an element and returns the element which has been actually inserted.
         */
        add(element: IUIElement, mode: number): IUIElement;
        /**
         * Adds an element and returns the element which has been actually inserted.
         */
        insert(element: IUIElement, index: number, mode: number): IUIElement;
        remove(element: IUIElement, mode: number): number;

        autoPositionChildren(): boolean;
    }

    export interface IGroupContainer extends IContainer {
        wrapSingleChild(): boolean;
        translateChildren(): boolean;
    }

    export interface IPage {
        getAllArtboards(): IArtboard[];

        saveWorkspaceState(): any;
        restoreWorkspaceState(data: any): void;
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
    }

    export interface ILayer extends IContainer {
    }

    export interface IDataElement {
        initFromData(content: any): void;
    }

    export interface IArtboardProps extends IUIElementProps {
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
    }
}