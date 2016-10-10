import UIElement from "../UIElement";
import Brush from "../Brush";
import Font from "../Font";
import {TextAlign} from "../Defs";
import {deepEquals} from "../../util";
import PropertyMetadata from "../PropertyMetadata";
import TextEngine from "./textengine";
import styleManager from "../style/StyleManager";

export default class Text extends UIElement {
    displayType(){
        return "Text";
    }

    prepareProps(changes){
        super.prepareProps(changes);
        var contentChanged = changes.content !== undefined;
        var widthChanged = changes.width !== undefined && changes.width !== this.width();
        var autoWidthChanged = changes.autoWidth !== undefined;
        var heightChanged = changes.height !== undefined && changes.height !== this.height();
        var fontChanged = changes.font !== undefined;

        var dimensionsAffected = contentChanged || widthChanged || autoWidthChanged || heightChanged || fontChanged;
        var textAlignChanged = fontChanged && changes.font.align !== TextAlign.left;

        if ((widthChanged && !autoWidthChanged) || textAlignChanged){
            changes.autoWidth = false;
        }
        if (autoWidthChanged && changes.autoWidth){
            if (!fontChanged || changes.font.align !== TextAlign.left){
                changes.font = Font.extend(this.props.font, changes.font, {align: TextAlign.left});
            }
        }

        if (dimensionsAffected){
            var syncWidth = this.props.autoWidth;
            if (changes.autoWidth !== undefined){
                syncWidth = changes.autoWidth === true;
            }
            if (changes.font === undefined){
                changes.font = this.props.font;
            }
            this._ensureBoundaryBox(changes, syncWidth);
        }

        if (fontChanged){
            var content = changes.content !== undefined ? changes.content : this.props.content;
            var keys = Object.keys(changes.font).filter(x => changes.font[x] !== this.props.font[x]);
            if (Array.isArray(content)){
                for (let i = 0, l = content.length; i < l; ++i) {
                    let part = content[i];
                    for (var j = 0; j < keys.length; j++){
                        var key = keys[j];
                        delete part[key];
                    }
                }
                changes.content = content;
            }
        }

        if (changes.textStyleId !== undefined) {
            extend(changes, styleManager.getStyle(changes.textStyleId, 2).props);
        }
    }
    propsUpdated(newProps, oldProps){
        if (!newProps.keepEngine //to avoid disposal when editing inline
            && (newProps.width !== undefined
            || newProps.height !== undefined
            || newProps.autoWidth !== undefined
            || newProps.font !== undefined
            || newProps.content !== undefined)){
            delete this.runtimeProps.engine;
        }
        super.propsUpdated.apply(this, arguments);
    }

    _ensureBoundaryBox(changes, forceWidth){
        var width;
        if (changes.width !== undefined){
            width = changes.width;
        }
        else{
            width = changes.width = this.width();
        }
        var height;
        if (changes.height !== undefined){
            height = changes.height;
        }
        else{
            height = changes.height = this.height();
        }
        if (changes.autoWidth === undefined){
            changes.autoWidth = this.props.autoWidth;
        }
        if (changes.content === undefined){
            changes.content = this.props.content;
        }
        var engine = this.createEngine(changes);
        var actualWidth = engine.getActualWidth();
        var actualHeight = engine.getActualHeight();
        if (width < actualWidth || forceWidth){
            changes.width = actualWidth + .5|0;
        }
        if (height < actualHeight){
            changes.height = actualHeight + .5|0;
        }
    }

    drawSelf(context, w, h, environment){
        context.save();
        
        if (this.runtimeProps.engine === undefined){
            this.createEngine();
        }
        else {
            TextEngine.setDefaultFormatting(this.props.font);
        }

        context.rectPath(0, 0, w, h);
        Brush.fill(this.backgroundBrush(), context, 0, 0, w, h);
        if (this.runtimeProps.drawText === false){
            context.restore();
            return;
        }
        Brush.stroke(this.borderBrush(), context, 0, 0, w, h);

        var verticalOffset = this.getVerticalOffset(this.runtimeProps.engine);
        if (verticalOffset !== 0){
            context.translate(0, verticalOffset);
        }
        this.runtimeProps.engine.render(context, this.runtimeProps.drawSelection, verticalOffset, environment.view.focused());

        context.restore();
    }

    getVerticalOffset(engine){
        var offset = 0, h;
        var height = this.height();
        var align = this.props.font.valign;
        if (align == TextAlign.middle){
            h = engine.getActualHeight();
            offset = (height - h)/2;
        } else if (align === TextAlign.bottom){
            h = engine.getActualHeight();
            offset = height - h;
        }
        return offset;
    }

    createEngine(props = this.props){
        TextEngine.setDefaultFormatting(props.font);

        var engine = new TextEngine();
        engine.updateSize(props.autoWidth ? 10000 : props.width, 10000);
        engine.setText(props.content);
        this.runtimeProps.engine = engine;
        return engine;
    }

    cursor(){
        if (this.runtimeProps.drawSelection){
            return "text";
        }
        super.cursor();
    }

    textStyleId(value) {
        if (arguments.length > 0) {
            this.setProps({textStyleId: value});
        }

        return this.props.textStyleId;
    }
    getTextStyleProps() {
        var stylePropNames = PropertyMetadata.getStylePropertyNamesMap(this.systemType(), 2);
        var res = {};
        for (var name in stylePropNames) {
            res[name] = sketch.util.flattenObject(this.props[name]);
        }
        return res;
    }
    hasPendingTexStyle(){
        if (!this.props.textStyleId){
            return false;
        }
        var baseStyle = styleManager.getStyle(this.props.textStyleId, 2);

        for (var p in baseStyle.props){
            if (!deepEquals(this.props[p], baseStyle.props[p])) {
                return true;
            }
        }
        return false;
    }
}


PropertyMetadata.registerForType(Text, {
    content: {
        defaultValue: "Your text here"
    },
    textStyleId: {
        displayName: "Text style",
        type: "textStyleName"
    },
    visibleWhenDrag: {
        defaultValue: false
    },
    font: {
        displayName: "Font",
        type: "font",
        options: {
            fonts: [{name: "Open Sans", value: "Open Sans"}]
        },
        defaultValue: Font.Default,
        style: 2
    },
    autoWidth: {
        displayName: "Width",
        type: "switch",
        options: {
            hasLabels: true,
            items: [
                {label: "Auto", value: true},
                {label: "Fixed", value: false}
            ]
        },
        defaultValue: true
    },
    groups: function(element){
        var ownGroups = [
            {
                label: element ? element.displayType() : '',
                properties: ["autoWidth"]
            },
            {
                label: "Font",
                properties: ["textStyleId", "font"]
            }
        ];

        var baseGroups = PropertyMetadata.findForType(UIElement).groups();
        return ownGroups.concat(baseGroups);
    },
    getNonRepeatableProps: function(element, newProps){
        var base = PropertyMetadata.findForType(UIElement).getNonRepeatableProps(element);
        var props = newProps && newProps.autoWidth !== undefined ? newProps : element.props;
        if (props.autoWidth){
            return base.concat(["width", "height", "content"]);
        }
        return base.concat(["content", "height"]);
    }
});