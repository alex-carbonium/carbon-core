import Intl from "Intl";
import EventHelper from "framework/EventHelper";
import {createUUID} from "../../util";

// TODO: test container with clip mask
// TODO: test image element

class StyleManager {
    constructor() {
        this._styles = {};
        this.styleChanged = EventHelper.createEvent();
    }

    createStyle(name, type, props) {
        var style = {id: createUUID(), name, props};
        this.registerStyle(style, type);
        this.styleChanged.raise(style.id, type);
        return style;
    }
    registerStyle(style, type){
        var styles = this._styles[type] = this._styles[type] || {};
        styles[style.id] = style;
    }

    deleteStyle(id, type) {
        delete this._styles[type][id];
        this.styleChanged.raise(id, type);
    }

    updateStyle(id, type, props) {
        var data = this._styles[type][id];
        data.props = props;
        this.styleChanged.raise(id, type);
    }

    getPropNameForType(type){
        if(type === 1){
            return "styleId";
        }

        return "textStyleId";
    }

    getStyles(type) {
        var res = [];
        var styles = this._styles[type];
        for (var id in styles) {
            res.push(styles[id]);
        }

        return res;
    }

    getStyle(id, type) {
        return this._styles[type][id];
    }

    getStyleNameForElement(element, type) {
        var styles = this.getStyles(type);
        var stylesMap = {};
        for (var i = 0; i < styles.length; ++i) {
            stylesMap[styles[i].name] = true;
        }
        var label = Intl.instance.formatMessage({
            id: "newstyle.name",
            defaultMessage: "{type} style"
        }, {type: element.displayName()});
        var tmp = label;
        var index = 1;
        while (stylesMap[tmp]) {
            tmp = label + " " + index;
            index++;
        }
        label = tmp;

        return label;
    }
}

export default new StyleManager();