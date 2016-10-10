import TypeDefaults from "./TypeDefaults";
import Brush from "./Brush";
import Promise from "bluebird";
import backend from "../backend";
import {ContentSizing} from "./Defs";
import {fitRect, fillRect} from "../math/Fitting";

var FrameSource = {};

FrameSource.types = {
    none:0,
    font:1,
    resource:2,
    sprite:3,
    template:4,
    url:5
};

function FrameSourceType (){}
FrameSourceType.prototype = {
    type:FrameSource.types.font
};

var FrameSourceDefault = TypeDefaults["FrameSource"] = function(){
    return new FrameSourceType();
};

function drawEmpty(context, x, y, w, h) {
    if (w > 0 && h > 0){
        //correct back to 0.5 translation after image element and decrease the bounding box by 1 pixel
        //this is because clipping cuts off 0.5 pixels of stroke in FF
        x += 2.5;
        y += 2.5;

        w -= 3;
        h -= 3;

        context.save();
        context.fillStyle = "#FFFFFF";
        context.strokeStyle = "#5C5C5E";
        context.lineWidth = 1;
        context.rectPath(x, y, w, h, true);
        context.fill();
        context.stroke();
        context.linePath(x, y, x + w, y + h);
        context.stroke();
        context.linePath(x + w, y, x, y + h);
        context.stroke();
        context.restore();
    }
}

function drawFont(source, context, x, y, w, h) {
    var s = Math.min(w,h)-2;
    context.font = s+'px ' + source.fontFamily;
    context.lineHeight = 1;
    context.textBaseline = 'middle';

    var measure = context.measureText(source.str);
    if(source.fillBrush && source.fillBrush.type){
        Brush.setFill(source.fillBrush, context, x, y, w, h);
        context.fillText(source.str, x + ~~((w - measure.width) /2), y + ~~(h/2));
    }
    if(source.strokeBrush && source.strokeBrush.type){
        Brush.setStroke(source.strokeBrush, context, x, y, w, h);
        context.strokeText(source.str, x + ~~((w - measure.width) /2), y + ~~(h/2));
    }
}

function drawResource(source, context, x, y, w, h) {
    var sw = source.width,
        sh = source.height,
        dw = w !== undefined ? w : sw,
        dh = h !== undefined ? h : sh;

    if (source.image){
        context.drawImage(source.image, 0, 0, sw, sh, x, y, dw, dh);
    }
}

function drawSprite(source, context, x, y, w, h) {
    var sw = source.width,
        sh = source.height;
    var dw = w === undefined ? sw : w;
    var dh = h === undefined ? sh : h;
    var sprite = fwk.Resources[source.spriteName];
    context.drawImage(sprite, source.x, source.y, sw, sh, x, y, dw, dh);
}

function ensureTemplateLoaded(source) {
    if (!source._template) {
        source._template = new fwk.TemplatedElement();
        source._template.setProps({templateId:source.templateId});
        source.width = source._template.width();
        source.height = source._template.height();
    }
}

function drawTemplate(source, context, x, y, w, h) {
    context.translate(x,y);
    context.scale(source.scaleX, source.scaleY);
    source._template.drawSelf(context, w, h, {});
}


FrameSource.draw = function(source, context, w, h, sizing, sourceProps) {
    switch(source.type){
        case FrameSource.types.font:
            drawFont(source, context, x, y, w, h);
            return;
        case FrameSource.types.resource:
            drawResource(source, context, x, y, w, h);
            return;
        case FrameSource.types.sprite:
            drawSprite(source, context, x, y, w, h);
            return;
        case FrameSource.types.template:
            drawTemplate(source, context, x, y, w, h);
            return;
        case FrameSource.types.url:
            drawURL(context, sourceProps);
            return;

        default:
            drawEmpty(context, x, y, w, h);
    }
}

FrameSource.hasValue = function(source) {
    switch(source.type){
        case FrameSource.types.font:
            return source.value && source.fontFamily;
        case FrameSource.types.resource:
            return source.resourceId;
        case FrameSource.types.sprite:
            return source.spriteName;
        case FrameSource.types.template:
            return source.templateId;
        case FrameSource.types.url:
            return source.url;

        default:
            return false;
    }
}

FrameSource.toString = function(source) {
    switch(source.type){
        case FrameSource.types.font:
            return "font " + source.name + " " + source.fontFamily;
        case FrameSource.types.resource:
            return "resource " + source.resourceId;
        case FrameSource.types.sprite:
            return "sprite " + source.spriteName;
        case FrameSource.types.template:
            return "template " + source.templateId;
        case FrameSource.types.url:
            return "url " + source.url;
        default:
            return '';
    }
}

FrameSource.size = function(source){
    return {
        width: source.width,
        height: source.height
    }
}
FrameSource.boundaryRect = function(source) {
    return {
        x:0,
        y:0,
        width: source.width,
        height: source.height
    }
}

function initResourceSource(source){
    if (source.resourceId){
        source._image = fwk.Resources[source.resourceId];
        source.width = this._image.width;
        source.height = this._image.height;
    }
    else{
        this._image = null;
    }

    return Deferred.createResolvedPromise(source);
}

function initSpriteSource(source){
    var sprite = sketch.ui.IconsInfo.sprites[source.spriteName];
    if (!sprite){
        throw "Sprite does not exist: " + source.spriteName;
    }

    var icon = sprite.icons[source.name];
    if (!icon){
        throw "Icon does not exist " + source.name;
    }

    //mark sprite specific properties as default so that they are not serialized
    source.x = icon.x;
    source.y = icon.y;
    source.width = icon.width;
    source.height = icon.height;

    return Deferred.createResolvedPromise(source);
}

function initTemplateSource(source) {
    ensureTemplateLoaded(source);
    return Deferred.createResolvedPromise(source);
}

function loadUrl(source) {
    var url = source.url;
    if(!url){
        return Promise.resolve({empty: true});
    }

    if(url[0] !== '/' && url[0] !== '.'
        && url.substr(0, backend.fileEndpoint) !== backend.fileEndpoint
        && url.substr(0, "data:image/png".length) !== "data:image/png") {
        url = backend.servicesEndpoint + "/proxy?" + url;
    }

    return new Promise((resolve) => {
        var image = new Image();

        //data: urls cannot be loaded in safari with crossOrigin flag
        if (url.substr(0, "data:".length) !== "data:"){
            image.crossOrigin = "anonymous";
        }

        image.onload = function(){
            resolve({image});
            image.onload = null;
            image.onerror = null;
        };
        image.onerror = function(){
            resolve({error: true});
            image.onload = null;
            image.onerror = null;
        };
        image.src = url;
    });
}
function drawURL(context, runtimeProps) {
    if (!runtimeProps){
        return;
    }
    var image = runtimeProps.image;
    if (image){
        var sr = runtimeProps.sr;
        var dr = runtimeProps.dr;
        context.drawImage(image, sr.x, sr.y, sr.width, sr.height, dr.x, dr.y, dr.width, dr.height);
    }
}
function resizeUrlImage(sizing, rect, runtimeProps){
    if (runtimeProps.image){
        switch (sizing){
            case ContentSizing.original:
                runtimeProps.sr = runtimeProps.dr = rect;
                break;
            case ContentSizing.fit:
                runtimeProps.sr = getUrlImageRect(runtimeProps);
                runtimeProps.dr = fitRect(runtimeProps.sr, rect);
                break;
            case ContentSizing.fill:
                runtimeProps.sr = getUrlImageRect(runtimeProps);
                runtimeProps.dr = fillRect(runtimeProps.sr, rect);
                break;
        }
    }
}
function getUrlImageRect(runtimeProps){
    return {x: 0, y: 0, width: runtimeProps.image.width, height: runtimeProps.image.height};
}


function initFontSource(source) {
    source = Object.assign(FrameSourceDefault(), source);
    source.fontFamily = source.fontFamily || sketch.ui.IconsInfo.defaultFontFamily;
    source.fillBrush = source.fillBrush || fwk.Brush.createFromResource("default.text");
    source.strokeBrush = source.strokeBrush || fwk.Stroke.Empty;


    var fontFamily = source.fontFamily;
    var glyphName = source.name;
    source.str = sketch.ui.IconsInfo.findGlyphString(fontFamily, glyphName);

    if (!source.str){ //due to wrong font upgrade + new support for multiple devices inside the same project
        for (var fontName in sketch.ui.IconsInfo.fonts){
            if (fontName !== fontFamily){
                source.str = sketch.ui.IconsInfo.findGlyphString(fontName, glyphName);
                if (source.str){
                    source.fontFamily = fontName;
                    break;
                }
            }
        }
    }

    return Deferred.createResolvedPromise(source);
}


FrameSource.load = function(source) {
    switch(source.type){
        case FrameSource.types.font:
            return initFontSource(source);
        case FrameSource.types.resource:
            return initResourceSource(source);
        case FrameSource.types.sprite:
            return initSpriteSource(source);
        case FrameSource.types.template:
            return initTemplateSource(source);
        case FrameSource.types.url:
            return loadUrl(source);
        default:
            return null;
    }
};

FrameSource.resize = function(source, sizing, rect, runtimeProps){
    if (runtimeProps){
        resizeUrlImage(sizing, rect, runtimeProps); //only one supported for now
    }
};

FrameSource.isSizingSupported = function(source){
    return source.type === FrameSource.types.url;
};


FrameSource.clone = function(source) {
    return Object.assign({}, source);
}

FrameSource.createFromResource = function(resourceId){
    var source = Object.assign(FrameSourceDefault(), {
        type:FrameSource.types.resource,
        resourceId:resourceId
    });

    return source;
};

FrameSource.createFromResourceAsync = function(resourceId){
    var source = Object.assign(FrameSourceDefault(), {
        type:FrameSource.types.resource,
        resourceId:resourceId
    });

    return FrameSource.init(source);
};


FrameSource.createEmpty = function(){
    var source = Object.assign(FrameSourceDefault(), {
        type:FrameSource.types.none
    });

    return source;
};


FrameSource.createFromTemplate = function(templateId){
    var source = Object.assign(FrameSourceDefault(), {
        type:FrameSource.types.template,
        templateId:templateId
    });

    return source;
};

FrameSource.createFromSprite = function(spriteName, imageName){
    var source =  Object.assign(FrameSourceDefault(), {
        type:FrameSource.types.sprite,
        name:imageName,
        spriteName:spriteName
    });

    return source;
};

FrameSource.createFromUrl = function(url){
    return Object.assign(FrameSourceDefault(), {
        type: FrameSource.types.url,
        url: url
    });
};

FrameSource.createFromFont = function(fontFamily, value, width, height){
    var defaultValue = FrameSourceDefault();
    defaultValue.fontFamily = defaultValue.fontFamily || sketch.ui.IconsInfo.defaultFontFamily;
    defaultValue.fillBrush = defaultValue.fillBrush || fwk.Brush.createFromResource("default.text");
    defaultValue.strokeBrush = defaultValue.strokeBrush || fwk.Stroke.Empty;

    var source =  Object.assign(defaultValue, {
        type:FrameSource.types.font,
        fontFamily:fontFamily,
        name:value,
        width:width||0,
        height:height||0
    });

    return source;
};


FrameSource.Empty = FrameSource.createEmpty();

export default FrameSource;
