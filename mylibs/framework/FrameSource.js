import TypeDefaults from "./TypeDefaults";
import Brush from "./Brush";
import backend from "../backend";
import {ContentSizing, Types} from "./Defs";
import {fitRect, fillRect} from "../math/Fitting";
import IconsInfo from "../ui/IconsInfo";
import Promise from "bluebird";

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
    type: FrameSource.types.url,
    family: IconsInfo.defaultFontFamily
};

var FrameSourceDefault = TypeDefaults[Types.FrameSource] = function(){
    return new FrameSourceType();
};

var iconProps = {fill: Brush.createFromColor("#ABABAB"), stroke: Brush.Empty};
var iconRuntimeProps = {glyph: IconsInfo.findGlyphString(IconsInfo.defaultFontFamily, "image")};
function drawEmpty(context, w, h) {
    context.save();
    context.fillStyle = "#DEDEDE";
    context.fillRect(0, 0, w, h);

    var iw = w;
    var ih = h;
    if (w > 64){
        iw = Math.min(128, w/2 + .5|0);
    }
    else if (w > 32){
        iw = 32;
    }
    if (h > 64){
        ih = Math.min(128, h/2 + .5|0);
    }
    else if (h > 32){
        ih = 32;
    }
    if (iw !== w || ih !== h){
        context.translate((w - iw)/2 + .5|0, (h - ih)/2 + .5|0);
    }

    drawFont(IconsInfo.defaultFontFamily, context, iw, ih, iconProps, iconRuntimeProps);

    context.restore();
}

function drawFont(family, context, w, h, props, runtimeProps) {
    if (!runtimeProps || !runtimeProps.glyph){
        return;
    }

    var s = Math.min(w,h) - 2;
    context.font = s+'px ' + family;
    context.lineHeight = 1;
    context.textBaseline = 'middle';

    var measure = context.measureText(runtimeProps.glyph);
    if (props.fill !== Brush.Empty){
        Brush.setFill(props.fill, context, 0, 0, w, h);
        context.fillText(runtimeProps.glyph, ~~((w - measure.width) /2), ~~(h/2));
    }
    if (props.stroke !== Brush.Empty){
        Brush.setStroke(props.stroke, context, 0, 0, w, h);
        context.strokeText(runtimeProps.glyph, ~~((w - measure.width) /2), ~~(h/2));
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
        // source._template = new fwk.TemplatedElement();
        // source._template.setProps({templateId:source.templateId});
        // source.width = source._template.width();
        // source.height = source._template.height();
    }
}

function drawTemplate(source, context, x, y, w, h) {
    context.translate(x,y);
    context.scale(source.scaleX, source.scaleY);
    source._template.drawSelf(context, w, h, {});
}


FrameSource.draw = function(source, context, w, h, props, runtimeProps) {
    switch(source.type){
        case FrameSource.types.font:
            drawFont(source.family, context, w, h, props, runtimeProps);
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
            drawURL(context, runtimeProps);
            return;

        default:
            drawEmpty(context, w, h);
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
FrameSource.boundaryRect = function(source, runtimeProps) {
    switch (source.type){
        case FrameSource.types.url:
            if (!runtimeProps){
                return null;
            }
            return getUrlImageRect(runtimeProps);
        default:
            return null;
    }
};

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
        && url.substr(0, backend.fileEndpoint.length) !== backend.fileEndpoint
        && url.substr(0, "data:image/png".length) !== "data:image/png") {
        url = backend.servicesEndpoint + "/api/proxy?" + url;
    }

    return new Promise((resolve) => {
        var image = new Image();

        //data: urls cannot be loaded in safari with crossOrigin flag
        if (url.substr(0, "data:".length) !== "data:"){
            image.crossOrigin = "anonymous";
        }

        image.onload = function(){
            var runtimeProps = {image};
            resolve(runtimeProps);
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
function resizeUrlImage(sizing, newRect, runtimeProps){
    if (runtimeProps.image){
        switch (sizing){
            case ContentSizing.original:
                runtimeProps.sr = runtimeProps.dr = newRect;
                break;
            case ContentSizing.fit:
                runtimeProps.sr = getUrlImageRect(runtimeProps);
                runtimeProps.dr = fitRect(runtimeProps.sr, newRect);
                break;
            case ContentSizing.fill:
                runtimeProps.sr = getUrlImageRect(runtimeProps);
                runtimeProps.dr = fillRect(runtimeProps.sr, newRect);
                break;
            case ContentSizing.center:
                var fsr = getUrlImageRect(runtimeProps);
                var sw = Math.min(fsr.width, newRect.width);
                var sh = Math.min(fsr.height, newRect.height);

                runtimeProps.sr = {
                    x: Math.abs(Math.min((newRect.width - fsr.width)/2 + .5|0, 0)),
                    y: Math.abs(Math.min((newRect.height - fsr.height)/2 + .5|0, 0)),
                    width: sw, height: sh
                };
                runtimeProps.dr = {
                    x: Math.max((newRect.width - fsr.width)/2 + .5|0, 0),
                    y: Math.max((newRect.height - fsr.height)/2 + .5|0, 0),
                    width: sw, height: sh
                };
                break;
            case ContentSizing.stretch:
                runtimeProps.sr = getUrlImageRect(runtimeProps);
                runtimeProps.dr = newRect;
                break;
        }
    }
}
function getUrlImageRect(runtimeProps){
    return {x: 0, y: 0, width: runtimeProps.image.width, height: runtimeProps.image.height};
}

FrameSource.prepareProps = function(sizing, oldRect, newRect, runtimeProps, changes){
    switch (sizing){
        case ContentSizing.manual:
            var dw = newRect.width - oldRect.width;
            var dh = newRect.height - oldRect.height;
            var ndr = Object.assign({}, runtimeProps.dr, {width: runtimeProps.dr.width + dw, height: runtimeProps.dr.height + dh});
            changes.sourceProps = {sr: runtimeProps.sr, dr: ndr};
            break;
    }
};

function initFontSource(source) {
    return Promise.resolve({glyph: IconsInfo.findGlyphString(source.family, source.name)});
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

FrameSource.resize = function(source, sizing, newRect, runtimeProps){
    if (runtimeProps){
        resizeUrlImage(sizing, newRect, runtimeProps); //only one supported for now
    }
};

FrameSource.isEditSupported = function(source){
    if (!source){
        return false;
    }
    return source.type === FrameSource.types.url;
};

FrameSource.isFillSupported = function(source){
    if (!source){
        return false;
    }
    return source.type === FrameSource.types.font;
};


FrameSource.clone = function(source) {
    return Object.assign(FrameSourceDefault(), source);
}

FrameSource.createFromResource = function(resourceId){
    var source = Object.assign(FrameSourceDefault(), {
        t: Types.FrameSource,
        type:FrameSource.types.resource,
        resourceId:resourceId
    });

    return source;
};

FrameSource.createFromResourceAsync = function(resourceId){
    var source = Object.assign(FrameSourceDefault(), {
        t: Types.FrameSource,
        type:FrameSource.types.resource,
        resourceId:resourceId
    });

    return FrameSource.init(source);
};


FrameSource.createEmpty = function(){
    var source = Object.assign(FrameSourceDefault(), {
        t: Types.FrameSource,
        type:FrameSource.types.none
    });

    return source;
};


FrameSource.createFromTemplate = function(templateId){
    var source = Object.assign(FrameSourceDefault(), {
        t: Types.FrameSource,
        type:FrameSource.types.template,
        templateId:templateId
    });

    return source;
};

FrameSource.createFromSprite = function(spriteName, imageName){
    var source =  Object.assign(FrameSourceDefault(), {
        t: Types.FrameSource,
        type:FrameSource.types.sprite,
        name:imageName,
        spriteName:spriteName
    });

    return source;
};

FrameSource.createFromUrl = function(url){
    return Object.assign(FrameSourceDefault(), {
        t: Types.FrameSource,
        url: url
    });
};

FrameSource.createFromFont = function(fontFamily, value){
    var defaultValue = FrameSourceDefault();

    var props = {
        t: Types.FrameSource,
        type:FrameSource.types.font,
        name:value
    };

    if (fontFamily !== defaultValue.family){
        props.family = fontFamily;
    }

    return Object.assign(defaultValue, props);
};


FrameSource.Empty = FrameSource.createEmpty();

export default FrameSource;
