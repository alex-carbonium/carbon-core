import StyleManager from "framework/style/StyleManager";
import {StyleType} from "framework/Defs";
import {createUUID} from "../../util";
import ArtboardTemplateControl from "framework/ArtboardTemplateControl";
import ToolboxConfiguration from "ui/toolbox/ToolboxConfiguration";
import Deferred from "framework/Deferred";
import DataNode from "framework/DataNode";

export default class PageExporter {
    prepareShareData(page) {
        var clone = page.mirrorClone();        

        var promise;
        if(!page.props.toolboxConfigId || page.isToolboxConfigDirty){
            promise = ToolboxConfiguration.buildToolboxConfig(page);
        } else {
            promise = Deferred.createResolvedPromise();
        }

        var i = 10; // to avoid infinite recursion in case of bugs
        while(this.expandNestedControls(clone) && i >=0){
            i--;
        }

        var styles = [];
        var textStyles = [];
        this.populatePageStyles(clone, styles, textStyles);

        return promise.then(()=>{
            clone.setProps({toolboxConfigUrl:page.props.toolboxConfigUrl, toolboxConfigId:page.props.toolboxConfigId});
            return {
                page:clone.toJSON(),
                styles:styles,
                textStyles:textStyles,
                publishDate:new Date(),
                publishedBy:App.Current.companyId()
                // add here any external dependencies
            }
        });
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
                    var refPage = DataNode.getImmediateChildById(App.Current, source.pageId);
                    var refArtboard = DataNode.getImmediateChildById(refPage, source.artboardId, true);
                    var clone = refArtboard.clone();
                    clone.setProps({id:createUUID(), x:rect.y, y:posY});
                    page.add(clone);
                    // TODO: add all states if needed

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