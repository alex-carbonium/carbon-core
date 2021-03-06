import UIElement from "../framework/UIElement";
import PropertyMetadata from "../framework/PropertyMetadata";
import {Types} from "../framework/Defs";

class ArtboardToolSettings extends UIElement {
    constructor(app){
        super();
        this._app = app;
    }

    createSelectionFrame(){
        return {
            element: this,
            frame: false,
            points: []
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
}
ArtboardToolSettings.prototype.t = Types.ArtboardToolSettings;

PropertyMetadata.registerForType(ArtboardToolSettings, {
    artboardScreenSizes: {
        displayName: "Screens",
        type: "artboardSizes",
        useInModel: false,
        editable: true,
        defaultValue: null
    },

    groups: function(){
        return [
            {
                label: "Screen sizes",
                properties: ["artboardScreenSizes"]
            }
        ];
    }
});


export default ArtboardToolSettings;