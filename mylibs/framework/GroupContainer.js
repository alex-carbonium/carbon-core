import {Types, Overflow} from "./Defs";
import Selection from "framework/SelectionModel";
import PropertyMetadata from "./PropertyMetadata";
import UserSettings from "../UserSettings";
import Container from "./Container";

export default class GroupContainer extends Container {
    unlockGroup(){
        super.unlockGroup();
        Selection.onElementSelected.bind(this, this._onSelectionChanged);
    }

    lockGroup() {
        super.lockGroup();
        Selection.onElementSelected.unbind(this, this._onSelectionChanged);
    }

    _onSelectionChanged(selection) {
        if (!selection || !selection.isDescendantOrSame(this)) {
            this.lockGroup();
        }
    }

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
        var rects = [];
        this.children.forEach((e) =>{
            var r = e.getBoundaryRect();
            rects.push(r);
        });

        return rects;
    }

    startResizing(){
        super.startResizing();
        this._rects = this._buildChildrenSizes();
        this._originalWidth = this.width();
        this._originalHeight = this.height();
        this.applyVisitor(e =>{
            if (e instanceof GroupContainer && e !== this){
                e.startResizing();
            }
        })
    }

    stopResizing(){
        super.stopResizing();
        delete this._rects;
        delete this._originalWidth;
        delete this._originalHeight;
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
        defaultValue: Overflow.ExpandBoth
    }
});
