import Tool from "../common/Tool";
import DropVisualization from "../../extensions/DropVisualization";
import {createUUID} from "../../util";
import {ActionType,
    AnimationType,
    EasingType,
    ActionEvents,
    StoryType,
    ViewTool,
    PrimitiveType} from "framework/Defs";
import * as ActionHelper from "./ActionHelper";
import Matrix from "../../math/matrix";
import {areRectsIntersecting, adjustRectSize, isPointInRect} from "../../math/math";
import Selection from "framework/SelectionModel"
import Invalidate from "framework/Invalidate";
import RequestAnimationSettings from "./RequestAnimationSettings";
import Environment from "../../environment";
import StoryAction from "../../stories/StoryAction";
import Link from "./Link";
import DataNode from "framework/DataNode";
import {IUIElement} from "carbon-core";

const HandleSize = 16;
const HomeButtonWidth = 12;
const HomeButtonHeight = 24;

const DefaultLinkColor = "#1592E6";
const InactiveLinkColor = 'gray';

function hasLocationProperty(props) {
    return props.x !== undefined
        || props.y !== undefined
        || props.width !== undefined
        || props.height !== undefined
        || props.m !== undefined
        || props.br !== undefined;
}

var PointType = {
    Left:0,
    Top:1,
    Right:2,
    Bottom:3
}

function isVerticalPoint(point) {
    return point.type & 1; // PointType.Top | PointType.Bottom
}

export default class LinkingTool extends Tool {
    [name: string]: any;

    constructor() {
        super(ViewTool.Proto);
    }

    _handleClickToHomeScreen(event, scale) {
        var artboards = this._app.activePage.getAllArtboards();
        for (var i = 0; i < artboards.length; ++i) {
            let artboard = artboards[i];
            var x = artboard.x();
            var y = artboard.y();
            var w = 0 | HomeButtonWidth / scale;
            var h = 0 | HomeButtonHeight / scale;
            if (isPointInRect({x: x - w, y: y, width: w, height: h}, event)) {
                this._activeStory.setProps({homeScreen: [this._app.activePage.id(), artboard.id()]});
                Invalidate.requestInteractionOnly();
                return true;
            }
        }

        return false;
    }

    mousedown(event) {
        if (!this._activeStory) {
            return;
        }

        var scale = this._view.scale();
        if (this._activeStory.props.type === StoryType.Prototype) {
            this._handlePrototypeMouseDownEvent(scale, event);
        } else {
            this._handleFlowMouseDownEvent(scale, event);
        }

        if (!event.handled) {
            for (var i = this.connections.length - 1; i >= 0; --i) {
                var c = this.connections[i];
                var connection = c.connection;
                var from = connection.from;
                var to = connection.to;
                var index = i;
                if (isPointInRect(this._getCupRectForPoint(from, scale), event)
                    || isPointInRect(this._getCupRectForPoint(to, scale), event)) {
                    this._onFirstMove = ()=> {
                        this._mousepressed = true;
                        this._startPoint = {_x: from.x, _y: from.y, x:from.x, y:from.y};
                        this._currentPoint = {_x: event.x, _y: event.y, x:event.x, y:event.y};
                        this._modifyingConnection = c;
                        this._sourceElement = c.element;
                        this._removeConnection(c.element);
                        Selection.makeSelection([c.element]);
                    }
                    event.handled = true;
                    return;
                }
            }
        }


        if (!event.handled && this._handleClickToHomeScreen(event, scale)) {
            event.handled = true;
        }

        return false;
    }

    _handlePrototypeMouseDownEvent(scale, event) {
        if (this._selection) {
            if (this._hitStartArrowRect(this._selection, event, scale)) {
                this._mousepressed = true;
                this._startPoint = {x: event.x, y: event.y, _x:event.x, _y:event.y};
                this._sourceElement = this._selection;
                event.handled = true;
            }
        }
    }

    _hitStartArrowRect(element:IUIElement, event:any, scale:number) {
        var size = HandleSize / scale;
        var rect = element.getBoundingBoxGlobal();
        var x = rect.x + rect.width;
        var y = 0 | rect.y + (rect.height - size) / 2;

        return (isPointInRect({x: x, y: y, width: size, height: size}, event));
    }

    _handleFlowMouseDownEvent(scale:number, event:any) {
        var size = HandleSize / scale;
        var page = this._app.activePage;
        var artboards = page.getAllArtboards();
        for (var i = 0; i < artboards.length; ++i) {
            let artboard = artboards[i];

            if (this._hitStartArrowRect(artboard, event, scale)) {
                this._mousepressed = true;
                this._startPoint = {x: event.x, y: event.y, _x:event.x, _y:event.y};
                this._sourceElement = artboard;
                event.handled = true;
                break;
            }
        }
    }

    onclick(event) {
        delete this._onFirstMove;
        var scale = this._view.scale();
        for (var i = this.connections.length - 1; i >= 0; --i) {
            var connection = this.connections[i];
            var to = connection.connection.to;
            if (isPointInRect(this._getCupRectForPoint(to, scale), event)) {
                var artboard = connection.element;
                var id = artboard.id();

                var action = this._activeStory.children.find(a=>a.props.sourceElementId === id);

                RequestAnimationSettings.onRequest.raise(event.event, artboard, action);
                event.handled = true;
                return;
            }
        }
    }

    mouseup(event) {
        if (this._onFirstMove) {
            delete this._onFirstMove;
            return this.onclick(event);
        }
        if (this._mousepressed) {
            this._mousepressed = false;
            event.handled = true;

            if (this._currentPoint) {
                this._linkToArtboard(event);

                Invalidate.requestInteractionOnly();
                delete this._currentPoint;
                delete this._startPoint;
            }
            else if (this._target) {
                Selection.makeSelection([this._target]);
            }
        }
    }

    _linkToArtboard(point) {
        var page = this._app.activePage;
        var targetArgtboard = page.getArtboardAtPoint(point);
        var activeStory = this._activeStory;
        if (!activeStory) {
            return;
        }

        if (targetArgtboard
            && !this._sourceElement.isAncestor(targetArgtboard)
            && targetArgtboard !== this._sourceElement) {

            if (this._modifyingConnection && this._modifyingConnection.artboard === targetArgtboard) {
                this.connections.push(this._modifyingConnection); // no need to rebalance since nothing actually changed.
                delete this._modifyingConnection;
            }

            var sourceId = this._sourceElement.id();
            activeStory.removeFirst(s=>s.props.sourceElementId === sourceId);
            this._removeConnection(this._sourceElement);

            var sourceRootId = this._sourceElement.primitiveRoot().id();
            var props = {
                id: createUUID(),
                sourceRootId: sourceRootId,
                sourceElementId: sourceId,
                event: ActionEvents.click,
                type: ActionType.GoToPage,
                targetArtboardId: targetArgtboard.id(),
                animation: {
                    segue: AnimationType.SlideLeft,
                    easing: EasingType.EaseOut,
                    duration: .2
                }
            }
            var storyAction = new StoryAction();
            storyAction.setProps(props);
            activeStory.add(storyAction);

            RequestAnimationSettings.onRequest.raise(point.event, targetArgtboard, storyAction);

            this._addConnection(this._sourceElement, targetArgtboard);

            if (!activeStory.props.homeScreen) {
                activeStory.setProps({homeScreen: [page.id(), sourceRootId]});
            }

            return;
        }

        if (this._modifyingConnection) {
            var e = this._modifyingConnection.element;
            if (e) {
                var sourceId = e.id();
                activeStory.removeFirst(s=>s.props.sourceElementId === sourceId)
            }
            delete this._modifyingConnection;
        }
    };

    mousemove(event) {
        this._onFirstMove && this._onFirstMove();
        delete this._onFirstMove;

        if (this._mousepressed) {
            var x = event.x,
                y = event.y;
            this._currentPoint = {_x: x, _y: y, x:x, y:y};
            Invalidate.requestInteractionOnly();
            event.handled = true;
        }

        var scale = this._view.scale();

        var target = this._app.activePage.hitElement(event, scale, null, Selection.directSelectionEnabled());

        if (this._target != target) {
            this._target = target;
            Invalidate.requestInteractionOnly();
        }

        if(this._isCurrentFlowStory()){
            var handles = this._findNearByHandles(event, scale);
            this._replaceHandles(handles);
        }
    }

    _isCurrentFlowStory(){
        return this._activeStory && this._activeStory.props.type === StoryType.Flow;
    }

    _isCurrentPrototypeStory() {
        return this._activeStory && this._activeStory.props.type === StoryType.Prototype;
    }

    _findNearByHandles(event: any, scale:number) {
        var page = this._app.activePage;
        var artboards = page.getAllArtboards();
        var handles = [];

        for (var i = 0; i < artboards.length; ++i) {
            let artboard = artboards[i];
            var rect = artboard.getBoundingBoxGlobal();
            rect = adjustRectSize(rect, 40 / scale);
            if(isPointInRect(rect, event)) {
                if(!this._hasOutboundConnections(artboard)){
                    this._addHandleOnElement(artboard, scale, handles);
                }
            }
        }

        return handles;
    }

    _hasOutboundConnections(element) {
        return !!this.connections.find(c=>c.element === element);
    }

    _replaceHandles(handles: Array<any>) {
        if(handles.length !== this._handles.length){
            this._handles = handles;
            Invalidate.requestInteractionOnly();
            return;
        }

        for(var i = 0; i < handles.length; ++i){
            if(handles[i].id !== this._handles[i].id){
                this._handles = handles;
                Invalidate.requestInteractionOnly();
                return;
            }
        }
    }

    attach(view, controller) {
        super.attach.apply(this, arguments);
        this._view.prototyping(true);
        this._currentArtboard = null;
        this._activeStory = this._app.activeStory();
        this._activeStoryChangedToken = this._app.activeStoryChanged.bind(this, ()=> {
            this._activeStory = this._app.activeStory();
            this._refreshConnections();
            Invalidate.requestInteractionOnly();

            if (this._activeStory && this._activeStory.props.homeScreen) {
                var page = this._app.setActivePageById(this._activeStory.props.homeScreen[0]);
                if (page) {
                    var artboard = page.findNodeByIdBreadthFirst(this._activeStory.props.homeScreen[1]);
                    if (artboard) {
                        Environment.view.ensureVisible(artboard);
                    }
                }
            }
        })

        var selectedElement = Selection.selectedElement();
        if (selectedElement) {
            this._currentArtboard = selectedElement.primitiveRoot();
        }

        this._changedToken = this._app.changed.bind(this, this._onAppChanged)
        Selection.refreshSelection();
        this._elementSelected(Selection.selectComposite());
        this._elementSelectedToken = Selection.onElementSelected.bind(this, this._elementSelected);
        this._refreshConnections();
        this._handles = [];
        Invalidate.request();
    }

    detach() {
        super.detach();
        this._view.prototyping(false);
        if(this._changedToken) {
            this._changedToken.dispose();
            this._changedToken = null;
        }

        if (this._elementSelectedToken) {
            this._elementSelectedToken.dispose();
            this._elementSelectedToken = null;
        }
        if (this._activeStoryChangedToken) {
            this._activeStoryChangedToken.dispose();
            this._activeStoryChangedToken = null;
        }
    }

    _getConnectedArtboard(e, page) {
        var action = this._activeStory.children.find(a=>a.props.sourceElementId === e.id());

        if (action) {
            var artboard = DataNode.getImmediateChildById(page, action.targetArtboardId, true);
            return artboard;
        }
    }

    _releaseConnections() {
        this.connections = [];
    }

    _refreshConnections() {
        this._releaseConnections();

        var activeStory = this._activeStory;
        if (!activeStory) {
            return;
        }

        var page = this._app.activePage;

        activeStory.children.forEach(action=> {
            var targetArtboard = DataNode.getImmediateChildById(page, action.props.targetArtboardId, true);
            var root = this._app.findNodeByIdBreadthFirst(action.props.sourceRootId);
            if (root) {
                var sourceElement = root.findNodeByIdBreadthFirst(action.props.sourceElementId);
                if (targetArtboard && sourceElement) {
                    this._addConnection(sourceElement, targetArtboard);
                }
            }
        });
    }

    _addConnection(element, artboard) {
        this.connections.push(new Link(
            element,
            artboard,
            ActionHelper.getConnectionPoints(element, artboard)
        ));

        this._rebalanceConnections();
    }

    _pointToId(p) {
        return p.x + '_' + p.y + + '_' + (p.type & 1)
    }

    _addBalancingConnection(pointsMap, source, target) {
        var pointId = this._pointToId(source);
        var list = pointsMap[pointId] || [];
        pointsMap[pointId] = list;
        source._x = source.x;
        source._y = source.y;

        list.push({
            target:target,
            source:source
        });
    }

    _rebalanceConnections() {
        var pointsMap = {};
        let BalanceMargin = 20;
        for(var c of this.connections) {
            var from = c.connection.from;
            var to = c.connection.to;
            this._addBalancingConnection(pointsMap, from, to);
            this._addBalancingConnection(pointsMap, to, from);
        }

        for(var id in pointsMap){
            var list = pointsMap[id];
            var count = list.length;
            if(count < 2) {
                continue;
            }

            if(list[0].target.type & 1)
            {
                list.sort((a,b)=>{
                    return a.target.x - b.target.x;
                })

                var startX = 0 | list[0].source.x - BalanceMargin * (count - 1) / 2;

                for(var i = 0; i < count; ++i) {
                    list[i].source._x = startX + i * BalanceMargin;
                }
            } else {

                list.sort((a,b)=>{
                    return a.target.y - b.target.y;
                })

                var startY = 0 | list[0].source.y - BalanceMargin * (count - 1) / 2;

                for(var i = 0; i < count; ++i) {
                    list[i].source._y = startY + i * BalanceMargin;
                }
            }
        }
    }

    _removeConnection(element) {
        var i = this.connections.findIndex(c=>c.element.id() == element.id());
        if(i === -1){
            return;
        }
        this.connections.splice(i, 1);
    }

    _elementSelected(selection) {
        if (!this._isCurrentPrototypeStory()) {
            return;
        }

        if (selection && selection.count() === 1) {
            this._selection = selection.first();
        } else {
            this._selection = null;
        }

        if (this._selection && this._selection.primitiveRoot() !== this._currentArtboard) {
            this._currentArtboard = this._selection.primitiveRoot();
            this._refreshConnections();
        }

        this._handles = [];
        var scale = this._view.scale();
        if (this._selection && this._activeStory) {
            var selectionId = this._selection.id();
            var action = this._activeStory.children.find(a=>a.props.sourceElementId === selectionId);
            if (!action || !action.props.targetArtboardId) {
                this._addHandleOnElement(this._selection, scale);
            }
        }

        Invalidate.requestInteractionOnly();
    }

    dragElementStarted(){
        this._draggingElement = true;
        Invalidate.requestInteractionOnly();
    }
    dragElementEnded() {
        this._draggingElement = false;
        this._handles = [];
        Invalidate.requestInteractionOnly();
    }

    _onAppChanged(primitives){
        var activePageId = this._app.activePage.id();
        var refreshState = false;

        var propChanges = primitives.filter(p=>p.path[0] === activePageId && p.type === PrimitiveType.DataNodeSetProps);

        for (let i = 0; i < propChanges.length; i++){
            var p = propChanges[i];
            var elementId = p.path[p.path.length - 1];
            var props = p.props;

            if (hasLocationProperty(props)) {
                for (let j = 0; j < this.connections.length; ++j) {
                    var c = this.connections[j];
                    if (c.element.id() === elementId || c.artboardId === elementId)  {
                        c.connection = ActionHelper.getConnectionPoints(c.element, c.artboard);
                    }
                }
            }
        }

        this._rebalanceConnections();
    }

    _renderArrow(context, from, to) {
        var x1 = from._x;
        var y1 = from._y;
        var x2 = to._x;
        var y2 = to._y;
        context.moveTo(x1, y1);

        if (isVerticalPoint(from)) {
            var dy = y2 - y1;
            context.bezierCurveTo(x1, y1 + 2 * dy / 3, x2, y1 + dy / 3, x2, y2);
        } else {
            var dx = x2 - x1;
            context.bezierCurveTo(x1 + 2 * dx / 3, y1, x1 + dx / 3, y2, x2, y2);
        }
    }

    _renderConnection(context, connectionInfo, scale) {
        context.save();

        var connection = connectionInfo.connection;
        if (connectionInfo.element == this._selection || this._activeStory.props.type === StoryType.Flow) {
            context.strokeStyle = DefaultLinkColor;
            context.fillStyle = DefaultLinkColor;
        } else {
            context.strokeStyle = InactiveLinkColor;
            context.fillStyle = InactiveLinkColor;
        }

        context.beginPath();
        this._renderArrow(context, connection.from, connection.to)

        if(scale > 1) {
            context.lineWidth = 2 / this._view.scale();
        } else if(scale > 0.5) {
            context.lineJoin = 2;
        } else {
            context.lineWidth = 1 / this._view.scale();
        }

        context.stroke();

        context.beginPath();
        this._renderCupForConnection(context, connection.from, scale);
        this._renderCupForConnection(context, connection.to, scale)

        context.fill();

        context.beginPath();
        this._renderInArrow(context, connection.to, scale);
        context.strokeStyle = "#fff";
        context.lineJoin = "bevel";
        context.lineWidth = 2 / scale;
        context.stroke();
        context.restore();
    }

    _getCupRectForPoint(point, scale) {
        if(scale < 1) {
            scale = 1;
        }
        var size = HandleSize / scale;
        if (point.type === PointType.Left) {
            return {x: point._x - size, y: point._y - size / 2, width: size, height: size};
        }
        else if (point.type === PointType.Right) {
            return {x: point._x, y: point._y - size / 2, width: size, height: size};
        }
        else if (point.type === PointType.Top) {
            return {x: point._x - size / 2, y: point._y - size, width: size, height: size};
        }
        else if (point.type === PointType.Bottom) {
            return {x: point._x - size / 2, y: point._y, width: size, height: size};
        }
    }

    _renderCup(context, point, scale) {
        var rect = this._getCupRectForPoint(point, scale);
        context.rect(rect.x, rect.y, rect.width, rect.height);
    }

    _renderCupForConnection(context, point, scale) {
        var rect = this._getCupRectForPoint(point, scale);
        var r = rect.width / 2 | 0;
        context.roundedRectPath(rect.x, rect.y, rect.width, rect.height, r, r);
    }

    _renderOutArrow(context, point, size) {
        var dx = size / 3;
        var dy = size / 4;
        var x = point._x;
        var y = point._y;
        context.moveTo(x + dx, y + dy);
        context.lineTo(x + size - dx, y + size / 2);
        context.lineTo(x + dx, y + size - dy);
    }

    _renderInArrow(context, point, scale) {
        if(scale < 1) {
            scale = 1;
        }
        var size = HandleSize / scale;
        var dx = size / 3;
        var dy = size / 4;
        var s2 = size / 2;
        var x = point._x;
        var y = point._y;

        var matrix = Matrix.create();

        if (point.type === PointType.Left) {
            matrix.translate(x - size, y - s2);
        } else if (point.type === PointType.Right) {
            matrix.translate(x, y - s2);
            matrix.rotate(180, s2, s2);
        } else if (point.type === PointType.Top) {
            matrix.translate(x - s2, y - size);
            matrix.rotate(90, s2, s2);
        } else if (point.type === PointType.Bottom) {
            matrix.translate(x - s2, y);
            matrix.rotate(270, s2, s2);
        }
        matrix.applyToContext(context);
        context.moveTo(dx, dy);
        context.lineTo(size - dx, size / 2);
        context.lineTo(dx, size - dy);
    }

    _addHandleOnElement(element, scale, handles?) {
        var size = HandleSize / scale;
        var rect = element.getBoundaryRectGlobal();
        var x = rect.x + rect.width;
        var y = 0 | rect.y + (rect.height - size) / 2;

        (handles||this._handles).push({x:x, y:y, id:element.id()});
    }

    _renderHandle(context, handle, scale) {
        var size = HandleSize / scale;
        var dx = size / 3;
        var dy = size / 4;
        var x = handle.x;
        var y = handle.y;

        context.beginPath();
        context.rectPath(x, y, size, size);
        context.fillStyle = DefaultLinkColor;
        context.fill();

        context.beginPath();
        context.moveTo(x + dx, y + dy);
        context.lineTo(x + size - dx, y + size / 2);
        context.lineTo(x + dx, y + size - dy);

        context.strokeStyle = "#fff";
        context.lineJoin = "bevel";
        context.lineWidth = 2 / scale;
        context.stroke();
    }

    _renderHandleOnElement(context, element, scale) {
        var size = HandleSize / scale;
        var rect = element.getBoundaryRectGlobal();
        var x = rect.x + rect.width;
        var y = 0 | rect.y + (rect.height - size) / 2;

        context.beginPath();
        context.rectPath(x, y, size, size);
        context.fillStyle = DefaultLinkColor;
        context.fill();

        context.beginPath();
        var dx = size / 3;
        var dy = size / 4;
        context.moveTo(x + dx, y + dy);
        context.lineTo(x + size - dx, y + size / 2);
        context.lineTo(x + dx, y + size - dy);

        context.strokeStyle = "#fff";
        context.lineJoin = "bevel";
        context.lineWidth = 2 / scale;
        context.stroke();
    }

    _renderHomeScreenButton(context, scale) {
        var page = this._app.activePage;
        var artboards = page.getAllArtboards();
        for (var i = 0; i < artboards.length; ++i) {
            let artboard = artboards[i];
            if (areRectsIntersecting(this._viewport, artboard.getBoundaryRect())) {
                this._drawButtonForArtboard(artboard, scale, context, page);
            }
        }
    }

    _drawButtonForArtboard(artboard, scale, context, page) {
        var x = artboard.x();
        var y = artboard.y();
        var w = 0 | HomeButtonWidth / scale;
        var h = 0 | HomeButtonHeight / scale;

        context.save();

        if (this._activeStory.props.homeScreen && this._activeStory.props.homeScreen[1] === artboard.id()) {
            context.fillStyle = DefaultLinkColor;
            // TODO: draw home icon here
        } else {
            context.fillStyle = "gray";
        }

        context.beginPath();
        context.rect(x - w, y, w, h);
        context.fill();
        context.restore();
    };

    layerdraw(context, environment) {
        if (!this._activeStory || this._draggingElement) {
            return;
        }

        context.save();
        var scale = this._view.scale();
        var view = this._view;
        this._viewport = Environment.view.viewportRect();

        if (this._mousepressed && this._currentPoint) {
            // render new (dragging) arrow
            this._renderNewArrow(context, scale);
        } else if (this._target) {
            DropVisualization.highlightElement(view, context, this._target);
        }

        if (this.connections.length) {
            for (var connection of this.connections) {
                this._renderConnection(context, connection, scale)
            }
        }

        for(var i = 0; i < this._handles.length; ++i){
            this._renderHandle(context, this._handles[i], scale);
        }

        this._renderHomeScreenButton(context, scale);

        context.restore();
    }

    _renderNewArrow(context, scale) {
        context.lineWidth = 2 / scale;
        context.strokeStyle = DefaultLinkColor;
        this._renderArrow(context, this._startPoint, this._currentPoint);
        context.stroke();
    }
}