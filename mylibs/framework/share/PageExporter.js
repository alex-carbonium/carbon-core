import StyleManager from "framework/style/StyleManager";
import {StyleType} from "framework/Defs";

export default class PageExporter {
    prepareShareData(page) {
        var clone = page.clone();
        // TODO: insert referenced controls
        var styles = [];
        var textStyles = [];
        this.populatePageStyles(page, styles, textStyles);
        var data = {
            page:clone.toJSON(),
            styles:styles,
            textStyles:textStyles
            // add here any external dependencies
        }

        return data;
    }

    getPageStyles(page, styles, textStyles){
        page.applyVisitor(e=>{
            var styleId = e.styleId();
            if(styleId){
                styles.push(StyleManager.getStyle(styleId, StyleType.Visual));
            }

            var textStyleId = e.props.textStyleId;
            if(textStyleId){
                textStyles.push(StyleManager.getStyle(textStyleId, StyleType.Text));
            }
        })
    }
}