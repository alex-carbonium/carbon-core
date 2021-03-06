import UIElement from "../../../framework/UIElement";
import PropertyMetadata from "../../../framework/PropertyMetadata";
import {Types} from "../../../framework/Defs";
import Font from "../../../framework/Font";

export default class DefaultFormatter extends UIElement {
    initFormatter(app){
        this._app = app;
        this.props.textStyleId = this._app.props.defaultTextSettings.textStyleId;
        this.props.font = Font.extend(this.props.font, this._app.props.defaultTextSettings.font);
        return this;
    }

    setProps(changes){
        super.setProps.apply(this, arguments);
        if (changes.font !== undefined){
            var defaultTextSettings = Object.assign({}, this._app.props.defaultTextSettings, {font: changes.font});
            this._app.setProps({defaultTextSettings});
        }
    }
    hasPendingTexStyle(){
        return false;
    }

    createSelectionFrame(){
        return {
            element: this,
            frame: false,
            points: []
        }
    }

    displayName(){
        return "Default text settings";
    }

    findPropertyDescriptor(name) {
        if(name === "name" || name === "locked") {
            return null;
        }
        return super.findPropertyDescriptor(name);
    }

    contextBarAllowed() {
        return false;
    }
}
DefaultFormatter.prototype.t = Types.DefaultFormatter;

PropertyMetadata.registerForType(DefaultFormatter, {
    textStyleId: {
        displayName: "Text style",
        type: "textStyleName"
    },
    font: {
        displayName: "Font",
        type: "font",
        options: {
            fonts: []
        },
        defaultValue: Font.Default,
        style: 2
    },
    groups: function(){
        return [
            {
                label: "Default font",
                properties: [/*"textStyleId",*/ "font"]
            }
        ];
    }
});