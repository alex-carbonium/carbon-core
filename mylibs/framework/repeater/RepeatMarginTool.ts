import { isPointInRect, adjustRectWidth, adjustRectHeight } from "math/math";
import DragController from "../DragController";
import CommandManager from "../commands/CommandManager";
import PropertyTracker from "../PropertyTracker";
import Cursor from "framework/Cursor";
import Invalidate from "framework/Invalidate";
import Environment from "environment";
import ModelStateListener from "../relayout/ModelStateListener";
import { LayerType, IView } from "carbon-app";
import Rect from "../../math/rect";
import UserSettings from "../../UserSettings";
import { RenderEnvironment, ChangeMode } from "carbon-core";

const MinSize = 4;

class RepeatMarginTool {
    [key:string]:any;
    _container: any;
    _margins: any;
    _activeMargin: any;
    _dragController: any;
    _firstDrag:boolean =  true;
    _view:IView;

    attach(container, view) {
        this._container = container;
        this._container.enablePropsTracking();
        this._strategy = container.arrangeStrategyInstance();

        this._dragController = new DragController();
        this._dragController.onSearching = this.onDragSearching.bind(this);
        this._dragController.onSearchCancelled = this.onDragSearchCancelled.bind(this);
        this._dragController.onStarting = this.onDragStarting.bind(this);
        this._dragController.onDragging = this.onDragging.bind(this);
        this._dragController.onStopped = this.onDragStopped.bind(this);

        this.createVisualizations();
        this._view = view;

        view.registerForLayerDraw(LayerType.Interaction, this, 0);
        this._dragController.bindToController(Environment.controller);
    }

    detach(container) {
        if (this._container) {
            this._container.disablePropsTracking();
        }
        this._container = null;
        this._margins = null;
        this._activeMargin = null;

        var view = this._view;
        view.unregisterForLayerDraw(LayerType.Interaction, this);
        if (this._dragController) {
            this._dragController.unbind();
            this._dragController = null;
        }
    }

    createVisualizations() {
        var container = this._container;
        if (!container) {
            return;
        }

        var baseMatrix = container.globalViewMatrix().clone();
        var containerWidth = container.width;
        var containerHeight = container.height;
        var cols = container.cols;
        var rows = container.rows;
        var itemBox = container.children[0].getBoundingBox();
        var marginX = this._strategy.getActualMarginX(container);
        var marginY = this._strategy.getActualMarginY(container);

        var marginRectX = { x: 0, y: 0, width: marginX, height: containerHeight };
        var marginRectY = { x: 0, y: 0, width: containerWidth, height: marginY };

        this._margins = [];
        for (let i = 1; i < cols; i++) {
            let x = itemBox.x + itemBox.width * i + marginX * (i - 1);
            if (x < containerWidth) {
                let matrix = baseMatrix.clone().translate(x, 0);
                let x2 = x + marginX;
                let rect = x2 < containerWidth ? marginRectX : adjustRectWidth(marginRectX, containerWidth - x2);
                this._margins.push({
                    rect,
                    vertical: false,
                    cursor: 'col-resize',
                    value: marginX,
                    matrix: matrix,
                    matrixInverted: matrix.clone().invert()
                });
            }
        }
        for (let i = 1; i < rows; i++) {
            let y = itemBox.y + itemBox.height * i + marginY * (i - 1);
            if (y < containerHeight) {
                let matrix = baseMatrix.clone().translate(0, y);
                let y2 = y + marginY;
                let rect = y2 < containerHeight ? marginRectY : adjustRectHeight(marginRectY, containerHeight - y2);
                this._margins.push({
                    rect,
                    vertical: true,
                    cursor: 'row-resize',
                    value: marginY,
                    matrix: matrix,
                    matrixInverted: matrix.clone().invert()
                });
            }
        }
    }
    onDragSearching(e) {
        var hit = false;
        let scale = this._view.scale();
        for (let i = 0, l = this._margins.length; i < l; ++i) {
            let margin = this._margins[i];
            let point = margin.matrixInverted.transformPoint(e);

            let hitRect = Rect.allocateFromRect(margin.rect);
            if (hitRect.width * scale < MinSize) {
                hitRect.width = MinSize / scale;
                hitRect.x -= hitRect.width / 2;
            }
            if (hitRect.height * scale < MinSize) {
                hitRect.height = MinSize / scale;
                hitRect.y -= hitRect.height / 2;
            }

            if (isPointInRect(hitRect, point)) {
                this._activeMargin = margin;
                Cursor.setGlobalCursor(margin.cursor);
                hit = true;
                hitRect.free();
                break;
            }

            hitRect.free();
        }
        if (hit || this._activeMargin !== null) {
            if (!hit) {
                this._activeMargin = null;
                Cursor.removeGlobalCursor();
            }
            Invalidate.requestInteractionOnly();
        }
    }
    onDragSearchCancelled() {
        this._activeMargin = null;
        Invalidate.requestInteractionOnly();
    }
    onDragStarting() {
        return this._activeMargin !== null;
    }
    onDragging(e, dx, dy, ddx, ddy) {
        if (this._firstDrag) {
            PropertyTracker.suspend();
            this._originalProps = this._container.selectGridProps();
            this._firstDrag = false;
        }

        ddx = ddx > 0 ? Math.ceil(ddx) : Math.floor(ddx);
        ddy = ddy > 0 ? Math.ceil(ddy) : Math.floor(ddy);

        if (this._activeMargin.vertical) {
            ddx = 0;
        }
        else {
            ddy = 0;
        }
        this._strategy.updateActualMargins(this._container, ddx, ddy);
        this.createVisualizations();
        Invalidate.request();
    }
    onDragStopped(e) {
        var newProps = this._container.selectGridProps();
        this._container.setProps(this._originalProps, ChangeMode.Self);
        this._container.performArrange(null, ChangeMode.Self);

        this._container.setProps(newProps);
        this._container.performArrange();

        PropertyTracker.resumeAndFlush();

        this.onDragSearching(e);

        Invalidate.request();
        this._firstDrag = true;
    }
    updateIfAttached(container) {
        if (container === this._container) {
            this.createVisualizations();
        }
    }
    onLayerDraw(layer, context, env) {
        if (this._dragController.isDragging) {
            for (let i = 0, l = this._margins.length; i < l; ++i) {
                var margin = this._margins[i];
                if (i !== this._activeMargin && margin.vertical === this._activeMargin.vertical) {
                    this.drawMargin(context, margin, env);
                }
            }
        }
        else if (this._activeMargin !== null) {
            this.drawMargin(context, this._activeMargin, env);
        }
    }

    drawMargin(context, margin, env: RenderEnvironment) {
        var scale = env.scale;

        context.save();
        context.beginPath();

        margin.matrix.applyToContext(context);
        context.fillStyle = UserSettings.repeater.marginFill;

        context.save();
        if (margin.rect.width === 0) {
            context.scale(1 / scale, 1 / scale);
            context.fillRect(margin.rect.x * scale - MinSize / 2, margin.rect.y * scale, MinSize, margin.rect.height * scale);
        }
        else if (margin.rect.height === 0) {
            context.scale(1 / scale, 1 / scale);
            context.fillRect(margin.rect.x * scale, margin.rect.y * scale - MinSize / 2, margin.rect.width * scale, MinSize);
        }
        else {
            context.fillRect(margin.rect.x, margin.rect.y, margin.rect.width, margin.rect.height);
        }
        context.restore();

        this._view.applyGuideFont(context);
        var text = margin.value + "";
        var w = context.measureText(text).width;
        if (margin.vertical) {
            var originX = -w / 2;
            var originY = (margin.rect.y + margin.rect.height / 2);
            context.translate(originX, originY);
            context.scale(1 / scale, 1 / scale);
            context.rotate(-Math.PI / 2);
            context.fillText(text, originX + .5 | 0, -2);
        }
        else {
            context.scale(1 / scale, 1 / scale);
            context.fillText(text, (margin.rect.x + margin.rect.width) / 2 * scale - w / 2 + .5 | 0, -4);
        }

        context.restore();
    }
}

export default new RepeatMarginTool();