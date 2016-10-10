import { Overflow} from "./Defs";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";

define(["framework/Container"], function (Container) {
    var fwk = sketch.framework;

    fwk.PropertyMetadata.extend("sketch.framework.Container", {
        "sketch.framework.GroupContainer": {
            allowMoveOutChildren:{
                defaultValue: false
            },
            enableGroupLocking: {
                defaultValue: true
            },
            overflow:{
                defaultValue: Overflow.AdjustBoth
            }
        }
    });


    return klass2("sketch.framework.GroupContainer", Container, (function () {
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
                fwk.GroupContainer.prototype.SuperKlass.drawSelf.apply(this, arguments);
            },
            allowMoveOutChildren: function(value, eventData){
                return Container.prototype.allowMoveOutChildren.apply(this, arguments) || (eventData && (eventData.event.ctrlKey || eventData.event.metaKey))
            },
            canAccept: function (element, autoInsert, event) {
                return event && (event.event.ctrlKey || event.event.metaKey);//!autoInsert && Container.prototype.canAccept.call(this, element);
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
});
