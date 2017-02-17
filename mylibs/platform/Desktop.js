import All from "platform/All";
import ActivityMonitor from "ActivityMonitor";
import AutoSaveTimer from "AutoSaveTimer";
import PersistentConnection from "server/PersistentConnection";
import ConsistencyMonitor from "../ConsistencyMonitor";
//TODO: circular dependency Shape -> Frame -> FrameSource -> IconsInfo -> Platform -> Desktop -> svgParser -> Shape
//import svgParser from "svg/SvgParser";
import domUtil from "utils/dom";
import AnimationGroup from "framework/animation/AnimationGroup";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import Keyboard from "./Keyboard";
import Environment from "environment";
import backend from "../backend";
import Hammer from "hammerjs";

var debug = require("DebugUtil")("carb:desktop");

var fwk = sketch.framework;
const WHEEL_STEP = 0.05;
const WHEEL_STEP_BIG = 0.5;

//we know that these are used anyway so no need to spam with requests
var nonTrackedActions = ["zoomIn", "zoomOut", "copy", "paste", "duplicate", ""];

var addDroppedImage = function (app, dropPosition, loadSrc, uploadedSrc) {
    var im = new Image();
    im.crossOrigin = "Anonymous";
    im.onload = function () {
        var dropX = 0;
        var dropY = 0;
        var image = sketch.framework.UIElement.fromType("sketch.ui.common.Image");
        fwk.ImageSource.createFromUrlAsync(uploadedSrc).then(function (source) {
            image.autoSizeOnFirstLoad(true);
            image.setProps({
                source: source
            });
        });

        if (dropPosition) {
            var scale = app.activePage.scale();
            dropX = ~~(dropPosition.x / scale);
            dropY = ~~(dropPosition.y / scale)
            image.x(dropX);
            image.y(dropY);
        }
        app.activePage.dropToPage(dropX, dropY, image);
    };
    if (loadSrc) {
        im.src = loadSrc;
    }

    if (uploadedSrc) {
        im.src = uploadedSrc;
    }
};

var onmousewheel = function (e) {
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
        var scroll = App.Current.activePage.pointToScroll({x: x, y: y}, {width: layerX * 2, height: layerY * 2});

        view.scrollX(scroll.scrollX);
        view.scrollY(scroll.scrollY);
        if (e.preventDefault) e.preventDefault();
        else e.returnValue = false;
        return false;
    } else {
        Environment.controller.onscroll(Environment.controller.createEventData(e));
    }

    e.preventDefault();
};

var onmousedown = function (event) {
    debug("mouse down offset=%d %d", event.offsetX, event.offsetY);
    if (!this._mouseButtonPressed && event.which === 1) {
        Environment.controller.onmousedown(Environment.controller.createEventData(event));
        this._mouseButtonPressed = true;
    }
};


var onmousemove = function (event) {
    Environment.controller.onmousemove(Environment.controller.createEventData(event));
    if (this._mouseButtonPressed) {
        // It is important to disable default mouse move because otherwise browser will make a text selection
        // (if there is selectable content such as comments) and then keyboard events will be handled by those selected elements
        // instead of htmlPanel.
        return false;
    }
};

var onmouseup = function (event) {
    if (this._mouseButtonPressed && event.which === 1) {
        Environment.controller.onmouseup(Environment.controller.createEventData(event));
        this._mouseButtonPressed = false;
        event.preventDefault();
        return false;
    }
};

var ondblclick = function (event) {
    Environment.controller.ondblclick(Environment.controller.createEventData(event));
};

var onpanstart = function (event) {
    if(event.pointerType === "touch") {
        Environment.controller.onpanstart(Environment.controller.createEventData(event));
    }
};


var onpanend = function (event) {
    if(event.pointerType === "touch") {
        Environment.controller.onpanend(Environment.controller.createEventData(event));
    }
};

var onpanmove = function (event) {
    if(event.pointerType === "touch") {
        Environment.controller.onpanmove(Environment.controller.createEventData(event));
    }
};

var onpinchstart = function (event) {
    if(event.pointerType === "touch") {
        Environment.controller.onpinchstart(Environment.controller.createEventData(event));
    }
};
var onpinchend = function (event) {
    if(event.pointerType === "touch") {
        Environment.controller.onpinchend(Environment.controller.createEventData(event));
    }
};
var onpinchmove = function (event) {
    if(event.pointerType === "touch") {
        Environment.controller.onpinchmove(Environment.controller.createEventData(event));
    }
};

var onclick = function (event) {
    Environment.controller.onclick(Environment.controller.createEventData(event));
};

var mouseOutData = null;
var onDocumentMouseMove = function (event) {
    if (event.which !== 1) {
        unbindMouseOutWatch();
    }
    else if (mouseOutData) {
        mouseOutData.currentX = event.clientX;
        mouseOutData.currentY = event.clientY;
    }
};

var onmouseleave = function (event) {
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
        mouseOutData.animationGroup = new AnimationGroup({}, {duration: 3600 * 1000}, function () {
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
};

var unbindMouseOutWatch = function () {
    if (mouseOutData) {
        mouseOutData.animationGroup.complete();
        mouseOutData = null;
        $(document).unbind('mousemove', onDocumentMouseMove);
    }
};

var onmouseenter = function (event) {
    unbindMouseOutWatch();
    Environment.controller.onmouseenter(Environment.controller.createEventData(event));
};

var oncontextmenu = function (event) {
    Environment.controller.showContextMenu(Environment.controller.createEventData(event));
};

var onViewFocused = function () {
    Environment.view.focused(true);
    Invalidate.requestUpperOnly();
};
var onViewBlurred = function () {
    Environment.view.focused(false);
    Invalidate.requestUpperOnly();
};

var onWindowBlur = function () {
    Keyboard.reset();
    App.Current.actionManager.invoke("cancel");
}

var setupFiledrop = function (app) {
    var that = this;
    that._uploadNotices = {};
    $('#viewContainer').filedrop({
        url: backend.decorateUrl("/api/File/Upload"), // upload handler, handles each file separately
        data: {folderId: sketch.params.folderId},
        error: function (err, file) {
            switch (err) {
                case 'TooManyFiles':
                    notify("error", {title: "Error", text: "You tried to upload too many files at a time"});
                    break;
                case 'FileTooLarge':
                    notify("error", {title: "Error", text: "The file you are uploading is too large"});
                    break;
                default:
                    break;
            }
        },
        rename: function (name) {
            return Base64.encode(name);
        },
        maxfiles: 100,
        maxfilesize: 50, // max file size in MBs
        drop: function (e) {
            that.dropPosition = {x: domUtil.layerX(e), y: domUtil.layerY(e)};

            var original = e.originalEvent;
            while (original.originalEvent) {
                original = original.originalEvent;
            }

            if (e.dataTransfer) {
                if (e.dataTransfer.files.length === 1) {
                    var file = e.dataTransfer.files[0];
                    if (file.type === 'image/svg+xml') {
                        var reader = new FileReader();
                        reader.onload = function (e) {
                            var svgText = e.target.result;
                            svgParser.loadSVGFromString(svgText, function (a) {
                                    a = null;
                                },
                                function (el, obj) {
                                    App.Current.activePage.getContentContainer().add(obj);
                                });
                        };

                        // Read in the image file as a data URL.
                        reader.readAsText(file);

                        return;
                    }
                }

                var src;
                try {
                    src = e.dataTransfer.getData("text/plain");
                } catch (e) {
                    try {
                        src = e.dataTransfer.getData("url");
                    } catch (e) {
                    }
                }

                if (src) {
                    addDroppedImage(app, that.dropPosition, src, src);
                    e.handled = true;
                }
            }
        },
        uploadFinished: function (i, file, response, time, xhr) {
            var dropPosition = that.dropPosition;
            var notice = that._uploadNotices[file.name];
            delete that._uploadNotices[file.name];

            var status = xhr.status !== 200 ? false : response.status;

            if (status === true) {
                if (window && window.FileReader) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        addDroppedImage(app, dropPosition, e.target.result, response.uploadedFileSrc);
                    };
                    reader.readAsDataURL(file);
                } else {
                    addDroppedImage(app, dropPosition, null, response.uploadedFileSrc);
                }

                if (notice) {
                    notice.options.type = "success";
                    notice.options.title = file.name + " is uploaded!";
                    notice.options.hide = true;
                    notice.options.delay = 3000;
                    notice.options.opacity = 1;
                    notice.update();
                }
            }
            else {
                if (new sketch.server.ControllerProxy().handleError(xhr)) {
                    notice.options.hide = true;
                    notice.options.delay = 1;
                    notice.update();
                }
                else if (notice) {
                    notice.options.type = "error";
                    notice.options.title = file.name + " was not uploaded";
                    notice.options.text = response.error;
                    notice.options.hide = true;
                    notice.options.delay = 5000;
                    notice.options.opacity = 1;
                    notice.update();
                }
            }
        },
        beforeEach: function (file) {
            // file is a file object
            // return false to cancel upload

            var notice = notify("info", {
                title: "Uploading file " + file.name,
                text: "Starting transfer...",
                hide: false,
                opacity: .8
            });
            that._uploadNotices[file.name] = notice;
            if (App.Current.activePage.preview()) {
                notify("error", {
                    title: "Image could not be uploaded",
                    text: "Please exit preview mode in order to add images"
                });
                return false;
            }

            if (!backend.isLoggedIn()) {
                notify("error", {title: "Please log in", text: "Please log in before uploading images"});
                return false;
            }

            if (!file.type.match(/^image\//)) {
                notify("error", {title: "This is not an image", text: "This file does not look like an image"});
                // Returning false will cause the
                // file to be rejected
                return false;
            }
        },
        progressUpdated: function (i, file, progress) {
            var notice = that._uploadNotices[file.name];
            if (notice) {
                notice.options.text = progress + "% done.";
                notice.update();
            }
        }
    });
};

export default klass(All, {
    _constructor: function () {
        this._mouseButtonPressed = false;
    },
    attachEvents: function (parentElement) {
        this._onmousewheelHandler = onmousewheel.bind(this);
        this._onmousedownHandler = onmousedown.bind(this);
        this._onmousemoveHandler = onmousemove.bind(this);
        this._onmouseupHandler = onmouseup.bind(this);
        this._ondblclickHandler = ondblclick.bind(this);
        this._onclickHandler = onclick.bind(this);
        this._onmouseenterHandler = onmouseenter.bind(this);
        this._onmouseleaveHandler = onmouseleave.bind(this);
        this._oncontextmenuHandler = oncontextmenu.bind(this);

        parentElement.addEventListener('mousewheel', this._onmousewheelHandler);
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


        var hammertime = this.hammertime = new Hammer(parentElement, { drag_min_distance: 1 });
        hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });
        hammertime.get('pinch').set({ enable: true });
        hammertime.on("panstart", onpanstart);
        hammertime.on("panend", onpanend);
        hammertime.on("panmove", onpanmove);
        hammertime.on("pinchstart", onpinchstart);
        hammertime.on("pinchmove", onpinchmove);
        hammertime.on("pinchend", onpinchend);
        hammertime.off("tap");

        this._parentElement = parentElement;
    },
    detachEvents: function () {
        var parentElement = this._parentElement;
        if (!parentElement) {
            return;
        }

        parentElement.removeEventListener('mousewheel', this._onmousewheelHandler);
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
    },
    run: function (/*App*/app) {
        All.prototype.run.apply(this, arguments);
    },
    setupConnection: function (app) {
        if (!sketch.params.exportMode && !app.serverless()) {
            var autoSaveTimer = new AutoSaveTimer(app, PersistentConnection.saveInterval);
            var persistentConnection = new PersistentConnection(app);
            app.activityMonitor = new ActivityMonitor(app, persistentConnection, autoSaveTimer);
            app.activityMonitor.activate();
            backend.setConnection(persistentConnection);
        }
        app.consistencyMonitor = new ConsistencyMonitor(app);
        app.consistencyMonitor.start();
    }
});
