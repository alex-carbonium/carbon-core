import EventHelper from "./EventHelper";
import SelectComposite from "./SelectComposite";
import Invalidate from "./Invalidate";
import {ViewTool} from "./Defs";

var debug = require("DebugUtil")("carb:selection");

function lockUnlockGroups(newSelectedElements) {
    var newUnlocked = [];
    var invalidate = false;

    //unlock parents
    for (let i = 0; i < newSelectedElements.length; i++){
        var el = newSelectedElements[i].parent();
        while (el && el.unlockGroup) {
            let unlocked = this._unlockedContainers.indexOf(el) !== -1;
            if (!unlocked){
                unlocked = el.unlockGroup();
                invalidate = true;
            }
            if (unlocked){
                newUnlocked.push(el);
            }

            el = el.parent();
        }
    }

    //activate self if single element is selected
    if (this._activeGroup){
        this._activeGroup.activeGroup(false);
        this._activeGroup = null;
    }

    //lock anything which is not selected anymore
    for (let i = 0; i < this._unlockedContainers.length; i++){
        var c = this._unlockedContainers[i];
        if (c.lockGroup && newUnlocked.indexOf(c) === -1){
            c.lockGroup();
            invalidate = true;
        }
    }
    this._unlockedContainers = newUnlocked;

    if (newSelectedElements.length === 1 && newSelectedElements[0].activeGroup){
        newSelectedElements[0].activeGroup(true);
        this._activeGroup = newSelectedElements[0];
    }

    if (invalidate){
        Invalidate.request();
    }
}
function onselect(rect) {
    var selection = App.Current.activePage.getElementsInRect(rect);

    Selection.makeSelection(selection);
}

class SelectionModel {
    constructor() {
        this._selectionMode = "new";
        this._selectFrame = null;
        this._unlockedContainers = [];
        this._activeGroup = null;
        this.onElementSelected = EventHelper.createEvent();
        this.startSelectionFrameEvent = EventHelper.createEvent();
        this.onSelectionFrameEvent = EventHelper.createEvent();
        this.stopSelectionFrameEvent = EventHelper.createEvent();
        this.modeChangedEvent = EventHelper.createEvent();

        this._selectCompositeElement = new SelectComposite();

        this._directSelectionEnabled = false;
        this._invertDirectSelection = false;
    }

    get selectFrame() {
        return this._selectFrame;
    }

    invertDirectSelection(value) {
        if (arguments.length === 1) {
            this._invertDirectSelection = value;
        }
        return this._invertDirectSelection;
    }


    directSelectionEnabled(value) {
        if (arguments.length === 1) {
            var enabled = this._invertDirectSelection ? !value : value;
            if (enabled !== this._directSelectionEnabled){
                this._directSelectionEnabled = enabled;
                debug("Direct selection: %s", enabled);
                this.modeChangedEvent.raise(enabled);
            }
        }
        return this._directSelectionEnabled;
    }

    setupSelectFrame(selectFrame, eventData) {
        this._selectFrame = selectFrame;
        this.startSelectionFrameEvent.raise();
        this.makeSelection([]);
        this._selectFrame.init(eventData);
    }

    updateSelectFrame(eventData) {
        if (this.selectedElements.length){
            this.makeSelection([]);
        }
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

        var canSelect = false;
        for (var i = 0, j = selection.length; i < j; ++i) {
            var element = selection[i];
            if (element.canSelect() || element.selectFromLayersPanel) {
                this._selectCompositeElement.add(element, multiSelect, refreshOnly);
                canSelect = true;
            }
        }

        this.performArrange();

        this._selectCompositeElement.selected(false);
        if (canSelect) {
            this._selectCompositeElement.selected(true);
        }
    }

    performArrange(){
        this._selectCompositeElement.performArrange();
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

    makeSelection(selection, refreshOnly, doNotTrack) {
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
            this._fireOnElementSelected(currentSelection || [], doNotTrack);
        }
    }

    refreshSelection() {
        var selection = this.selectedElements();
        this.makeSelection([], true);
        this.makeSelection(selection, true);

        lockUnlockGroups.call(this, selection);
    }

    reselect(){
        var selection = this.selectedElements();
        this.makeSelection([], true);
        this.makeSelection(selection, false, true);
    }

    _fireOnElementSelected(oldSelection, doNotTrack) {
        lockUnlockGroups.call(this, this.selectedElements());
        this.onElementSelected.raise(this._selectCompositeElement, oldSelection, doNotTrack);
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
            this._fireOnElementSelected([]);
        }
    }

    clear() {
        this._selectCompositeElement.clear();

        // this.layer3.invalidate();
    }

    selectAll() {
        var page = App.Current.activePage;

        if (App.Current.currentTool === ViewTool.Artboard){
            this.makeSelection(page.getAllArtboards());
            return;
        }

        var artboard = page.getActiveArtboard();
        if (artboard){
            this.makeSelection(artboard.children);
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
    hide(){
        var elements = this.selectedElements();
        for (var i = 0; i < elements.length; i++){
            var e = elements[i];
            if (e.visible()){
                e.visible(false);
            }
        }
        this._selectCompositeElement.selected(false);
    }
    show(){
        var elements = this.selectedElements();
        for (var i = 0; i < elements.length; i++){
            var e = elements[i];
            if (!e.visible()){
                e.visible(true);
            }
        }
        this._selectCompositeElement.selected(false);
        this._selectCompositeElement.selected(true);
    }

    hideFrame(){
        this._selectCompositeElement.selected(false);
    }
}

var Selection = new SelectionModel();

export default Selection;