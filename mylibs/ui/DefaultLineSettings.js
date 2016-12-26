import UIElement from "framework/UIElement";
import PropertyMetadata from "framework/PropertyMetadata";
import Brush from "framework/Brush";
import AppPropsChanged from "commands/AppPropsChanged";
import {Types} from "../framework/Defs";

class DefaultLineSettings extends UIElement {
    constructor(app){
        super();
        this._app = app;
        this.props = app.defaultLineSettings() || PropertyMetadata.getDefaultProps(DefaultLineSettings.prototype.t);
    }

    constructPropsChangedCommand(changes){
        var changes = extend(this.props, changes);

        return new AppPropsChanged(this._app, {defaultLineSettings: changes});
    }

    updateColors(){
        this.setProps({
            stroke:Brush.extend(this.props.stroke, this._app.defaultStroke())
        });
    }

    createSelectionFrame(){
        return {
            element: this,
            frame: false,
            points: []
        }
    }
}
DefaultLineSettings.prototype.t = Types.DefaultLineSettings;

PropertyMetadata.extend({[Types.DefaultLineSettings]: {
    stroke: {
        displayName: "Stroke",
        type: "stroke",
        defaultValue: Brush.Black
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
    groups: function(){
        return [
            {
                label: "Default Appearance",
                expanded: true,
                properties: ["opacity", "stroke"]
            }
        ];
    }
}});


export default DefaultLineSettings;