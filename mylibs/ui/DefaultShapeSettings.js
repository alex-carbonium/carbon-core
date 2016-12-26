import UIElement from "framework/UIElement";
import PropertyMetadata from "framework/PropertyMetadata";
import Brush from "framework/Brush";
import QuadAndLock from "framework/QuadAndLock";
import AppPropsChanged from "commands/AppPropsChanged";
import {Types} from "../framework/Defs";

class DefaultShapeSettings extends UIElement {
    constructor(app){
        super();
        this._app = app;
        this.props = app.defaultShapeSettings() || PropertyMetadata.getDefaultProps(DefaultShapeSettings.prototype.t);
    }

    updateColors(){
        this.setProps({
            fill:Brush.extend(this.props.fill, this._app.defaultFill()),
            stroke:Brush.extend(this.props.stroke, this._app.defaultStroke())
        });
    }

    constructPropsChangedCommand(changes){
        var changes = extend(this.props, changes);

        return new AppPropsChanged(this._app, {defaultShapeSettings: changes});
    }

    createSelectionFrame(){
        return {
            element: this,
            frame: false,
            points: []
        }
    }
}
DefaultShapeSettings.prototype.t = Types.DefaultShapeSettings;

PropertyMetadata.extend({[Types.DefaultShapeSettings]: {
    fill: {
        displayName: "Fill",
        type: "fill",
        defaultValue: Brush.createFromColor("#B6B6B6")
    },
    stroke: {
        displayName: "Stroke",
        type: "stroke",
        defaultValue: Brush.Empty
    },

    opacity: {
        displayName: "Opacity",
        type: "numeric",
        options: {
            step: .1,
            min: 0,
            max: 1
        },
        defaultValue: 1
    },
    cornerRadius: {
        displayName: "Corner radius",
        defaultValue: QuadAndLock.Default,
        type: "quadAndLock"
    },
    groups: function(){
        return [
            {
                label: "Default Appearance",
                expanded: true,
                properties: ["fill", "opacity", "stroke", "cornerRadius"]
            }
        ];
    }
}});


export default DefaultShapeSettings;