import PropertyMetadata from "framework/PropertyMetadata";
import { Types } from "./Defs";
import Rect from "../math/rect";
import UIElement from "./UIElement";
import { IUIElement, IContainerProps, IDataNode, IArtboard, IPage, IRect, IPoint, LayerType } from "carbon-core";

class NullPage extends UIElement implements IPage {
    t: string;
    props: IContainerProps;
    children: any[];
    nameProvider: any;
    type: LayerType = LayerType.Content;
    isActive: boolean = false;
    app = null;

    constructor() {
        super();
        this.children = [];
        this.props = null;
    }

    decorators: any[];
    addDecorator(decorator) { }
    removeDecorator(decorator) { }
    removeAllDecorators():any[] { return null; }
    removeDecoratorByType(type) { }

    incrementVersion() {
    }

    activate() {
    }
    deactivate() {
    }
    canChangeNodeTree() {
        return false;
    }

    globalMatrixToLocal(m: any) {
        return m;
    }

    canSelect(): boolean {
        throw new Error('Method not implemented.');
    }

    mode(v?: any): any {

    }

    clone(): IPage {
        return this;
    }

    changePosition(element: IUIElement, index: number, mode?: number) {

    }

    globalViewMatrixInverted() {
        return null;
    }

    zOrder() {
        return 0;
    }

    getElementById(id) {
        return null;
    }

    getBoundaryRect() {
        return Rect.Zero;
    }

    hitTransparent(value?: boolean): boolean {
        return true;
    }

    canAccept(elements: IUIElement[], autoInsert: boolean, allowMoveIn: boolean): boolean {
        return false;
    }
    insert(element: IUIElement, index: number, mode: number): IUIElement {
        return element;
    }
    autoPositionChildren(): boolean {
        return false;
    }
    applyVisitor(callback: (IUIElement: any) => boolean | void) {
    }
    shouldApplyViewMatrix(): boolean {
        return false;
    }
    getMaxOuterBorder(): number {
        return 0;
    }
    hitTest(point: IPoint, scale: number, boundaryRectOnly: boolean): boolean {
        return false;
    }
    hitTestGlobalRect(rect: IRect, directSelection: boolean): boolean {
        return false;
    }
    showResizeHint(): boolean {
        return false;
    }
    each(callback: (e: IUIElement, index?: number) => boolean | void) {
    }
    fill(value?: any) {
    }

    clearRenderingCache(){}
    parent() {
        return null;
    }
    allowCaching() {
        return false;
    }
    isInitialized() {
        return true;
    }
    setActiveArtboard() {
    }
    setActiveArtboardById() {
    }
    getAllResourceArtboards(resourceType) {
        return [];
    }
    getAllArtboards() {
        return [];
    }
    getArtboardAtPoint(value) {
        return null;
    }
    getElementsInRect() {
        return [];
    }
    initId() {
    }
    add(element) {
        return element;
    }
    removing() {
        return true;
    }
    remove(element) {
        return -1;
    }
    clear() {
    }
    renderTile(canvas, options) {
    }
    invalidate() {

    }
    homeScreen() {

    }
    enablePropsTracking() {

    }
    disablePropsTracking() {

    }
    getActiveArtboard(): IArtboard {
        return null;
    }
    resize(rect) {
    }
    id() {
        return "";
    }
    toJSON() {
        return {};
    }
    fromJSON(data) {
        return this;
    }
    timeStamp() {
    }
    name() {
        return "";
    }
    encodedName() {
    }
    preview() {
        return false;
    }
    isPhoneVisible(visible) {
    }
    activating() {
    }
    deactivating() {
        return true;
    }
    activated() {
    }
    deactivated() {
    }
    getContentContainer() {
        return this;
    }
    scaleToSize() {
        return 1;
    }
    getEditableProperties() {
        return [];
    }
    isInvalidateRequired() {
        return false;
    }
    displayName() {
        return "Page";
    }
    viewportRect() {
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    scale() {
    }
    pageScale() {
        return 1;
    }
    autoInsert() {

    }
    drawSelf(context, w, h) {

    }

    setProps() {

    }

    initPage() {

    }
    getHomeArtboard() {

    }
    hitElements() {
        return [];
    }
    scrollX() {
        return 0;
    }
    scrollY() {
        return 0;
    }
    hitElement() {
        return null;
    }
    hitElementDirect() {
        return null;
    }
    pointToScroll() {
        return { scrollX: 0, scrollY: 0 };
    }

    saveWorkspaceState() {
    }
    restoreWorkspaceState(data: any): void {
    }

    patchProps(patchType: any, propName: any, propValue: any) {
    }

    insertArtboards(artboards: IArtboard[]) {
    }
    width(): number {
        return 0;
    }
    height(): number {
        return 0;
    }
    x(): number {
        return 0;
    }
    y(): number {
        return 0;
    }
    angle(): number {
        return 0;
    }

    dropElement(element) {
    }

    flatten() {
    }

    export(): Promise<object>{
        return Promise.reject(new Error());
    }

    activeGroup() {
        return false;
    }
    lockedGroup() {
        return false;
    }
}

NullPage.prototype.t = Types.NullPage;

PropertyMetadata.registerForType(NullPage, {});

export default new NullPage();
