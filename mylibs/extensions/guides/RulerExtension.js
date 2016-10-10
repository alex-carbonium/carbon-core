import RuntimeExtension from "./../RuntimeExtension";
import CustomGuides from "./CustomGuides";
import Brush from "framework/Brush";
import PropertyTracker from "framework/PropertyTracker";
import Artboard from "framework/Artboard";
import SnapController from "framework/SnapController";
import CommandManager from "framework/commands/CommandManager";
import Selection from "framework/SelectionModel";
import CompositeCommand from "../../framework/commands/CompositeCommand";
import Cursor from "framework/Cursor";
import Invalidate from "framework/Invalidate";

import Matrix from "math/matrix";
import {areRectsEqual, isPointInRect} from "math/math";
import Environment from "environment";
import DesignerView from "framework/DesignerView";

const PADDING_TOP = 32; //to match css for top bar
const RULER_WIDTH = 16;
const MINOR_LENGTH = 6;
const LABEL_MARGIN_X = 2;

export default class RulerExtension extends RuntimeExtension {
    constructor(app, view, controller) {
        super(app, view, controller);
    }

    attach(app, view, controller) {
        if (!(view instanceof DesignerView)) {
            return;
        }
        super.attach.apply(this, arguments);
        this._newGuideX = null;
        this._newGuideY = null;
        this._dragRequestedX = false;
        this._dragRequestedY = false;
        this._startDragX = 0;
        this._startDragY = 0;
        this._dragging = false;
        this._customGuides = new CustomGuides(Environment.view);

        this._viewportRect = null;

        SnapController.snapGuides.push(this._customGuides);
    }

    detach() {
        super.detach();
        this.view && this.view.unregisterForLayerDraw(2, this);
    }

    _onScaleChange(scale) {
        calculateSettings.call(this, scale);
        this.setOrigin(this.app.activePage.getActiveArtboard());
        this.setHighlight(this._selectComposite);
    }
    onLoaded() {
        this._selectComposite = Selection.selectComposite();

        var view = this.view;
        var controller = this.controller;

        view.registerForLayerDraw(2, this);

        this.registerForDispose(view.scaleChanged.bind(scale => {
            this._onScaleChange(scale);
        }));

        this.registerForDispose(controller.onArtboardChanged.bind(this, this.onArtboardChanged));
        this.registerForDispose(Selection.onElementSelected.bind(this, this.onSelection));
        this.registerForDispose(controller.mousedownEvent.bindHighPriority(this, this.onMouseDown));
        this.registerForDispose(controller.mousemoveEvent.bindHighPriority(this, this.onMouseMove));
        this.registerForDispose(controller.mouseupEvent.bindHighPriority(this, this.onMouseUp));
        this.registerForDispose(controller.mouseleaveEvent.bindHighPriority(this, this.onMouseLeave));

        this.registerForDispose(this.app.onBuildMenu.bind(this, this.onBuildMenu));

        this.registerForDispose(PropertyTracker.propertyChanged.bind(this, this.onPropertyChanged));

        // calculateSettings.call(this, view.scale());
        this._onScaleChange(view.scale());
        this.onArtboardChanged(this.app.activePage.getActiveArtboard());
    }

    onPropertyChanged(e, props) {
        if (e === this._origin) {
            if (props.x !== undefined || props.y !== undefined) {
                this.setOrigin(e);
            }
            else if (props.guides !== undefined) {
                this.setGuides(e);
            }
        }
        else if (this._selectComposite.has(e)) {
            this.setHighlight(this._selectComposite);
        }
    }

    onSelection(selection) {
        if (selection.count() === 1) {
            var element = selection.elementAt(0);
            if (element instanceof Artboard) {
                this.setOrigin(element);
                this.setGuides(element);
            }
        }
        this.setHighlight(selection);
    }

    onArtboardChanged(artboard) {
        if (!artboard) {
            return;
        }
        this.setOrigin(artboard);
        this.setGuides(artboard);
    }

    setOrigin(artboard) {
        if (!artboard) {
            return;
        }
        if (this._origin) {
            this._origin.disablePropsTracking();
        }

        this._origin = artboard;
        this._origin.enablePropsTracking();
        this._originX = artboard.x() * this._settings.scale + .5 | 0;
        this._originY = artboard.y() * this._settings.scale + .5 | 0;
        this._originWidth = artboard.width() * this._settings.scale + .5 | 0;
        this._originHeight = artboard.height() * this._settings.scale + .5 | 0;
    }

    setHighlight(selection) {
        if (selection.count() === 0) {
            this._highlight = null;
            return;
        }
        var box = selection.getBoundingBoxGlobal();
        this._highlight = {
            x: (selection.x() + box.x) * this._settings.scale - this._originX + .5 | 0,
            y: (selection.y() + box.y) * this._settings.scale - this._originY + .5 | 0,
            width: box.width * this._settings.scale,
            height: box.height * this._settings.scale
        };
    }

    setGuides(artboard) {
        var guides = artboard.props.guides;
        if (guides) {
            this._customGuides.prepareAndSetProps({
                guides: artboard.props.guides,
                origin: artboard.position()
            });
        }
        else {
            this._customGuides.prepareAndSetProps({
                guides: null
            });
        }
    }

    onMouseDown(e) {
        if (!this.guidesEnabled()) {
            return;
        }
        if (isPointInRect(this._rectHorizontal, e)) {
            var guideX = Math.round(e.x) - this._origin.x();
            if (this._customGuides.tryCaptureX(guideX)) {
                this._newGuideX = guideX;
            }

            this._startDragX = e.x;
            this._dragRequestedX = true;
            e.handled = true;
            Invalidate.requestUpperOnly();
            this._mousePressed = true;
            return false;
        }
        else if (isPointInRect(this._rectVertical, e)) {
            var guideY = Math.round(e.y) - this._origin.y();
            if (this._customGuides.tryCaptureY(guideY)) {
                this._newGuideY = guideY;
            }

            this._startDragY = e.y;
            e.handled = true;
            this._dragRequestedY = true;
            Invalidate.requestUpperOnly();
            this._mousePressed = true;
            return false;
        }
    }

    onMouseMove(e) {
        if(!this._mousePressed && e.event.buttons !== 0){
            return;
        }
        if (!this.guidesEnabled() && !this._rectHorizontal) {
            return;
        }

        if (this._dragRequestedX && e.x !== this._startDragX) {
            this._dragging = true;
        }
        else if (this._dragRequestedY && e.y !== this._startDragY) {
            this._dragging = true;
        }

        if (this._dragging) {
            if (this._customGuides.capturedIndexX !== -1) {
                if (e.x < this._rectHorizontal.x || e.x > this._rectHorizontal.x + this._rectHorizontal.width) {
                    Cursor.setGlobalCursor("crosshair", true);
                    this._newGuideX = null;
                }
                else {
                    this._newGuideX = Math.round(e.x) - this._origin.x();
                    Cursor.setGlobalCursor("col-resize", true);
                }
            }
            else if (this._customGuides.capturedIndexY !== -1) {
                if (e.y < this._rectVertical.y || e.y > this._rectVertical.y + this._rectVertical.height) {
                    Cursor.setGlobalCursor("crosshair", true);
                    this._newGuideY = null;
                }
                else {
                    this._newGuideY = Math.round(e.y) - this._origin.y();
                    Cursor.setGlobalCursor("row-resize", true);
                }
            }
            else {
                this._newGuideX = null;
                this._newGuideY = null;
            }
            e.handled = true;
            Invalidate.requestUpperOnly();
            return;
        }

        if (isPointInRect(this._rectHorizontal, e)) {
            var x = Math.round(e.x) - this._origin.x();
            if (this._customGuides.tryCaptureX(x)) {
                this._newGuideX = this._origin.props.guides.x[this._customGuides.capturedIndexX];
            }
            else {
                this._newGuideX = x;
                this._customGuides.releaseCaptured();
            }
            Cursor.setGlobalCursor("col-resize", true);
            Invalidate.requestUpperOnly();
        }
        else if (isPointInRect(this._rectVertical, e)) {
            var y = Math.round(e.y) - this._origin.y();
            if (this._customGuides.tryCaptureY(y)) {
                this._newGuideY = this._origin.props.guides.y[this._customGuides.capturedIndexY];
            }
            else {
                this._newGuideY = y;
                this._customGuides.releaseCaptured();
            }
            Cursor.setGlobalCursor("row-resize", true);
            Invalidate.requestUpperOnly();
        }
        else if (this._newGuideX || this._newGuideY) {
            this._newGuideX = null;
            this._newGuideY = null;
            this._customGuides.releaseCaptured();
            Cursor.removeGlobalCursor();
            Invalidate.requestUpperOnly();
        }
    }

    onMouseUp(e) {
        if(!this._mousePressed){
            return;
        }

        this._mousePressed = false;
        if (!this.guidesEnabled()) {
            return;
        }

        if (this._dragging) {
            this._dragRequestedX = false;
            this._dragRequestedY = false;
            this._dragging = false;

            e.handled = true;
            if (this._customGuides.capturedIndexX !== -1) {
                let guides = this.getGuidesProperty();
                if (e.x < this._rectHorizontal.x || e.x > this._rectHorizontal.x + this._rectHorizontal.width) {
                    guides.x.splice(this._customGuides.capturedIndexX, 1);
                }
                else {
                    guides.x[this._customGuides.capturedIndexX] = Math.round(e.x) - this._origin.x();
                }
                this._newGuideX = null;
                this._origin.setProps({guides: guides});
            }
            else if (this._customGuides.capturedIndexY !== -1) {
                let guides = this.getGuidesProperty();
                if (e.y < this._rectVertical.y || e.y > this._rectVertical.y + this._rectVertical.height) {
                    guides.y.splice(this._customGuides.capturedIndexY, 1);
                }
                else {
                    guides.y[this._customGuides.capturedIndexY] = Math.round(e.y) - this._origin.y();
                }
                this._newGuideY = null;
                this._origin.setProps({guides: guides});
            }


            this._customGuides.releaseCaptured();

            Cursor.removeGlobalCursor();
            Invalidate.requestUpperOnly();
            return false;
        }

        var hit = false;
        if (isPointInRect(this._rectHorizontal, e)) {
            var guideX = Math.round(e.x) - this._origin.x();
            let guides = this.getGuidesProperty();
            if (guides.x.indexOf(guideX) === -1) {
                guides.x.push(guideX);
                this._origin.setProps({guides: guides});
            }
            this._newGuideX = null;
            hit = true;
        }
        else if (isPointInRect(this._rectVertical, e)) {
            var guideY = Math.round(e.y) - this._origin.y();
            let guides = this.getGuidesProperty();
            if (guides.y.indexOf(guideY) === -1) {
                guides.y.push(guideY);
                this._origin.setProps({guides: guides});
            }
            this._newGuideY = null;
            hit = true;
        }

        if (hit) {
            this._customGuides.releaseCaptured();

            this._dragRequestedX = false;
            this._dragRequestedY = false;
            this._dragging = false;

            e.handled = true;

            Invalidate.requestUpperOnly();
            return false;
        }

    }

    onMouseLeave() {
        var invalidate = false;
        if (this._newGuideX !== null || this._newGuideY !== null) {
            this._newGuideX = null;
            this._newGuideY = null;
            invalidate = true;
        }
        if (this._dragging) {
            this._customGuides.releaseCaptured();
            this._dragRequestedX = false;
            this._dragRequestedY = false;
            this._dragging = false;
            invalidate = true;
        }
        if (invalidate) {
            Cursor.removeGlobalCursor();
            Invalidate.requestUpperOnly();
        }
    }

    getGuidesProperty() {
        var guides = this._origin.props.guides;
        if (!guides) {
            guides = {x: [], y: []};
        }
        else {
            guides = extend(true, {}, guides);
        }
        return guides;
    }

    deleteGuidesOnArtboard() {
        this._origin.setProps({guides: null});
    }

    deleteGuidesOnPage() {
        var commands = [];
        var artboards = Environment.view.page().getAllArtboards();
        for (var i = 0; i < artboards.length; i++) {
            artboards[i].setProps({guides: null});
        }
    }

    deleteAllGuides() {
        var commands = [];
        for (var i = 0; i < this.app.pages.length; i++) {
            var page = this.app.pages[i];
            var artboards = page.getAllArtboards();
            for (var j = 0; j < artboards.length; j++) {
                artboards[j].setProps({guides: null});
            }
        }
        CommandManager.execute(new CompositeCommand(commands));
    }

    deleteGuideX(i) {
        var guides = this.getGuidesProperty();
        guides.x.splice(i, 1);
        this._origin.setProps({guides: guides});
    }

    deleteGuideY(i) {
        var guides = this.getGuidesProperty();
        guides.y.splice(i, 1);
        this._origin.setProps({guides: guides});
    }

    onBuildMenu(context, menu) {
        var hit = false;

        if (isPointInRect(this._rectHorizontal, context.eventData)) {
            menu.items.length = 0;
            var guideX = Math.round(context.eventData.x) - this._origin.x();
            if (this.guidesEnabled() && this._customGuides.tryCaptureX(guideX)) {
                menu.items.push({
                    name: "Delete guide",
                    callback: function (i) {
                        this.deleteGuideX(i)
                    }.bind(this, this._customGuides.capturedIndexX)
                });
            }

            hit = true;
        }
        else if (isPointInRect(this._rectVertical, context.eventData)) {
            menu.items.length = 0;
            var guideY = Math.round(context.eventData.y) - this._origin.y();
            if (this.guidesEnabled() && this._customGuides.tryCaptureY(guideY)) {
                menu.items.push({
                    name: "Delete guide",
                    callback: function (i) {
                        this.deleteGuideY(i)
                    }.bind(this, this._customGuides.capturedIndexY)
                });
            }

            hit = true;
        }

        if (hit) {
            menu.items.push({
                name: "Delete all guides",
                items: [
                    {
                        name: "On current artboard",
                        callback: () => this.deleteGuidesOnArtboard()
                    },
                    {
                        name: "On current page",
                        callback: () => this.deleteGuidesOnPage()
                    },
                    {
                        name: "On all pages",
                        callback: () => this.deleteAllGuides()
                    }
                ],
                callback: () => this.deleteAllGuides()
            });
            this._newGuideX = null;
            this._newGuideY = null;
            this._customGuides.releaseCaptured();
            Cursor.removeGlobalCursor();
            Invalidate.requestUpperOnly();
        }
    }

    checkRefreshCache() {
        var viewportRect = Environment.view.viewportRect();
        if (!this._settings || (this._viewportRect && areRectsEqual(this._viewportRect, viewportRect))) {
            return;
        }
        this._viewportRect = viewportRect;
        this._viewportSize = this.app.viewportSize();

        var xRounder = viewportRect.x < 0 ? -.5 : .5;
        var yRounder = viewportRect.y < 0 ? -.5 : .5;
        var scale = this._settings.scale;

        var rulerWidth = RULER_WIDTH / this._settings.scale;
        this._rectHorizontal = {
            x: viewportRect.x + rulerWidth,
            y: viewportRect.y + PADDING_TOP / this._settings.scale,
            width: viewportRect.width - rulerWidth,
            height: rulerWidth
        };
        this._rectVertical = {
            x: viewportRect.x,
            y: viewportRect.y + rulerWidth + PADDING_TOP / this._settings.scale,
            width: rulerWidth,
            height: viewportRect.height - rulerWidth
        };

        this._baseMatrix = new Matrix();
        this._baseMatrix.scale(1 / scale, 1 / scale);
        this._baseMatrix.translate(viewportRect.x * scale + xRounder | 0, (viewportRect.y * scale + yRounder | 0) + PADDING_TOP);
    }

    onLayerDraw(layer, context) {
        this.checkRefreshCache();

        context.save();

        context.font = "10px Arial";
        context.strokeStyle = "gray";
        this._baseMatrix.applyToContext(context);

        this.drawHorizontal(context, this._viewportSize.width, this._viewportSize.height, Environment.view.scrollX() - this._originX, this._originWidth);
        this.drawVertical(context, this._viewportSize.height, this._viewportSize.width, Environment.view.scrollY() - this._originY, this._originWidth);

        // context.beginPath();
        // context.rect(0, 0, RULER_WIDTH - .5, RULER_WIDTH - .5);
        // context.stroke();

        context.restore();
    }

    drawHorizontal(context, length, viewportHeight, origin, width) {
        context.save();

        // context.fillStyle = "white";
        // context.fillRect(0, 0, length, RULER_WIDTH);

        var offset = calculateOffset(origin, length, this._settings);
        var major = offset.major;
        context.translate(offset.translate, 0);

        var minx = offset.major * this._settings.majorStep * this._settings.scale;
        var minDraw = -minx + .5 | 0;
        var maxDraw = width - minx + .5 | 0;
        if (this._highlight) {
            var highlightX = this._highlight.x - minx + .5 | 0;
            if (highlightX > 0 && highlightX < length) {
                context.fillStyle = "rgb(226, 199, 11)";
                context.fillRect(highlightX, 0, this._highlight.width, MINOR_LENGTH);
            }
        }

        context.fillStyle = "black";
        context.beginPath();

        for (var i = 0, l = offset.minorCount; i < l; ++i) {
            let x = i * this._settings.minorStepPixels + .5 | 0;
            context.moveTo(x + .5, 0);
            if (i % 10 === 0) {
                var text = major++ * this._settings.majorStep;
                if (x >= minDraw && x <= maxDraw) {
                    context.lineTo(x + .5, RULER_WIDTH);
                    context.fillText(text, x + LABEL_MARGIN_X, 18);
                } else {
                    context.lineTo(x + .5, MINOR_LENGTH);
                }
            }
            else if (x > minDraw && x < maxDraw || i % 5 === 0) {
                context.lineTo(x + .5, MINOR_LENGTH);
            }
        }
        // context.moveTo(0, RULER_WIDTH - .5);
        // context.lineTo(length + Math.abs(offset.translate), RULER_WIDTH - .5);
        context.stroke();

        if (this.guidesEnabled()) {
            this._customGuides.drawX(context, minx, viewportHeight);
        }
        if (this._newGuideX !== null) {
            context.beginPath();
            var x = this._newGuideX * this._settings.scale - minx + .5 | 0;

            context.moveTo(x + .5, 0);
            context.lineTo(x + .5, RULER_WIDTH);
            Brush.stroke(this._customGuides.borderBrush(), context);

            var text = "" + (this._newGuideX + .5 | 0);
            context.fillStyle = "white";
            context.fillRect(x + LABEL_MARGIN_X, 0, context.measureText(text).width + 5, RULER_WIDTH - MINOR_LENGTH);
            context.fillStyle = "black";
            context.fillText(text, x + LABEL_MARGIN_X + 2, 10);

            context.globalAlpha = .3;
            context.beginPath();
            context.moveTo(x + .5, RULER_WIDTH);
            context.lineTo(x + .5, viewportHeight);
            context.stroke();
            context.globalAlpha = 1;
        }

        context.restore();
    }

    drawVertical(context, length, viewportWidth, origin, height) {
        context.save();

        // context.fillStyle = "white";
        // context.fillRect(0, 0, RULER_WIDTH, length);

        var offset = calculateOffset(origin, length, this._settings);
        var major = offset.major;
        context.translate(0, offset.translate - PADDING_TOP);

        var miny = offset.major * this._settings.majorStep * this._settings.scale;
        var minDraw = -miny + .5 | 0;
        var maxDraw = height - miny + .5 | 0;
        if (this._highlight) {
            var highlightY = this._highlight.y - miny + .5 | 0;
            if (highlightY > 0 && highlightY < length) {
                context.fillStyle = "rgb(226, 199, 11)";
                context.fillRect(0, highlightY, MINOR_LENGTH, this._highlight.height);
            }
        }

        context.fillStyle = "black";
        context.beginPath();

        var labels = [];
        for (let i = 0, l = offset.minorCount; i < l; ++i) {
            let y = i * this._settings.minorStepPixels + .5 | 0;
            context.moveTo(0, y + .5);
            if (i % 10 === 0) {
                var text = major++ * this._settings.majorStep;
                if (y >= (minDraw - 5) && y <= (maxDraw + 5)) {
                    context.lineTo(RULER_WIDTH, y + .5);
                    labels.push(y, text);
                } else {
                    context.lineTo(MINOR_LENGTH, y + .5);
                }
            }
            else if (y > minDraw && y < maxDraw || (i % 5 === 0)) {
                context.lineTo(MINOR_LENGTH, y + .5);
            }
        }
        // context.moveTo(RULER_WIDTH - .5, 0);
        // context.lineTo(RULER_WIDTH - .5, length + Math.abs(offset.translate));
        context.stroke();

        if (this.guidesEnabled()) {
            this._customGuides.drawY(context, miny, viewportWidth);
        }
        var guideLabelY = 0;
        if (this._newGuideY !== null) {
            context.beginPath();
            let y = this._newGuideY * this._settings.scale - miny + .5 | 0;

            context.moveTo(0, y + .5);
            context.lineTo(RULER_WIDTH, y + .5);
            Brush.stroke(this._customGuides.borderBrush(), context);

            guideLabelY = y;

            context.globalAlpha = .3;
            context.beginPath();
            context.moveTo(RULER_WIDTH, y + .5);
            context.lineTo(viewportWidth, y + .5);
            context.stroke();
            context.globalAlpha = 1;
        }

        var originX = RULER_WIDTH / 2;
        var originY = length / 2 + .5 | 0;
        context.translate(originX, originY);
        context.rotate(-Math.PI / 2);
        for (let i = 0; i < labels.length; i += 2) {
            //simplified rotation
            let x = originX - labels[i] + originY;
            context.fillText(labels[i + 1], x - 8, 10);
        }
        if (this._newGuideY !== null) {
            var text = "" + (this._newGuideY + .5 | 0);
            let x = originX - guideLabelY + originY;
            context.fillStyle = "white";
            context.fillRect(x - 10, -RULER_WIDTH / 2, context.measureText(text).width + 5, RULER_WIDTH - MINOR_LENGTH);
            context.fillStyle = "black";
            context.fillText(text, x - 8, 0);
        }

        context.restore();
    }

    guidesEnabled() {
        return this.app.props.customGuides.show;
    }
}

function calculateSettings(scale) {
    var base = 100;
    var ratio = 1 / scale;
    var log2 = Math.log2(ratio);
    var p = Math.abs(log2);
    var majorStep = log2 > 0 ? base * (1 << p) : base / (1 << p);

    if (majorStep < 10) {
        majorStep = 10;
    }
    else if (majorStep < 50) {
        majorStep = 20;
    }

    var minorStepPixels = majorStep / 10 * scale;

    this._settings = {
        scale,
        majorStep,
        minorStepPixels
    }
}

function calculateOffset(origin, length, settings) {
    //find first visible major
    var major = origin / settings.minorStepPixels / 10;
    var rounder = major > 0 ? 1 : major < 0 ? -1 : 0;
    major = major + rounder | 0;
    //if origin is on the left, step one major back to ensure filling the width
    if (origin > 0) --major;
    var translate = Math.round(major * settings.minorStepPixels * 10 - origin);

    //draw one major more to fill the width
    var minorCount = length / settings.minorStepPixels + 10.5;

    return {major, translate, minorCount};
}