import {ArrangeStrategies, Overflow, StackAlign, StackOrientation, ChangeMode} from "./Defs";
import ArrangeStrategy from "./ArrangeStrategy";
import ContextPool from "framework/render/ContextPool";
import CorruptedElement from "framework/CorruptedElement";
import {areRectsEqual} from "math/math";
import Selection from "framework/SelectionModel"
import Environment from "environment";

define(["framework/UIElement", "framework/QuadAndLock", "logger", "math/matrix"], function (UIElement, QuadAndLock, logger, Matrix) {
    var fwk = sketch.framework;

    klass2('sketch.framework.Container', UIElement, (function () {
        var isLockGroup = function () {
            var selected = false;
            var that = this;
            //TODO: fails when generating PDF - think about removing usages of view


            if (Selection) {
                var selectedElement = Selection.selectedElement();

                // TODO: cut dependency between select composite, and use instanceOf
                if (selectedElement && selectedElement.__type__ === 'SelectComposite') {
                    var partOfSelection = false;
                    selectedElement.each(function (e) {
                        if (that == e) {
                            partOfSelection = true;
                            return true;
                        }
                    });

                    if (partOfSelection) {
                        return true;
                    }
                }

                if (selectedElement
                    && selectedElement.isDescendantOrSame(this)) {
                    selected = true;
                }
            }
            return this.enableGroupLocking() && (!this._activeGroup || !selected);
        };


        return {
            _constructor: function () {
                this.children = [];

                this._activeGroup = false;
                this._allowGroupActivation = true;
            },
            lockArrange: function () {
                this._arrangeLocked = this._arrangeLocked ? this._arrangeLocked + 1 : 1;
            },
            unlockArrange: function () {
                this._arrangeLocked--;
                if (!this._arrangeLocked && this._arrangeRequested) {
                    this._arrangeRequested = false;
                    // this.performArrange();
                }
            },
            performArrange: function (oldRect, mode) {
                var newRect = this.getBoundaryRect();
                oldRect = oldRect || newRect;
                var newBoundary = this.arrange({oldValue: oldRect, newValue: newRect});
                if (newBoundary && !areRectsEqual(newBoundary, newRect)) {
                    this.setProps(newBoundary);
                }
            },
            arrangeStrategy: function (value) {
                if (value !== undefined) {
                    this.setProps({arrangeStrategy: value})
                }
                return this.props.arrangeStrategy;
            },
            arrangeStrategyInstance: function () {
                return ArrangeStrategy.findStrategy(this);
            },

            fillBackground: function (context, l, t, w, h) {
                if (this.backgroundBrush() && fwk.Brush.canApply(this.backgroundBrush()) && this.standardBackground()) {
                    context.save();
                    var cornerRadius = this.cornerRadius();
                    if (cornerRadius !== fwk.QuadAndLock.Default) {
                        context.roundedRectDifferentRadiusesPath(l, t, w, h,
                            cornerRadius.upperLeft,
                            cornerRadius.upperRight,
                            cornerRadius.bottomLeft,
                            cornerRadius.bottomRight);
                    } else {
                        context.rectPath(l, t, w, h, true);
                    }
                    fwk.Brush.fill(this.backgroundBrush(), context, l, t, w, h);
                    context.restore();
                }
            },
            strokeBorder: function (context, l, t, w, h) {
                //not supported for iphone
                if (this.borderBrush() && fwk.Brush.canApply(this.borderBrush()) && this.standardBackground()) {
                    context.save();
                    // context.lineWidth = this.borderWidth();
                    var cornerRadius = this.cornerRadius();
                    if (cornerRadius !== fwk.QuadAndLock.Default) {
                        context.roundedRectDifferentRadiusesPath(l, t, w, h,
                            cornerRadius.upperLeft,
                            cornerRadius.upperRight,
                            cornerRadius.bottomLeft,
                            cornerRadius.bottomRight);
                    } else {
                        context.rectPath(l, t, w, h, true);
                    }
                    var dash = this.dashPattern();
                    if (dash) {
                        context.setLineDash(dash);
                    }
                    fwk.Brush.stroke(this.borderBrush(), context, l, t, w, h);
                    context.restore();
                }
            },
            drawSelf: function (context, w, h, environment) {
                this.fillBackground(context, 0, 0, w, h);
                this.drawChildren(context, w, h, environment);
                this.strokeBorder(context, 0, 0, w, h);
            },
            modifyContextBeforeDrawChildren: function (context) {

            },
            _renderMaskedElements: function (context, mask, i, items, environment) {

                if (environment.finalRender || !mask.drawPath) {
                    var clipingRect = mask.getBoundingBoxGlobal(false, true);
                    var p1 = environment.pageMatrix.transformPoint2(clipingRect.x, clipingRect.y);
                    var p2 = environment.pageMatrix.transformPoint2(clipingRect.x + clipingRect.width, clipingRect.y + clipingRect.height);
                    p1.x = Math.max(0, 0 | p1.x * environment.contextScale);
                    p1.y = Math.max(0, 0 | p1.y * environment.contextScale);
                    p2.x = 0 | p2.x * environment.contextScale + .5;
                    p2.y = 0 | p2.y * environment.contextScale + .5;

                    var sw = p2.x - p1.x;
                    var sh = p2.y - p1.y;

                    var offContext = ContextPool.getContext(sw, sh, environment.contextScale);
                    offContext.relativeOffsetX = -p1.x;
                    offContext.relativeOffsetY = -p1.y;

                    offContext.save();
                    offContext.translate(-p1.x, -p1.y);
                    environment.setupContext(offContext);
                    this.globalViewMatrix().applyToContext(offContext);


                    //offContext.clearRect(clipingRect.x, clipingRect.y, clipingRect.width, clipingRect.height);
                    for (; i < items.length; ++i) {
                        var child = items[i];

                        if (child.visible()) {
                            this.drawChildSafe(child, offContext, environment);
                        }
                    }

                    offContext.beginPath();
                    mask.viewMatrix().applyToContext(offContext);
                    offContext.globalCompositeOperation = "destination-in";
                    if(mask.drawPath) {
                        mask.drawPath(offContext, mask.width(), mask.height());
                        offContext.fillStyle = "black";
                        offContext.fill2();
                    } else {
                        mask.drawSelf(offContext, mask.width(), mask.height(), environment);
                    }

                    offContext.restore();

                    context.resetTransform();
                    context.drawImage(offContext.canvas, 0, 0, sw, sh, p1.x, p1.y, sw, sh);
                    ContextPool.releaseContext(offContext)
                } else {
                    context.beginPath();
                    mask.viewMatrix().applyToContext(context);
                    mask.drawPath(context, mask.width(), mask.height());
                    context.clip("evenodd");
                    mask.viewMatrix().clone().invert().applyToContext(context);

                    for (; i < items.length; ++i) {
                        var child = items[i];

                        if (child.visible()) {
                            this.drawChildSafe(child, context, environment);
                        }
                    }
                }
            },
            clone: function () {
                var clone = UIElement.prototype.clone.apply(this, arguments);

                for (var i = 0; i < this.children.length; i++) {
                    var e = this.children[i];
                    clone.add(e.clone(), ChangeMode.Self);
                }

                return clone;
            },
            mirrorClone: function () {
                var clone = UIElement.prototype.mirrorClone.apply(this, arguments);

                for (var i = 0; i < this.children.length; i++) {
                    var e = this.children[i];
                    clone.add(e.mirrorClone(), ChangeMode.Self);
                }

                return clone;
            },
            drawChildren: function (context, w, h, environment) {
                w = w === undefined ? this.width() : w;
                h = h === undefined ? this.height() : h;

                context.save();

                if (this.clipSelf()) {
                    context.rectPath(0, 0, w, h);
                    context.clip();
                }

                this.modifyContextBeforeDrawChildren(context);

                if (this.children) {
                    var items = this.children;
                    for (var i = 0; i < items.length; ++i) {
                        var child = items[i];
                        if (child.clipMask()) {
                            if (child.visible()) {
                                var b = child.props.borderBrush;
                                child.props.borderBrush = null;
                                this.drawChildSafe(child, context, environment);
                                child.props.borderBrush = b;
                            }
                            context.save();
                            this._renderMaskedElements(context, child, i++, items, environment);
                            context.restore();
                            if (child.visible()) {
                                var b = child.backgroundBrush();
                                child.setProps({backgroundBrush: null}, ChangeMode.Self);
                                this.drawChildSafe(child, context, environment);
                                child.setProps({backgroundBrush: b}, ChangeMode.Self);
                            }
                            break;
                        }
                        if (child.visible()) {
                            this.drawChildSafe(child, context, environment);
                        }
                    }
                }
                context.restore();
            },
            drawChildSafe: function (child, context, environment) {
                try {
                    child.draw(context, environment);
                } catch (e) {
                    logger.error("Draw error", e);
                    var data;
                    try {
                        data = child.toJSON(true);
                    }
                    catch (e2) {
                        logger.error("toJSON error", e2);
                        data = {
                            props: {
                                width: child.width(),
                                height: child.height(),
                                y: child.y(),
                                x: child.x(),
                                id: child.id()
                            }
                        }
                    }
                    var newChild = new CorruptedElement(data);
                    newChild.parent(child.parent());
                    var items = this.children;
                    for (var i = 0; i < items.length; ++i) {
                        var c = items[i];
                        if (c === child) {
                            items.splice(i, 1, newChild);
                            break;
                        }
                    }
                    newChild.draw(context, environment);
                }
            },
            clip: function () {
            },
            padding: function (value) {
                if (value !== undefined) {
                    this.setProps({padding: value})
                }
                return this.props.padding;
            },
            innerHeight: function () {
                var padding = this.padding();
                return this.height() - padding.top - padding.bottom;
            },
            innerWidth: function () {
                var padding = this.padding();
                return this.width() - padding.left - padding.right;
            },
            allowMoveOutChildren: function (value) {
                if (value !== undefined) {
                    this.setProps({allowMoveOutChildren: value})
                }
                return this.props.allowMoveOutChildren;
            },
            add: function (/*UIElement*/element, mode) {
                return this.insert(element, this.children.length, mode);
            },
            insert: function (/*UIElement*/element, /*int*/index, mode) {
                this.acquiringChild(element, index);

                var oldParent = element.parent();
                if (oldParent && !(oldParent === NullContainer)) {
                    oldParent.remove(element, mode);
                }

                element.parent(this);

                this.insertChild(element, index, mode);

                this.invalidate();

                return element;
            },
            contains: function (element) {
                return this.positionOf(element) !== -1;
            },
            positionOf: function (element) {
                return this.children.indexOf(element);
            },
            count: function () {
                return this.children.length;
            },
            changePosition: function (/*UIElement*/element, /*int*/index, mode) {
                this.changeChildPosition(element, index, mode);
                this.invalidate();
            },
            remove: function (/*UIElement*/element, mode) {
                element.removing();

                this.releasingChild(element);
                this.removeChild(element, mode);

                element.removed();

                this.invalidate();
            },
            replace: function (elementFrom, elementTo) {
                var idx = this.positionOf(elementFrom);
                this.remove(elementFrom);
                this.insert(elementTo, idx);
            },
            clear: function () {
                for (var i = 0; i < this.children.length; i++) {
                    var child = this.children[i];
                    this.releasingChild(child);
                    child.trackDeleted(this);
                }
                this.children.length = 0;
            },
            canAdd: function (element) {
                return true;
            },
            canRemove: function (element) {
                return true;
            },
            canInsert: function (element, index) {
                return true;
            },
            acquiringChild: function (child, index) {
            },
            releasingChild: function (child) {
                //child.onresize.unbind(this._childResizeHandler);
                child.parent(NullContainer);
            },
            getAcceptedChildTypes: function () {
                return null;
            },
            canAccept: function (element) {
                if (this.acceptDisabled()) {
                    return false;
                }

                var types = this.getAcceptedChildTypes();

                if (!types) {
                    return element.canBeAccepted(this);
                }

                var result = false;
                each(types, function (t) {
                    if (element instanceof t) {
                        result = true;
                        return false;
                    }
                });
                return result && element.canBeAccepted(this);
            },
            mousedown: function (event) {
                fwk.Container.Super.mousedown.call(this, event); //to hide inplace editor
                this.delegateToChildren("mousedown", event);

                if (this.enableGroupLocking()) {
                    if (Selection) {
                        var selectedElement = Selection.selectedElement();
                        if (selectedElement && selectedElement.isDescendantOrSame(this)) {
                            this._allowGroupActivation = true;
                        } else {
                            this.lockGroup();
                        }
                    }
                }
            },
            mousemove: function (event) {
                this.delegateToChildren("mousemove", event);
            },
            mouseup: function (event) {
                this.delegateToChildren("mouseup", event);
            },
            dblclick: function (event) {
                this.delegateToChildren("dblclick", event);
            },
            click: function (event) {
                if (this._allowGroupActivation) {
                    this.unlockGroup();
                    this.delegateToChildren("click", event);
                }
            },
            delegateToChildren: function (name, event) {
                for (let i = this.children.length - 1; i >= 0; --i) {
                    var element = this.children[i];
                    if (element.hitTest(event.x, event.y, event._scale)) {
                        element[name](event);
                        if (event.handled) {
                            break;
                        }
                    }

                }
            },
            hitElement: function (/*Point*/position, scale, predicate) {
                var hitTest = predicate || this.hitTest;
                if (!(this.hitVisible() && hitTest.call(this, position, scale))) {
                    return null;
                }
                var hitElement = this.hitTransparent() ? null : this;

                //position = sketch.math2d.rotatePoint(position, this.angle() * Math.PI / 180, this.rotationOrigin(true));
                for (let i = this.children.length - 1; i >= 0; --i) {
                    var element = this.children[i];
                    var newHit = element.hitElement(position, scale, predicate);
                    if (newHit) {
                        hitElement = newHit;
                        break;
                    }
                }

                return hitElement;
            },
            hitElements: function (/*Point*/position, scale) {
                var that = this;
                var elements = [];

                this.applyVisitor(function (element) {
                    if (that !== element) {
                        if (element.hitVisible() && element.hitTest(position, scale) && !element.hitTransparent() && element.canSelect() && !element.locked()) {
                            elements.push(element);
                        }
                    }
                });

                return elements;
            },
            hitElementDirect: function (position, scale, predicate) {
                Selection.directSelectionEnabled(true);
                var result = this.hitElement(position, scale, predicate);
                Selection.directSelectionEnabled(false);
                return result;
            },
            lockedGroup: function () {
                var parent = this.parent();
                return parent && (isLockGroup.call(this) || parent.lockedGroup()) && !Selection.directSelectionEnabled();
            },
            select: function () {
                this.lockedGroup()
            },
            captureMouse: function (/*UIElement*/element) {
                Environment.controller.captureMouse(element);
            },
            releaseMouse: function (/*UIElement*/element) {
                Environment.controller.releaseMouse(element);
            },
            applyVisitor: function (/*Visitor*/callback, useLogicalChildren, parent) {
                var stop = false;
                for (let i = this.children.length - 1; i >= 0; --i) {
                    var item = this.children[i];
                    if (item.applyVisitor(callback, useLogicalChildren, this) === false) {
                        stop = true;
                        break;
                    }
                }
                if (!stop) {
                    return callback(this, parent);
                }
                return false;
            },
            findActualParentForAncestorById: function (elementId) {
                var realParrent = null;
                this.applyVisitor(function (e, p) {
                    if (e.id() === elementId) {
                        realParrent = p;
                        return false;
                    }
                });

                return realParrent;
            },

            resetGlobalViewCache: function (resetPrimitiveRoot) {
                UIElement.prototype.resetGlobalViewCache.apply(this, arguments);

                if (this.children) {
                    for (let i = this.children.length - 1; i >= 0; --i) {
                        var e = this.children[i];
                        e.resetGlobalViewCache(resetPrimitiveRoot);
                    }
                }
            },
            global2local: function (/*Point*/pos) {
                var parent = this.parent();
                if (parent == null || !this.globalViewMatrix) {
                    return pos;
                }
                var matrix = this.globalViewMatrixInverted();
                return matrix.transformPoint(pos);
            },
            local2global: function (/*Point*/pos) {
                var parent = this.parent();
                if (parent == null || !this.globalViewMatrix) {
                    return pos;
                }

                var matrix = this.globalViewMatrix();
                return matrix.transformPoint(pos);
            },
            dropOn: function (event) {
                var element = event.element;

                if (Selection.isElementSelected(element)) {
                    this.unlockGroup();
                }
                event.handled = true;
            },
            registerForLayerDraw: function (layer, element) {
                this.parent().registerForLayerDraw(layer, element);
            },
            unregisterForLayerDraw: function (layer, element) {
                this.parent().unregisterForLayerDraw(layer, element);
            },
            arrange: function (resizeEvent, context) {
                UIElement.prototype.arrange.apply(this, arguments);
                return ArrangeStrategy.arrange(this, resizeEvent, context);
            },
            autoWidth: function () {
                var overflow = this.overflow();
                return overflow === Overflow.AdjustHorizontal || overflow === Overflow.AdjustBoth || this.autoExpandWidth();
            },
            autoHeight: function () {
                var overflow = this.overflow();
                return overflow === Overflow.AdjustVertical || overflow === Overflow.AdjustBoth || this.autoExpandHeight();
            },
            autoExpandWidth: function () {
                var overflow = this.overflow();
                return overflow === Overflow.ExpandHorizontal || overflow === Overflow.ExpandBoth;
            },
            autoExpandHeight: function () {
                var overflow = this.overflow();
                return overflow === Overflow.ExpandVertical || overflow === Overflow.ExpandBoth;
            },
            autoGrowMode: function (value) {
                return this.field("_autoGrowMode", value, true);
            },
            cornerRadius: function (value) {
                if (value !== undefined) {
                    this.setProps({cornerRadius: value})
                }
                return this.props.cornerRadius;
            },
            dropPositioning: function (value) {
                if (value !== undefined) {
                    this.setProps({dropPositioning: value})
                }
                return this.props.dropPositioning;
            },
            enableGroupLocking: function (value) {
                if (value !== undefined) {
                    this.setProps({enableGroupLocking: value})
                }
                return this.props.enableGroupLocking;
            },
            unlockGroup: function () {
                if (this.enableGroupLocking()) {
                    this._allowGroupActivation = true;
                    this._activeGroup = true;
                }
            },
            lockGroup: function () {
                if (this.enableGroupLocking()) {
                    this._allowGroupActivation = false;
                    this._activeGroup = false;
                }
            },
            getDropData: function (pos, element) {
                var width = this.width(),
                    height = this.height();

                pos = this.global2local(pos);

                var intervals = [];
                var last = 0;
                var baseLine;

                function calculateBaseLine(intervals, pos, insertIndex) {
                    var minY = Number.MAX_VALUE;
                    var lineY = 0;
                    for (var i = 0; i < intervals.length; i++) {
                        var itr = intervals[i];
                        var minCandidate = Math.abs(itr - pos);
                        if (minCandidate < minY) {
                            minY = minCandidate;
                            lineY = itr;
                            insertIndex = i;
                        }
                    }
                    return {lineY: lineY, insertIndex: insertIndex};
                }

                var dropPositioning = this.dropPositioning();
                if (dropPositioning === 'vertical') {
                    for (var i = 0; i < this.children.length; i++) {
                        var _element = this.children[i];
                        if (_element !== element) {
                            var gr = _element.getBoundaryRect();
                            intervals.push((last + gr.y) / 2);
                            last = gr.y + gr.height;
                        }
                    }

                    intervals.push((last + height) / 2);

                    baseLine = calculateBaseLine(intervals, pos.y);

                    var pt1 = this.local2global({x: 5, y: baseLine.lineY});
                    var pt2 = this.local2global({x: width - 10, y: baseLine.lineY});
                    return {
                        x1: pt1.x,
                        y1: pt1.y,
                        x2: pt2.x,
                        y2: pt2.y,
                        index: baseLine.insertIndex,
                        angle: this.angle()
                    }
                } else if (dropPositioning === 'horizontal') {
                    for (var i = 0; i < this.children.length; i++) {
                        var _element = this.children[i];
                        if (_element !== element) {
                            var gr = _element.getBoundaryRect();
                            intervals.push((last + gr.x) / 2);
                            last = gr.x + gr.width;
                        }
                    }

                    intervals.push((last + width) / 2);

                    baseLine = calculateBaseLine(intervals, pos.x);

                    var pt1 = this.local2global({x: baseLine.lineY, y: 5});
                    var pt2 = this.local2global({x: baseLine.lineY, y: height - 10});
                    return {
                        x1: pt1.x,
                        y1: pt1.y,
                        x2: pt2.x,
                        y2: pt2.y,
                        index: baseLine.insertIndex,
                        angle: this.angle()
                    }
                }

                return null;
            },

            global2localDropPosition: function (pos) {
                return this.global2local(pos);
            },

            getChildren: function () {
                return this.children;
            },
            findElementByName: function (name) {
                var element;

                this.applyVisitor(function (el) {
                    if (el.name() === name) {
                        element = el;
                        return false;
                    }
                }, false);

                return element;
            },
            isAtomicInModel: function (value) {
                return this.field("_isAtomicInModel", value, false);
            },
            toJSON: function (includeDefaults) {
                var current = fwk.Container.prototype.SuperKlass.toJSON.apply(this, arguments);
                if (!this.isAtomicInModel()) {
                    var children = current.children = [];
                    for (var i = 0; i < this.children.length; i++) {
                        var element = this.children[i];
                        if (!element.isTemporary()) {
                            children.push(element.toJSON(includeDefaults));
                        }
                    }
                }
                return current;
            },
            getElementById: function (id) {
                var res = null;
                if (this.id() === id) {
                    return this;
                }
                this.applyVisitor(function (el) {
                    if (el.id() === id) {
                        res = el;
                        return false;
                    }
                }, false);

                return res;
            },
            fromJSON: function (data) {
                //this.lockArrange();
                fwk.Container.prototype.SuperKlass.fromJSON.apply(this, arguments)
                this.childrenFromJSON(data.children);
                //this.unlockArrange();
                return this;
            },
            childrenFromJSON: function (children) {
                if (!this.isAtomicInModel() && children) {
                    this.clear();
                    for (var i = 0, length = children.length; i < length; i++) {
                        var childData = children[i];
                        //var newId = childData.id;
                        // var duplicate = this.getElementById(newId);
                        // if (duplicate) {
                        //     setTimeout(function () {
                        //         try {
                        //             logger.error("Duplicate element with the same id", {
                        //                 projectId: App.Current.id(),
                        //                 data: childData
                        //             })
                        //         } catch (e) {
                        //
                        //         }
                        //     }, 1);

                        //} else {
                        this.add(fwk.UIElement.fromJSON(childData));
                        //}
                    }
                }
            },
            findSingleChildOrDefault: function (predicate) {
                var result = null;
                this.applyVisitor(function (el) {
                    if (predicate(el)) {
                        result = el;
                        return false;
                    }
                }, false);

                return result;
            },
            dispose: function () {
                if (this.isDisposed()) {
                    return;
                }

                for (var i = 0; i < this.children.length; i++) {
                    var e = this.children[i];
                    if (!e.isDisposed()) {
                        e.dispose();
                    }
                }

                fwk.Container.prototype.SuperKlass.dispose.apply(this, arguments)
            },
            toString: function () {
                return this.__type__.substr(this.__type__.lastIndexOf(".") + 1)
                    + ": "
                    + map(this.getChildren(), function (x) {
                        return x.toString()
                    }).join(", ");
            }
        };
    })());

    fwk.PropertyMetadata.extend("sketch.framework.UIElement", {
        "sketch.framework.Container": {
            angle: {
                editorArgument: 0,
                useInModel: false,
                editable: false,
                validate: [{minMax: [0, 0]}]
            },
            arrangeStrategy: {
                defaultValue: ArrangeStrategies.Canvas
            },
            stackAlign: {
                defaultValue: StackAlign.Default
            },
            stackOrientation: {
                defaultValue: StackOrientation.Vertical
            },
            padding: {
                displayName: "Padding",
                type: "box",
                useInModel: true,
                editable: false,
                defaultValue: fwk.Box.Default
            },
            dropPositioning: {
                displayName: "Drop position",
                type: "choice",
                possibleValues: {"none": "None", "vertical": "Vertical", "horizontal": "Horizontal"},
                useInModel: true,
                editable: false,
                defaultValue: "none"
            },
            enableGroupLocking: {
                displayName: "Group locking",
                type: "trueFalse",
                useInModel: true,
                editable: false,
                defaultValue: false
            },
            overflow: {
                defaultValue: Overflow.Visible,
                displayName: "Overflow",
                type: "dropdown",
                options: {
                    width: 1 / 2,
                    items: [
                        {name: "Clip", value: Overflow.Clip},
                        {name: "Visible", value: Overflow.Visible},
                        {name: "Grow and shrink horizontally", value: Overflow.AdjustHorizontal},
                        {name: "Grow and shrink vertically", value: Overflow.AdjustVertical},
                        {name: "Grow and shrink", value: Overflow.AdjustBoth},
                        {name: "Grow horizontally", value: Overflow.ExpandHorizontal},
                        {name: "Grow vertically", value: Overflow.ExpandVertical},
                        {name: "Grow", value: Overflow.ExpandBoth}
                    ]
                }
            },
            cornerRadius: {
                displayName: "Border radius",
                type: "quadAndLock",
                useInModel: true,
                editable: true,
                defaultValue: QuadAndLock.Default
            },
            allowMoveOutChildren: {
                displayName: "Allow drag elements out",
                type: "checkbox",
                useInModel: true,
                editable: true,
                defaultValue: true,
            },
            groups: function (element) {
                var ownGroups = [
                    {
                        label: element ? element.displayType() : '',
                        properties: ["overflow"]
                    }
                ];

                var baseGroups = fwk.PropertyMetadata.findAll("sketch.framework.UIElement").groups();
                return ownGroups.concat(baseGroups).concat([
                    {
                        label: "Settings",
                        properties: ["allowMoveOutChildren"]
                    }
                ]);
            }
        }
    });


    fwk.Container.createCanvas = function () {
        var container = new fwk.Container();
        container.arrangeStrategy(ArrangeStrategies.Canvas);
        return container;
    };
    fwk.Container.createStackHorizontal = function () {
        var container = new fwk.Container();
        container.setProps({
            arrangeStrategy: ArrangeStrategies.Stack,
            stackOrientation: StackOrientation.Horizontal
        });
        return container;
    };
    fwk.Container.createStackVertical = function () {
        var container = new fwk.Container();
        container.arrangeStrategy(ArrangeStrategies.Stack);
        return container;
    };
    fwk.Container.createDock = function () {
        var container = new fwk.Container();
        container.arrangeStrategy(ArrangeStrategies.Dock);
        return container;
    };
    fwk.Container.createAlign = function () {
        var container = new fwk.Container();
        container.arrangeStrategy(ArrangeStrategies.Align);
        return container;
    };

    return fwk.Container;
});
