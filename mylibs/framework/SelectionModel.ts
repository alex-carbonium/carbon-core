import EventHelper from "./EventHelper";
import SelectComposite from "./SelectComposite";
import Invalidate from "./Invalidate";
import { ViewTool } from "./Defs";
import UserSettings from "../UserSettings";
import Environment from "../environment";
import { ISelection, IEvent, IEvent2, IUIElement, IComposite, IEvent3 } from "carbon-core";

let debug = require("DebugUtil")("carb:selection");

function lockUnlockGroups(newSelectedElements) {
    let newUnlocked = [];
    let invalidate = false;

    //unlock parents
    for (let i = 0; i < newSelectedElements.length; i++) {
        let el = newSelectedElements[i].parent();
        while (el && el.unlockGroup) {
            let unlocked = this._unlockedContainers.indexOf(el) !== -1;
            if (!unlocked) {
                unlocked = el.unlockGroup();
                invalidate = true;
            }
            if (unlocked) {
                newUnlocked.push(el);
            }

            el = el.parent();
        }
    }

    //activate self if single element is selected
    if (this._activeGroup) {
        this._activeGroup.activeGroup(false);
        this._activeGroup = null;
    }

    //lock anything which is not selected anymore
    for (let i = 0; i < this._unlockedContainers.length; i++) {
        let c = this._unlockedContainers[i];
        if (c.lockGroup && newUnlocked.indexOf(c) === -1) {
            c.lockGroup();
            invalidate = true;
        }
    }
    this._unlockedContainers = newUnlocked;

    if (newSelectedElements.length === 1 && newSelectedElements[0].activeGroup) {
        newSelectedElements[0].activeGroup(!UserSettings.group.editInIsolationMode);
        this._activeGroup = newSelectedElements[0];
    }

    if (invalidate) {
        Invalidate.request();
    }
}
function onselect(rect) {
    let selection = App.Current.activePage.getElementsInRect(rect);

    Selection.makeSelection(selection);
}

class SelectionModel implements ISelection {
    [name: string]: any;
    private _activeGroup: any;

    modeChangedEvent: IEvent<boolean>;
    onElementSelected: IEvent3<IUIElement, IUIElement[], boolean>;

    constructor() {
        this._selectionMode = "new";
        this._selectFrame = null;
        this._unlockedContainers = [];
        this._activeGroup = null;
        this.onElementSelected = EventHelper.createEvent3<IUIElement, IUIElement[], boolean>();
        this.startSelectionFrameEvent = EventHelper.createEvent();
        this.onSelectionFrameEvent = EventHelper.createEvent();
        this.stopSelectionFrameEvent = EventHelper.createEvent();
        this.modeChangedEvent = EventHelper.createEvent();

        this._selectCompositeElement = new SelectComposite();

        this._directSelectionEnabled = false;
        this._invertDirectSelection = false;
    }

    get elements(): IUIElement[]{
        return this._selectCompositeElement.elements;
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


    directSelectionEnabled(value?: boolean) {
        if (arguments.length === 1) {
            let enabled = this._invertDirectSelection ? !value : value;
            if (enabled !== this._directSelectionEnabled) {
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
        if (this.selectedElements.length) {
            this.makeSelection([]);
        }
        let rect = this._selectFrame.update(eventData);
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
            if (value !== "new" && value !== "add" && value !== "remove" && value !== 'add_or_replace') {
                throw { name: "ArgumentException", message: "Incorrect selection mode specified" };
            }
            this._selectionMode = value;
        }
        return this._selectionMode;
    }

    addToSelection(/*Array*/elements:IUIElement[], refreshOnly:boolean) {
        let multiSelect = elements.length > 1;
        let selection = this._decomposeSelection(elements);

        let canSelect = false;
        for (let i = 0, j = selection.length; i < j; ++i) {
            let element = selection[i];
            if (element.canSelect() || element.runtimeProps.selectFromLayersPanel) {
                this._selectCompositeElement.register(element, multiSelect, refreshOnly);
                canSelect = true;
            }
        }

        this.performArrange();

        this._selectCompositeElement.selected(false);
        if (canSelect) {
            this._selectCompositeElement.selected(true);
        }
    }

    performArrange() {
        this._selectCompositeElement.performArrange();
    }

    getSelection() : IUIElement[] {
        let selectedElement = this.selectedElement();
        if (!selectedElement) {
            return null;
        }
        return this._decomposeSelection([selectedElement]);
    }

    _decomposeSelection(selection) : IUIElement[] {
        if (!selection) {
            return [];
        }

        let newSelection = selection;

        if (selection.length === 1) {
            let selectedElement = selection[0];

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

    makeSelection(selection, refreshOnly = false, doNotTrack = false) {
        let currentSelection = this._selectCompositeElement.elements;

        let newSelection = this._decomposeSelection(selection);
        if (this.areSameArrays(currentSelection, newSelection)) {
            return;
        }

        if (this._selectionMode === "add_or_replace") {
            if (!this.intersectArrays(currentSelection, newSelection)) {
                this.unselectAll(refreshOnly);
                currentSelection = [];
            }
            this._selectionMode = "add";
        }


        if (!selection || selection.length === 0) {
            this.unselectAll(refreshOnly);
        }
        else if (this._selectionMode === "add") {
            let alreadyAdded = false;
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
            this.removeGroupFromArray(currentSelection, newSelection);
            this.addToSelection(currentSelection, refreshOnly);
        }

        if (!refreshOnly) {
            this._selectCompositeElement.ensureSorted();
            this._fireOnElementSelected(currentSelection || [], doNotTrack);
        }
    }

    refreshSelection() {
        let selection = this.selectedElements();
        this.makeSelection([], true);
        this.makeSelection(selection, true);

        lockUnlockGroups.call(this, selection);
    }

    reselect() {
        let selection = this.selectedElements();
        this.makeSelection([], true);
        this.makeSelection(selection, false, true);
    }

    _fireOnElementSelected(oldSelection, doNotTrack = false) {
        lockUnlockGroups.call(this, this.selectedElements());
        this.onElementSelected.raise(this._selectCompositeElement, oldSelection, doNotTrack);
    }

    unselectAll(refreshOnly = false) {
        this._selectCompositeElement.selected(false);
        let count = this._selectCompositeElement.count();
        this._selectCompositeElement.unregisterAll(refreshOnly);
        return count !== 0;
    }

    unselectGroup(elements, refreshOnly) {
        this.unselectAll(refreshOnly);
        let currentSelection = this._selectCompositeElement.elements;
        this.removeGroupFromArray(currentSelection, elements);
        this.addToSelection(currentSelection, refreshOnly);
    }

    clearSelection() {
        if (this.unselectAll()) {
            this._fireOnElementSelected([]);
        }
    }

    clear() {
        this._selectCompositeElement.unregisterAll();

        // this.interactionLayer.invalidate();
    }

    selectAll() {
        let page = App.Current.activePage;

        if (App.Current.currentTool === ViewTool.Artboard) {
            this.makeSelection(page.getAllArtboards());
            return;
        }

        if (Environment.view.isolationLayer.isActive){
            this.makeSelection(Environment.view.isolationLayer.children);
            return;
        }

        let artboard = page.getActiveArtboard();
        if (artboard) {
            this.makeSelection(artboard.children);
            return;
        }

        let v = Number.MAX_SAFE_INTEGER / 2;
        onselect.call(this, { x: -v, y: -v, width: Number.MAX_SAFE_INTEGER, height: Number.MAX_SAFE_INTEGER });
    }

    hasSelectionFrame() {
        return !!this._selectFrame;
    }

    lock() {
        let elements = this.selectedElements();
        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];
            if (!e.locked()) {
                e.locked(true);
            }
        }
        this._selectCompositeElement.selected(false);
    }
    unlock() {
        let elements = this.selectedElements();
        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];
            if (e.locked()) {
                e.locked(false);
            }
        }
        this._selectCompositeElement.selected(false);
        this._selectCompositeElement.selected(true);
    }
    hide() {
        let elements = this.selectedElements();
        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];
            if (e.visible()) {
                e.visible(false);
            }
        }
        this._selectCompositeElement.selected(false);
    }
    show() {
        let elements = this.selectedElements();
        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];
            if (!e.visible()) {
                e.visible(true);
            }
        }
        this._selectCompositeElement.selected(false);
        this._selectCompositeElement.selected(true);
    }

    hideFrame() {
        this._selectCompositeElement.selected(false);
    }

    private removeGroupFromArray(array, group){
        for(let i = 0; i < group.length; ++i){
            let idx = array.indexOf(group[i]);
            if(idx !== -1) {
                array.splice(idx, 1);
            }
        }
    }

    private areSameArrays(array1, array2){
        if (!array1 || !array2){
            return false;
        }
        if (array1.length !== array2.length){
            return false;
        }
        for (let i = 0, j = array1.length; i < j; ++i) {
            if(array1[i] !== array2[i]){
                return false;
            }
        }
        return true;
    }

    private intersectArrays(array1, array2){
        for(let i = 0; i < array2.length; ++i){
            if(array1.indexOf(array2[i]) === -1){
                return false;
            }
        }

        return true;
    }
}

let Selection = new SelectionModel();

export default Selection;