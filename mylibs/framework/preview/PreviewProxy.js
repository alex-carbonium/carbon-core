import Page from "framework/Page";
import NullPage from "framework/NullPage";
import EventHelper from "framework/EventHelper";
import DataNode from "framework/DataNode";
import Matrix from "math/matrix";

export default class PreviewProxy {
    constructor(app) {
        this.app = app;
        this.navigateToPage = EventHelper.createEvent();
    }

    _makePageFromArtboard(artboard, screenSize) {
        var page = new Page();
        var previewClone = artboard.mirrorClone();
        var oldRect = previewClone.boundaryRect();
        if (artboard.props.allowVerticalResize || artboard.props.allowHorizontalResize) {
            previewClone.setTransform(Matrix.Identity);
            previewClone.width(artboard.props.allowHorizontalResize ? screenSize.width : artboard.width());
            previewClone.height(artboard.props.allowVerticalResize ? screenSize.height : artboard.height());
            previewClone.performArrange({oldRect});
        } else {
            previewClone.setTransform(Matrix.Identity);
        }

        page.add(previewClone);
        page.originalSize = oldRect;
        page.minScrollX(0);
        page.minScrollY(0);
        return page;
    }

    getCurrentScreen(screenSize) {
        var activeStory = this.app.activeStory();
        if(!activeStory || !activeStory.props.homeScreen){
            // TODO: return special page with instruction that you need to create at least on artboard
            return NullPage;
        }
        var page = DataNode.getImmediateChildById(this.app, activeStory.props.homeScreen[0]);
        var artboard = DataNode.getImmediateChildById(page, activeStory.props.homeScreen[1], true);
        if(!artboard) {
            artboard = page.getAllArtboards()[0];
        }

        if(!artboard) {
            return NullPage;
        }

        return this._makePageFromArtboard(artboard, screenSize);
    }

    getScreenById(artboardId, screenSize) {
        var artboard = DataNode.getImmediateChildById(this.app.activePage, artboardId, true);

        return this._makePageFromArtboard(artboard, screenSize);
    }

    allElementsWithActions() {
        var page = this.activePage;
        var artboard = page.children[0];
        var elementsMap = {};
        var activeStory = this.app.activeStory();
        if(!activeStory) {
            return [];
        }

        activeStory.children.forEach(c=>{
           if(c.props.sourceRootId === artboard.id()){
               elementsMap[c.props.sourceElementId] = true;
           }
        });

        var res = [];

        if(artboard) {
            artboard.applyVisitor(e=>{
                if(elementsMap[e.id()]){
                    res.push(e);
                }
            });
        }

        return res;
    }

    resizeActiveScreen(screenSize, scale) {
        var page = this.activePage;
        if(page === NullPage){
            return;
        }
        var artboard = page.children[0];
        if (artboard && (artboard.props.allowVerticalResize || artboard.props.allowHorizontalResize)) {
            var oldRect = artboard.boundaryRect();
            var width = artboard.props.allowHorizontalResize ? screenSize.width : this.activePage.originalSize.width;
            var height = artboard.props.allowVerticalResize ? screenSize.height : this.activePage.originalSize.height;
            artboard.setProps({x: 0, y: 0, width: width, height: height});
            artboard.performArrange({oldRect});
        }


        page.maxScrollX(Math.max(0, (artboard.width() - screenSize.width) * scale));
        page.maxScrollY(Math.max(0, (artboard.height() - screenSize.height) * scale));
    }
}