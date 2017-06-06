import Matrix from "../math/matrix";
import { IContainer, IDataNodeProps, IMatrix, IPoint, IRect, ISize, IUIElement, IUIElementProps, IConstraints, IContext, IContainerProps, IDataNode, IMouseEventData, IKeyboardState } from "carbon-core";
import { emptyUuid } from "../util";
import DataNode from "./DataNode";
import Rect from "../math/rect";
import Point from "../math/point";
import Constraints from "./Constraints";

class NullContainer extends DataNode implements IContainer {
    children = [];
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

    autoGrow(dw, dh) { }

    mousemove(event: IMouseEventData, keys: IKeyboardState) { }
    mouseup(event: IMouseEventData, keys: IKeyboardState) { }
    mousedown(event: IMouseEventData, keys: IKeyboardState) { }
    dblclick(event: IMouseEventData, scale: number) { }
    click(event: IMouseEventData) { }


    boundaryRect() {
        return Rect.Zero;
    }

    hitTransparent(value: boolean): boolean {
        return true;
    }
    globalMatrixToLocal(m: any) {
        return m;
    }
    getElementById() {
        return null;
    }
    name() {
        return '';
    }
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
    applyTranslation(vector: IPoint, withReset?: any, mode?: any): void {
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
    size(size?: ISize): ISize {
        return { height: 0, width: 0 };
    }
    center(global?: boolean): IPoint {
        return Point.Zero;
    }
    getMaxOuterBorder(): number {
        return 0;
    }
    hitTest(point: IPoint, scale: number, boundaryRectOnly: boolean): boolean {
        return false;
    }
    hitTestGlobalRect(rect: IRect, directSelection?: boolean): boolean {
        return false;
    }
    showResizeHint(): boolean {
        return false;
    }
    each(callback: (e: IUIElement, index?: number) => boolean | void) {
    }
    fill(value?: any) {
        throw new Error("Method not implemented.");
    }
    stroke(value?: any) {
        throw new Error("Method not implemented.");
    }
    x(): number {
        throw new Error("Method not implemented.");
    }
    y(): number {
        throw new Error("Method not implemented.");
    }
    width(): number {
        throw new Error("Method not implemented.");
    }
    height(): number {
        throw new Error("Method not implemented.");
    }
    angle(): number {
        throw new Error("Method not implemented.");
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
    canSelect(): boolean {
        return false;
    }
    mirrorClone(): IUIElement {
        return null;
    }
    runtimeProps: any;
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

    id() {
        return emptyUuid;
    }

    add(element) {
        return element;
    }

    insert(element, index) {
        return element;
    }

    remove(element) {
        return -1;
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

    registerForLayerDraw() {

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

    hitElement() {
        return null;
    }

    parent() {
        return null;
    }

    globalViewMatrix() {
        return Matrix.Identity;
    }

    globalViewMatrixInverted() {
        return Matrix.Identity;
    }

    scale() {
        return 1;
    }

    activeGroup() {
        return false;
    }

    locked() {
        return true;
    }
}

export default new NullContainer();
