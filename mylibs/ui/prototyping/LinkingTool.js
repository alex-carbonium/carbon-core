import Tool from "../common/Tool";
import DropVisualization from "../../extensions/DropVisualization";
import {createUUID} from "../../util";
import {ActionType, AnimationType, EasingType, ActionEvents, StoryType, ViewTool} from "../../framework/Defs";
import * as ActionHelper from "./ActionHelper";
import Matrix from "../../math/matrix";
import {areRectsIntersecting, adjustRectSize, isPointInRect} from "../../math/math";
import PropertyTracker from "../../framework/PropertyTracker";
import Selection from "../../framework/SelectionModel"
import Invalidate from "../../framework/Invalidate";
import RequestAnimationSettings from "./RequestAnimationSettings";
import Environment from "../../environment";
import StoryAction from "../../stories/StoryAction";

const HandleSize = 16;
const HomeButtonWidth = 12;
const HomeButtonHeight = 24;

const DefaultLinkColor = "#1592E6";

// TODO:
// - show button only on hover like visio
// - cache all artboards rects

export default class LinkingTool extends Tool {
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
                Invalidate.requestUpperOnly();
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
                    this._onMove = ()=> {
                        this._mousepressed = true;
                        this._startPoint = {x: from.x, y: from.y};
                        this._currentPoint = {x: event.x, y: event.y};
                        this._modifyingConnection = c;
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
            var size = HandleSize / scale;
            var rect = this._selection.getBoundaryRectGlobal();
            var x = rect.x + rect.width;
            var y = 0 | rect.y + (rect.height - size) / 2;

            if (isPointInRect({x: x, y: y, width: size, height: size}, event)) {
                this._mousepressed = true;
                this._startPoint = {x: event.x, y: event.y};
                this._sourceElement = this._selection;
                event.handled = true;
            }
        }
    }


    _handleFlowMouseDownEvent(scale, event) {
        var size = HandleSize / scale;
        var page = this._app.activePage;
        var artboards = page.getAllArtboards();
        for (var i = 0; i < artboards.length; ++i) {
            let artboard = artboards[i];

            var rect = artboard.getBoundaryRectGlobal();
            var x = rect.x + rect.width;
            var y = 0 | rect.y + (rect.height - size) / 2;

            if (isPointInRect({x: x, y: y, width: size, height: size}, event)) {
                this._mousepressed = true;
                this._startPoint = {x: event.x, y: event.y};
                this._sourceElement = artboard;
                event.handled = true;
                break;
            }
        }
    }

    onclick(event) {
        delete this._onMove;
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
        if (this._onMove) {
            delete this._onMove;
            return this.onclick(event);
        }
        if (this._mousepressed) {
            this._mousepressed = false;
            event.handled = true;

            if (this._currentPoint) {
                this._linkToArtboard(event);

                Invalidate.requestUpperOnly();
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
            this._sourceElement.enablePropsTracking();
            targetArgtboard.enablePropsTracking();

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
                e.disablePropsTracking();
                this._modifyingConnection.artboard.disablePropsTracking();
            }
            delete this._modifyingConnection;
        }
    };

    mousemove(event) {
        this._onMove && this._onMove();
        delete this._onMove;

        if (this._mousepressed) {
            var x = event.x,
                y = event.y;
            this._currentPoint = {x: x, y: y};
            Invalidate.requestUpperOnly();
            event.handled = true;
        }

        var scale = this._view.scale();

        var target = this._app.activePage.hitElement(event, scale, null, event.ctrlKey);

        if (this._target != target) {
            this._target = target;
            Invalidate.requestUpperOnly();
        }

        if(this._activeStory && this._activeStory.props.type === StoryType.Flow){
            var page = this._app.activePage;
            var artboards = page.getAllArtboards();

            var handles = [];
            for (var i = 0; i < artboards.length; ++i) {
                let artboard = artboards[i];
                var rect = artboard.getBoundaryRectGlobal();
                rect = adjustRectSize(rect, 40 / scale);
                if(isPointInRect(rect, event)) {
                    this._addHandleOnElement(artboard, scale, handles);
                }
            }

            if(handles.length !== this._handles.length){
                this._handles = handles;
                Invalidate.requestUpperOnly();
                return;
            }

            for(var i = 0; i < handles.length; ++i){
                if(handles[i].id !== this._handles[i].id){
                    this._handles = handles;
                    Invalidate.requestUpperOnly();
                    return;
                }
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
            Invalidate.requestUpperOnly();

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
        PropertyTracker.propertyChanged.bind(this, this._onPropertyChanged);
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
        PropertyTracker.propertyChanged.unbind(this, this._onPropertyChanged);
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
        if (this.connections) {
            for (var i = 0; i < this.connections.length; ++i) {
                var c = this.connections[i];
                c.element.disablePropsTracking();
                c.artboard.disablePropsTracking();
            }
        }

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
                var sourceElement = root.getElementById(action.props.sourceElementId);
                if (targetArtboard && sourceElement) {
                    this._addConnection(sourceElement, targetArtboard);
                }
            }
        });
        // adding incoming connections
        // page.applyVisitor(e=> {
        //     var artboard = this._getConnectedArtboard(e, page);
        //     if (artboard === activeArtboard) {
        //         that._addConnection(e, artboard);
        //     }
        // });
        // activeArtboard.applyVisitor((e)=> {
        //     var artboard = this._getConnectedArtboard(e, page);
        //     if (artboard) {
        //         that._addConnection(e, artboard);
        //     }
        // });
    }

    _createConnection(element, artboard) {
        return {
            element: element,
            artboardId: artboard.id(),
            artboard: artboard,
            connection: ActionHelper.getConnectionPoints(element.getBoundaryRectGlobal(), artboard.getBoundaryRectGlobal())
        }
    }

    _addConnection(element, artboard) {
        element.enablePropsTracking();
        artboard.enablePropsTracking();
        this.connections.push(this._createConnection(element, artboard));
    }

    _removeConnection(element) {
        var i = this.connections.findIndex(c=>c.element.id() == element.id());
        if(i === -1){
            return;
        }
        var c = this.connections[i];
        c.artboard.disablePropsTracking();
        c.element.disablePropsTracking();
        this.connections.splice(i, 1);
    }

    _elementSelected(selection) {
        if (this._activeStory && this._activeStory.props.type !== StoryType.Prototype) {
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
                Invalidate.requestUpperOnly();
            }
        }

        Invalidate.requestUpperOnly();
    }

    _onPropertyChanged(element, props) {
        if (props.x !== undefined
            || props.y !== undefined
            || props.width !== undefined
            || props.height !== undefined) {
            for (var i = 0; i < this.connections.length; ++i) {
                var c = this.connections[i];
                if (c.element.id() === element.id()) {
                    c.connection = ActionHelper.getConnectionPoints(props, c.artboard.getBoundaryRectGlobal())
                } else if (c.artboardId === element.id()) {
                    c.connection = ActionHelper.getConnectionPoints(c.element.getBoundaryRectGlobal(), props)
                }
            }
        }
    }

    _renderArrow(context, from, to) {
        var x1 = from.x;
        var y1 = from.y;
        var x2 = to.x;
        var y2 = to.y;
        context.moveTo(x1, y1);

        if (from.type & 1/*vertical*/) {
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
            context.strokeStyle = "gray";
            context.fillStyle = "gray";
        }
        context.beginPath();
        this._renderArrow(context, connection.from, connection.to)
        context.lineWidth = 2 / this._view.scale();

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
        var size = HandleSize / scale;
        if (point.type === 0) {
            return {x: point.x - size, y: point.y - size / 2, width: size, height: size};
        }
        else if (point.type === 2) {
            return {x: point.x, y: point.y - size / 2, width: size, height: size};
        }
        else if (point.type === 1) {
            return {x: point.x - size / 2, y: point.y - size, width: size, height: size};
        }
        else if (point.type === 3) {
            return {x: point.x - size / 2, y: point.y, width: size, height: size};
        }
    }

    _renderCup(context, point, scale) {
        var rect = this._getCupRectForPoint(point, scale);
        context.rect(rect.x, rect.y, rect.width, rect.height);
    }

    _renderCupForConnection(context, point, scale) {
        var rect = this._getCupRectForPoint(point, scale);
        var r = rect.width /2 |0;
        context.roundedRectPath(rect.x, rect.y, rect.width, rect.height, r, r);
    }

    _renderOutArrow(context, point, size) {
        var dx = size / 3;
        var dy = size / 4;
        var x = point.x;
        var y = point.y;
        context.moveTo(x + dx, y + dy);
        context.lineTo(x + size - dx, y + size / 2);
        context.lineTo(x + dx, y + size - dy);
    }

    _renderInArrow(context, point, scale) {
        var size = HandleSize / scale;
        var dx = size / 3;
        var dy = size / 4;
        var s2 = size / 2;
        var x = point.x;
        var y = point.y;

        var matrix = Matrix.create();

        if (point.type === 0) {
            matrix.translate(x - size, y - s2);
        } else if (point.type === 2) {
            matrix.translate(x, y - s2);
            matrix.rotate(180, s2, s2);
        } else if (point.type === 1) {
            matrix.translate(x - s2, y - size);
            matrix.rotate(90, s2, s2);
        } else if (point.type === 3) {
            matrix.translate(x - s2, y);
            matrix.rotate(270, s2, s2);
        }
        matrix.applyToContext(context);
        context.moveTo(dx, dy);
        context.lineTo(size - dx, size / 2);
        context.lineTo(dx, size - dy);
    }

    _addHandleOnElement(element, scale, handles) {
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
        if (!this._activeStory) {
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
