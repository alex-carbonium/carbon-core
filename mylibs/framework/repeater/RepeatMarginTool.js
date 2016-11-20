import {isPointInRect, adjustRectWidth, adjustRectHeight} from "math/math";
import DragController from "../DragController";
import CommandManager from "../commands/CommandManager";
import PropertyTracker from "../PropertyTracker";
import Cursor from "framework/Cursor";
import Invalidate from "framework/Invalidate";
import Environment from "environment";
import ModelStateListener from "../sync/ModelStateListener";

export default {
    _container: null,
    _margins: null,
    _activeMargin: null,
    _dragController: null,
    _marginRectX: null,
    _marginRectY: null,
    attach: function(container){
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

        var view = Environment.view;
        view.registerForLayerDraw(2, this, 0);
        this._dragController.bindToController(Environment.controller);
    },
    detach: function(container){
        this._container.disablePropsTracking();
        this._container = null;
        this._margins = null;
        this._activeMargin = null;

        var view = Environment.view;
        view.unregisterForLayerDraw(2, this);
        if (this._dragController){
            this._dragController.unbind();
            this._dragController = null;   
        }
    },
    createVisualizations: function(){
        var container = this._container;
        if (!container){
            return;
        }

        var baseMatrix = container.globalViewMatrix().clone();
        var containerWidth = container.width();
        var containerHeight = container.height();
        var numX = this._strategy.getNumX(container);
        var numY = this._strategy.getNumY(container);
        var itemBox = container.children[0].getBoundaryRect();
        var marginX = this._strategy.getActualMarginX(container);
        var marginY = this._strategy.getActualMarginY(container);

        this._marginRectX = {x: 0, y: 0, width: marginX, height: containerHeight};
        this._marginRectY = {x: 0, y: 0, width: containerWidth, height: marginY};
        if (this._marginRectX.width < 2){
            this._marginRectX.x = -1;
            this._marginRectX.width = 3;
        }
        if (this._marginRectY.height < 2){
            this._marginRectY.y = -1;
            this._marginRectY.height = 3;
        }

        this._margins = [];
        for (let i = 1; i < numX; i++){
            let x = itemBox.x + itemBox.width*i + marginX * (i-1);
            if (x < containerWidth){
                let matrix = baseMatrix.clone().translate(x, 0);
                let x2 = x + marginX;
                let rect = x2 < containerWidth ? this._marginRectX : adjustRectWidth(this._marginRectX, containerWidth - x2);
                this._margins.push({
                    rect: rect,
                    vertical: false,
                    cursor: 'col-resize',
                    value: marginX,
                    matrix: matrix,
                    matrixInverted: matrix.clone().invert()
                });
            }
        }
        for (let i = 1; i < numY; i++){
            let y = itemBox.y + itemBox.height*i + marginY * (i-1);
            if (y < containerHeight){
                let matrix = baseMatrix.clone().translate(0, y);
                let y2 = y + marginY;
                let rect = y2 < containerHeight ? this._marginRectY : adjustRectHeight(this._marginRectY, containerHeight - y2);
                this._margins.push({
                    rect: rect,
                    vertical: true,
                    cursor: 'row-resize',
                    value: marginY,
                    matrix: matrix,
                    matrixInverted: matrix.clone().invert()
                });
            }
        }
    },
    onDragSearching: function(e){
        var hit = false;
        for (let i = 0, l = this._margins.length; i < l; ++i) {
            let margin = this._margins[i];
            let point = margin.matrixInverted.transformPoint(e);
            if (isPointInRect(margin.rect, point)){
                this._activeMargin = margin;
                Cursor.setGlobalCursor(margin.cursor);
                hit = true;
                break;
            }
        }
        if (hit || this._activeMargin !== null){
            if (!hit){
                this._activeMargin = null;
                Cursor.removeGlobalCursor();
            }
            Invalidate.requestUpperOnly();
        }
    },
    onDragSearchCancelled: function(){
        this._activeMargin = null;
        Invalidate.requestUpperOnly();
    },
    onDragStarting: function(){
        var canStart = this._activeMargin !== null;
        if (canStart){
            PropertyTracker.suspend();
            ModelStateListener.stop();
            this._oldProps = this._container.selectGridProps();
        }
        return canStart;
    },
    onDragging: function(e, dx, dy, ddx, ddy){
        if (this._activeMargin.vertical){
            ddx = 0;
        }
        else {
            ddy = 0;
        }
        this._strategy.updateActualMargins(this._container, ddx, ddy);
        this.createVisualizations();
        Invalidate.request();
    },
    onDragStopped: function(e){
        ModelStateListener.start();
        var newProps = this._container.selectGridProps();
        this._container.trackSetProps(newProps, this._oldProps);
        this._container.performArrange();
        Invalidate.request();
        PropertyTracker.resume();
        PropertyTracker.flush();

        this.onDragSearching(e);
    },
    updateIfAttached: function(container){
        if (container === this._container){
            this.createVisualizations();
        }
    },
    onLayerDraw: function(layer, context, env){
        if (this._dragController.isDragging){
            for (let i = 0, l = this._margins.length; i < l; ++i) {
                var margin = this._margins[i];
                if (i !== this._activeMargin && margin.vertical === this._activeMargin.vertical){
                    this.drawMargin(context, margin, env);
                }
            }
        }
        else if (this._activeMargin !== null){
            this.drawMargin(context, this._activeMargin, env);
        }
    },
    drawMargin: function(context, margin, env){
        context.save();
        context.beginPath();

        margin.matrix.applyToContext(context);
        context.fillStyle = 'pink';
        context.fillRect(margin.rect.x, margin.rect.y, margin.rect.width, margin.rect.height);

        var scale = env.view.scale();

        env.view.applyGuideFont(context);
        var text = margin.value + "";
        var w = context.measureText(text).width;
        if (margin.vertical){
            var originX = -w/2;
            var originY = (margin.rect.y + margin.rect.height/2);
            context.translate(originX, originY);
            context.scale(1/scale, 1/scale);
            context.rotate(-Math.PI/2);
            context.fillText(text, originX + .5|0, -2);
        }
        else{
            context.scale(1/scale, 1/scale);
            context.fillText(text, (margin.rect.x + margin.rect.width)/2*scale - w/2 + .5|0, -4);
        }

        context.restore();
    }
}