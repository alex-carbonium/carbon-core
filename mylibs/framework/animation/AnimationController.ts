import { IAnimationController } from "carbon-app";

export default class AnimationContrller implements IAnimationController {
    _cancelRedrawCallback: any;
    _requestRedrawCallback: any;
    _activeGroups: any[];

    constructor(requestRedrawCallback, cancelRedrawCallback) {
        this._activeGroups = [];
        this._requestRedrawCallback = requestRedrawCallback;
        this._cancelRedrawCallback = cancelRedrawCallback;
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
    registerAnimationGroup(group) {
        this._activeGroups.push(group);
        group.start(new Date().getTime());
        this._requestRedrawCallback(true);
        return group;
    }
}