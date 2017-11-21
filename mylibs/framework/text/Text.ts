import UIElement from "../UIElement";
import Brush from "../Brush";
import Font from "../Font";
import { Types } from "../Defs";
import { deepEquals } from "../../util";
import PropertyMetadata from "../PropertyMetadata";
import TextEngine from "./textengine";
import FontManager from "./font/fontmanager";
import styleManager from "../style/StyleManager";
import { IContainer, IDataElement, IText, TextAlign, IUIElement, ITextProps, TextContent, HorizontalConstraint, VerticalConstraint, TextMode, IPooledObject, IMatrix, ChangeMode, ResizeDimension, IRect } from "carbon-core";
import params from "params";
import ContextCommandCache from "framework/render/ContextCommandCache";
import Environment from "../../environment";
import Rect from "../../math/rect";
import Matrix from "../../math/matrix";
import ObjectPool from "../ObjectPool";
import Selection from "../SelectionModel";
import Constraints from "../Constraints";

export default class Text extends UIElement<ITextProps> implements IText, IContainer, IDataElement {
    prepareProps(changes, mode?) {
        let dataProvider = changes.dp;

        super.prepareProps(changes, mode);

        let textChanges = this.allocateTextChanges(changes);

        this.prepareTextMode(textChanges);
        this.prepareFill(textChanges);

        let contentAffected = textChanges.content !== this.props.content
            || textChanges.mode !== this.props.mode
            || textChanges.wrap !== this.props.wrap
            || textChanges.font !== this.props.font;

        if (textChanges.font !== this.props.font) {
            this.updateContentWithFont(textChanges);
        }

        if (contentAffected || textChanges.br !== this.props.br) {
            if (textChanges.mode === TextMode.Label) {
                if (textChanges.br.height !== this.props.br.height) {
                    this.fitFontSizeToHeight(textChanges);
                    contentAffected = contentAffected || textChanges.font !== this.props.font;
                }
                else {
                    this.fitBrToFont(textChanges);
                }
            }
            else {
                this.ensureNotSmallerThanText(textChanges);
            }

            if (contentAffected) {
                this.adjustByFontAlign(textChanges);
            }
        }

        if (changes.textStyleId !== undefined) {
            extend(changes, styleManager.getStyle(changes.textStyleId, 2).props);
        }

        this.copyTextChanges(textChanges, changes);

        if (textChanges.content !== this.props.content && this.props.dp && !dataProvider) {
            changes.dp = null;
        }

        textChanges.free();
    }
    propsUpdated(newProps, oldProps, mode) {
        if (newProps.br !== undefined
            || newProps.mode !== undefined
            || newProps.font !== undefined
            || newProps.content !== undefined
            || newProps.visible !== undefined
            || newProps.wrap !== undefined
        ) {
            if (!this.runtimeProps.editing) {
                delete this.runtimeProps.engine;
            }

            this.refreshMinSizeConstraints();

            delete this.runtimeProps.commandCache;
        }
        super.propsUpdated.apply(this, arguments);

        if ((newProps.font || newProps.content) && mode !== ChangeMode.Self) {
            this.autoGrowParent(newProps.br || this.props.br, oldProps.br || this.props.br);
        }

        if (newProps.mode !== oldProps.mode && Selection.isOnlyElementSelected(this)) {
            Selection.refreshSelection();
        }
    }

    saveOrResetLayoutProps(mode: ChangeMode): boolean {
        if (super.saveOrResetLayoutProps(mode)) {
            this.runtimeProps.origFont = this.font();
            return true;
        }

        this.setProps({
            font: this.runtimeProps.origFont
        }, mode);
        return false;
    }

    clearSavedLayoutProps() {
        super.clearSavedLayoutProps();
        delete this.runtimeProps.origFont;
    }

    autoGrowParent(newBr: IRect, oldBr: IRect) {
        let constraints = this.constraints();
        let dw = 0;
        let dh = 0;

        if (constraints.h === HorizontalConstraint.LeftRight) {
            dw = (newBr.width - oldBr.width);
        }
        if (constraints.v === VerticalConstraint.TopBottom) {
            dh = (newBr.height - oldBr.height);
        }

        if (dw || dh) {
            // Parent auto grow specifically uses ChangeMode.Model for immediate sync.
            this.parent().autoGrow(dw, dh, ChangeMode.Model, this);
        }
    }

    private prepareTextMode(textChanges: TextChanges) {
        let isStretchConstraint = textChanges.constraints.h === HorizontalConstraint.LeftRight || textChanges.constraints.v === VerticalConstraint.TopBottom;
        if (textChanges.mode === TextMode.Label && isStretchConstraint) {
            textChanges.mode = TextMode.Block;
        }

        if (textChanges.wrap && textChanges.wrap !== this.props.wrap) {
            textChanges.mode = TextMode.Block;
        }

        if (textChanges.mode === TextMode.Label) {
            textChanges.wrap = false;
        }
        else if (textChanges.mode !== this.props.mode && textChanges.wrap === this.props.wrap) {
            textChanges.wrap = true;
        }
    }

    private prepareFill(textChanges: TextChanges) {
        if (textChanges.fill !== this.props.fill) {
            textChanges.font = Font.extend(textChanges.font, { color: textChanges.fill.value });
        }
        else if (textChanges.font.color !== this.props.font.color) {
            textChanges.fill = Brush.createFromColor(textChanges.font.color);
        }
    }

    private fitFontSizeToHeight(textChanges: TextChanges) {
        let lineHeight = textChanges.br.height;
        let lineCount = this.engine().getDocument().frame.lines.length;
        if (lineCount > 1) {
            lineHeight = textChanges.br.height / (1 + (lineCount - 1) * textChanges.font.lineSpacing);
        }

        let fontInfo = this.getHighestFontInfo(textChanges);
        let unitsPerEm = fontInfo.getUnitsPerEm();
        let baseHeight = fontInfo.getAscender() - fontInfo.getDescender();
        let newFontSize = lineHeight * unitsPerEm / baseHeight + .5 | 0;

        if (newFontSize !== textChanges.font.size) {
            textChanges.font = Font.extend(textChanges.font, { size: newFontSize });
        }

        let engine = this.getOrCreateEngine(textChanges);
        let actualWidth = engine.getActualWidth() + .5 | 0;
        textChanges.br = textChanges.br.withWidth(actualWidth);
    }

    private fitBrToFont(textChanges: TextChanges) {
        let engine = this.getOrCreateEngine(textChanges);
        let actualWidth = engine.getActualWidth() + .5 | 0;
        let actualHeight = engine.getActualHeight() + .5 | 0;
        textChanges.br = textChanges.br.withSize(actualWidth, actualHeight);
    }

    private allocateTextChanges(changes) {
        let textChanges = TextChanges.allocate();
        textChanges.content = changes.content || this.props.content;
        textChanges.fill = changes.fill || this.props.fill;
        textChanges.font = changes.font || this.props.font;
        textChanges.br = changes.br || this.props.br;
        textChanges.m = changes.m || this.props.m;
        textChanges.mode = changes.mode || this.props.mode;
        textChanges.wrap = changes.hasOwnProperty("wrap") ? changes.wrap : this.props.wrap;
        textChanges.constraints = changes.constraints || this.props.constraints;
        return textChanges;
    }
    private copyTextChanges(textChanges: TextChanges, changes: Partial<ITextProps>) {
        if (textChanges.br !== this.props.br) {
            changes.br = textChanges.br;
        }
        else {
            delete changes.br;
        }
        if (textChanges.m !== this.props.m) {
            changes.m = textChanges.m;
        }
        else {
            delete changes.m;
        }
        if (textChanges.font !== this.props.font) {
            changes.font = textChanges.font;
        }
        else {
            delete changes.font;
        }
        if (textChanges.content !== this.props.content) {
            changes.content = textChanges.content;
        }
        else {
            delete changes.content;
        }
        if (textChanges.mode !== this.props.mode) {
            changes.mode = textChanges.mode;
        }
        else {
            delete changes.mode;
        }
        if (textChanges.wrap !== this.props.wrap) {
            changes.wrap = textChanges.wrap;
        }
        else {
            delete changes.wrap;
        }
        if (textChanges.constraints !== this.props.constraints) {
            changes.constraints = textChanges.constraints;
        }
        else {
            delete changes.constraints;
        }
        if (textChanges.fill !== this.props.fill) {
            changes.fill = textChanges.fill;
        }
        else {
            delete changes.fill;
        }
    }

    private getHighestFontInfo(textChanges: TextChanges) {
        //TODO: go through content and return highest
        let font = textChanges.font;
        return FontManager.instance.getFont(font.family, font.style, font.weight);
    }

    private ensureNotSmallerThanText(textChanges: TextChanges) {
        let engine = this.getOrCreateEngine(textChanges);

        var actualWidth = engine.getActualWidth();
        var actualHeight = engine.getActualHeight();

        var br = textChanges.br;
        var newWidth = br.width;
        if (br.width < actualWidth) {
            newWidth = actualWidth + .5 | 0;
        }

        var newHeight = br.height;
        if (br.height < actualHeight) {
            newHeight = actualHeight + .5 | 0;
        }

        textChanges.br = br.withSize(newWidth, newHeight);
    }

    private adjustByFontAlign(textChanges: TextChanges) {
        if (textChanges.br === this.props.br) {
            return;
        }

        var dx = 0;
        var dy = 0;

        if (textChanges.constraints.h !== HorizontalConstraint.LeftRight) {
            if (textChanges.font.align === TextAlign.right) {
                dx = this.props.br.width - textChanges.br.width;
            } else if (textChanges.font.align === TextAlign.center) {
                dx = (this.props.br.width - textChanges.br.width) / 2;
            }
        }

        if (textChanges.constraints.v !== VerticalConstraint.TopBottom) {
            if (textChanges.font.valign === TextAlign.bottom) {
                dy = this.props.br.height - textChanges.br.height;
            } else if (textChanges.font.valign === TextAlign.middle) {
                dy = (this.props.br.height - textChanges.br.height) / 2;
            }
        }

        if (dx || dy) {
            textChanges.m = textChanges.m.clone().translate(dx, dy);
        }
    }

    private updateContentWithFont(textChanges: TextChanges) {
        let content = textChanges.content;
        let keys = Object.keys(textChanges.font).filter(x => textChanges.font[x] !== this.props.font[x]);
        if (Array.isArray(content)) {
            for (let i = 0, l = content.length; i < l; ++i) {
                let part = content[i];
                for (let j = 0; j < keys.length; j++) {
                    let key = keys[j];
                    delete part[key];
                }
            }
            textChanges.content = content;
        }
    }

    drawSelf(context, w, h) {
        // if(false && !this.runtimeProps.editing) {
        //     if (!this.runtimeProps.commandCache) {
        //         context = new ContextCommandCache(context);
        //     } else {
        //         ContextCommandCache.replay(context, this.runtimeProps.commandCache);
        //         return;
        //     }
        // }

        context.save();

        let engine = this.engine();

        var verticalOffset = this.getVerticalOffset(this.runtimeProps.engine);
        if (verticalOffset !== 0) {
            context.translate(0, verticalOffset);
        }
        params.perf && performance.mark("Text.render");
        engine.render(context, this.runtimeProps.drawSelection, verticalOffset, Environment.view ? Environment.view.focused() : false);
        params.perf && performance.measure("Text.render", "Text.render");

        context.restore();

        this.runtimeProps.commandCache = context.commands;
    }

    getVerticalOffset(engine) {
        var offset = 0, h;
        var height = this.height;
        var align = this.props.font.valign;
        if (align === TextAlign.middle) {
            h = engine.getActualHeight();
            offset = (height - h) / 2;
        } else if (align === TextAlign.bottom) {
            h = engine.getActualHeight();
            offset = height - h;
        }
        return offset;
    }

    engine() {
        if (!this.runtimeProps.engine) {
            params.perf && performance.mark("Text.createEngine");
            this.runtimeProps.engine = this.getOrCreateEngine(this.props);
            params.perf && performance.measure("Text.createEngine", "Text.createEngine");
        }

        return this.runtimeProps.engine;
    }

    private getOrCreateEngine(props: EngineProps) {
        if (this.runtimeProps.editing && this.runtimeProps.engine) {
            return this.runtimeProps.engine;
        }

        var engine = new TextEngine(props.font);
        engine.updateSize(props.br.width, props.br.height);
        engine.setWrap(props.wrap);
        engine.setText(props.content);

        return engine;
    }
    resetEngine() {
        delete this.runtimeProps.engine;
    }

    minWidth() {
        if (this.props.mode === TextMode.Block && this.runtimeProps.minWidth === undefined) {
            this.calculateMinSize();
        }
        return this.runtimeProps.minWidth;
    }

    minHeight() {
        // min height is relevant only if there is no wrap
        if (this.props.mode === TextMode.Block && !this.props.wrap && this.runtimeProps.minHeight === undefined) {
            this.calculateMinSize();
        }
        return this.runtimeProps.minHeight;
    }

    calculateMinSize() {
        var engine = this.getOrCreateEngine(this.props);
        if (this.props.wrap) {
            this.runtimeProps.minWidth = engine.calculateMaxWordWidth();
            this.runtimeProps.minHeight = engine.calculateMinPossibleHeight();
        }
        else {
            this.runtimeProps.minWidth = engine.getActualWidth();
            this.runtimeProps.minHeight = engine.getActualHeight();
        }
    }

    textStyleId(value) {
        if (arguments.length > 0) {
            this.setProps({ textStyleId: value });
        }

        return this.props.textStyleId;
    }
    getTextStyleProps() {
        var stylePropNames = PropertyMetadata.getStylePropertyNamesMap(this.systemType(), 2);
        var res = {};
        for (var name in stylePropNames) {
            res[name] = this.props[name];
        }
        return res;
    }
    hasPendingTexStyle() {
        if (!this.props.textStyleId) {
            return false;
        }
        var baseStyle = styleManager.getStyle(this.props.textStyleId, 2);

        for (var p in baseStyle.props) {
            if (!deepEquals(this.props[p], baseStyle.props[p])) {
                return true;
            }
        }
        return false;
    }

    getNonRepeatableProps(newProps) {
        var base = super.getNonRepeatableProps();
        var props = newProps && newProps.mode !== undefined ? newProps : this.props;
        if (props.mode === TextMode.Label) {
            return base.concat(["br", "content"]);
        }
        return base.concat(["content"]);
    }

    initFromData(content) {
        this.prepareAndSetProps({ content, dp: this.props.dp });
    }

    canAccept(elements, autoInsert, allowMoveInOut) {
        if (elements.length !== 1) {
            return false;
        }
        var other = elements[0];
        return other instanceof Text && other.runtimeProps.isDataElement;
    }

    markAsDataField() {
        this.runtimeProps.isDataElement = true;
    }

    add(text: Text, mode) {
        return this.insert(text, 0, mode);
    }

    insert(text: Text, index, mode) {
        this.prepareAndSetProps(text.selectProps(["content", "dp", "df"]));
        return this;
    }

    changePosition(element: IUIElement, index: number, mode?: number) {
    }
    getElementById() {
        return null;
    }

    remove() {
        return -1;
    }

    flatten() {
    }

    autoPositionChildren(): boolean {
        return true;
    }

    get children() {
        return null;
    }

    globalMatrixToLocal(m: any) {
        return m;
    }

    font(value?: Font) {
        if (arguments.length) {
            this.setProps({ font: value });
        }
        return this.props.font;
    }

    content(value?: TextContent) {
        if (arguments.length) {
            this.setProps({ content: value });
        }
        return this.props.content;
    }

    resizeDimensions(value?) {
        if (arguments.length) {
            return super.resizeDimensions(value);
        }

        let result = super.resizeDimensions();
        if (result === ResizeDimension.None) {
            return result;
        }

        if (this.props.mode === TextMode.Label) {
            return ResizeDimension.Vertical;
        }
        return ResizeDimension.Both;
    }

    cloneProps() {
        let props = super.cloneProps();

        if (Array.isArray(props.content)) {
            props.content = props.content.map(x => Object.assign({}, x));
        }

        return props;
    }

    canStroke() {
        return false;
    }

    allowColorOverride() {
        return true;
    }

    static fromSvgElement(element, parsedAttributes, matrix) {
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
        var font: any = {};
        if (parsedAttributes.fontSize) {
            font.size = parsedAttributes.fontSize.replace('px', '');
        }

        if (parsedAttributes.fontFamily) {
            font.family = 'Open Sans';//TODO: parsedAttributes.fontFamily;
        }

        var md = matrix.decompose();

        var props = {
            content: parsedAttributes.text,
            font: Font.createFromObject(font),
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
    mode: {
        displayName: "@textMode",
        type: "switch",
        options: {
            items: [
                { label: "@textMode.block", value: TextMode.Block, icon: "type-icon_area-text" },
                { label: "@textMode.label", value: TextMode.Label, icon: "type-icon_line-text" }
            ],
            hasLabels: true,
            size: 3 / 4
        },
        defaultValue: TextMode.Block
    },
    wrap: {
        displayName: "@wrap",
        type: "checkbox",
        options: {
            size: 1 / 4,
            label: false
        },
        defaultValue: true,
    },
    textStyleId: {
        displayName: "Text style",
        type: "textStyleName"
    },
    fill: {
        defaultValue: Brush.createFromColor(Font.Default.color)
    },
    font: {
        displayName: "Font",
        type: "font",
        defaultValue: Font.Default,
        style: 2
    },

    groups: function (element) {
        var baseGroups = PropertyMetadata.findForType(UIElement).groups();

        var ownGroups = [
            baseGroups.find(x => x.label === "Layout"),
            baseGroups.find(x => x.label === "@constraints"),
            {
                label: UIElement.displayType(Types.Text),
                properties: [/*"textStyleId",*/ "mode", "wrap", "font"]
            },
            baseGroups.find(x => x.label === "Appearance")
        ];

        return ownGroups;
    },
    prepareVisibility: function (element: UIElement) {
        return {
            fill: false,
            stroke: false
        };
    }
});

/**
 * A pooled object for collecting a single view of all changed or current properties.
 */
class TextChanges implements IPooledObject {
    private static pool = new ObjectPool(() => new TextChanges(), 1);

    public content: TextContent = "";
    public font: Font = Font.Default;
    public mode: TextMode = TextMode.Label;
    public br: Rect = Rect.Zero;
    public m: IMatrix = Matrix.Identity;
    public wrap: boolean = false;
    public constraints = Constraints.All;
    public fill = Brush.Empty;

    reset() {
        //always fully initialized
    }
    free() {
        TextChanges.pool.free(this);
    }

    static allocate() {
        return TextChanges.pool.allocate();
    }
}

type EngineProps = Pick<ITextProps, "br" | "content" | "font" | "mode" | "wrap">;