import EventHelper from "framework/EventHelper";
import SelectComposite from "framework/SelectComposite";


// public methods
function unlockGroupForElementHierarchy(elements) {
    each(elements, function (el) {
        el = el.parent();
        while (el.unlockGroup) {
            el.unlockGroup();
            el = el.parent();
            if (!el) {
                return false;
            }
        }
    });
}
function onselect(rect) {
    var selection = App.Current.activePage.getElementsInRect(rect);

    Selection.makeSelection(selection);
}

class SelectionModel {
    constructor() {
        this._selectionMode = "new";
        this._selectFrame = null;
        this.onElementSelected = EventHelper.createEvent();
        this.startSelectionFrameEvent = EventHelper.createEvent();
        this.onSelectionFrameEvent = EventHelper.createEvent();
        this.stopSelectionFrameEvent = EventHelper.createEvent();

        this._selectCompositeElement = new SelectComposite();

        this._directSelectionEnabled = false;
        this._forceDirectSelection = false;
    }

    get selectFrame() {
        return this._selectFrame;
    }

    forceDirectSelection(value) {
        if (value != undefined) {
            this._forceDirectSelection = value;
        }
        return this._forceDirectSelection;
    }


    directSelectionEnabled(value) {
        if (value != undefined) {
            this._directSelectionEnabled = value;
        }
        return this._directSelectionEnabled || this._forceDirectSelection;
    }

    setupSelectFrame(selectFrame, eventData) {
        this._selectFrame = selectFrame;
        this.startSelectionFrameEvent.raise();
        this.makeSelection(null);
        this._selectFrame.init(eventData);
    }

    updateSelectFrame(eventData) {
        var rect = this._selectFrame.update(eventData);
        this.onSelectionFrameEvent.raise(rect);
    }

    completeSelectFrame(eventData) {
        this.stopSelectionFrameEvent.raise();
        this._selectFrame.complete(eventData);
        this._selectFrame = null;
    }

    isElementSelected(el) {
        return this._selectCompositeElement.has(el);
    }

    isOnlyElementSelected(el) {
        return this._selectCompositeElement.count() === 1 && this._selectCompositeElement.has(el);
    }

    count() {
        return this._selectCompositeElement.count();
    }

    selectedElement() {
        if (this._selectCompositeElement.count() === 0) {
            return null;
        }
        else if (this._selectCompositeElement.count() === 1) {
            return this._selectCompositeElement.elementAt(0);
        }
        return this._selectCompositeElement;
    }

    selectComposite() {
        return this._selectCompositeElement;
    }

    selectionMode(value) {
        if (arguments.length === 1) {
            if (value !== "new" && value !== "add" && value !== "remove" && value != 'add_or_replace') {
                throw {name: "ArgumentException", message: "Incorrect selection mode specified"};
            }
            this._selectionMode = value;
        }
        return this._selectionMode;
    }

    addToSelection(/*Array*/elements, refreshOnly) {
        var multiSelect = elements.length > 1;
        var selection = this._decomposeSelection(elements);

        unlockGroupForElementHierarchy(elements);

        var canSelect = false;
        for (var i = 0, j = selection.length; i < j; ++i) {
            var element = selection[i];
            if (element.canSelect() || element.selectFromLayersPanel) {
                this._selectCompositeElement.add(element, multiSelect, refreshOnly);
                canSelect = true;
            }
        }

        this._selectCompositeElement.selected(false);
        if (canSelect) {
            this._selectCompositeElement.selected(true);
        }
    }

    getSelection() {
        var selectedElement = this.selectedElement();
        if (!selectedElement) {
            return null;
        }
        return this._decomposeSelection([selectedElement]);
    }

    _decomposeSelection(selection) {
        if (!selection) {
            return [];
        }

        var newSelection = selection;

        if (selection.length === 1) {
            var selectedElement = selection[0];

            if (selectedElement instanceof SelectComposite) {
                newSelection = [];
                selectedElement.each(function (element) {
                    newSelection.push(element);
                });
            }
        }
        return newSelection;
    }

    selectedElements() {
        return this._selectCompositeElement.elements;
    }

    makeSelection(selection, refreshOnly) {
        var currentSelection = this._selectCompositeElement.elements;

        var newSelection = this._decomposeSelection(selection);
        if (areSameArrays(currentSelection, newSelection)) {
            return;
        }

        if (this._selectionMode === "add_or_replace") {
            if (!intersectArrays(currentSelection, newSelection)) {
                this.unselectAll(refreshOnly);
                currentSelection = [];
            }
            this._selectionMode = "add";
        }


        if (!selection || selection.length === 0) {
            this.unselectAll(refreshOnly);
        }
        else if (this._selectionMode === "add") {

            var alreadyAdded = false;
            each(currentSelection, function (el1) {
                each(newSelection, function (el2) {
                    if (el1 === el2) {
                        alreadyAdded = true;
                        return;
                    }
                });
                if (alreadyAdded) {
                    return;
                }
            });
            if (alreadyAdded) {
                return;
            }

            this.addToSelection(selection, refreshOnly);
        }
        else if (this._selectionMode === "new") {
            this.unselectAll(refreshOnly);
            this.addToSelection(selection, refreshOnly);
        }
        else if (this._selectionMode === "remove") {
            this.unselectAll(refreshOnly);
            sketch.util.removeGroupFromArray(currentSelection, newSelection);
            this.addToSelection(currentSelection, refreshOnly);
        }

        if (!refreshOnly) {
            this._fireOnElementSelected(currentSelection);
        }
    }

    refreshSelection() {
        var selection = this.selectedElements();
        this.makeSelection([], true);
        this.makeSelection(selection, true);
    }

    _fireOnElementSelected(oldSelection) {
        this.onElementSelected.raise(this._selectCompositeElement, oldSelection);
    }

    unselectAll(refreshOnly) {
        this._selectCompositeElement.selected(false);
        var count = this._selectCompositeElement.count();
        this._selectCompositeElement.clear(refreshOnly);
        return count !== 0;
    }

    unselectGroup(elements, refreshOnly) {
        this.unselectAll(refreshOnly);
        var currentSelection = this._selectCompositeElement.elements;
        sketch.util.removeGroupFromArray(currentSelection, elements);
        this.addToSelection(currentSelection, refreshOnly);
    }

    clearSelection() {
        if (this.unselectAll()) {
            this._fireOnElementSelected(null);
        }
    }

    clear() {
        this._selectCompositeElement.clear();

        // this.layer3.invalidate();
    }

    selectAll() {
        var page = App.Current.activePage;
        var artboard = page.getActiveArtboard();
        if(artboard){
            onselect.call(this, artboard.getBoundaryRectGlobal());
            return;
        }

        var v = Number.MAX_SAFE_INTEGER / 2;
        onselect.call(this, {x: -v, y: -v, width: Number.MAX_SAFE_INTEGER, height: Number.MAX_SAFE_INTEGER});
    }

    hasSelectionFrame() {
        return !!this._selectFrame;
    }

    lock(){
        var elements = this.selectedElements();
        for (var i = 0; i < elements.length; i++){
            var e = elements[i];
            if (!e.locked()){
                e.locked(true);
            }
        }
        this._selectCompositeElement.selected(false);
    }
    unlock(){
        var elements = this.selectedElements();
        for (var i = 0; i < elements.length; i++){
            var e = elements[i];
            if (e.locked()){
                e.locked(false);
            }
        }
        this._selectCompositeElement.selected(false);
        this._selectCompositeElement.selected(true);
    }
}

var Selection = new SelectionModel();

export default Selection;