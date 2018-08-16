import PropertyMetadata from "./PropertyMetadata";
import { Types } from "./Defs";
import Rect from "../math/rect";
import UIElement from "./UIElement";
import { IUIElement, IContainerProps, IDataNode, IArtboard, IPage, IRect, IPoint, LayerType } from "carbon-core";

class NullPage extends UIElement implements IPage {
    t: string;
    props: any = {};
    children: any[];
    nameProvider: any;
    type: LayerType = LayerType.Content;
    isActive: boolean = false;
    app = null;

    constructor() {
        super();
        this.children = [];
        this.props = {} as any;
    }

    decorators: any[];
    addDecorator(decorator) { }
    removeDecorator(decorator) { }
    removeAllDecorators(): any[] { return null; }
    removeDecoratorByType(type) { }

    hasParent() { return false; }

    incrementVersion() {
    }
    maxScrollX(value?: number): number {
        return 0;
    }
    maxScrollY(value?: number): number {
        return 0;
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
    hitTest(point: IPoint, view: any, boundaryRectOnly: boolean): boolean {
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

    fill = null;
    stroke = null;

    clearRenderingCache() { }

    parent = null;
    originalSize = null;

    autoGrow(dw, dh) {
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
    getArtboardAtPoint(value, view) {
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
    get id() {
        return "";
    }
    set id(v) { }
    toJSON() {
        return {};
    }
    fromJSON(data) {
        return this;
    }
    timeStamp() {
    }
    get name() {
        return '';
    }
    set name(v) { }

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
    applyScaling2() {
    }
    scale = 1;
    scaleX = 1;
    scaleY = 1;
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

    scrollX = 0;
    scrollY = 0;

    hitElement(a, b, c?, d?): IUIElement {
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
    get width(): number {
        return 0;
    }
    set width(v) {
    }
    get height(): number {
        return 0;
    }
    set height(v) {
    }
    get x(): number {
        return 0;
    }
    set x(v) {
    }
    get y(): number {
        return 0;
    }
    set y(v) {
    }
    get angle(): number {
        return 0;
    }
    set angle(v) {
    }

    dropElement(element) {
    }

    flatten() {
    }

    export(): Promise<object> {
        return Promise.reject(new Error());
    }

    activeGroup() {
        return false;
    }
    lockedGroup() {
        return false;
    }

    transferElement() {
    }
}

NullPage.prototype.t = Types.NullPage;

PropertyMetadata.registerForType(NullPage, {});

export default new NullPage();
