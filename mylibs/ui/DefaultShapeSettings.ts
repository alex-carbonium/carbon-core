import UIElement from "framework/UIElement";
import PropertyMetadata from "framework/PropertyMetadata";
import Brush from "framework/Brush";
import QuadAndLock from "framework/QuadAndLock";
import AppPropsChanged from "commands/AppPropsChanged";
import {Types, ChangeMode} from "../framework/Defs";
import UserSettings from "../UserSettings";

const appearanceProps = ["fill", "stroke", "strokeWidth", "strokePosition", "opacity"];

class DefaultShapeSettings extends UIElement {
    constructor(app){
        super();
        this._app = app;

        var props = app.defaultShapeSettings();
        this.setProps(props);
    }

    updateColors(){
        this.setProps(this._app.defaultShapeSettings(), ChangeMode.Self);
    }

    propsUpdated(props, oldProps, mode){
        super.propsUpdated(props, oldProps, mode);

        if (mode === ChangeMode.Model){
            this._app.defaultShapeSettings(this.selectProps(appearanceProps));
        }
    }

    contextBarAllowed() {
        return false;
    }

    findPropertyDescriptor(name) {
        if(name === "name" || name === "locked") {
            return null;
        }
        return super.findPropertyDescriptor(name);
    }

    createSelectionFrame(){
        return {
            element: this,
            frame: false,
            points: []
        }
    }

    isPhantom(): boolean{
        return true;
    }
}
DefaultShapeSettings.prototype.t = Types.DefaultShapeSettings;

PropertyMetadata.registerForType(DefaultShapeSettings, {
    fill: {
        defaultValue: Brush.createFromColor(UserSettings.shapes.defaultFill)
    },
    stroke: {
        defaultValue: Brush.createFromColor(UserSettings.shapes.defaultStroke)
    },
    groups: function(){
        return [
            {
                label: "Default Appearance",
                properties: appearanceProps
            }
        ];
    }
});


export default DefaultShapeSettings;