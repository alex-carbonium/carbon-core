import PropertyMetadata from "framework/PropertyMetadata";
import { Types } from "./Defs";
import { IPage } from "carbon-model";

class NullPage implements IPage {
    t: string;
    props: {};
    children: any[];

    constructor() {
        this.children = [];
        this.props = {};
    }
    parent() {

    }
    isInitialized() {
        return true;
    }
    init(view) {

    }
    getAllPalettes() {
        return [];
    }
    getAllArtboards() {
        return [];
    }
    getArtboardAtPoint() {

    }
    getElementsInRect() {
        return [];
    }
    initId() {
    }
    add(/*UIElement*/element) {
    }
    remove(/*UIElement*/element) {
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
    getActiveArtboard() {

    }
    renderContentTile(context, x, y, zoom) {
    }
    renderContentToDataURL() {
    }
    resize(rect) {
    }
    id() {
        return 0;
    }
    toJSON() {
    }
    fromJSON(data) {
    }
    timeStamp() {
    }
    name(value) {
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
    }
    activated(previousPage) {
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

    }
    scrollY() {

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
}

NullPage.prototype.t = Types.NullPage;

PropertyMetadata.registerForType(NullPage, {});

export default new NullPage();
