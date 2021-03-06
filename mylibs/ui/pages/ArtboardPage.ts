import Artboard from "../../framework/Artboard";
import StateBoard from "../../framework/StateBoard";
import EventHelper from "../../framework/EventHelper";
import Page from "../../framework/Page";
import PropertyMetadata from "../../framework/PropertyMetadata";
import {unionRect} from "../../math/geometry";
import {areRectsIntersecting} from "../../math/math";
import Matrix from "../../math/matrix";
import NullArtboard from "../../framework/NullArtboard";
import RelayoutEngine from "../../framework/relayout/RelayoutEngine";
import SystemConfiguration from "../../SystemConfiguration";
import Invalidate from "../../framework/Invalidate";
import { Types } from "../../framework/Defs";
import Rect from "../../math/rect";
import { IArtboard } from "carbon-model";
import { ArtboardType, IArtboardPage, ChangeMode, IArtboardPageProps, RenderEnvironment, RenderFlags, IUIElement, IContainer } from "carbon-core";
import DataNode from "../../framework/DataNode";
import Container from "../../framework/Container";
import UIElement from "../../framework/UIElement";
import { IElementWithCode } from "carbon-model";
import { IView } from "carbon-app";
var debug = require<any>("DebugUtil")("carb:artboardPage");

const ARTBOARD_SPACE = 100;

class ArtboardPage extends Page implements IArtboardPage, IElementWithCode {
    constructor() {
        super();
        this._artboardNames = {};
        this.runtimeProps.codeVersion = 0;
    }

    initPage() {
        super.initPage();
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

    propsUpdated(props: Readonly<IArtboardPageProps>, oldProps, mode: ChangeMode) {
        super.propsUpdated(props, oldProps, mode);

        if (props.code) {
            this.runtimeProps.codeVersion = (this.runtimeProps.codeVersion || 0) + 1;
        }

        if (mode === ChangeMode.Model && props.symbolGroups) {
            App.Current.resourcePageChanged.raise(this);
        }
    }

    propsPatched(patchType, propName, item) {
        super.propsPatched(patchType, propName, item);

        if (propName === "symbolGroups") {
            App.Current.resourcePageChanged.raise(this);
        }
    }

    add(child) {
        super.add.apply(this, arguments);
        if (child instanceof Artboard) {
            this._artboardNames[child.name] = true;
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

    drawChildSafe(child: UIElement, context, environment: RenderEnvironment) {
        let frame = null;
        if (!(environment.flags & RenderFlags.CheckViewport) || child.isInViewport(environment.viewport)) {
            super.drawChildSafe(child, context, environment);
        } else {
            debug("Skip artboard not in the viewport: %s", this.name);
        }
    }

    getBoundingBoxGlobal() {
        //TODO: can it be calculated as a union rect of all artboards? for renderer.
        return Rect.Max;
    }

    getBoundingBox() {
        //TODO: can it be calculated as a union rect of all artboards? for renderer.
        return Rect.Max;
    }

    click() {
        this.setActiveArtboard(null);
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
                type:null
            });
            artboard.resetTransform();
            artboard.applyTranslation(pos);

            this.nameProvider.assignNewName(artboard);

            pos.x += screen.w + ARTBOARD_SPACE;

            this.add(artboard);
        }

        if(SystemConfiguration.ResetActiveToolToDefault) {
            App.Current.actionManager.invoke("resetCurrentTool");
        }
    }

    setActiveArtboardById (id:string, doNotTrack?:boolean) {
        var artboard = DataNode.getImmediateChildById(this, id, true);
        if(artboard && artboard instanceof Artboard) {
            this.setActiveArtboard(artboard, doNotTrack);
            Invalidate.request();
        }
    }

    // TODO: move this code to controller
    setActiveArtboard(artboard, doNotTrack?) {
        let oldArtboard: IArtboard = this._activeArtboard;

        if (artboard === oldArtboard) {
            return;
        }

        if (this._activeArtboard) {
            this._activeArtboard.deactivate();
        }

        this._activeArtboard = artboard;
        if (artboard){
            artboard.activate();
            !doNotTrack && App.Current.setMirrorArtboardId(artboard.parent.id, artboard.id);
        } else {
            !doNotTrack && App.Current.setMirrorArtboardId(null, null);
        }

        App.Current.actionManager.invoke("onArtboardChanged", {newArtboard:artboard, oldArtboard:oldArtboard});

        // redraw content to change artboard header color
        Invalidate.request();
    }

    getNextAvailiablePosition(width, height) {
        let maxX = 0, maxY = 0;
        for (let a of this.children) {
            let right = a.right();
            if (right > maxX) {
                maxX = right;
                maxY = a.y;
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

    getAllArtboards(excludeStateboards = false) {
        let items = this.children;
        let res = [];
        //reversing for hit testing
        for (let i = items.length - 1; i >= 0; --i) {
            if (items[i] instanceof Artboard &&(!excludeStateboards || !(items[i] instanceof StateBoard))) {
                res.push(items[i]);
            }
        }
        return res;
    }

    getAllResourceArtboards(resourceType?) {
        let res = [];
        let artboards = this.getAllArtboards();
        for (let j = 0; j < artboards.length; ++j) {
            let a = artboards[j];
            let matches = resourceType === undefined ? a.props.type !== ArtboardType.Regular : a.props.type === resourceType;
            if (matches) {
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

    getArtboardAtPoint(point, view) {
        for (let artboard of this.getAllArtboards()) {
            if (artboard.hitTestBoundingBox(point, view)) {
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

    trackDeleted() {
        //allow all resources to perform their removal logic
        let artboards = this.getAllResourceArtboards();
        artboards.forEach(x => this.remove(x));

        super.trackDeleted.apply(this, arguments);
    }

    saveWorkspaceState(): any{
        let artboard = this.getActiveArtboard();
        return {artboardId: artboard ? artboard.id : null};
    }

    restoreWorkspaceState(data: any): void{
        if (data.artboardId){
            let artboard = this.getAllArtboards().find(x => x.id === data.artboardId);
            if (artboard){
                this.setActiveArtboard(artboard);
            }
        }
    }

    dropElement(element: IUIElement, mode?: ChangeMode) {
        let parent: any = null;
        let elementBox = element.getBoundingBoxGlobal();
        let toAccept = [element];
        for (let i = 0; i < this.children.length; ++i){
            if (this.children[i].canAccept(toAccept, false, false) && this.children[i].getBoundingBoxGlobal().isIntersecting(elementBox)) {
                if (parent) {
                    parent = this;
                    break;
                }
                parent = this.children[i] as any;
            }
        }

        if (!parent) {
            parent = this;
        }

        if(parent.dropElement && parent !== this) {
            parent.dropElement(element, mode);
        } else {
            element.setTransform(parent.globalMatrixToLocal(element.globalViewMatrix()));
            parent.add(element, mode);
        }
    }

    code(value?: string): string {
        if (arguments.length > 0) {
            this.setProps({ code: value })
        }

        return this.props.code;
    }

    declaration(module: boolean): string {
        return "";
    }

    get codeVersion() {
        return this.runtimeProps.codeVersion;
    }

    get exports(): { [name: string]: string } {
        return this.runtimeProps.exports;
    }

    set exports(value: { [name: string]: string }) {
        this.runtimeProps.exports = value;
    }
}
ArtboardPage.prototype.t = Types.ArtboardPage;

PropertyMetadata.registerForType(ArtboardPage, {
    guidesX: {
        defaultValue: []
    },
    guidesY: {
        defaultValue: []
    },
    symbolGroups: {
        defaultValue: []
    }
});


export default ArtboardPage;
