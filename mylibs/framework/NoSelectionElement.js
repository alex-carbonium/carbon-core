import UIElement from "framework/UIElement";
import {DeviceList} from "ui/Devices";
import Page from "framework/Page";
import PropertyMetadata from "./PropertyMetadata";
import PropertyTracker from "./PropertyTracker";
import {ChangeMode, Types} from "./Defs";

var pageProperties = ["name", /*,"screenType", "orientation" "status"*/];
var contentContainerProperties = ["width", "height"];

export default class NoSelectionElement extends UIElement {
    constructor(app, page){
        super();
        this._app = app;
        this._page = page;
        this._contentContainer = page;//.getContentContainer();

        this.setProps({
            name: page.name()
            //screenType: page.screenType(),
            //orientation: page.orientation(),
            // status: page.status(),
            // width: this._contentContainer.width(),
            // height: this._contentContainer.height()
        }, ChangeMode.Root);
    }

    prepareProps(changes){
        this._page.prepareProps(changes);
        this._contentContainer.prepareProps(changes);
    }

    enablePropsTracking(){
        super.enablePropsTracking.apply(this, arguments);
        this._page.enablePropsTracking();
        this._contentContainer.enablePropsTracking();
        PropertyTracker.propertyChanged.bind(this, this._onPropertyChanged);
    }

    disablePropsTracking(){
        super.disablePropsTracking.apply(this, arguments);
        this._page.disablePropsTracking();
        this._contentContainer.disablePropsTracking();
        PropertyTracker.propertyChanged.unbind(this, this._onPropertyChanged);
    }

    setProps(){
        super.setProps.apply(this, arguments);
        if (this._contentContainer){
            this._contentContainer.setProps.apply(this._contentContainer, arguments);
        }
    }

    _onPropertyChanged(element, changes){
        var propNames = element === this._contentContainer ? contentContainerProperties :
            element === this._page ? pageProperties :
                null;

        if (propNames){
            var selectedChanges = this._selectProperties(changes, propNames);
            if (selectedChanges){
                this.setProps(selectedChanges);
            }
        }
    }

    _selectProperties(changes, propNames){
        var result = null;
        for (var i = 0; i < propNames.length; i++){
            var name = propNames[i];
            if (changes.hasOwnProperty(name)){
                result = result || {};
                result[name] = changes[name];
            }
        }
        return result;
    }
}
NoSelectionElement.prototype.t = Types.NoSelectionElement;

PropertyMetadata.registerForType(NoSelectionElement, {
    name: {
        displayName: "Name",
        type: "text",
        options: {
            noPreview: true
        }
    },
    // width: {
    //     displayName: "Width",
    //     type: "numeric",
    //     options: {
    //         noPreview: true
    //     }
    // },
    // height: {
    //     displayName: "Height",
    //     type: "numeric",
    //     options: {
    //         noPreview: true
    //     }
    // },
    // screenType: {
    //     displayName: "Device",
    //     type: "dropdown",
    //     options: {
    //         size: 1/2,
    //         items: DeviceList
    //     }
    // },
    // orientation: {
    //     displayName: "Orientation",
    //     type: "dropdown",
    //     options: {
    //         size: 1/2,
    //         items: [{name: "Portrait", value: "portrait"}, {name: "Landscape", value: "landscape"}]
    //     }
    // },
    // status: {
    //     displayName: "Status",
    //     type: "dropdown",
    //     options: {
    //         items: pageStatusItems
    //     }
    // },
    groups: function(){
        return [
            {
                label: "Page",
                properties: ["name"]
            }
        ];
    }
});