define(["framework/Properties", "framework/Deferred", "framework/TypeDefaults"], function(Properties, Deferred, TypeDefaults){
    var fwk = sketch.framework;

    var ImageSource = sketch.framework.ImageSource = {};

    ImageSource.types = {
        none:0,
        font:1,
        resource:2,
        sprite:3,
        template:4,
        url:5
    }

    function ImageSourceType (){}
    ImageSourceType.prototype = {
        type:ImageSource.types.font,
        fillBrush:fwk.Brush.createFromResource("default.text"),
        strokeBrush:fwk.Stroke.Empty
    };

    var imageSourceDefault = TypeDefaults["ImageSource"] = function(){
        return new ImageSourceType();
    }

    function drawNone(context, x, y, w, h) {
        if(this.skipDraw){
            return;
        }
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
            fwk.Brush.setFill(source.fillBrush, context, x, y, w, h);
            context.fillText(source.str, x + ~~((w - measure.width) /2), y + ~~(h/2));
        }
        if(source.strokeBrush && source.strokeBrush.type){
            fwk.Brush.setStroke(source.strokeBrush, context, x, y, w, h);
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

    function drawURL(source, context, x, y, w, h) {
        var image = source._image;
        var sw = source.width,
           sh = source.height,
           dw = w !== undefined ? w : sw,
           dh = h !== undefined ? h : sh;

        if (image && image.width && image.height){
           var fitSize = sketch.util.fitDimensions(sw, sh, dw, dh, true);
           var fitX = ~~(x + 0.5 + dw/2 - fitSize.width/2) - 0.5;
           var fitY = ~~(y + 0.5 + dh/2 - fitSize.height/2) - 0.5;
           context.drawImage(image, 0, 0, sw, sh, fitX, fitY, fitSize.width, fitSize.height);
        }
    }


    ImageSource.draw = function(source, context, x, y, w, h) {
        switch(source.type){
            case ImageSource.types.font:
                drawFont(source, context, x, y, w, h);
                return;
            case ImageSource.types.resource:
                drawResource(source, context, x, y, w, h);
                return;
            case ImageSource.types.sprite:
                drawSprite(source, context, x, y, w, h);
                return;
            case ImageSource.types.template:
                drawTemplate(source, context, x, y, w, h);
                return;
            case ImageSource.types.url:
                drawURL(source, context, x, y, w, h);
                return;

            default:
                drawNone(context, x, y, w, h);
        }
    }

    ImageSource.hasValue = function(source) {
        switch(source.type){
            case ImageSource.types.font:
                return source.value && source.fontFamily;
            case ImageSource.types.resource:
                return source.resourceId;
            case ImageSource.types.sprite:
                return source.spriteName;
            case ImageSource.types.template:
                return source.templateId;
            case ImageSource.types.url:
                return source.url;

            default:
                return false;
        }
    }

    ImageSource.toString = function(source) {
        switch(source.type){
            case ImageSource.types.font:
                return "font " + source.name + " " + source.fontFamily;
            case ImageSource.types.resource:
                return "resource " + source.resourceId;
            case ImageSource.types.sprite:
                return "sprite " + source.spriteName;
            case ImageSource.types.template:
                return "template " + source.templateId;
            case ImageSource.types.url:
                return "url " + source.url;
            default:
                return '';
        }
    }

    ImageSource.size =  function(source){
        return {
            width: source.width,
            height: source.height
        }
    }
    ImageSource.boundaryRect = function(source) {
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
        source.y = icon.y;;
        source.width = icon.width;
        source.height = icon.height;

       return Deferred.createResolvedPromise(source);
    }

    function initTemplateSource(source) {
        ensureTemplateLoaded(source);
        return Deferred.createResolvedPromise(source);
    }

    function initUrlSource(source) {
        //if (imageElement){
        //    source._imageElement = imageElement;// ??????????
        //}

        var url = source.url;
        if(!url /*&& source._imageElement*/){
            //source._imageElement.setProps({source:fwk.ImageSource.None()});
            return Deferred.createResolvedPromise(ImageSource.createEmpty());
        }

        var deferred = Deferred.create();

        if(url[0] !== '/' && url[0] !== '.' && sketch.params.storageUrl
            && url.substr(0, sketch.params.storageUrl.length) !== sketch.params.storageUrl
            && url.substr(0, "data:image/png".length) !== "data:image/png") {
            url = sketch.params.exportServiceUrl + "Content/ImageURL?url=" + url;
        }

        //var notFromCache = false;
        var image;
        var update = function(){
            if (source._isLoaded) {
                deferred.resolve(source);
                return deferred.promise();
            }
            if (image.width !== source.width){
                source.width = image.width;
            }
            if (image.height !== source.height){
                source.height = image.height;
            }
            source._image = image;
            source._isLoaded = true;
            image.onload = null;
            image.onerror = null;
            fwk.Resources[url] = image;
            deferred.resolve(source);

            //if (notFromCache){
            //    fwk.pubSub.publish("image.loadedFromUrl", source._imageElement);  //?????????
            //}
        };

        if (!source._isLoaded){

            image = fwk.Resources[url];
            if (image){
                update();
            }
            else {
                image = new Image();

                //data: urls cannot be loaded in safari with crossOrigin flag
                if (url.substr(0, "data:".length) !== "data:"){
                    image.crossOrigin = "anonymous";
                }

                image.onload = update;
                image.onerror = function(){
                    that._isLoaded = true;
                    deferred.resolve(source);
                };
                //notFromCache = true;
                image.setSource(url);
            }
        }
        else {
            deferred.resolve(source);
        }

        return deferred.promise();
    }


    function initFontSource(source) {
        source = Object.assign(imageSourceDefault(), source);
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


    ImageSource.init = function(source) {
        switch(source.type){
            case ImageSource.types.font:
                return initFontSource(source);
            case ImageSource.types.resource:
                return initResourceSource(source);
            case ImageSource.types.sprite:
                return initSpriteSource(source);
            case ImageSource.types.template:
                return initTemplateSource(source);
            case ImageSource.types.url:
                return initUrlSource(source);
            default:
                return Deferred.createResolvedPromise(source);
        }
    }


    var defaults = {
        __type__:"ImageSource",
        width:0,
        height:0
    }

    ImageSource.clone = function(source) {
        return Object.assign({}, source);
    }

    ImageSource.createFromResource = function(resourceId){
        var source = Object.assign(imageSourceDefault(), {
            type:ImageSource.types.resource,
            resourceId:resourceId
        });

        ImageSource.init(source);

        return source;
    };

    ImageSource.createFromResourceAsync = function(resourceId){
        var source = Object.assign(imageSourceDefault(), {
            type:ImageSource.types.resource,
            resourceId:resourceId
        });

        return ImageSource.init(source);
    };


    ImageSource.createEmpty = function(skipDraw){
        var source = Object.assign(imageSourceDefault(), {
            type:ImageSource.types.none,
            skipDraw:skipDraw
        });


        return source;
    };


    ImageSource.createFromTemplate = function(templateId){
        var source = Object.assign(imageSourceDefault(), {
            type:ImageSource.types.template,
            templateId:templateId
        });

        ImageSource.init(source);

        return source;
    };

    ImageSource.createFromSprite = function(spriteName, imageName){
        var source =  Object.assign(imageSourceDefault(), {
            type:ImageSource.types.sprite,
            name:imageName,
            spriteName:spriteName
        });

        ImageSource.init(source);

        return source;
    };

    ImageSource.createFromUrl = function(url){
        var source =  Object.assign(imageSourceDefault(), {
            type:ImageSource.types.url,
            url:url
        });

        ImageSource.init(source);

        return source;
    };

    ImageSource.createFromUrlAsync = function(url){
        var source =  Object.assign(imageSourceDefault(), {
            type:ImageSource.types.url,
            url:url
        });

        return ImageSource.init(source);
    };

    ImageSource.createFromFont = function(fontFamily, value, width, height){
        var defaultValue = imageSourceDefault();
        defaultValue.fontFamily = defaultValue.fontFamily || sketch.ui.IconsInfo.defaultFontFamily;
        defaultValue.fillBrush = defaultValue.fillBrush || fwk.Brush.createFromResource("default.text");
        defaultValue.strokeBrush = defaultValue.strokeBrush || fwk.Stroke.Empty;

        var source =  Object.assign(defaultValue, {
            type:ImageSource.types.font,
            fontFamily:fontFamily,
            name:value,
            width:width||0,
            height:height||0
        });

        ImageSource.init(source);

        return source;
    };


    ImageSource.None = function() { return ImageSource.createEmpty(); };
    ImageSource.Empty = function() { return ImageSource.createEmpty(true); };

    return ImageSource;
});