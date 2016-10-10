import Artboard from "framework/Artboard";
import StateBoard from "framework/StateBoard";
import Page from "framework/Page";
import PropertyMetadata from "framework/PropertyMetadata";
import {unionRect} from "math/geometry";
import {areRectsIntersecting} from "math/math";
import commandManager from "framework/commands/CommandManager";
import Matrix from "math/matrix";
import CompositeCommand from "framework/commands/CompositeCommand";
import NullArtboard from "framework/NullArtboard";
import RelayoutEngine from "framework/relayout/RelayoutEngine";
import SystemConfiguration from "SystemConfiguration";
import Invalidate from "framework/Invalidate";
import Environment from "environment";

const ARTBOARD_SPACE = 100;

class ArtboardPage extends Page {

    constructor() {
        super();
        this._artboardNames = {};
    }

    initPage(view) {
        super.initPage(view);
        var artboard = this.getFirstArtboard();
        if (!artboard) {
            artboard = new Artboard();
            artboard.setProps({width: 1000, height: 1000, y: 0, x: 0});
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
            this.setActiveArtboard(child);
        }
    }

    viewportRect() {
        return {
            x: 0, y: 0,
            width: 0,
            height: 0
        }
    }

    getContentOuterSize() {
        var items = this.children;
        if (!items.length) {
            return {x: 0, y: 0, width: 0, height: 0};
        }
        var rect = items[0].getBoundaryRect();
        for (var i = 1; i < items.length; ++i) {
            rect = unionRect(rect, items[i].getBoundaryRect());
        }

        return rect;
    }

    getPagePoint(anchorX, anchorY) {
        var x, y;
        var rect = this.getContentOuterSize();
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
        this._viewport = Environment.view.viewportRect();
        super.draw.apply(this, arguments);
    }

    drawChildSafe(child, context, environment) {
        if (areRectsIntersecting(this._viewport, child.getBoundaryRect())) {
            super.drawChildSafe(child, context, environment);
        }
    }

    insertArtboards(screens) {
        var commands = [];
        var pos = this.getNextAvailiablePosition(screens[0].w, screens[0].h);
        for (var screen of screens) {

            var artboard = new Artboard();
            artboard.setProps({
                name: this.getNextArtboardName(screen.name),
                x: pos.x,
                y: pos.y,
                width: screen.w,
                height: screen.h
            });

            pos.x += screen.w + ARTBOARD_SPACE;

            this.add(artboard);
        }

        commandManager.execute(new CompositeCommand(commands));

        if(SystemConfiguration.ResetActiveToolToDefault) {
            App.Current.actionManager.invoke("movePointer");
        }
    }

    setActiveArtboard(artboard) {
        if (this._activeArtboard) {
            this._activeArtboard.deactivate();
        }

        this._activeArtboard = artboard;
        artboard.activate();
        Environment.controller && Environment.controller.onArtboardChanged && Environment.controller.onArtboardChanged.raise(artboard);
    }

    _activateArtboard(event) {
        var artboard = this._activeArtboard;
        if (artboard && artboard.hitTest(event)) {
            return;
        }

        var artboards = this.getAllArtboards();

        for (var i = 0, length = artboards.length; i < length; ++i) {
            artboard = artboards[i];
            if (artboard.hitTest(event)) {
                this.setActiveArtboard(artboard);
                Invalidate.request();
                return;
            }
        }

        this.setActiveArtboard(NullArtboard);
    }




    _onMouseUp(event) {
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
        var maxX = 0, maxY = 0;
        for (var a of this.children) {
            var right = a.right();
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
        var testIndex = this.children.length;
        var testName;
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
        var items = this.children;
        var res = [];
        for (var i = 0; i < items.length; ++i) {
            if (items[i] instanceof Artboard /*&& !(items[i] instanceof StateBoard)*/) {
                res.push(items[i]);
            }
        }
        return res;
    }

    eachArtboard(callback) {
        var items = this.children;
        for (var i = 0; i < items.length; ++i) {
            if (items[i] instanceof Artboard) {
                callback(items[i]);
            }
        }
    }

    getArtboardById(id) {
        for (var artboard of this.getAllArtboards()) {
            if (artboard.id() === id) {
                return artboard;
            }
        }

        return null;
    }


    getArtboardAtPoint(point) {
        for (var artboard of this.getAllArtboards()) {
            if (artboard.hitTest(point)) {
                return artboard;
            }
        }

        return null;
    }

    getFirstArtboard() {
        var items = this.children;
        var res = null;
        for (var i = 0; i < items.length; ++i) {
            if (items[i] instanceof Artboard) {
                res = items[i];
                break;
            }
        }
        return res;
    }

    relayout(oldPropsMap){
        var primitives = null;
        let res = RelayoutEngine.run2(this, oldPropsMap, e => !(e instanceof Artboard));
        if (res !== null){
            if (primitives === null){
                primitives = [];
            }
            Array.prototype.push.apply(primitives, res);
        }
        return primitives;
    }
}


ArtboardPage.prototype.__type__ = "ArtboardPage";

PropertyMetadata.registerForType(ArtboardPage, {
});


export default ArtboardPage;
 