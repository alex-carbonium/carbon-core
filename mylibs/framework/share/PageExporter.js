import StyleManager from "framework/style/StyleManager";
import {StyleType} from "framework/Defs";
import {createUUID} from "../../util";
import ArtboardTemplateControl from "framework/ArtboardTemplateControl";

export default class PageExporter {
    prepareShareData(page) {
        var clone = page.clone();

        var i = 10; // to avoid infinite recursion in case of bugs
        while(this.expandNestedControls(clone) && i >=0){
            i--;
        }

        var styles = [];
        var textStyles = [];
        this.populatePageStyles(clone, styles, textStyles);
        var data = {
            page:clone.toJSON(),
            styles:styles,
            textStyles:textStyles
            // add here any external dependencies
        }

        return data;
    }

    expandNestedControls(page){
        var rect = page.getContentOuterSize();
        var pageId = page.id();
        var delta = 100;
        var posY = rect.y + rect.height + delta;
        var found = false;
        page.applyVisitor(e=>{
            if(e instanceof ArtboardTemplateControl) {
                var source = e.source();
                if(source.pageId != pageId){
                    // clone referenced artboard and insert it to the current page
                    var refPage = App.Current.getPageById(source.pageId);
                    var refArtboard = refPage.getArtboardById(source.artboardId);
                    var clone = refArtboard.clone();
                    clone.setProps({id:createUUID(), x:rect.y, y:posY});
                    page.add(clone);

                    // calculate position for the next element
                    posY += clone.height() + delta;

                    // replace source for the referencing control
                    e.source({pageId:pageId, artboardId:clone.id()});
                    found = true;
                }
            }
        });

        return found;
    }

    populatePageStyles(page, styles, textStyles){
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