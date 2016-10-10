import UIElement from "framework/UIElement";
import PropertyMetadata from "framework/PropertyMetadata";
import Brush from "framework/Brush";
import QuadAndLock from "framework/QuadAndLock";
import AppPropsChanged from "commands/AppPropsChanged";

class DefaultShapeSettings extends UIElement {
    constructor(app) {
        super();
        this._app = app;
        this.props = app.defaultShapeSettings() || PropertyMetadata.getDefaultProps(DefaultShapeSettings.prototype.__type__);
    }

    constructPropsChangedCommand(changes){
        var changes = extend(this.props, changes);
        
        return new AppPropsChanged(this._app, {defaultShapeSettings:changes});
    }

    createSelectionFrame() {
        return {
            element: this,
            frame: false,
            points: []
        }
    }
}

DefaultShapeSettings.prototype.__type__ = "DefaultShapeSettings";

PropertyMetadata.extend(
    {
    [DefaultShapeSettings.prototype.__type__]: {
        backgroundBrush: {
            displayName: "Fill",
            type: "fill",
            useInModel: true,
            editable: true,
            defaultValue: Brush.White
        },
        borderBrush: {
            displayName: "Stroke",
            type: "stroke",
            useInModel: true,
            editable: true,
            defaultValue: Brush.Black
        },
       
        opacity: {
            displayName: "Opacity",
            type: "numeric",
            editorArgument: 0.1,
            useInModel: true,
            editable: true,
            validate: [
                {minMax: [0, 1]}
            ],
            defaultValue: 1
        },
        cornerRadius: {
            displayName: "Corner radius",
            defaultValue: QuadAndLock.Default,
            type: "quadAndLock",
            useInModel: true,
            editable: true
        },
        groups: function () {
            return [
                {
                    label: "Default Appearance",
                    expanded: true,
                    properties: ["backgroundBrush", "opacity", "borderBrush",  "cornerRadius"]
                }
            ];
        }
    }
});


export default DefaultShapeSettings;