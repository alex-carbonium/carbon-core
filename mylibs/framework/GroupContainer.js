import {Types, Overflow, ChangeMode} from "./Defs";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import PropertyMetadata from "./PropertyMetadata";

define(["framework/Container"], function (Container) {

    var GroupContainer = klass(Container, (function () {
        var selectionChanged = function selectionChanged() {
            if (!this.isDisposed() && this._locked != this.lockedGroup()) {
                Invalidate.request();
                this._locked = this.lockedGroup();
            }
        };
        return {
            _constructor: function () {
                this._locked = false;
                // TODO: refactor
                if (Selection.onElementSelected) {
                    this._selectionSubscription = Selection.onElementSelected.bind(this, selectionChanged);
                }
            },
            getVisualActions: function () {
                return {fromCategories: ["Layering", "Ungroup"]};
            },
            drawSelf: function (context, w, h, environment) {
                if (!this.lockedGroup()) {
                    context.save();
                    context.globalAlpha = 0.05;
                    context.fillStyle = "black";
                    context.fillRect(0, 0, w, h);
                    context.restore();

                }
                GroupContainer.prototype.SuperKlass.drawSelf.apply(this, arguments);
            },
            _buildChildrenSizes(){
                var rects = [];
                this.children.forEach((e) => {
                    var r = e.getBoundaryRect();
                    rects.push(r);
                });

                return rects;
            },
            startResizing(){
                GroupContainer.prototype.SuperKlass.startResizing.call(this);
                this._rects = this._buildChildrenSizes();
                this._originalWidth = this.width();
                this._originalHeight = this.height();
                this.applyVisitor(e=>{
                    if(e instanceof GroupContainer && e !== this){
                        e.startResizing();
                    }
                })
            },
            stopResizing(){
                GroupContainer.prototype.SuperKlass.stopResizing.call(this);
                delete this._rects;
                delete this._originalWidth;
                delete this._originalHeight;
                this.applyVisitor(e=>{
                    if(e instanceof GroupContainer && e !== this){
                        e.stopResizing();
                    }
                })
            },
            _roundValue(value){
                return value;
            },

            allowMoveOutChildren: function (value, eventData) {
                return Container.prototype.allowMoveOutChildren.apply(this, arguments) || (eventData && (eventData.event.ctrlKey || eventData.event.metaKey))
            },
            canAccept: function (element, autoInsert, allowMoveInOut) {
                return allowMoveInOut;//!autoInsert && Container.prototype.canAccept.call(this, element);
            },
            lockAutoresize: function() {
                this._lockAutoresize = true;
            },
            unlockAutoresize: function() {
                delete this._lockAutoresize;
            },
            iconType: function () {
                return 'group';
            },
            dispose: function () {
                if (this._selectionSubscription) {
                    this._selectionSubscription.dispose();
                    delete this._selectionSubscription;
                }
                Container.prototype.dispose.apply(this, arguments);
            }
        }
    })());

    GroupContainer.prototype.t = Types.GroupContainer;

    Container.GroupContainerType = GroupContainer;

    PropertyMetadata.registerForType(GroupContainer, {
        allowMoveOutChildren: {
            defaultValue: false
        },
        enableGroupLocking: {
            defaultValue: true
        },
        scaleChildren: {
            defaultValue: true
        },
        overflow: {
            defaultValue: Overflow.AdjustBoth
        }
    });

    return GroupContainer;
});
