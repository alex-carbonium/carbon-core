import { IAnimationController } from "carbon-app";

class AnimationController implements IAnimationController {
    _cancelRedrawCallback: any;
    _requestRedrawCallback: any;
    _activeGroups: any[];

    constructor() {
        this._activeGroups = [];
    }

    attach(requestRedrawCallback, cancelRedrawCallback) {
        this._requestRedrawCallback = requestRedrawCallback;
        this._cancelRedrawCallback = cancelRedrawCallback;
    }

    detach() {
        this._requestRedrawCallback = null;
        this._cancelRedrawCallback = null;
    }

    setCallbacks(requestRedrawCallback, cancelRedrawCallback) {
        this._requestRedrawCallback = requestRedrawCallback;
        this._cancelRedrawCallback = cancelRedrawCallback;
    }

    update() {
        var time = new Date().getTime();
        var completedAny = false;
        for (var i = 0; i < this._activeGroups.length; ++i) {
            var group = this._activeGroups[i];
            group.update(time);
            if (group.isCompleted()) {
                this._activeGroups.splice(i, 1);
                i--;
                group.dispose();
                completedAny = true;
            }
        }
        if (!this._activeGroups.length && completedAny) {
            this._cancelRedrawCallback();
        }
    }

    reset() {
        this._activeGroups  = [];
    }

    registerAnimationGroup(group) {
        this._activeGroups.push(group);
        group.start(this, new Date().getTime());
        this._requestRedrawCallback(true);
        return group;
    }

    unregisterAnimationGroup(group) {
        let index = this._activeGroups.findIndex(g=>g === group);
        if(index >= 0) {
            this._activeGroups.splice(index, 1);
        }
    }
}

export default new AnimationController();