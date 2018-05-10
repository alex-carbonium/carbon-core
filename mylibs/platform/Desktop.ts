import All from "platform/All";
import ActivityMonitor from "ActivityMonitor";
import AutoSaveTimer from "AutoSaveTimer";
import PersistentConnection from "server/PersistentConnection";
import domUtil from "utils/dom";
import AnimationGroup from "framework/animation/AnimationGroup";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import { keyboard } from "./Keyboard";
import Environment from "environment";
import backend from "../backend";
import Hammer from "hammerjs";
import { IApp, IView, IController } from "carbon-core";

var debug = require("DebugUtil")("carb:desktop");

const WHEEL_STEP = 0.05;
const WHEEL_STEP_BIG = 0.5;

//we know that these are used anyway so no need to spam with requests
var nonTrackedActions = ["zoomIn", "zoomOut", "copy", "paste", "duplicate", ""];

var onmousewheel = function (e) {
    let eventData = this.controller.createEventData(e);
    this.controller.onmousewheel(eventData);
    if (eventData._preventDefault === true) {
        // to avoid browser zoom
        e.preventDefault();
        return;
    }
    try {
        var view = this.view;
        if (e.ctrlKey) {

            var oldValue = view.scale();
            var step = WHEEL_STEP;
            if (oldValue > 1) {
                step = WHEEL_STEP_BIG;
            } else if (oldValue < 0.5) {
                step = 0.01;
            }

            var delta = e.deltaY;
            var value = oldValue + (delta < 0 ? step : -step);

            var sx = view.scrollX,
                sy = view.scrollY;
            var layerX = domUtil.layerX(e, this.view);
            var layerY = domUtil.layerY(e, this.view);
            var x = (layerX + sx) / oldValue;
            var y = (layerY + sy) / oldValue;

            this.view.zoom(Math.round(value * 100) / 100);
            var scroll = App.Current.activePage.pointToScroll({ x: x, y: y }, { width: layerX * 2, height: layerY * 2 });

            view.scrollX = (scroll.scrollX);
            view.scrollY = (scroll.scrollY);
        } else {
            this.controller.onscroll(this.controller.createEventData(e));
        }

        e.preventDefault();
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onmousedown = function (event) {
    try {
        debug("mouse down offset=%d %d", event.offsetX, event.offsetY);
        if (!this._mouseButtonPressed && event.which === 1) {
            this.controller.onmousedown(this.controller.createEventData(event));
            this._mouseButtonPressed = true;
        }
        if (!this._mouseButton2Pressed && event.which === 2) {
            this.controller.onmiddlemousedown(this.controller.createEventData(event));
            this._mouseButton2Pressed = true;
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};


var onmousemove = function (event) {
    try {
        this.controller.onmousemove(this.controller.createEventData(event));
        if (this._mouseButtonPressed) {
            // It is important to disable default mouse move because otherwise browser will make a text selection
            // (if there is selectable content such as comments) and then keyboard events will be handled by those selected elements
            // instead of view container.
            return false;
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onmouseup = function (event) {
    try {
        if (this._mouseButtonPressed && event.which === 1) {
            this.controller.onmouseup(this.controller.createEventData(event));
            this._mouseButtonPressed = false;
            event.preventDefault();
            return false;
        }
        if (this._mouseButton2Pressed && event.which === 2) {
            this.controller.onmiddlemouseup(this.controller.createEventData(event));
            this._mouseButton2Pressed = false;
            event.preventDefault();
            return false;
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var ondblclick = function (event) {
    try {
        this.controller.ondblclick(this.controller.createEventData(event));
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onpanstart = function (event) {
    try {
        if (event.pointerType === "touch") {
            this.controller.onpanstart(this.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};


var onpanend = function (event) {
    try {
        if (event.pointerType === "touch") {
            this.controller.onpanend(this.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onpanmove = function (event) {
    try {
        if (event.pointerType === "touch") {
            this.controller.onpanmove(this.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onpinchstart = function (event) {
    try {
        if (event.pointerType === "touch") {
            this.controller.onpinchstart(this.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};
var onpinchend = function (event) {
    try {
        if (event.pointerType === "touch") {
            this.controller.onpinchend(this.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};
var onpinchmove = function (event) {
    try {
        if (event.pointerType === "touch") {
            this.controller.onpinchmove(this.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onclick = function (event) {
    try {
        this.controller.onclick(this.controller.createEventData(event));
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var ondoubletap = function (event) {
    try {
        this.controller.ondoubletap(this.controller.createEventData(event));
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
}

var ontap = function (event) {
    try {
        this.controller.ontap(this.controller.createEventData(event));
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
}

var mouseOutData = null;
var onDocumentMouseMove = function (event) {
    try {
        if (event.which !== 1) {
            unbindMouseOutWatch();
        }
        else if (mouseOutData) {
            mouseOutData.currentX = event.clientX;
            mouseOutData.currentY = event.clientY;
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onmouseleave = function (event) {
    try {
        if (this._mouseButtonPressed && Selection.hasSelectionFrame()) {
            mouseOutData = {
                startLayerX: domUtil.layerX(event, this.view),
                startLayerY: domUtil.layerY(event, this.view),
                startX: event.clientX,
                startY: event.clientY,
                lastX: event.clientX,
                lastY: event.clientY,
                currentX: event.clientX,
                currentY: event.clientY,
                dxScroll: 0,
                dyScroll: 0
                //maxScroll: this.view.getMaxScroll()
            };
            mouseOutData.animationGroup = new AnimationGroup({}, { duration: 3600 * 1000 }, function () {
                if (mouseOutData) {
                    var dx = mouseOutData.currentX - mouseOutData.lastX;
                    var dy = mouseOutData.currentY - mouseOutData.lastY;
                    var adx = Math.abs(dx);
                    var ady = Math.abs(dy);

                    if (adx >= ady && adx >= 20) {
                        mouseOutData.dxScroll = (mouseOutData.currentX - mouseOutData.startX) / 10;
                        mouseOutData.dyScroll = 0;
                        mouseOutData.lastX = mouseOutData.currentX;
                    }
                    else if (ady > adx && ady >= 20) {
                        mouseOutData.dyScroll = (mouseOutData.currentY - mouseOutData.startY) / 10;
                        mouseOutData.dxScroll = 0;
                        mouseOutData.lastY = mouseOutData.currentY;
                    }

                    if (mouseOutData.dxScroll !== 0) {
                        var scrollX = this.view.scrollX + mouseOutData.dxScroll;
                        this.view.scrollX = (scrollX);
                    }
                    if (mouseOutData.dyScroll !== 0) {
                        var scrollY = this.view.scrollY + mouseOutData.dyScroll;
                        this.view.scrollY = (scrollY);
                    }
                }
            });

            this.view.animationController.registerAnimationGroup(mouseOutData.animationGroup);
            $(document).bind('mousemove', onDocumentMouseMove);
        }

        this.controller.onmouseleave(this.controller.createEventData(event));
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var unbindMouseOutWatch = function () {
    if (mouseOutData) {
        mouseOutData.animationGroup.complete();
        mouseOutData = null;
        $(document).unbind('mousemove', onDocumentMouseMove);
    }
};

var onmouseenter = function (event) {
    try {
        unbindMouseOutWatch();
        this.controller.onmouseenter(this.controller.createEventData(event));
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var oncontextmenu = function (event) {
    try {
        this.controller.showContextMenu(this.controller.createEventData(event));
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onViewFocused = function () {
    this.view.focused(true);
    Invalidate.requestInteractionOnly();
};
var onViewBlurred = function () {
    this.view.focused(false);
    this.controller.onblur();
    Invalidate.requestInteractionOnly();
};

var onWindowBlur = function () {
    keyboard.reset();
    if (!DEBUG) {
        App.Current.actionManager.invoke("cancel");
    }
    Selection.cancelSelectFrame();
    Invalidate.requestInteractionOnly();
}

var onWindowResize = function () {
    try {
        this.controller.onWindowResize();
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
}

export default class Desktop extends All {
    [key: string]: any;

    constructor(richUI: boolean) {
        super(richUI);
        this._mouseButtonPressed = false;
    }

    attachEvents(parentElement, app: IApp, view: IView, controller: IController) {
        this.app = app;
        this.view = view;
        this.controller = controller;

        this._onmousewheelHandler = onmousewheel.bind(this);
        this._onmousedownHandler = onmousedown.bind(this);
        this._onmousemoveHandler = onmousemove.bind(this);
        this._onmouseupHandler = onmouseup.bind(this);
        this._ondblclickHandler = ondblclick.bind(this);
        this._onclickHandler = onclick.bind(this);
        this._onmouseenterHandler = onmouseenter.bind(this);
        this._onmouseleaveHandler = onmouseleave.bind(this);
        this._oncontextmenuHandler = oncontextmenu.bind(this);
        this._onViewFocused = onViewFocused.bind(this);
        this._onViewBlurred = onViewBlurred.bind(this);
        this._onWindowBlur = onWindowBlur.bind(this);
        this._onWindowResize = onWindowResize.bind(this);

        parentElement.addEventListener('mousewheel', this._onmousewheelHandler, { capture: false, passive: false });
        parentElement.addEventListener('mousedown', this._onmousedownHandler, true);
        parentElement.addEventListener('mousemove', this._onmousemoveHandler, true);
        parentElement.addEventListener('dblclick', this._ondblclickHandler);
        parentElement.addEventListener('click', this._onclickHandler);
        parentElement.addEventListener('mouseenter', this._onmouseenterHandler);
        parentElement.addEventListener('mouseleave', this._onmouseleaveHandler);
        parentElement.addEventListener('contextmenu', this._oncontextmenuHandler);
        parentElement.addEventListener('focus', this._onViewFocused);
        parentElement.addEventListener('blur', this._onViewBlurred);
        document.body.addEventListener('mouseup', this._onmouseupHandler, true);

        (window as any).addEventListener('blur', this._onWindowBlur);
        (window as any).addEventListener('resize', this._onWindowResize);

        this._onpanstart = onpanstart.bind(this);
        this._onpanend = onpanend.bind(this);
        this._onpanmove = onpanmove.bind(this);
        this._onpinchstart = onpinchstart.bind(this);
        this._onpinchmove = onpinchmove.bind(this);
        this._onpinchend = onpinchend.bind(this);
        this._ondoubletap = ondoubletap.bind(this);
        this._ontap = ontap.bind(this);

        var hammertime = this.hammertime = new Hammer(parentElement, { drag_min_distance: 1, inputClass: Hammer.TouchInput } as any);
        hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });
        hammertime.get('pinch').set({ enable: true });
        hammertime.on("panstart", this._onpanstart);
        hammertime.on("panend", this._onpanend);
        hammertime.on("panmove", this._onpanmove);
        hammertime.on("pinchstart", this._onpinchstart);
        hammertime.on("pinchmove", this._onpinchmove);
        hammertime.on("pinchend", this._onpinchend);
        hammertime.on("doubletap", this._ondoubletap);
        hammertime.on("tap", this._ontap);

        this._parentElement = parentElement;
    }

    detachEvents() {
        var parentElement = this._parentElement;
        if (!parentElement) {
            return;
        }

        parentElement.removeEventListener('mousewheel', this._onmousewheelHandler, { capture: false, passive: false });
        parentElement.removeEventListener('mousedown', this._onmousedownHandler);
        parentElement.removeEventListener('mousemove', this._onmousemoveHandler);
        parentElement.removeEventListener('dblclick', this._ondblclickHandler);
        parentElement.removeEventListener('click', this._onclickHandler);
        parentElement.removeEventListener('mouseenter', this._onmouseenterHandler);
        parentElement.removeEventListener('mouseleave', this._onmouseleaveHandler);
        parentElement.removeEventListener('contextmenu', this._oncontextmenuHandler);
        parentElement.removeEventListener('focus', this._onViewFocused);
        parentElement.removeEventListener('blur', this._onViewBlurred);
        document.body.removeEventListener('mouseup', this._onmouseupHandler);
        (window as any).removeEventListener('blur', this._onWindowBlur);
        (window as any).removeEventListener('resize', this._onWindowResize);

        this.hammertime.destroy();

        delete this._onmousewheelHandler;
        delete this._onmousedownHandler;
        delete this._onmousemoveHandler;
        delete this._onmouseupHandler;
        delete this._ondblclickHandler;
        delete this._onclickHandler;
        delete this._onmouseenterHandler;
        delete this._onmouseleaveHandler;
        delete this._oncontextmenuHandler;
        delete this._onViewFocused;
        delete this._onViewBlurred;
        delete this._onWindowBlur;
        delete this._onWindowResize;
        delete this._parentElement;

        delete this._onpanstart;
        delete this._onpanend;
        delete this._onpanmove;
        delete this._onpinchstart;
        delete this._onpinchmove;
        delete this._onpinchend;
        delete this._ondoubletap;
        delete this._ontap;
    }

    containerOffset() {
        var htmlParent = this.viewContainerElement();
        return domUtil.offset(htmlParent);
    }
}
