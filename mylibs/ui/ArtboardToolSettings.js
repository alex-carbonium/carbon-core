import UIElement from "framework/UIElement";
import PropertyMetadata from "framework/PropertyMetadata";

class ArtboardToolSettings extends UIElement {
    constructor(app) {
        super();
        this._app = app;
    }

    createSelectionFrame() {
        return {
            element: this,
            frame: false,
            points: []
        }
    }

}

ArtboardToolSettings.prototype.__type__ = "ArtboardToolSettings";

PropertyMetadata.extend(
    {
    [ArtboardToolSettings.prototype.__type__]: {
        artboardScreenSizes: {
            displayName: "Screens",
            type: "artboardSizes",
            useInModel: false,
            editable: true,
            defaultValue: null
        },

        groups: function () {
            return [
                {
                    label: "Screen sizes",
                    properties: ["artboardScreenSizes"]
                }
            ];
        }
    }
});


export default ArtboardToolSettings;