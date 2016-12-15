import {Types, Overflow} from "./Defs";
import PropertyMetadata from "./PropertyMetadata";
import UserSettings from "../UserSettings";
import Container from "./Container";

export default class GroupContainer extends Container {
    adjust(){

    }

    // draw(context, environment){
    //     for (var i = 0; i < this.children.length; i++){
    //         var element = this.children[i];
    //         element.draw(context, environment);
    //     }
    // }

    drawSelf(context, w, h, environment){
        // if (!this.lockedGroup()){
        //     context.save();
        //     context.strokeStyle = UserSettings.group.active_stroke;
        //     context.strokeRect(0, 0, w, h);
        //     context.restore();
        //
        // }
        super.drawSelf.apply(this, arguments);
    }

    _buildChildrenSizes(){
        return this.children.map(e => e.getBoundingBox());
    }

    startResizing(){
        super.startResizing();
        this._rects = this._buildChildrenSizes();
        this.applyVisitor(e =>{
            if (e !== this){
                e.startResizing();
            }
        })
    }

    stopResizing(){
        super.stopResizing();
        delete this._rects;
        this.applyVisitor(e =>{
            if (e instanceof GroupContainer && e !== this){
                e.stopResizing();
            }
        })
    }

    _roundValue(value){
        return value;
    }

    allowMoveOutChildren(value, event){
        return super.allowMoveOutChildren.apply(this, arguments) || (event && event.ctrlKey);
    }

    canAccept(elements, autoInsert, allowMoveInOut){
        return allowMoveInOut;
    }

    lockAutoresize(){
        this._lockAutoresize = true;
    }

    unlockAutoresize(){
        delete this._lockAutoresize;
    }

    iconType(){
        return 'group';
    }
}

GroupContainer.prototype.t = Types.GroupContainer;

Container.GroupContainerType = GroupContainer;

PropertyMetadata.registerForType(GroupContainer, {
    allowMoveOutChildren: {
        defaultValue: false
    },
    enableGroupLocking: {
        defaultValue: true
    },
    scaleChildren: {
        defaultValue: true
    },
    overflow: {
        defaultValue: Overflow.AdjustBoth
    }
});
