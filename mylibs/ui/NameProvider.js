import Intl from "Intl";

export default class NameProvider {

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

    assignNewName(element) {
        let namesMap = this._namesMap;
        let lastLabel = null;
        while (true) {
            var displayType = element.displayType();
            var index = this.getNextIndex(element, displayType);            
            var label = Intl.instance.formatMessage({
                id: displayType,
                defaultMessage: displayType
            }) + " " + index;

            if (!namesMap[label] || lastLabel === label) break;
            lastLabel = label;
        }
        namesMap[label] = true;

        element.setProps({ name: label });
    }
}