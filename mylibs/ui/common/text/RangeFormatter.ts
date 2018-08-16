import UIElement from "../../../framework/UIElement";
import PropertyMetadata from "../../../framework/PropertyMetadata";
import {Types} from "../../../framework/Defs";
import Font from "../../../framework/Font";
import { ChangeMode, IText, ITextProps } from "carbon-core";
import Brush from "../../../framework/Brush";
import { TextAdapter } from "../../../framework/text/TextAdapter";
import { LazyFormatting } from "carbon-text";

var debug = require("DebugUtil")("carb:rangeFormatter");

export default class RangeFormatter extends UIElement {
    private _element: IText;
    private _internalUpdate: boolean;
    private _adapter: TextAdapter;

    initFormatter(app, adapter: TextAdapter, element){
        this._app = app;
        this._adapter = adapter;
        this._adapter.selectionChanged().bind(this.selectionChanged);
        this._element = element;

        this._internalUpdate = true;
        this.setProps({ fill: Brush.createFromCssColor(element.props.font.color), name: element.name }, ChangeMode.Root);
        this._internalUpdate = false;
    }
    getFirstFont(){
        var range = this._adapter.getRange(0, 0);
        var formatting = range.getFormatting();
        return this._formattingToFont(formatting);
    }
    selectionChanged = (formatting: LazyFormatting) => {
        var modifyingInsert = this._adapter.isModifyingInsertFormatting();
        var f = modifyingInsert ? this._adapter.nextInsertFormatting() : formatting();
        if (modifyingInsert || this._isFormattingChanged(f, this._adapter.lastFormatting())){
            this._adapter.lastFormatting(f);
            var font = this._formattingToFont(f);
            debug("set font %o", font);

            this._internalUpdate = true;
            let props: Partial<ITextProps> = { font };
            if (font.color !== this.props.font.color) {
                props.fill = Brush.createFromCssColor(font.color);
            }
            this.setProps(props, ChangeMode.Root);
            this._internalUpdate = false;
        }
    }
    onRangeFormattingChanged = (range) => {
        if (range.isDocumentRange()) {
            let fontExtension = null;
            let rangeFormatting = range.getFormatting();
            for (let prop in rangeFormatting) {
                if (prop === "text") {
                    continue;
                }
                let value = rangeFormatting[prop];
                if (value !== undefined) {
                    fontExtension = fontExtension || {};
                    fontExtension[prop] = value;
                }
            }

            if (fontExtension) {
                var newFont = Font.extend(this._element.props.font, fontExtension);
                this._element.setProps({font: newFont});
            }
        }
    }
    setProps(changes, mode){
        if (mode === ChangeMode.Model && !this._internalUpdate) {
            if (changes.font || changes.fill) {
                let font = changes.font;
                if (changes.fill) {
                    font = font || this.props.font;
                    font = Font.extend(font, { color: changes.fill.value });
                }
                this._fontChanged(font);
            }
            if (changes.name) {
                this._element.name = (changes.name);
            }
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

    _fontChanged(font: Font){
        var range = this._adapter.selectedRange();

        var formatting = this._fontToFormatting(font);
        debug("set formatting %s", JSON.stringify(formatting.keys.map((x, i) => {return {[x]: formatting.values[i]}})));
        range.setFormatting(formatting.keys, formatting.values);

        let fontExtension = null;

        if (formatting.valign !== null){
            var newFont = Font.extend(this._element.props.font, {valign: formatting.valign});
            this._element.setProps({font: newFont});
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