import All from "platform/All";
import ActivityMonitor from "ActivityMonitor";
import AutoSaveTimer from "AutoSaveTimer";
import PersistentConnection from "server/PersistentConnection";
//import svgParser from "svg/SvgParser";
import domUtil from "utils/dom";
import AnimationGroup from "framework/animation/AnimationGroup";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import { keyboard } from "./Keyboard";
import Environment from "environment";
import backend from "../backend";
import Hammer from "hammerjs";

var debug = require("DebugUtil")("carb:desktop");

const WHEEL_STEP = 0.05;
const WHEEL_STEP_BIG = 0.5;

//we know that these are used anyway so no need to spam with requests
var nonTrackedActions = ["zoomIn", "zoomOut", "copy", "paste", "duplicate", ""];

var onmousewheel = function (e) {
    try {
        var view = Environment.view;
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

            var sx = view.scrollX(),
                sy = view.scrollY();
            var layerX = domUtil.layerX(e);
            var layerY = domUtil.layerY(e);
            var x = (layerX + sx) / oldValue;
            var y = (layerY + sy) / oldValue;

            Environment.view.zoom(Math.round(value * 100) / 100);
            var scroll = App.Current.activePage.pointToScroll({ x: x, y: y }, { width: layerX * 2, height: layerY * 2 });

            view.scrollX(scroll.scrollX);
            view.scrollY(scroll.scrollY);
        } else {
            Environment.controller.onscroll(Environment.controller.createEventData(e));
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
            Environment.controller.onmousedown(Environment.controller.createEventData(event));
            this._mouseButtonPressed = true;
        }
        if (!this._mouseButton2Pressed && event.which === 2) {
            Environment.controller.onmiddlemousedown(Environment.controller.createEventData(event));
            this._mouseButton2Pressed = true;
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};


var onmousemove = function (event) {
    try {
        Environment.controller.onmousemove(Environment.controller.createEventData(event));
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
            Environment.controller.onmouseup(Environment.controller.createEventData(event));
            this._mouseButtonPressed = false;
            event.preventDefault();
            return false;
        }
        if (this._mouseButton2Pressed && event.which === 2) {
            Environment.controller.onmiddlemouseup(Environment.controller.createEventData(event));
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
        Environment.controller.ondblclick(Environment.controller.createEventData(event));
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onpanstart = function (event) {
    try {
        if (event.pointerType === "touch") {
            Environment.controller.onpanstart(Environment.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};


var onpanend = function (event) {
    try {
        if (event.pointerType === "touch") {
            Environment.controller.onpanend(Environment.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onpanmove = function (event) {
    try {
        if (event.pointerType === "touch") {
            Environment.controller.onpanmove(Environment.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onpinchstart = function (event) {
    try {
        if (event.pointerType === "touch") {
            Environment.controller.onpinchstart(Environment.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};
var onpinchend = function (event) {
    try {
        if (event.pointerType === "touch") {
            Environment.controller.onpinchend(Environment.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};
var onpinchmove = function (event) {
    try {
        if (event.pointerType === "touch") {
            Environment.controller.onpinchmove(Environment.controller.createEventData(event));
        }
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onclick = function (event) {
    try {
        Environment.controller.onclick(Environment.controller.createEventData(event));
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var ondoubletap = function (event) {
    try {
        Environment.controller.ondoubletap(Environment.controller.createEventData(event));
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
                startLayerX: domUtil.layerX(event),
                startLayerY: domUtil.layerY(event),
                startX: event.clientX,
                startY: event.clientY,
                lastX: event.clientX,
                lastY: event.clientY,
                currentX: event.clientX,
                currentY: event.clientY,
                dxScroll: 0,
                dyScroll: 0
                //maxScroll: Environment.view.getMaxScroll()
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
                        var scrollX = Environment.view.scrollX() + mouseOutData.dxScroll;
                        Environment.view.scrollX(scrollX);
                    }
                    if (mouseOutData.dyScroll !== 0) {
                        var scrollY = Environment.view.scrollY() + mouseOutData.dyScroll;
                        Environment.view.scrollY(scrollY);
                    }
                }
            });

            Environment.view.animationController.registerAnimationGroup(mouseOutData.animationGroup);
            $(document).bind('mousemove', onDocumentMouseMove);
        }

        Environment.controller.onmouseleave(Environment.controller.createEventData(event));
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
        Environment.controller.onmouseenter(Environment.controller.createEventData(event));
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var oncontextmenu = function (event) {
    try {
        Environment.controller.showContextMenu(Environment.controller.createEventData(event));
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
};

var onViewFocused = function () {
    Environment.view.focused(true);
    Invalidate.requestInteractionOnly();
};
var onViewBlurred = function () {
    Environment.view.focused(false);
    Environment.controller.onblur();
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
        Environment.controller.onWindowResize();
    }
    catch (e) {
        Environment.reportFatalErrorAndRethrow(e);
    }
}

export default class Desktop extends All {
    constructor(richUI) {
        super(richUI);
        this._mouseButtonPressed = false;
    }

    attachEvents(parentElement) {
        this._onmousewheelHandler = onmousewheel.bind(this);
        this._onmousedownHandler = onmousedown.bind(this);
        this._onmousemoveHandler = onmousemove.bind(this);
        this._onmouseupHandler = onmouseup.bind(this);
        this._ondblclickHandler = ondblclick.bind(this);
        this._onclickHandler = onclick.bind(this);
        this._onmouseenterHandler = onmouseenter.bind(this);
        this._onmouseleaveHandler = onmouseleave.bind(this);
        this._oncontextmenuHandler = oncontextmenu.bind(this);

        parentElement.addEventListener('mousewheel', this._onmousewheelHandler, { capture: false, passive: false });
        parentElement.addEventListener('mousedown', this._onmousedownHandler);
        parentElement.addEventListener('mousemove', this._onmousemoveHandler);
        parentElement.addEventListener('dblclick', this._ondblclickHandler);
        parentElement.addEventListener('click', this._onclickHandler);
        parentElement.addEventListener('mouseenter', this._onmouseenterHandler);
        parentElement.addEventListener('mouseleave', this._onmouseleaveHandler);
        parentElement.addEventListener('contextmenu', this._oncontextmenuHandler);
        parentElement.addEventListener('focus', onViewFocused);
        parentElement.addEventListener('blur', onViewBlurred);
        document.body.addEventListener('mouseup', this._onmouseupHandler);

        window.addEventListener('blur', onWindowBlur);
        window.addEventListener('resize', onWindowResize);


        var hammertime = this.hammertime = new Hammer(parentElement, { drag_min_distance: 1 });
        hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });
        hammertime.get('pinch').set({ enable: true });
        hammertime.on("panstart", onpanstart);
        hammertime.on("panend", onpanend);
        hammertime.on("panmove", onpanmove);
        hammertime.on("pinchstart", onpinchstart);
        hammertime.on("pinchmove", onpinchmove);
        hammertime.on("pinchend", onpinchend);
        hammertime.on("doubletap", ondoubletap);
        hammertime.off("tap");

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
        parentElement.removeEventListener('focus', onViewFocused);
        parentElement.removeEventListener('blur', onViewBlurred);
        document.body.removeEventListener('mouseup', this._onmouseupHandler);
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
        delete this._parentElement;
    }

    containerOffset() {
        var htmlParent = this.viewContainerElement();
        return domUtil.offset(htmlParent);
    }
}
