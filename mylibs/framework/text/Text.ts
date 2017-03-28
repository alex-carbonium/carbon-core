import UIElement from "../UIElement";
import Brush from "../Brush";
import Font from "../Font";
import {Types} from "../Defs";
import {deepEquals} from "../../util";
import PropertyMetadata from "../PropertyMetadata";
import TextEngine from "./textengine";
import styleManager from "../style/StyleManager";
import { IContainer, IDataElement } from "carbon-core";
import { TextAlign, Dictionary } from "carbon-basics";

class Text extends UIElement implements IContainer, IDataElement {
    prepareProps(changes){
        var dataProvider = changes.dp;

        super.prepareProps(changes);

        var contentChanged = changes.content !== undefined;
        var brChanged = changes.br !== undefined;
        var autoWidthChanged = changes.autoWidth !== undefined;
        var fontChanged = changes.font !== undefined;

        var dimensionsAffected = contentChanged || brChanged || autoWidthChanged || fontChanged;
        var textAlignChanged = fontChanged && changes.font.align !== TextAlign.left;

        if (textAlignChanged){
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
            if (!fontChanged){
                changes.font = this.props.font;
            }
            this._ensureBoundaryBox(changes, syncWidth);
            if (!fontChanged){
                delete changes.font;
            }
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

        if (contentChanged && this.props.dp && !dataProvider){
            changes.dp = null;
        }
    }
    propsUpdated(newProps, oldProps){
        if (!this.runtimeProps.keepEngine //to avoid disposal when editing inline
            && (newProps.br !== undefined
            || newProps.autoWidth !== undefined
            || newProps.font !== undefined
            || newProps.content !== undefined)){
            delete this.runtimeProps.engine;
        }
        super.propsUpdated.apply(this, arguments);
    }

    _ensureBoundaryBox(changes, forceWidth){
        var br = changes.br || this.getBoundaryRect();

        if (changes.autoWidth === undefined){
            changes.autoWidth = this.props.autoWidth;
        }
        if (changes.content === undefined){
            changes.content = this.props.content;
        }
        var engine = this.createEngine(changes);
        var actualWidth = engine.getActualWidth();
        var actualHeight = engine.getActualHeight();

        var newWidth = br.width;
        if (br.width < actualWidth || forceWidth){
            newWidth = actualWidth + .5|0;
        }
        var newHeight = br.height;
        if (br.height < actualHeight){
            newHeight = actualHeight + .5|0;
        }
        changes.br = br.withSize(newWidth, newHeight);
    }

    applySizeScaling(s, o, options, changeMode){
        this.prepareAndSetProps({autoWidth: false}, changeMode);
        super.applySizeScaling.apply(this, arguments);
    }

    drawSelf(context, w, h, environment){
        context.save();

        if (this.runtimeProps.engine === undefined){
            this.createEngine();
        }
        else {
            TextEngine.setDefaultFormatting(this.props.font);
        }

        context.beginPath();
        context.rectPath(0, 0, w, h);
        Brush.fill(this.fill(), context, 0, 0, w, h);
        if (this.runtimeProps.drawText === false){
            context.restore();
            return;
        }
        context.lineWidth = this.strokeWidth();
        Brush.stroke(this.stroke(), context, 0, 0, w, h);

        var verticalOffset = this.getVerticalOffset(this.runtimeProps.engine);
        if (verticalOffset !== 0){
            context.translate(0, verticalOffset);
        }
        this.runtimeProps.engine.render(context, this.runtimeProps.drawSelection, verticalOffset, environment.view?environment.view.focused():false);

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
        engine.updateSize(props.autoWidth ? 10000 : (props.br || this.getBoundaryRect()).width, 10000);
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
            res[name] = window['sketch'].util.flattenObject(this.props[name]);
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

    getNonRepeatableProps(newProps){
        var base = super.getNonRepeatableProps();
        var props = newProps && newProps.autoWidth !== undefined ? newProps : this.props;
        if (props.autoWidth){
            return base.concat(["br", "content"]);
        }
        return base.concat(["content"]);
    }

    initFromData(content){
        this.prepareAndSetProps({content, dp: this.props.dp});
    }

    canAccept(elements, autoInsert, allowMoveInOut) {
        if (elements.length !== 1) {
            return false;
        }
        var other = elements[0];
        return other instanceof Text && other.runtimeProps.isDataElement;
    }

    add(text: Text, mode){
        return this.insert(text, 0, mode);
    }

    insert(text: Text, index, mode){
        this.prepareAndSetProps(text.selectProps(["content", "dp", "df"]));
        return this;
    }

    remove(){
        return -1;
    }

    autoPositionChildren(): boolean{
        return true;
    }

    get children(){
        return null;
    }

    globalMatrixToLocal(m: any) {
        return m;
    }

    static fromSvgElement(element, parsedAttributes, matrix){
        //
        // :
        // "cls-5"
        // clip-path
        // :
        // "url(#clip-_3D_Touch)"
        // data-name
        // :
        // "New Message"
        // font-family
        // :
        // "Helvetica"
        // font-size
        // :
        // "18px"
        // id
        //     :
        //     "New_Message"
        // transformMatrix
        //     :
        //     Matri
        var text = new Text();
        var font: Dictionary = {};
        if(parsedAttributes.fontSize){
            font.size = parsedAttributes.fontSize.replace('px','');
        }

        if(parsedAttributes.fontFamily){
            font.family = 'Open Sans';//TODO: parsedAttributes.fontFamily;
        }

        var md = matrix.decompose();

        var props = {
            content:parsedAttributes.text,
            font:Font.createFromObject(font),
            x: md.translation.x,
            y: md.translation.y
        }



        text.prepareAndSetProps(props);

        return text;
    }
}
Text.prototype.t = Types.Text;

PropertyMetadata.registerForType(Text, {
    content: {
        defaultValue: "Your text here"
    },
    textStyleId: {
        displayName: "Text style",
        type: "textStyleName"
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
        var baseGroups = PropertyMetadata.findForType(UIElement).groups();

        var ownGroups = [
            baseGroups.find(x => x.label === "Layout"),
            {
                label: UIElement.displayType(Types.Text),
                properties: [/*"textStyleId",*/ "autoWidth", "font"]
            },
            baseGroups.find(x => x.label === "Appearance"),
            baseGroups.find(x => x.label === "@constraints")
        ];

        return ownGroups;
    }
});

export default Text;