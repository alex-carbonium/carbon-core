import Artboard from "./Artboard";
import PropertyMetadata from "framework/PropertyMetadata";
import ModelStateListener from "framework/relayout/ModelStateListener";
import {Types} from "./Defs";
import DataNode from "framework/DataNode";
import NullContainer from "./NullContainer";

class StateBoard extends Artboard {

    constructor() {
        super();
        delete this._recorder;
    }

    get artboard() {
        if (!this._artboard) {
            if(this.parent() === NullContainer){
                return null;
            }

            this._artboard = DataNode.getImmediateChildById(this.parent(), this.props.masterId, true);
            if(this._artboard) {
                this._artboard.linkStateBoard(this);
            }
        }
        return this._artboard;
    }

    set artboard(value) {
        this._artboard = value;
    }

    get stateId() {
        return this.props.stateId;
    }

    headerText(){
        if(!this.artboard){
            return;
        }
        var state = this.artboard._recorder.getStateById(this.stateId);
        return state?state.name:'';
    }

    displayName(){
        return this.props.name + " (" + this.headerText() + ")";
    }

    getElementByMasterId(masterId) {
        var res = null;

        this.applyVisitor(e=> {
            if (e.props.masterId === masterId) {
                res = e;
                return false;
            }
        });

        return res;
    }

    transferProps(elementId, props) {
        this._transfering = true;
        var element = this.getElementByMasterId(elementId);
        element.prepareProps(props);
        element.setProps(props);

        this._transfering = false;
    }

    transferInsert(masterParent, element, index) {
        this._transfering = true;
        var parent = this.getElementByMasterId(masterParent.id());
        var clone = element.clone();
        clone.setProps({masterId: element.id()})
        parent.insert(clone, index);

        this._transfering = false;
    }

    registerSetProps(element, props, oldProps) {
        ModelStateListener.trackSetProps(this, element, props, oldProps);

        if (!this._transfering && this.artboard) {
            this.artboard._recorder.trackSetProps(this.stateId, element.props.masterId, props, oldProps);
        }
    }

    registerDelete(parent, element) {
        ModelStateListener.trackDelete(this, parent, element, /*remoteOnly:*/true);
        if (!this._transfering && this.artboard) {
            var masterElement = this.artboard.getElementById(element.props.masterId);
            masterElement.parent().remove(masterElement);
        }
    }

    transferDelete(masterElement) {
        this._transfering = true;
        var target = this.getElementByMasterId(masterElement.id());
        if (target) {
            target.parent().remove(target);
        }
        this._transfering = false;
    }

    registerInsert(parent, element, index) {
        ModelStateListener.trackInsert(this, parent, element, index);

        if (!this._transfering && this.artboard) {
            var clone = element.clone();
            element.setProps({masterId: clone.id()});
            this.artboard.transferInsert(this.props.stateId, parent.props.masterId, clone, index);
        }
    }

    registerChangePosition(parent, element, index, oldIndex) {
        // we move element out of the board, so need to remove it from other boards
        ModelStateListener.trackChangePosition(this, parent, element, index, oldIndex);

        if (!this._transfering && this.artboard) {
            var element = this.artboard.getElementById(element.props.masterId);
            if(element) {
                element.parent().changePosition(element, index);
            }
        }
    }

    // this on is called when somebody is deleting artboard
    trackDeleted(parent) {
        super.trackDeleted.apply(this, arguments);

        this.artboard && this.artboard.removeStateById(this.stateId);
    }

    transferChangePosition(masterElement, index) {
        this._transfering = true;
        var target = this.getElementByMasterId(masterElement.id());
        if(target) {
            target.parent().changePosition(target, index);
        }
        this._transfering = false;
    }
}
StateBoard.prototype.t = Types.StateBoard;


PropertyMetadata.registerForType(StateBoard, {
    groups: function () {
        return [
            {
                label: "Layout",
                properties: ["width", "height", "x", "y"]
            },
            {
                label: "Appearance",
                expanded: false,
                properties: ["fill"]
            }
        ];
    }
});


export default StateBoard;