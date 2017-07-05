import Artboard from "framework/Artboard";
import StateBoard from "framework/StateBoard";
import EventHelper from "framework/EventHelper";
import Page from "framework/Page";
import PropertyMetadata from "framework/PropertyMetadata";
import {unionRect} from "math/geometry";
import {areRectsIntersecting} from "math/math";
import Matrix from "math/matrix";
import NullArtboard from "framework/NullArtboard";
import RelayoutEngine from "framework/relayout/RelayoutEngine";
import SystemConfiguration from "SystemConfiguration";
import Invalidate from "framework/Invalidate";
import Environment from "environment";
import { Types, ViewTool } from "../../framework/Defs";
import Rect from "../../math/rect";
import { IArtboard } from "carbon-model";
import { ArtboardType } from "carbon-core";
var debug = require<any>("DebugUtil")("carb:artboardPage");

const ARTBOARD_SPACE = 100;

class ArtboardPage extends Page {

    constructor() {
        super();
        this._artboardNames = {};
        this.toolboxConfigIsDirty = EventHelper.createEvent();
    }

    initPage(view) {
        super.initPage(view);
        let artboard = this.getFirstArtboard();
        if (!artboard) {
            artboard = new Artboard();
            artboard.setProps({width: 1000, height: 1000});
            this.nameProvider.assignNewName(artboard);
            this.add(artboard);
        }
        this.setActiveArtboard(artboard);
    }

    getContentContainer() {
        return this._activeArtboard;
    }

    add(child) {
        super.add.apply(this, arguments);
        if (child instanceof Artboard) {
            this._artboardNames[child.name()] = true;
        }
        return child;
    }

    viewportRect() {
        return {
            x: 0, y: 0,
            width: 0,
            height: 0
        }
    }

    /**
     * A boundary rect of a page is computed as a rect covering all artboards. It's readonly.
     */
    boundaryRect(){
        return this.getContentOuterSize();
    }

    getContentOuterSize(): Rect {
        let items = this.children;
        if (!items.length) {
            return Rect.Zero;
        }
        let rect: Rect = items[0].getBoundaryRectGlobal();
        for (let i = 1; i < items.length; ++i) {
            rect = unionRect(rect, items[i].getBoundaryRectGlobal());
        }

        return rect;
    }

    getPagePoint(anchorX, anchorY) {
        let x, y;
        let rect = this.getContentOuterSize();
        switch (anchorX) {
            case "x":
                x = rect.x;
                break;
            case "center":
                x = rect.x + rect.width / 2;
                break;
            case "right":
                x = rect.x + rect.width;
                break;
        }

        switch (anchorY) {
            case "y":
                y = rect.y;
                break;
            case "center":
                y = rect.y + rect.height / 2;
                break;
            case "bottom":
                y = rect.y + rect.height;
                break;
        }

        return {x: x, y: y};
    }

    globalViewMatrix() {
        return Matrix.Identity;
    }

    draw(context, environment) {
        environment.viewportRect = environment.view.viewportRect();

        super.draw.apply(this, arguments);

        context.restore();
    }

    drawChildSafe(child, context, environment) {
        let frame = null;
        if (!environment.viewportRect || areRectsIntersecting(environment.viewportRect, child.getBoundingBoxGlobal(true))) {
            if(environment.showFrames && child.frame){
                frame = child.frame;
                if (frame) {
                    child.drawCustomFrame(context, environment);
                }
            }
            super.drawChildSafe(child, context, environment);
            if(child instanceof Artboard){
                if(!frame || !environment.showFrames) {
                    child.drawFrameRect(context, environment);
                }
                child.drawExtras(context, environment);
            }
        } else {
            debug("Skip artboard not in the viewport: %s", this.name());
        }
    }

    getBoundingBoxGlobal() {
        return Rect.Max;
    }

    getBoundingBox() {
        return Rect.Max;
    }

    insertArtboards(screens) {
        let commands = [];
        let pos = this.getNextAvailiablePosition(screens[0].w, screens[0].h);
        for (let screen of screens) {
            let artboard;
            if(screen.i){
                artboard = screen.i.clone();
            } else {
                artboard = new Artboard();
            }
            artboard.setProps({
                width: screen.w,
                height: screen.h,
                toolboxGroup:null
            });
            artboard.resetTransform();
            artboard.applyTranslation(pos);

            this.nameProvider.assignNewName(artboard);

            pos.x += screen.w + ARTBOARD_SPACE;

            this.add(artboard);
        }

        if(SystemConfiguration.ResetActiveToolToDefault) {
            App.Current.resetCurrentTool();
        }
    }

    setActiveArtboard(artboard, doNotTrack?) {
        let oldArtboard: IArtboard = this._activeArtboard;
        if (this._activeArtboard) {
            this._activeArtboard.deactivate();
        }

        this._activeArtboard = artboard;
        if (artboard){
            artboard.activate();
            !doNotTrack && App.Current.setMirrorArtboardId(artboard.parent().id(), artboard.id());
        } else {
            !doNotTrack && App.Current.setMirrorArtboardId(null, null);
        }
        Environment.controller && Environment.controller.onArtboardChanged && Environment.controller.onArtboardChanged.raise(artboard, oldArtboard);
    }

    _activateArtboard(event): IArtboard {
        let artboard = this._activeArtboard;
        if (artboard && artboard.hitTest(event)) {
            return;
        }

        let artboards = this.getAllArtboards();

        for (let i = 0, length = artboards.length; i < length; ++i) {
            artboard = artboards[i];
            if (artboard.hitTest(event)) {
                this.setActiveArtboard(artboard);
                Invalidate.request();
                return;
            }
        }
    }

    get isToolboxConfigDirty(){
        return true;
    }


    _onMouseUp(event) {
        if (event.handled){
            return;
        }
        this._activateArtboard(event);
    }


    activated() {
        super.activated.apply(this, arguments);
        if(Environment.controller && Environment.controller.mouseupEvent) {
            Environment.controller.mouseupEvent.bind(this, this._onMouseUp);
        }
    }

    deactivated() {
        super.deactivated.apply(this, arguments);
        if(Environment.controller && Environment.controller.mouseupEvent) {
            Environment.controller.mouseupEvent.unbind(this, this._onMouseUp);
        }
    }

    getNextAvailiablePosition(width, height) {
        let maxX = 0, maxY = 0;
        for (let a of this.children) {
            let right = a.right();
            if (right > maxX) {
                maxX = right;
                maxY = a.y();
            }
        }

        return {x: maxX + 50, y: maxY};
    }

    getNextArtboardName(name) {


        name = name || "Artboard";
        if (!this.children || !this._artboardNames[name]) {
            return name
        }
        let testIndex = this.children.length;
        let testName;
        while (true) {
            testName = name + " " + testIndex;
            if (!this._artboardNames[testName]) {
                break;
            }
            testIndex++;
        }

        return testName;
    }

    getActiveArtboard() {
        return this.getContentContainer();
    }

    getAllArtboards() {
        let items = this.children;
        let res = [];
        //reversing for hit testing
        for (let i = items.length - 1; i >= 0; --i) {
            if (items[i] instanceof Artboard /*&& !(items[i] instanceof StateBoard)*/) {
                res.push(items[i]);
            }
        }
        return res;
    }

    getAllResourceArtboards(resourceType) {
        let res = [];
        let artboards = this.getAllArtboards();
        for (let j = 0; j < artboards.length; ++j) {
            let a = artboards[j];
            if (a.props.type === resourceType) {
                res.push(a);
            }
        }

        return res;
    }

    eachArtboard(callback) {
        let items = this.children;
        for (let i = 0; i < items.length; ++i) {
            if (items[i] instanceof Artboard) {
                callback(items[i]);
            }
        }
    }

    getArtboardAtPoint(point) {
        for (let artboard of this.getAllArtboards()) {
            if (artboard.hitTest(point)) {
                return artboard;
            }
        }

        return null;
    }

    getFirstArtboard() {
        let items = this.children;
        let res = null;
        for (let i = 0; i < items.length; ++i) {
            if (items[i] instanceof Artboard) {
                res = items[i];
                break;
            }
        }
        return res;
    }

    relayout(oldPropsMap){
        let primitives = null;
        let res = RelayoutEngine.run(this, oldPropsMap, e => !(e instanceof Artboard));
        if (res !== null){
            if (primitives === null){
                primitives = [];
            }
            Array.prototype.push.apply(primitives, res);
        }
        return primitives;
    }

    makeToolboxConfigDirty(forceUpdate, changedId){
        this.setProps({toolboxConfigId:null});
        if(forceUpdate){
            App.Current.changeToolboxPage.raise(this);
        }
        this.toolboxConfigIsDirty.raise(forceUpdate, changedId);
    }

    saveWorkspaceState(): any{
        let artboard = this.getActiveArtboard();
        return {artboardId: artboard ? artboard.id() : null};
    }
    restoreWorkspaceState(data: any): void{
        if (data.artboardId){
            let artboard = this.getAllArtboards().find(x => x.id() === data.artboardId);
            if (artboard){
                this.setActiveArtboard(artboard);
            }
        }
    }
}
ArtboardPage.prototype.t = Types.ArtboardPage;

PropertyMetadata.registerForType(ArtboardPage, {
    guidesX: {
        defaultValue: []
    },
    guidesY: {
        defaultValue: []
    }
});


export default ArtboardPage;
