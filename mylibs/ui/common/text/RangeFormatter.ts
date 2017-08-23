import UIElement from "framework/UIElement";
import PropertyMetadata from "framework/PropertyMetadata";
import {Types} from "framework/Defs";
import Font from "framework/Font";
import { ChangeMode } from "carbon-core";

var debug = require("DebugUtil")("carb:rangeFormatter");

export default class RangeFormatter extends UIElement {
    initFormatter(app, engine, element){
        this._app = app;
        this._engine = engine;
        this._engine.selectionChanged(this.selectionChanged);
        this._element = element;
    }
    getFirstFont(){
        var range = this._engine.getRange(0, 0);
        var formatting = range.getFormatting();
        return this._formattingToFont(formatting);
    }
    selectionChanged = formatting => {
        var modifyingInsert = this._engine.isModifyingInsertFormatting();
        var f = modifyingInsert ? this._engine.nextInsertFormatting() : formatting();
        if (modifyingInsert || this._isFormattingChanged(f, this._engine.lastFormatting())){
            this._engine.lastFormatting(f);
            var font = this._formattingToFont(f);
            debug("set font %s", JSON.stringify(font));
            this.setProps({font}, ChangeMode.Root);
        }
    };
    setProps(changes, mode){
        if (mode === ChangeMode.Model && changes.font !== undefined){
            this._fontChanged(changes.font);
        }
        super.setProps.apply(this, arguments);
    }
    hasPendingTexStyle(){
        return false;
    }
    createSelectionFrame(){
        return {
            element: this,
            frame: false,
            points: []
        }
    }

    _fontChanged(font){
        var range = this._engine.selectedRange();
        var formatting = this._fontToFormatting(font);
        debug("set formatting %s", JSON.stringify(formatting.keys.map((x, i) => {return {[x]: formatting.values[i]}})));
        range.setFormatting(formatting.keys, formatting.values);
        if (formatting.valign !== null){
            var font = Font.extend(this._element.props.font, {valign: formatting.valign});
            this._element.setProps({font});
        }
    }

    _fontToFormatting(font){
        var keys = [];
        var values = [];
        var valign = null;
        for (var i in font){
            if (font[i] !== this.props.font[i]){
                if (i === 'valign'){
                    valign = font[i];
                }
                keys.push(i);
                values.push(font[i]);
            }
        }
        return {keys, values, valign};
    }
    _formattingToFont(formatting){
        var changes = null;
        var elementFont = this._element.props.font;
        for (var i in formatting){
            if (i !== "text"){
                var value = formatting[i];
                if (value !== elementFont[i]){
                    changes = changes || {};
                    changes[i] = formatting[i];
                }
            }
        }

        if (changes === null){
            return elementFont;
        }

        return Font.extend(elementFont, changes);
    }
    _isFormattingChanged(f1, f2){
        if (!f1 || !f2){
            return true;
        }

        //formatting is stored in base-base proto for some reason
        var p1 = this._getTopProto(f1);
        var p2 = this._getTopProto(f2);

        var keys1 = Object.keys(p1);
        var keys2 = Object.keys(p2);

        var l1 = keys1.length;
        var l2 = keys2.length;
        if ('text' in p1){
            l1 += 1;
        }
        if ('text' in p2){
            l2 += 1;
        }

        if (l1 !== l2){
            return true;
        }

        for (var i = 0, l = keys1.length; i < l; ++i){
            var key = keys1[i];
            if (key !== "text" && p1[key] !== p2[key]){
                return true;
            }
        }
        return false;
    }
    _getTopProto(o){
        var proto = Object.getPrototypeOf(o);
        while (proto && proto !== Object.prototype){
            o = proto;
            proto = Object.getPrototypeOf(o);
        }
        return o;
    }
    displayName(){
        return this._element.displayName();
    }

    isPhantom(): boolean{
        return true;
    }
}
RangeFormatter.prototype.t = Types.RangeFormatter;

PropertyMetadata.registerForType(RangeFormatter, {
    textStyleId: {
        displayName: "Text style",
        type: "textStyleName"
    },
    font: {
        displayName: "Font",
        type: "font",
        options: {
            fonts: []
        },
        defaultValue: Font.Default,
        style: 2
    },
    groups: function(){
        return [
            {
                label: "Content font",
                properties: [/* "textStyleId",*/ "font"]
            }
        ];
    }
});