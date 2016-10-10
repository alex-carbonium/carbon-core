import Environment from "environment";

define(function(require){
    var fwk = sketch.framework;
    var domUtil = require("utils/dom");

    return klass((function(){
        var PINCH_THRESHOLD = 0.05;
        var SCROLL_THRESHOLD = 5;
        var CapturedGesture = {
            Pinch: 1,
            Drag: 2
        };

        function preventDefault(e){
            e.gesture.preventDefault();
            e.preventDefault();
            //console.log(e.type);
            return false;
        }
        function createAppEvent(e){
            preventDefault(e);
            return sketch.util.createEvent(e.gesture.srcEvent);
        }
        function pageToLayer(point, sample){
            var dx = sample.layerX - sample.pageX;
            var dy = sample.layerY - sample.pageY;
            return {
                layerX: point.pageX + dx,
                layerY: point.pageY + dy
            }
        }

        function bindTouchEvents(app, element){
            var zoomBeforeTransform;
            var lastScale;
            var lastDistance;
            var capturedGesture;

            require(["hammer"], function(Hammer){
                Hammer(element, { drag_min_distance: 1 })
                    .on("tap", preventDefault) //click is fired instead
                    .on("hold", preventDefault)
                    .on("doubletap", function(e){
                        Environment.controller.ondblclick(createAppEvent(e));
                    })
                    .on("dragstart", function(e){
                        Environment.controller.onmousedown(createAppEvent(e));
                    })
                    .on("dragend", function(e){
                        Environment.controller.onmouseup(createAppEvent(e));
                    })
                    .on("drag", function(e){
                        Environment.controller.onmousemove(createAppEvent(e));
                    })
                    .on("transformstart", function(e){
                        var appEvent = createAppEvent(e);
                        var center = pageToLayer(e.gesture.center, {
                            pageX: e.gesture.srcEvent.pageX,
                            pageY: e.gesture.srcEvent.pageY,
                            layerX: domUtil.layerX(appEvent),
                            layerY: domUtil.layerY(appEvent)
                        });
                        zoomBeforeTransform = app.zoom();
                        app.zoomToPoint = {x: center.layerX / zoomBeforeTransform, y: center.layerY / zoomBeforeTransform};
                        lastScale = e.gesture.scale;
                        lastDistance = e.gesture.distance;
                        capturedGesture = undefined;

                        app.platform.unbindScroll();
                    })
                    .on("transform", function(e){
                        preventDefault(e);
                        if (e.gesture.touches.length !== 2){
                            return;
                        }
                        if (capturedGesture == undefined || capturedGesture === CapturedGesture.Pinch){
                            var ds = Math.round((e.gesture.scale - lastScale) * 100) / 100;
                            if (capturedGesture){
                                app.zoom(zoomBeforeTransform * e.gesture.scale);
                                return;
                            }
                            if (Math.abs(ds) >= PINCH_THRESHOLD){
                                capturedGesture = CapturedGesture.Pinch;
                            }
                        }
                        if (capturedGesture == undefined || capturedGesture === CapturedGesture.Drag){
                            var dd = Math.round(e.gesture.distance - lastDistance);
                            if (dd >= SCROLL_THRESHOLD){
                                capturedGesture = CapturedGesture.Drag;
                            }
                            if (capturedGesture){
                                lastDistance = e.gesture.distance;
                                var sx, sy;
                                switch (e.gesture.direction){
                                    case "up":
                                        sy = Environment.view.scrollY();
                                        Environment.view.scrollY(sy + dd);
                                        break;
                                    case "down":
                                        sy = Environment.view.scrollY();
                                        Environment.view.scrollY(sy - dd);
                                        break;
                                    case "left":
                                        sx = Environment.view.scrollX();
                                        Environment.view.scrollX(sx + dd);
                                        break;
                                    case "right":
                                        sx = Environment.view.scrollX();
                                        Environment.view.scrollX(sx - dd);
                                        break;
                                }
                                return;
                            }
                            //console.log("dir=" + e.gesture.direction + " dis=" + e.gesture.distance + " ctr=" + JSON.stringify(e.gesture.center));
                        }
                    })
                    .on("transformend", function(e){
                        delete app.zoomToPoint;
                        app.platform.bindScroll();
                        capturedGesture = undefined;
                    });
                });
        }

        return {
            _constructor: function(app){
                if (!app.platform.richUI()){
                    return;
                }
                if (('ontouchend' in document) && sketch.params.deviceType === "Tablet"){
                    bindTouchEvents(app, app.platform.htmlPanel);
                }
            }
        }
    })());
});