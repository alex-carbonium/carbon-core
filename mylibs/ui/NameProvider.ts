import CoreIntl from "../CoreIntl";
import { INameProvider } from "carbon-core";

export default class NameProvider implements INameProvider {
    [name: string]: any;

    constructor(page) {
        this._nextIndexes = {};
        this._namesMap = {};
        this.initForPage(page);
    }

    initForPage(page) {
        var namesMap = this._namesMap;
        page.applyVisitor(e => {
            namesMap[e.name()] = true;
        })
    }

    getNextIndex(label) {
        var nextIndexes = this._nextIndexes;
        var idx = nextIndexes[label] || 1;
        nextIndexes[label] = idx + 1;

        return idx;
    }

    assignNewName(element, separator = " ") {
        let newName = this.createNewName(element.displayType(), separator);
        element.setProps({ name: newName });
    }

    createNewName(elementName: string, separator = " ") {
        let namesMap = this._namesMap;
        let lastLabel = null;
        while (true) {
            var index = this.getNextIndex(elementName);
            var label = CoreIntl.instance.formatMessage({
                id: elementName,
                defaultMessage: elementName
            }) + separator + index;

            if (!namesMap[label] || lastLabel === label) break;
            lastLabel = label;
        }
        namesMap[label] = true;

        return label;
    }
}