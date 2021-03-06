import RuntimeExtension from "../RuntimeExtension";
import PropertyTracker from "../../framework/PropertyTracker";
import UIElement from "../../framework/UIElement";
import Artboard from "../../framework/Artboard";
import NullArtboard from "../../framework/NullArtboard";
import Selection from "../../framework/SelectionModel";

import Matrix from "../../math/matrix";
import { areRectsEqual } from "../../math/math";
import DesignerView from "../../framework/DesignerView";
import NullPage from "../../framework/NullPage";
import UserSettings from "../../UserSettings";
import RulerGuides from "./RulerGuides";
import { IArtboardProps, IApp, IView, IController, ILayer, IContext, IComposite, IMouseEventData, InteractionType, IPage } from "carbon-core";
import { IArtboard, IUIElement } from "carbon-model";
import { LayerType } from "carbon-app";

const config = UserSettings.ruler;
const selectionSize = 3;
const PADDING_TOP = 0; //to match css for top bar
const LABEL_MARGIN_X = 2;

var widthOfL = -1;
var widthOfW = -1;

export default class RulerExtension extends RuntimeExtension {
    [name: string]: any;
    _rulerGuides: RulerGuides;

    constructor(app: IApp, view: IView, controller: IController) {
        super(app, view, controller);
    }

    attach(app: IApp, view: IView, controller: IController) {
        return;
        // if (!(view instanceof DesignerView)) {
        //     return;
        // }

        // super.attach.apply(this, arguments);

        // this._rulerGuides = new RulerGuides(app, view, controller);
        // this._viewportRect = null;
        // this.view = view;
    }

    detach() {
        super.detach();
        this.view && this.view.unregisterForLayerDraw(LayerType.Interaction, this);

        if (this._rulerGuides) {
            this._rulerGuides.dispose();
        }
    }

    _onScaleChange(scale: number) {
        calculateSettings.call(this, scale);
        this.setOrigin((this.app.activePage.getActiveArtboard()) as any || this.app.activePage);
        this.setHighlight(this._selectComposite);
    }
    onLoaded() {
        this._selectComposite = Selection.selectComposite();

        var view = this.view;
        var controller = this.controller;

        view.registerForLayerDraw(LayerType.Interaction, this);

        this.registerForDispose(view.scaleChanged.bind(scale => {
            this._onScaleChange(scale);
        }));

        this.registerForDispose(controller.onArtboardChanged.bind(this, this.onArtboardChanged));
        this.registerForDispose(Selection.onElementSelected.bind(this, this.onSelection));

        this.registerForDispose(this.controller.interactionProgress.bind(this, this.onInteractionProgress));

        this.registerForDispose(this.app.pageChanged.bind(this, this.onPageChanged));

        this.registerForDispose(PropertyTracker.propertyChanged.bind(this, this.onPropertyChanged));

        this.onPageChanged();
        this.checkRefreshCache();
    }

    onPropertyChanged(e: UIElement, props: IArtboardProps) {
        if (e === this._origin) {
            if (e.isChangeAffectingLayout(props)) {
                this.setOrigin(e as Artboard);
            }
            else if (props.guidesX !== undefined || props.guidesY !== undefined) {
                this._rulerGuides.setGuides(e as Artboard);
                this.view.snapController.calculateSnappingPoints(e);
            }
        }
        else if (this._selectComposite.has(e)) {
            this.setHighlight(this._selectComposite);
        }
    }

    onSelection(selection: IComposite) {
        if (selection.elements.length === 1) {
            var element = selection.elements[0];
            if (element instanceof Artboard) {
                this.setOrigin(element);
                this._rulerGuides.setGuides(element);
            }
        }
        this.setHighlight(selection);
    }

    onInteractionProgress(type: InteractionType, eventData: IMouseEventData, composite: IComposite) {
        if (type === InteractionType.Dragging || type === InteractionType.Resizing || type === InteractionType.Rotation) {
            this.setHighlight(composite);
        }
    }

    onArtboardChanged(artboard: any, prev: any) {
        let origin = artboard;
        if(!origin) {
            origin = this.app.activePage;
        }
        this.setOrigin(origin);
        this._rulerGuides.setGuides(origin);
    }

    onPageChanged() {
        this._onScaleChange(this.view.scale());
        this.onArtboardChanged(this.app.activePage.getActiveArtboard() as any, null);
    }

    setOrigin(artboard: Artboard | IPage) {
        this._artboardActive = !!artboard;

        if (!this._artboardActive || artboard === NullPage) {
            this._originX = 0;
            this._originY = 0;
            this._originWidth = 0;
            this._originHeight = 0;
            // this._rulerGuides.setOrigin(this.app.activePage);
            return;
        }
        if (this._origin) {
            this._origin.disablePropsTracking();
        }

        var bb = artboard.getBoundingBox();

        this._origin = artboard;
        this._origin.enablePropsTracking();
        this._originX = Math.round(bb.x * this._settings.scale);
        this._originY = Math.round(bb.y * this._settings.scale);
        this._originWidth = bb.width * this._settings.scale + .5 | 0;
        this._originHeight = bb.height * this._settings.scale + .5 | 0;

        this._rulerGuides.setOrigin(artboard);
    }

    setHighlight(selection: IComposite) {
        if (!selection || (selection.elements && selection.elements.length === 0)) {
            this._highlight = null;
            return;
        }

        if ((selection.elements && selection.elements.length === 1 && selection.elements[0] instanceof Artboard) || selection instanceof Artboard) {
            this._highlight = null;
            return;
        }

        var box = selection.getBoundingBoxGlobal();

        if (box.width !== 0 || box.height !== 0) {
            this._highlight = {
                x: Math.round(box.x) * this._settings.scale - this._originX,
                y: Math.round(box.y) * this._settings.scale - this._originY,
                width: box.width * this._settings.scale + .5 | 0,
                height: box.height * this._settings.scale + .5 | 0
            };
        }
    }

    checkRefreshCache() {
        var viewportRect = this.view.viewportRect();
        if (!this._settings || (this._viewportRect && areRectsEqual(this._viewportRect, viewportRect))) {
            return;
        }
        this._viewportRect = viewportRect;
        this._viewportSize = this.view.viewportSize();

        var xRounder = viewportRect.x < 0 ? -.5 : .5;
        var yRounder = viewportRect.y < 0 ? -.5 : .5;
        var scale = this._settings.scale;

        var rulerWidth = config.size / this._settings.scale;
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

        this._baseMatrix = Matrix.create();
        this._baseMatrix.scale(1 / scale, 1 / scale);
        this._baseMatrix.translate(viewportRect.x * scale + xRounder | 0, (viewportRect.y * scale + yRounder | 0) + PADDING_TOP);

        this._rulerGuides.setRulerBounds(this._rectHorizontal, this._rectVertical);
    }

    onLayerDraw(layer: ILayer, context: IContext) {
        this.checkRefreshCache();

        context.save();

        context.font = config.font_size + "px Arial";
        context.strokeStyle = "gray";
        this._baseMatrix.applyToContext(context);

        this.drawHorizontal(context, this._viewportSize.width, this._viewportSize.height, this.view.scrollX - this._originX, this._originWidth);
        this.drawVertical(context, this._viewportSize.height, this._viewportSize.width, this.view.scrollY - this._originY, this._originHeight);

        //context.clearRect(0, -PADDING_TOP, config.size, PADDING_TOP + config.size);

        context.restore();
    }

    drawHorizontal(context: IContext, length: number, viewportHeight: number, origin: number, width: number) {
        context.save();

        // context.fillStyle = "white";
        // context.fillRect(0, 0, length, settings.size);

        var offset = calculateOffset(origin, length, this._settings);
        var major = offset.major;
        context.translate(offset.translate, 0);

        context.save();
        context.fillStyle = config.overlay_fill;
        context.globalAlpha = config.overlay_opacity;
        context.fillRect(-offset.translate, 0, length, config.size);
        context.restore();

        var minx = offset.major * this._settings.majorStep * this._settings.scale;
        var minDraw = -minx + .5 | 0;
        var maxDraw = width - minx + .5 | 0;

        this.drawHorizontalHighlight(context, minDraw, maxDraw, minx, length, offset);

        context.strokeStyle = "gray";
        context.lineWidth = 1;
        context.beginPath();

        for (var i = 0, l = offset.minorCount; i < l; ++i) {
            let x = i * this._settings.minorStepPixels + .5 | 0;
            context.moveTo(x + .5, 0);
            if (i % 10 === 0) {
                let text = major++ * this._settings.majorStep;
                //if (x >= minDraw && x <= maxDraw || width === 0) {
                context.lineTo(x + .5, config.size);
                context.fillStyle = x >= minDraw && x <= maxDraw ? "black" : "gray";
                context.fillText(text + "", x + LABEL_MARGIN_X, 11);
                //}
                // else {
                //     context.lineTo(x + .5, config.tick_minor_size);
                // }
            }
            else if (x > minDraw && x < maxDraw || (i % 5 === 0)) {
                context.lineTo(x + .5, config.tick_minor_size);
            }
        }
        // context.moveTo(0, settings.size - .5);
        // context.lineTo(length + Math.abs(offset.translate), settings.size - .5);
        context.stroke();

        this._rulerGuides.drawX(context, minx, viewportHeight);

        context.restore();
    }
    drawHorizontalHighlight(context: IContext, minDraw: number, maxDraw: number, minx: number, length: number, offset: IOffset) {
        if (this._artboardActive) {
            if (maxDraw >= 0 && minDraw + offset.translate <= length) {
                context.fillStyle = config.artboard_fill;
                context.fillRect(minDraw, 0, Math.min(this._originWidth, length - minDraw - offset.translate), config.size);
            }

            if (this._highlight) {
                var highlightX = Math.round(this._highlight.x - minx);
                var hx = highlightX + offset.translate;
                var hw = this._highlight.width;
                if (hx <= length && hx + hw >= 0) {
                    let y = config.size + selectionSize / 2;

                    context.beginPath();
                    context.strokeStyle = config.selection_edge_fill;
                    context.lineWidth = selectionSize;
                    context.moveTo(highlightX, y);
                    context.lineTo(highlightX + 2, y);

                    context.moveTo(highlightX + this._highlight.width - 2, y);
                    context.lineTo(highlightX + this._highlight.width, y);
                    context.stroke();

                    context.beginPath();
                    context.lineWidth = selectionSize;
                    context.strokeStyle = config.selection_fill;
                    context.moveTo(highlightX + 2, y);
                    context.lineTo(Math.min(highlightX + this._highlight.width - 2, length - offset.translate), y);
                    context.stroke();

                    // if (this._highlight.width > 70){
                    //     if (widthOfL === -1){
                    //         widthOfL = context.measureText("L").width + 1;
                    //     }
                    //     if (widthOfW === -1){
                    //         widthOfW = context.measureText("W").width + 1;
                    //     }
                    //
                    //     var ty = y + 12;
                    //     context.fillStyle = config.selection_label_fill;
                    //     context.fillText("L", highlightX, ty);
                    //     context.fillStyle = config.selection_value_fill;
                    //     context.fillText(this._highlight.box.x + "", highlightX + widthOfL, ty);
                    //
                    //     if (drawRightPoint){
                    //         var t = this._highlight.box.width + "";
                    //         var w = context.measureText(t).width;
                    //         context.fillStyle = config.selection_label_fill;
                    //         context.fillText("W", highlightX + this._highlight.width - widthOfW - w, ty);
                    //         context.fillStyle = config.selection_value_fill;
                    //         context.fillText(t, highlightX + this._highlight.width - w, ty);
                    //     }
                    // }
                }
            }
        }
    }


    drawVertical(context: IContext, length: number, viewportWidth: number, origin: number, height: number) {
        context.save();

        // context.fillStyle = "white";
        // context.fillRect(0, 0, settings.size, length);

        var offset = calculateOffset(origin, length, this._settings);
        var major = offset.major;
        context.translate(0, offset.translate - PADDING_TOP);

        var miny = offset.major * this._settings.majorStep * this._settings.scale;
        var minDraw = -miny + .5 | 0;
        var maxDraw = height - miny + .5 | 0;

        this.drawVerticalHighlight(context, minDraw, maxDraw, miny, length, offset);

        context.strokeStyle = "gray";
        context.lineWidth = 1;
        context.beginPath();

        var labels = [];
        for (let i = 0, l = offset.minorCount; i < l; ++i) {
            let y = i * this._settings.minorStepPixels + .5 | 0;
            context.moveTo(0, y + .5);
            if (i % 10 === 0) {
                let text = major++ * this._settings.majorStep;
                //if (y >= (minDraw - 5) && y <= (maxDraw + 5) || height === 0) {
                context.lineTo(config.size, y + .5);
                labels.push(y, text, y >= minDraw && y <= maxDraw + 5 ? 1 : 0);
                //}
                // else {
                //     context.lineTo(config.tick_minor_size, y + .5);
                // }
            }
            else if (y > minDraw && y < maxDraw || (i % 5 === 0)) {
                context.lineTo(config.tick_minor_size, y + .5);
            }
        }
        // context.moveTo(settings.size - .5, 0);
        // context.lineTo(settings.size - .5, length + Math.abs(offset.translate));
        context.stroke();

        this._rulerGuides.drawY(context, miny, viewportWidth);

        var originX = config.size / 2;
        var originY = length / 2 + .5 | 0;
        context.translate(originX, originY);
        context.rotate(-Math.PI / 2);
        for (let i = 0; i < labels.length; i += 3) {
            //simplified rotation
            let x = originX - labels[i] + originY;
            context.fillStyle = labels[i + 2] ? "black" : "gray";
            context.fillText(labels[i + 1] + "", x - 5, 5);
        }

        context.restore();
    }
    drawVerticalHighlight(context: IContext, minDraw: number, maxDraw: number, miny: number, length: number, offset: IOffset) {
        if (this._artboardActive) {
            if (maxDraw >= 0 && minDraw + offset.translate <= length) {
                context.fillStyle = config.artboard_fill;
                context.fillRect(0, minDraw, config.size, Math.min(this._originHeight, length - minDraw - offset.translate));
            }

            if (this._highlight) {
                var highlightY = Math.round(this._highlight.y - miny);
                var hy = highlightY + offset.translate;
                var hh = this._highlight.width;
                if (hy <= length && hy + hh >= 0) {
                    let x = config.size + selectionSize / 2;

                    context.beginPath();
                    context.strokeStyle = config.selection_edge_fill;
                    context.lineWidth = selectionSize;
                    context.moveTo(x, highlightY);
                    context.lineTo(x, highlightY + 2);

                    context.moveTo(x, highlightY + this._highlight.height - 2);
                    context.lineTo(x, highlightY + this._highlight.height);
                    context.stroke();

                    context.beginPath();
                    context.lineWidth = selectionSize;
                    context.strokeStyle = config.selection_fill;
                    context.moveTo(x, highlightY + 2);
                    context.lineTo(x, Math.min(highlightY + this._highlight.height - 2, length - offset.translate));
                    context.stroke();

                    // if (this._highlight.height > 70){
                    //     if (widthOfL === -1){
                    //         widthOfL = context.measureText("L").width + 1;
                    //     }
                    //     if (widthOfW === -1){
                    //         widthOfW = context.measureText("W").width + 1;
                    //     }
                    //
                    //     context.save();
                    //
                    //     var tx = x + 2;
                    //     context.fillStyle = config.selection_label_fill;
                    //     context.fillText("L", tx, highlightY);
                    //     context.fillStyle = config.selection_value_fill;
                    //     context.fillText(this._highlight.box.y + "", tx + widthOfL, highlightY);
                    //
                    //     if (drawRightPoint){
                    //         var t = this._highlight.box.height + "";
                    //         context.fillStyle = config.selection_label_fill;
                    //         context.fillText("W", tx, highlightY + this._highlight.height);
                    //         context.fillStyle = config.selection_value_fill;
                    //         context.fillText(t, tx + widthOfW, highlightY + this._highlight.height);
                    //     }
                    //     context.restore();
                    // }
                }
            }
        }
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

function calculateOffset(origin, length, settings): IOffset {
    //find first visible major
    var major = origin / settings.minorStepPixels / 10;
    var rounder = major > 0 ? 1 : major < 0 ? -1 : 0;
    major = major + rounder | 0;
    //if origin is on the left, step one major back to ensure filling the width
    if (origin > 0) {
        --major
    };
    var translate = Math.round(major * settings.minorStepPixels * 10 - origin);

    //draw one major more to fill the width
    var minorCount = length / settings.minorStepPixels + 10.5;

    return { major, translate, minorCount };
}

interface IOffset {
    major: number;
    translate: number;
    minorCount: number;
}