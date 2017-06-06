import UIElement from "../UIElement";
import Brush from "../Brush";
import Font from "../Font";
import { Types } from "../Defs";
import { deepEquals } from "../../util";
import PropertyMetadata from "../PropertyMetadata";
import TextEngine from "./textengine";
import styleManager from "../style/StyleManager";
import { IContainer, IDataElement, IText, TextAlign, IUIElement, ITextProps, TextContent, HorizontalConstraint, VerticalConstraint } from "carbon-core";
import params from "params";
import ContextCommandCache from "framework/render/ContextCommandCache";
import Environment from "../../environment";
import Rect from "../../math/rect";

class Text extends UIElement<ITextProps> implements IText, IContainer, IDataElement {
    prepareProps(changes) {
        var dataProvider = changes.dp;

        super.prepareProps(changes);

        var contentChanged = changes.content !== undefined;
        var brChanged = changes.br !== undefined;
        var autoWidthChanged = changes.autoWidth !== undefined;
        var fontChanged = changes.font !== undefined;

        var dimensionsAffected = contentChanged || brChanged || autoWidthChanged || fontChanged;
        var textAlignChanged = fontChanged && changes.font.align !== TextAlign.left;

        if (textAlignChanged) {
            changes.autoWidth = false;
        }

        if (autoWidthChanged && changes.autoWidth) {
            if (!fontChanged || changes.font.align !== TextAlign.left) {
                changes.font = Font.extend(this.props.font, changes.font, { align: TextAlign.left });
            }
        }

        if (dimensionsAffected) {
            var syncWidth = this.props.autoWidth;
            if (changes.autoWidth !== undefined) {
                syncWidth = changes.autoWidth === true;
            }
            if (!fontChanged) {
                changes.font = this.props.font;
            }
            this._ensureBoundaryBox(changes, syncWidth);
            if (!fontChanged) {
                delete changes.font;
            }
        }

        if (fontChanged) {
            var content = changes.content !== undefined ? changes.content : this.props.content;
            var keys = Object.keys(changes.font).filter(x => changes.font[x] !== this.props.font[x]);
            if (Array.isArray(content)) {
                for (let i = 0, l = content.length; i < l; ++i) {
                    let part = content[i];
                    for (var j = 0; j < keys.length; j++) {
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

        if (contentChanged && this.props.dp && !dataProvider) {
            changes.dp = null;
        }
    }
    propsUpdated(newProps, oldProps) {
        if (!this.runtimeProps.keepEngine //to avoid disposal when editing inline
            && (newProps.br !== undefined
                || newProps.autoWidth !== undefined
                || newProps.font !== undefined
                || newProps.content !== undefined)) {
            delete this.runtimeProps.engine;
        }

        if (newProps.br !== undefined
            || newProps.autoWidth !== undefined
            || newProps.font !== undefined
            || newProps.content !== undefined
            || newProps.visible !== undefined) {
            delete this.runtimeProps.commandCache;
        }
        super.propsUpdated.apply(this, arguments);
    }

    _ensureBoundaryBox(changes, forceWidth) {
        var br = changes.br || this.boundaryRect();

        if (changes.autoWidth === undefined) {
            changes.autoWidth = this.props.autoWidth;
        }
        if (changes.content === undefined) {
            changes.content = this.props.content;
        }
        var engine = this.createEngine(changes);
        var actualWidth = engine.getActualWidth();
        var actualHeight = engine.getActualHeight();

        var newWidth = br.width;
        if (br.width < actualWidth || forceWidth) {
            newWidth = actualWidth + .5 | 0;
        }

        var newHeight = br.height;
        if (br.height < actualHeight) {
            newHeight = actualHeight + .5 | 0;
        }

        var constraints = this.constraints();
        var dx = 0;
        var dy = 0;

        if (constraints.h === HorizontalConstraint.Right) {
            dx = br.width - newWidth;
        } else if (constraints.h === HorizontalConstraint.Center) {
            dx = (br.width - newWidth) / 2;
        }

        if (constraints.v === VerticalConstraint.Bottom) {
            dy = br.height - newHeight;
        } else if (constraints.v === VerticalConstraint.Center) {
            dy = (br.height - newHeight) / 2;
        }

        changes.br =  br.withSize(newWidth, newHeight);
        changes.m = (changes.m || this.props.m).clone().translate(dx, dy);
    }

    applySizeScaling(s, o, options, changeMode) {
        this.prepareAndSetProps({ autoWidth: false }, changeMode);
        super.applySizeScaling.apply(this, arguments);
    }

    drawSelf(context, w, h) {
        // if(false && !this.runtimeProps.keepEngine) {
        //     if (!this.runtimeProps.commandCache) {
        //         context = new ContextCommandCache(context);
        //     } else {
        //         ContextCommandCache.replay(context, this.runtimeProps.commandCache);
        //         return;
        //     }
        // }

        context.save();

        if (this.runtimeProps.engine === undefined) {
            params.perf && performance.mark("Text.createEngine");
            this.createEngine();
            params.perf && performance.measure("Text.createEngine", "Text.createEngine");
        }
        else {
            params.perf && performance.mark("Text.setDefaultFormatting");
            TextEngine.setDefaultFormatting(this.props.font);
            params.perf && performance.measure("Text.setDefaultFormatting", "Text.setDefaultFormatting");
        }

        context.beginPath();
        params.perf && performance.mark("Text.fill");
        context.rectPath(0, 0, w, h);
        Brush.fill(this.fill(), context, 0, 0, w, h);
        params.perf && performance.measure("Text.fill", "Text.fill");
        if (this.runtimeProps.drawText === false) {
            context.restore();
            return;
        }
        context.lineWidth = this.strokeWidth();
        params.perf && performance.mark("Text.stroke");
        Brush.stroke(this.stroke(), context, 0, 0, w, h);
        params.perf && performance.measure("Text.stroke", "Text.stroke");

        var verticalOffset = this.getVerticalOffset(this.runtimeProps.engine);
        if (verticalOffset !== 0) {
            context.translate(0, verticalOffset);
        }
        params.perf && performance.mark("Text.render");
        this.runtimeProps.engine.render(context, this.runtimeProps.drawSelection, verticalOffset, Environment.view ? Environment.view.focused() : false);
        params.perf && performance.measure("Text.render", "Text.render");

        context.restore();

        this.runtimeProps.commandCache = context.commands;
    }

    getVerticalOffset(engine) {
        var offset = 0, h;
        var height = this.height();
        var align = this.props.font.valign;
        if (align == TextAlign.middle) {
            h = engine.getActualHeight();
            offset = (height - h) / 2;
        } else if (align === TextAlign.bottom) {
            h = engine.getActualHeight();
            offset = height - h;
        }
        return offset;
    }

    createEngine(props = this.props) {
        TextEngine.setDefaultFormatting(props.font);

        var engine = new TextEngine();
        engine.updateSize(props.autoWidth ? 10000 : (props.br || this.boundaryRect()).width, 10000);
        engine.setText(props.content);
        this.runtimeProps.engine = engine;
        return engine;
    }

    cursor() {
        if (this.runtimeProps.drawSelection) {
            return "text";
        }
        super.cursor();
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
        var props = newProps && newProps.autoWidth !== undefined ? newProps : this.props;
        if (props.autoWidth) {
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
    textStyleId: {
        displayName: "Text style",
        type: "textStyleName"
    },
    font: {
        displayName: "Font",
        type: "font",
        defaultValue: Font.Default,
        style: 2
    },
    autoWidth: {
        displayName: "Width",
        type: "switch",
        options: {
            hasLabels: true,
            items: [
                { label: "Auto", value: true },
                { label: "Fixed", value: false }
            ]
        },
        defaultValue: true
    },
    groups: function (element) {
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