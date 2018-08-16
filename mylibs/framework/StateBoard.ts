import Artboard from "./Artboard";
import PropertyMetadata from "./PropertyMetadata";
import ModelStateListener from "./relayout/ModelStateListener";
import { Types } from "./Defs";
import DataNode from "./DataNode";
import NullContainer from "./NullContainer";
import { IStateboard, IStateboardProps } from "carbon-core";
import { model } from "./Model";

class StateBoard extends Artboard implements IStateboard {
    props: IStateboardProps;

    constructor() {
        super();
        delete this._recorder;
    }

    get artboard() {
        if (!this._artboard) {
            if (this.parent === NullContainer) {
                return null;
            }

            this._artboard = DataNode.getImmediateChildById(this.parent, this.props.masterId, true);
            if (this._artboard) {
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

    code(value?) {
        return this.artboard.code(value);
    }

    declaration(module?) {
        return this.artboard.declaration(module);
    }

    get exports() {
        return this.artboard.exports;
    }

    set exports(value) {
        this.artboard.exports = value;
    }

    headerText() {
        if (!this.artboard) {
            return;
        }
        var state = this.artboard._recorder.getStateById(this.stateId);
        return state ? state.name : '';
    }

    getStates() {
        if(this.artboard) {
            return this.artboard.getStates();
        }
    }

    displayName() {
        return this.props.name + " (" + this.headerText() + ")";
    }

    getElementByMasterId(masterId) {
        var res = null;

        this.applyVisitor(e => {
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
        var parent = this.getElementByMasterId(masterParent.id);
        var clone = element.clone();
        clone.setProps({ masterId: element.id })
        parent.insert(clone, index);

        this._transfering = false;
    }

    registerSetProps(element, props, oldProps) {
        ModelStateListener.trackSetProps(this, element, props, oldProps);

        if (!this._transfering && this.artboard) {
            this.artboard._recorder.trackSetProps(this.stateId, element.props.masterId, props, oldProps);
        }
    }

    getStateboardById(artboardId) {
        if(this.id === artboardId) {
            return this;
        }

        if(this.artboard) {
            return this.artboard.getStateboardById(artboardId);
        }

        return null;
    }

    registerDelete(parent, element) {
        ModelStateListener.trackDelete(this, parent, element, /*remoteOnly:*/true);
        if (!this._transfering && this.artboard) {
            var masterElement = this.artboard.getElementById(element.props.masterId);
            masterElement.parent.remove(masterElement);
        }
    }

    transferDelete(masterElement) {
        this._transfering = true;
        var target = this.getElementByMasterId(masterElement.id);
        if (target) {
            target.parent.remove(target);
        }
        this._transfering = false;
    }

    registerInsert(parent, element, index) {
        ModelStateListener.trackInsert(this, parent, element, index);

        if (!this._transfering && this.artboard) {
            var clone = element.clone();
            element.setProps({ masterId: clone.id });
            this.artboard.transferInsert(this.props.stateId, parent.props.masterId, clone, index);
        }
    }

    registerChangePosition(parent, element, index, oldIndex) {
        // we move element out of the board, so need to remove it from other boards
        ModelStateListener.trackChangePosition(this, parent, element, index, oldIndex);

        if (!this._transfering && this.artboard) {
            var element = this.artboard.getElementById(element.props.masterId);
            if (element) {
                element.parent.changePosition(element, index);
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
        var target = this.getElementByMasterId(masterElement.id);
        if (target) {
            target.parent.changePosition(target, index);
        }
        this._transfering = false;
    }
}
StateBoard.prototype.t = Types.StateBoard;


PropertyMetadata.registerForType(StateBoard, {
    groups: function () {
        return [
            {
                label: "",
                id:"layout",
                properties: ["position", "size"],
                expanded: true
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