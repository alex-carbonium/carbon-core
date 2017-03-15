import Matrix from "../math/matrix";

class NullContainer {

    constructor(){
        this.props = {};
    }

    local2global(pos) {
        return pos;
    }

    global2local(pos) {
        return pos;
    }

    zOrder() {
        return null;
    }

    incrementVersion () {
        
    }

    hitElements() {
        return [];
    }

    allowMoveOutChildren(){
        return true;
    }

    getDropData(){
        return null;
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

    primitiveRoot() {
        return null;
    }

    unlockGroup() {

    }

    registerForLayerDraw() {

    }

    getBoundaryRect() {
        return {x: 0, y: 0, width: 0, height: 0};
    }

    getBoundaryRectGlobal() {
        return {x: 0, y: 0, width: 0, height: 0};
    }

    invalidate() {

    }

    lockedGroup(){
        return false;
    }

    hitElement(){
        return null;
    }

    parent(){
        return null;
    }

    globalViewMatrix(){
        return Matrix.Identity;
    }

    globalViewMatrixInverted(){
        return Matrix.Identity;
    }

    scale(){
        return 1;
    }

    activeGroup(){
        return false;
    }
}

window.NullContainer = new NullContainer();
export default window.NullContainer;
