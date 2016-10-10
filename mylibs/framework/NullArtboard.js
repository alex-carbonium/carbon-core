class NullArtboard {
    constructor(){
        this.props = {};
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

    x(){
       return 0;
    }

    y(){
        return 0;
    }

    width(){
        return 0;
    }

    height() {
        return 0;
    }

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
