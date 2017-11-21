declare const emptyUuid:string;
class NullArtboard {
    props:Readonly<any>;

    constructor(){
        this.props = {} as any;
    }

    getCustomProperties(value) {
        return [];
    }

    getChildControlList() {
        return [];
    }

    applyVisitor(){

    }

    setProps(){

    }

    local2global(pos) {
        return pos;
    }

    global2local(pos) {
        return pos;
    }

    invalidate() {
    }

    arrange() {
    }

    id() {
        return emptyUuid;
    }

    add(element) {
    }

    remove(element) {
    }

    clear() {
    }

    unregisterForLayerDraw() {

    }

    clearRenderingCache() {}

    unlockGroup() {

    }

    activate(){

    }

    deactivate(){

    }

    hitTest(){
        return false;
    }

    enablePropsTracking(){

    }

    disablePropsTracking(){

    }

    get x(){
       return 0;
    }

    set x(value){}

    get y(){
        return 0;
    }
    set y(value){}

    get width(){
        return 0;
    }
    set width(value){}

    get height() {
        return 0;
    }
    set height(value){}

    registerForLayerDraw() {

    }

    getBoundaryRect() {
        return {x: 0, y: 0, width: 0, height: 0};
    }

    getBoundaryRectGlobal() {
        return {x: 0, y: 0, width: 0, height: 0};
    }
}

export default new NullArtboard();
