import CoreIntl from "../CoreIntl";

export default class NameProvider {
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

    getNextIndex(element, label) {
        var nextIndexes = this._nextIndexes;
        var idx = nextIndexes[label] || 1;
        nextIndexes[label] = idx + 1;

        return idx;
    }

    assignNewName(element, separator = " ") {
        let namesMap = this._namesMap;
        let lastLabel = null;
        while (true) {
            var displayType = element.displayType();
            var index = this.getNextIndex(element, displayType);
            var label = CoreIntl.instance.formatMessage({
                id: displayType,
                defaultMessage: displayType
            }) + separator + index;

            if (!namesMap[label] || lastLabel === label) break;
            lastLabel = label;
        }
        namesMap[label] = true;

        element.setProps({ name: label });
    }
}