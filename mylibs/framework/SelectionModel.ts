import EventHelper from "./EventHelper";
import SelectComposite from "./SelectComposite";
import {SelectFrame} from "./SelectFrame";
import UserSettings from "../UserSettings";
import Environment from "../environment";
import { ISelection, IEvent, IEvent2, IUIElement, IComposite, IEvent3, SelectionMode, KeyboardState, ISelectComposite, IRect } from "carbon-core";
import Rect from "../math/rect";
import ArrayPool from "./ArrayPool";
import UIElement from "./UIElement";
import NullContainer from "./NullContainer";

let debug = require("DebugUtil")("carb:selection");

function lockUnlockGroups(newSelectedElements) {
    let newUnlocked = [];

    //unlock parents
    for (let i = 0; i < newSelectedElements.length; i++) {
        let el = newSelectedElements[i].parent;
        while (el && el.unlockGroup) {
            let unlocked = this._unlockedContainers.indexOf(el) !== -1;
            if (!unlocked) {
                unlocked = el.unlockGroup();
            }
            if (unlocked) {
                newUnlocked.push(el);
                el.invalidate();
            }

            el = el.parent;
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
            c.invalidate();
        }
    }
    this._unlockedContainers = newUnlocked;

    if (newSelectedElements.length === 1 && newSelectedElements[0].activeGroup) {
        newSelectedElements[0].activeGroup(!UserSettings.group.editInIsolationMode);
        this._activeGroup = newSelectedElements[0];
    }
}
function onselect(rect) {
    let selection = App.Current.activePage.getElementsInRect(rect);

    Selection.makeSelection(selection);
}

class SelectionModel implements ISelection {
    [name: string]: any;
    private _activeGroup: any;
    private _previousElements: IUIElement[] = ArrayPool.EmptyArray;
    private _selectionMode: SelectionMode = "new";
    private _selectCompositeElement: SelectComposite;
    private _propertyComposite = new SelectComposite();
    private _selectFrame = new SelectFrame();
    private _selectFrameStarted = false;

    latestGlobalBoundingBox: IRect = Rect.Zero;
    modeChangedEvent: IEvent<boolean>;
    onElementSelected: IEvent3<ISelectComposite, IUIElement[], boolean>;
    propertiesRequested = EventHelper.createEvent<ISelectComposite>();

    constructor() {
        this._unlockedContainers = ArrayPool.EmptyArray;
        this._activeGroup = null;
        this.onElementSelected = EventHelper.createEvent3<ISelectComposite, IUIElement[], boolean>();
        this.startSelectionFrameEvent = EventHelper.createEvent();
        this.onSelectionFrameEvent = EventHelper.createEvent();
        this.stopSelectionFrameEvent = EventHelper.createEvent();
        this.modeChangedEvent = EventHelper.createEvent();

        this._selectCompositeElement = new SelectComposite();

        this._directSelectionEnabled = false;
        this._invertDirectSelection = false;
    }

    get elements(): IUIElement[] {
        return this._selectCompositeElement.elements;
    }

    get previousElements(): IUIElement[] {
        return this._previousElements;
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

    startSelectFrame(eventData) {
        this._selectFrameStarted = true;
        this.startSelectionFrameEvent.raise();
        this._selectFrame.init(eventData);
    }

    updateSelectFrame(eventData) {
        let rect = this._selectFrame.update(eventData);
        this.onSelectionFrameEvent.raise(rect);
    }

    completeSelectFrame(eventData) {
        Selection.selectFrame.parent.remove(Selection.selectFrame);
        this._selectFrameStarted = false;
        this.stopSelectionFrameEvent.raise();
        this._selectFrame.complete(eventData);
    }

    cancelSelectFrame() {
        Selection.selectFrame.parent.remove(Selection.selectFrame);
        this._selectFrameStarted = false;
        this.stopSelectionFrameEvent.raise();
    }

    isElementSelected(el) {
        return this._selectCompositeElement.has(el);
    }

    areSelected(elements: IUIElement[]) {
        return elements.length && elements.every(x => this.isElementSelected(x));
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

    getSelection(): IUIElement[] {
        return this.elements;
    }

    selectedElements() {
        return this._selectCompositeElement.elements;
    }

    getSelectionMode(keys: KeyboardState, extended: boolean): SelectionMode {
        if (extended) {
            return keys.ctrlKey ? "add" : keys.shiftKey ? "toggle" : keys.altKey ? "remove" : "new";
        }
        return keys.shiftKey ? "toggle" : "new";
    }

    makeSelection(selection, mode: SelectionMode = "new", refreshOnly = false, doNotTrack = false) {
        let currentSelection = this._selectCompositeElement.elements;

        if (this.areSameArrays(currentSelection, selection) && (mode === "new" || mode === "add") && this._propertyComposite.count() === 0) {
            return;
        }

        if (selection.length === 0) {
            this.unselectAll(refreshOnly);
        }
        else {
            switch (mode) {
                case "new":
                    this.unselectAll(refreshOnly);
                    this._selectCompositeElement.registerAll(selection);
                    break;
                case "add":
                    this._selectCompositeElement.registerAll(selection);
                    break;
                case "toggle":
                    for (let i = 0, j = selection.length; i < j; ++i) {
                        let element = selection[i];
                        if (this.isElementSelected(element)) {
                            this._selectCompositeElement.unregister(element);
                        }
                        else {
                            this._selectCompositeElement.register(element);
                        }
                    }
                    break;
                case "remove":
                    for (let i = 0, j = selection.length; i < j; ++i) {
                        let element = selection[i];
                        if (this.isElementSelected(element)) {
                            this._selectCompositeElement.unregister(element);
                        }
                    }
                    break;
                default:
                    assertNever(mode);
            }
        }

        this._selectCompositeElement.performArrange();

        if (!refreshOnly) {
            this._selectCompositeElement.ensureSorted();
            this.onSelectionMade(doNotTrack);
        }
    }

    refreshSelection(elements?: IUIElement[], raiseEvents = false) {
        let selection = elements || this.selectedElements();
        this.makeSelection(ArrayPool.EmptyArray, "new", true);
        this.makeSelection(selection, "new", true);

        lockUnlockGroups.call(this, selection);
    }

    reselect(selection: IUIElement[] = this.selectedElements()) {
        this.makeSelection(ArrayPool.EmptyArray, "new", false, true);
        this.makeSelection(selection, "new", false, true);
    }

    private onSelectionMade(doNotTrack = false) {
        lockUnlockGroups.call(this, this.selectedElements());
        this.calculateGlobalBoundingBox();

        this.onElementSelected.raise(this._selectCompositeElement, this._previousElements, doNotTrack);

        this._propertyComposite.unregisterAll();
        this.propertiesRequested.raise(this._selectCompositeElement);
    }

    requestProperties(elements: IUIElement[]) {
        this._propertyComposite.unregisterAll();
        this._propertyComposite.registerAll(elements);
        this.propertiesRequested.raise(this._propertyComposite);
    }

    private calculateGlobalBoundingBox() {
        if (this.elements.length) {
            this.latestGlobalBoundingBox = UIElement.getCombinedBoundingBoxGlobal(this.elements);
        }
    }

    private unselectAll(refreshOnly = false) {
        if (!refreshOnly) {
            this._previousElements = this.elements;
        }

        let count = this._selectCompositeElement.count();
        this._selectCompositeElement.unregisterAll();
        return count !== 0;
    }

    clearSelection(doNotTrack: boolean = false) {
        if (this.unselectAll()) {
            this.onSelectionMade(doNotTrack);
        }
    }

    clear() {
        this._selectCompositeElement.unregisterAll();

        // this.interactionLayer.invalidate();
    }

    selectAll() {
        let page = App.Current.activePage;

        if (Environment.controller.currentTool === "artboardTool") {
            this.makeSelection(page.getAllArtboards());
            return;
        }

        if (Environment.view.isolationLayer && Environment.view.isolationLayer.isActive) {
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
        return this._selectFrameStarted;
    }

    useInCode(value:boolean) {
        let elements = this.selectedElements();
        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];
            e.prepareAndSetProps({useInCode:value})
        }
    }

    lock() {
        let elements = this.selectedElements();
        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];
            if (!e.locked()) {
                e.locked(true);
            }
        }
        this.clearSelection();
    }

    unlock() {
        let elements = this.selectedElements();
        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];
            if (e.locked()) {
                e.locked(false);
            }
        }
        this._selectCompositeElement.showActiveFrame();
    }
    hide() {
        let elements = this.selectedElements();
        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];
            if (e.visible) {
                e.visible = (false);
            }
        }
        this._selectCompositeElement.hideActiveFrame();
    }
    show() {
        let elements = this.selectedElements();
        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];
            if (!e.visible) {
                e.visible = (true);
            }
        }
        this._selectCompositeElement.showActiveFrame();
    }

    hideFrame(permanent = false) {
        this._selectCompositeElement.hideActiveFrame(permanent);
    }
    showFrame() {
        this._selectCompositeElement.showActiveFrame();
    }

    private areSameArrays(array1, array2) {
        if (array1.length !== array2.length) {
            return false;
        }
        for (let i = 0, j = array1.length; i < j; ++i) {
            if (array1[i] !== array2[i]) {
                return false;
            }
        }
        return true;
    }

    private intersectArrays(array1, array2) {
        for (let i = 0; i < array2.length; ++i) {
            if (array1.indexOf(array2[i]) === -1) {
                return false;
            }
        }

        return true;
    }
}

let Selection = new SelectionModel();

export default Selection;