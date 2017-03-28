import TypeDefaults from "./TypeDefaults";
import Brush from "./Brush";
import backend from "../backend";
import {ContentSizing, Types} from "./Defs";
import {fitRect, fillRect} from "../math/Fitting";
import IconsInfo from "../ui/IconsInfo";
import Rect from "../math/rect";
import { Dictionary } from "carbon-basics";

const FrameSource: Dictionary = {};

FrameSource.types = {
    none:0,
    font:1,
    url:5
};

function FrameSourceType (){}
FrameSourceType.prototype = {
    type: FrameSource.types.url,
    family: IconsInfo.defaultFontFamily
};

const FrameSourceDefault = TypeDefaults[Types.FrameSource] = function(){
    return new FrameSourceType();
};

const iconProps = {fill: Brush.createFromColor("#ABABAB"), stroke: Brush.Empty};
const iconRuntimeProps = {glyph: IconsInfo.findGlyphString(IconsInfo.defaultFontFamily, "image")};
function drawEmpty(context, w, h) {
    context.save();
    context.fillStyle = "#DEDEDE";
    context.fillRect(0, 0, w, h);

    let iw = w;
    let ih = h;
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

    const s = Math.min(w, h) - 2;
    context.font = s+'px ' + family;
    context.lineHeight = 1;
    context.textBaseline = 'middle';

    const measure = context.measureText(runtimeProps.glyph);
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
    const sw = source.width,
        sh = source.height,
        dw = w !== undefined ? w : sw,
        dh = h !== undefined ? h : sh;

    if (source.image){
        context.drawImage(source.image, 0, 0, sw, sh, x, y, dw, dh);
    }
}

function drawSprite(source, context, x, y, w, h) {
    // const sw = source.width,
    //     sh = source.height;
    // const dw = w === undefined ? sw : w;
    // const dh = h === undefined ? sh : h;
    // const sprite = fwk.Resources[source.spriteName];
    // context.drawImage(sprite, source.x, source.y, sw, sh, x, y, dw, dh);
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
            //drawResource(source, context, x, y, w, h);
            return;
        case FrameSource.types.sprite:
            //drawSprite(source, context, x, y, w, h);
            return;
        case FrameSource.types.template:
            //drawTemplate(source, context, x, y, w, h);
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
            return source.name && source.family;
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

FrameSource.toString = function(source?) {
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
            if (!runtimeProps || !runtimeProps.image){
                return null;
            }
            return getUrlImageRect(runtimeProps);
        default:
            return null;
    }
};

function loadUrl(source, sourceProps) {
    let url = source.url;
    if(!url){
        return Promise.resolve({empty: true});
    }

    let cors = sourceProps && sourceProps.cors;
    if (!cors && url[0] !== '/' && url[0] !== '.'
        && url.substr(0, backend.fileEndpoint.length) !== backend.fileEndpoint
        && url.substr(0, "data:image/png".length) !== "data:image/png") {
        url = backend.servicesEndpoint + "/api/proxy?" + url;
    }

    return new Promise((resolve) => {
        const image = new Image();

        //data: urls cannot be loaded in safari with crossOrigin flag
        if (url.substr(0, "data:".length) !== "data:"){
            image.crossOrigin = "anonymous";
        }

        image.onload = function(){
            const runtimeProps = {image};
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
    const image = runtimeProps.image;
    if (image){
        const sr = runtimeProps.sr;
        const dr = runtimeProps.dr;
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
                const fsr = getUrlImageRect(runtimeProps);
                const sw = Math.min(fsr.width, newRect.width);
                const sh = Math.min(fsr.height, newRect.height);

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
    return new Rect(0, 0, runtimeProps.image.width, runtimeProps.image.height);
}

FrameSource.prepareProps = function(source, sizing, oldRect, newRect, props, runtimeProps, changes, fitUrl){
    if (runtimeProps){
        switch (sizing){
            case ContentSizing.manual:
                const dw = newRect.width - oldRect.width;
                const dh = newRect.height - oldRect.height;
                const ndr = Object.assign({}, runtimeProps.dr, {
                    width: runtimeProps.dr.width + dw,
                    height: runtimeProps.dr.height + dh
                });
                changes.sourceProps = Object.assign({}, props, {sr: runtimeProps.sr, dr: ndr});
                break;
        }
    }

    if (props && props.urls && fitUrl){
        const ar = props.width/props.height;
        let bestLink = null;
        for (let i = 0; i < props.urls.links.length; i++){
            const link = props.urls.links[i];
            if (link.w >= newRect.width && link.w/ar >= newRect.height){
                bestLink = link;
                break;
            }
        }
        if (bestLink === null){
            bestLink = props.urls.links[props.urls.links.length - 1];
        }
        const bestUrl = props.urls.raw + bestLink.url;
        if (bestUrl !== source.url){
            changes.source = this.createFromUrl(bestUrl);
            if (changes.sourceProps && changes.sourceProps.sr){
                const scale = bestLink.w/props.cw;
                changes.sourceProps.sr = {
                    x: Math.round(changes.sourceProps.sr.x * scale),
                    y: Math.round(changes.sourceProps.sr.y * scale),
                    width: changes.sourceProps.sr.width * scale + .5|0,
                    height: changes.sourceProps.sr.height * scale + .5|0
                };
            }
            changes.sourceProps = Object.assign({}, props, changes.sourceProps, {cw: bestLink.w});
        }
    }
};

function initFontSource(source) {
    return Promise.resolve({glyph: IconsInfo.findGlyphString(source.family, source.name)});
}


FrameSource.load = function(source, sourceProps) {
    switch(source.type){
        case FrameSource.types.font:
            return initFontSource(source);
        case FrameSource.types.url:
            return loadUrl(source, sourceProps);
        default:
            return null;
    }
};

FrameSource.resize = function(source, sizing, newRect, runtimeProps){
    if (runtimeProps){
        resizeUrlImage(sizing, newRect, runtimeProps); //only one supported for now
    }
};

FrameSource.shouldClip = function(source, w, h, runtimeProps){
    switch (source.type){
        case FrameSource.types.url:
            if (!runtimeProps){
                return false;
            }
            var dr = runtimeProps.dr;
            if (!dr){
                return false;
            }
            return dr.x < 0 || dr.x + dr.width > w || dr.y < 0 || dr.y + dr.height > h;
    }
    return false;
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
    const source = Object.assign(FrameSourceDefault(), {
        t: Types.FrameSource,
        type: FrameSource.types.resource,
        resourceId: resourceId
    });

    return source;
};

FrameSource.createFromResourceAsync = function(resourceId){
    const source = Object.assign(FrameSourceDefault(), {
        t: Types.FrameSource,
        type: FrameSource.types.resource,
        resourceId: resourceId
    });

    return FrameSource.init(source);
};


FrameSource.createEmpty = function(){
    const source = Object.assign(FrameSourceDefault(), {
        t: Types.FrameSource,
        type: FrameSource.types.none
    });

    return source;
};


FrameSource.createFromTemplate = function(templateId){
    const source = Object.assign(FrameSourceDefault(), {
        t: Types.FrameSource,
        type: FrameSource.types.template,
        templateId: templateId
    });

    return source;
};

FrameSource.createFromSprite = function(spriteName, imageName){
    const source = Object.assign(FrameSourceDefault(), {
        t: Types.FrameSource,
        type: FrameSource.types.sprite,
        name: imageName,
        spriteName: spriteName
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
    const defaultValue = FrameSourceDefault();

    const props: Dictionary = {
        t: Types.FrameSource,
        type: FrameSource.types.font,
        name: value
    };

    if (fontFamily !== defaultValue.family){
        props.family = fontFamily;
    }

    return Object.assign(defaultValue, props);
};


FrameSource.Empty = FrameSource.createEmpty();

export default FrameSource;
