import FontInfo from "../font/fontinfo";

import { FontStyle, Dictionary } from "carbon-basics";

export function event() {
    var handlers = [];

    var subscribe: Dictionary = function (handler) {
        handlers.push(handler);
    };

    subscribe.fire = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        handlers = handlers.filter(function(handler) {
            return handler.apply(null, args) !== false;
        });
    };

    subscribe.clearHandlers = function () {
        handlers = [];
    }

    return subscribe;
};

export function cssProperty(string, prop, numeric?: boolean) {
    var regex = new RegExp('\\b(?:' + prop + '\\s*?:\\s*([^;>]*?)(?=[;">}]|$))');
    var m = regex.exec(string);
    if (m && m.length>1) {
        if (numeric) {
            var regnum = /([0-9]*)\.?[0-9]+/;
            var m1 = regnum.exec(m[1]);
            if (m1 && m1.length) {
                return m1[0];
            }
            return null;
        }
        return m[1];
    }
    return null;
}

export function parseFont(font, defaultFormatting){
    var fontFamily = defaultFormatting.family,
        fontSize = null,
        strikeout = defaultFormatting.strikeout,
        fontStyle = defaultFormatting.style,
        fontWeight = defaultFormatting.weight,
        fontVariant = "normal",
        lineHeight = "normal";

    var element;
    var elements = font.split(/\s+/);
    outer: while (element = elements.shift()){
        switch (element){
            case "normal":
                break;

            case "italic":
                fontStyle = "italic";
                break;
            case "oblique":
                strikeout = true;
                break;

            case "small-caps":
                fontVariant = element;
                break;

            case "bold":
                fontWeight = 400;
                break;
            case "bolder":
                fontWeight = 900;
                /* that's wrong, but eh*/
                break;
            case "lighter":
                fontWeight = 200;
                break;
            case "100":
            case "200":
            case "300":
            case "400":
            case "500":
            case "600":
            case "700":
            case "800":
            case "900":
                fontWeight = parseInt(element);
                break;

            default:
                if (!fontSize){
                    var parts = element.split("/");
                    fontSize = parts[0];
                    if (parts.length > 1) lineHeight = parts[1];
                    break;
                }

                fontFamily = element;
                if (elements.length)
                    fontFamily += " " + elements.join(" ");
                break outer;
        }
    }

    var match = fontSize.match(/[0-9]+pt$/)
    if (match && match.length){
        fontSize = parseInt(fontSize);
        fontSize *= /*this should be really system-dependent*/96/72;
    } else{
        fontSize = parseInt(fontSize);
        if (Number.isNaN(fontSize)){
            fontSize = 10;
        }
    }

    return {
        "style": fontStyle === "italic" ? FontStyle.Italic : FontStyle.Normal,
        "variant": fontVariant,
        "weight": fontWeight,
        "size": parseInt(fontSize),
        "lineHeight": lineHeight,
        "family": fontFamily.replace(/^"(.*)"$/, '$1'),
        "strikeout": strikeout
    }
}

export function deCRLFify(text) {
    text = text.replace('\r\n', '\n');
    text = text.replace('\r', '\n'); // <- by doing so, we don't add or lose any newlines
    return text;
};

export function derive(prototype, methods) {
    var properties = {};
    Object.keys(methods).forEach(function(name) {
        properties[name] = { value: methods[name] };
    });
    return Object.create(prototype, properties);
}

export function inherit(target, base) {
    target.prototype = Object.create(base.prototype);
    target.prototype.constructor = target;

    // Mix properties of constructor here as they may contain constants and the such
    for (var prop in base) {
        if (prop && prop.length > 0 && prop !== "constructor" && prop != "toString" && prop.charAt(0) != "_" && !target[prop]) {
            target[prop] = base[prop];
        }
    }
}
