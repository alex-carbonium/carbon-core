import {Types, Overflow} from "./Defs";
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
            allowMoveOutChildren: function(value, eventData){
                return Container.prototype.allowMoveOutChildren.apply(this, arguments) || (eventData && (eventData.event.ctrlKey || eventData.event.metaKey))
            },
            canAccept: function (element, autoInsert, allowMoveInOut) {
                return allowMoveInOut;//!autoInsert && Container.prototype.canAccept.call(this, element);
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
        allowMoveOutChildren:{
            defaultValue: false
        },
        enableGroupLocking: {
            defaultValue: true
        },
        overflow:{
            defaultValue: Overflow.AdjustBoth
        }
    });

    return GroupContainer;
});
