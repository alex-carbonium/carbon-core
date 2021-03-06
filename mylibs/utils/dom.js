export default {
    offset: function (elem) {
        var docElem, win,
            box = {top: 0, left: 0},
            doc = elem && elem.ownerDocument;

        if (!doc) {
            return;
        }

        docElem = doc.documentElement;

        // If we don't have gBCR, just use 0,0 rather than error
        // BlackBerry 5, iOS 3 (original iPhone)
        if (typeof elem.getBoundingClientRect !== "undefined") {
            box = elem.getBoundingClientRect();
        }
        win = window;
        return {
            top: box.top + ( win.pageYOffset || docElem.scrollTop ) - ( docElem.clientTop || 0 ),
            left: box.left + ( win.pageXOffset || docElem.scrollLeft ) - ( docElem.clientLeft || 0 )
        };
    },

    layerX: function (event, view, value) {
        if (arguments.length === 3) {
            event.__layerX = value;
            return value;
        }
        if (event.__layerX !== undefined) {
            return event.__layerX;
        }
        if (event.offsetX === undefined) {
            var original = event;
            if (original) {
                while (original.originalEvent) {
                    original = original.originalEvent;
                }
                if (original.__layerX !== undefined) {
                    event.__layerX = original.__layerX;
                }
                //for opera only and IE 10
                else if (original.offsetX !== undefined) {
                    event.__layerX = original.offsetX;
                }
                else if (original.layerX !== undefined) {
                    event.__layerX = original.layerX;
                }
                else if(original.center) {
                    event.__layerX = original.center.x - view.context.canvas.getBoundingClientRect().left;
                }
                else {
                    event.__layerX = original.clientX - view.viewContainerElement.getBoundingClientRect().left;
                }
            }
            return event.__layerX;
        }
        return event.offsetX;
    },

    layerY: function (event, view, value) {
        if (arguments.length === 3) {
            event.__layerY = value;
            return value;
        }
        if (event.__layerY !== undefined) {
            return event.__layerY;
        }
        if (event.offsetY === undefined) {
            var original = event;
            if (original) {
                while (original.originalEvent) {
                    original = original.originalEvent;
                }
                if (original.__layerY !== undefined) {
                    event.__layerY = original.__layerY;
                }
                //for opera only and IE 10
                else if (original.offsetY !== undefined) {
                    event.__layerY = original.offsetY;
                }
                else if (original.layerY !== undefined) {
                    event.__layerY = original.layerY;
                }
                else if(original.center) {
                    event.__layerY = original.center.y - view.context.canvas.getBoundingClientRect().top;
                }
                else {
                    event.__layerY = original.clientY - view.viewContainerElement.getBoundingClientRect().top;
                }
                return event.__layerY;
            }
        }
        return event.offsetY;
    },

    touchCenter: function (center) {
        var offset = $('#viewContainer').offset();
        return {x: center.x - offset.left, y: center.y - offset.top};

    }
}

export function getClipboardData(e){
    return e.clipboardData || (window && window.clipboardData);
}

export function setClipboardContent(e, type, content){
    getClipboardData(e).setData(type, content);
}

export function tryGetClipboardContent(types, e){
    var result;
    var clipboardData = getClipboardData(e);

    if (clipboardData.items){
        for (let i = 0, l = clipboardData.items.length; i < l; ++i){
            var item = clipboardData.items[i];
            if (types.indexOf(item.type) !== -1){
                if (item.kind === "file"){
                    result = item.getAsFile();
                }
                else {
                    result = clipboardData.getData(item.type);
                }
                break;
            }
        }
        return result;
    }

    for (let i = 0, l = types.length; i < l; ++i){
        var type = types[i];
        try{
            result = clipboardData.getData(type);
        }
        catch(e){}

        if (result){
            break;
        }
    }

    if (!result && clipboardData.files){
        for (let i = 0, l = clipboardData.files.length; i < l; ++i) {
            var file = clipboardData.files[i];
            if (types.indexOf(file.type) !== -1){
                result = file;
                break;
            }
        }
    }

    return result;
}