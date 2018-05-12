import Matrix from "../math/matrix";
import { IContainer, IDataNodeProps, IMatrix, IPoint, IRect, ISize, IUIElement, IUIElementProps, IConstraints, IContext, IContainerProps, IDataNode, IMouseEventData, KeyboardState, ResizeDimension, PropDescriptor, IPrimitiveRoot, IView } from "carbon-core";
import { emptyUuid } from "../util";
import DataNode from "./DataNode";
import Rect from "../math/rect";
import Point from "../math/point";
import Constraints from "./Constraints";

class NullContainer extends DataNode implements IUIElement, IContainer, IPrimitiveRoot {
    children = [];
    runtimeProps:any = null;
    props: IContainerProps = null;

    constructor() {
        super(false);
    }

    mode(v?: any): any {

    }

    decorators: any[];
    addDecorator(decorator) { }
    removeDecorator(decorator) { }
    removeAllDecorators(): any[] { return null; }
    removeDecoratorByType(type) { }

    selectLayoutProps() {
        return null;
    }

    isDescendantOrSame(el) {
        return false;
    }

    clearRenderingCache() { }
    select() { }
    unselect() { }
    allowCaching() {
        return false;
    }

    performArrange() { }
    allowRearrange() { return false; }
    autoGrow(dw, dh) { }
    selectFrameVisible() {
        return false;
    }

    mousemove(event: IMouseEventData) { }
    mouseup(event: IMouseEventData) { }
    mousedown(event: IMouseEventData) { }
    dblclick(event: IMouseEventData, scale: number) { }
    click(event: IMouseEventData) { }

    hasFlags() {
        return false;
    }
    hasParent() { return false; }
    addFlags() {
    }
    removeFlags() {
    }
    sourceId() {
        return "";
    }

    boundaryRect() {
        return Rect.Zero;
    }

    hitTransparent(value?: boolean): boolean {
        return true;
    }
    hitVisible() {
        return false;
    }
    globalMatrixToLocal(m: any) {
        return m;
    }
    getElementById() {
        return null;
    }
    get name() {
        return '';
    }
    set name(v) { }
    flatten(): void {
    }
    displayName(): string {
        return '';
    }
    viewMatrix(): IMatrix {
        return Matrix.Identity;
    }
    shouldApplyViewMatrix(): boolean {
        return false;
    }
    applyScaling(vector: IPoint, origin: IPoint, options?: any, mode?: any): boolean {
        return false;
    }
    applyMatrixScaling(vector: IPoint, origin: IPoint, options?: any, mode?: any): void {
    }
    applyTranslation(vector: IPoint, withReset?: any, mode?: any): void {
    }
    applyDirectedTranslation(vector: IPoint, mode?: any): void {
    }
    applyGlobalTranslation(vector: IPoint, withReset?: boolean, mode?: any): void {
    }
    applyTransform() {
    }
    setTransform(matrix: IMatrix) {
    }
    resetTransform() {
    }
    getBoundingBox(): IRect {
        return Rect.Zero;
    }
    getBoundingBoxGlobal(): IRect {
        return Rect.Zero;
    }
    size = { height: 0, width: 0 };
    center(global?: boolean): IPoint {
        return Point.Zero;
    }
    getMaxOuterBorder(): number {
        return 0;
    }
    hitTest(point: IPoint, view: IView, boundaryRectOnly: boolean): boolean {
        return false;
    }
    hitTestGlobalRect(rect: IRect, directSelection?: boolean): boolean {
        return false;
    }
    showResizeHint(): boolean {
        return false;
    }
    resizeDimensions() {
        return ResizeDimension.None;
    }
    canSelect() {
        return false;
    }
    canDrag() {
        return false;
    }
    each(callback: (e: IUIElement, index?: number) => boolean | void) {
    }
    fill = null;
    stroke = null;
    scale = 1;
    scaleX = 1;
    scaleY = 1;
    useInCode = false;

    set x(v) {
        throw new Error("Method not implemented.");
    }

    get x(): number {
        throw new Error("Method not implemented.");
    }

    set y(v) {
        throw new Error("Method not implemented.");
    }
    get y(): number {
        throw new Error("Method not implemented.");
    }
    set width(v) {
        throw new Error("Method not implemented.");
    }
    get width(): number {
        throw new Error("Method not implemented.");
    }
    set height(v) {
        throw new Error("Method not implemented.");
    }
    get height(): number {
        throw new Error("Method not implemented.");
    }
    set angle(v) {
        throw new Error("Method not implemented.");
    }
    get angle(): number {
        throw new Error("Method not implemented.");
    }
    runtimeProxy() {
        return this;
    }
    constraints(value?: IConstraints): IConstraints {
        return Constraints.Default;
    }
    clone(): IUIElement {
        return null;
    }
    drawBoundaryPath(context: IContext, round?: boolean) {
    }
    systemType(): string {
        return '';
    }
    mirrorClone(): IUIElement {
        return null;
    }
    prepareProps(changes: Partial<IContainerProps>) {
    }
    prepareAndSetProps(props: Partial<IContainerProps>, mode?: any) {
    }
    setProps(props: Partial<IContainerProps>, mode?: any) {
    }
    patchProps(patchType: any, propName: any, propValue: any) {
    }
    selectProps(names: string[]): Partial<IContainerProps> {
        return {};
    }
    getImmediateChildById<T extends IDataNode>(id: string, materialize?: boolean): T {
        return null;
    }
    findAllNodesDepthFirst<T extends IDataNode>(predicate: (node: T) => boolean): T[] {
        return [];
    }
    findNodeByIdBreadthFirst<T extends IDataNode>(id: string): T {
        return null;
    }
    enablePropsTracking() {
    }
    disablePropsTracking() {
    }
    toJSON() {
        return {};
    }
    fromJSON(json: any) {
        return this;
    }
    primitivePath() {
        return [];
    }
    dispose(): void {
    }

    autoPositionChildren() {
        return false;
    }

    applyVisitor() {
    }

    canAccept() {
        return false;
    }
    canBeAccepted() {
        return false;
    }

    local2global(pos) {
        return pos;
    }

    global2local(pos) {
        return pos;
    }

    arrangeStrategy() {
        return -1;
    }

    zOrder() {
        return null;
    }

    incrementVersion() {

    }

    hitElements() {
        return [];
    }

    allowMoveOutChildren() {
        return true;
    }

    getDropData() {
        return null;
    }

    arrange() {
    }

    get id() {
        return emptyUuid;
    }

    set id(v) { }

    add(element) {
        return element;
    }

    insert(element, index) {
        return element;
    }

    remove(element) {
        return -1;
    }

    removing() {
        return true;
    }
    removed() {
    }

    changePosition(element, index) {
    }

    clear() {
    }

    unregisterForLayerDraw() {

    }

    primitiveRoot() {
        return null;
    }

    unlockGroup() {

    }

    getBoundaryRect() {
        return Rect.Zero;
    }

    getBoundaryRectGlobal() {
        return Rect.Zero;
    }

    invalidate() {

    }

    lockedGroup() {
        return false;
    }

    hitElement(a, b, c?, d?): IUIElement {
        return null;
    }

    parent = null;

    globalViewMatrix() {
        return Matrix.Identity;
    }

    globalViewMatrixInverted() {
        return Matrix.Identity;
    }

    applyScaling2() {
        return 1;
    }

    activeGroup() {
        return false;
    }

    locked() {
        return true;
    }
    get visible() {
        return false;
    }
    set visible(v) { }

    draw() {
    }
    drawSelf() {
    }

    opacity = 0;

    resetGlobalViewCache() {

    }

    clearSavedLayoutProps() {

    }

    contextBarAllowed() {
        return false;
    }

    animate(properties, options, progressCallback) {
        return Promise.resolve();
    }

    expandRectWithBorder(box) {
        return box;
    }

    findPropertyDescriptor(propName): PropDescriptor {
        return null;
    }

    canFill() {
        return false;
    }
    canStroke() {
        return false;
    }

    rotate() {
    }
    translate() {
    }
    translateInRotationDirection() {
    }
    translateInWorld() {
    }

    isEditable() {
        return false;
    }
    isInTree() {
        return false;
    }
    isInViewport(viewportRect) {
        return false;
    }
    roundBoundingBoxToPixelEdge() {
        return false;
    }
    transferElement() {
    }

    registerEventHandler(name, callback){
        return null;
    }
}

export default new NullContainer();
