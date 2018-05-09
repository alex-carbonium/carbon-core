import EventHelper from "./EventHelper";
import SelectComposite from "./SelectComposite";
import { SelectFrame } from "./SelectFrame";
import UserSettings from "../UserSettings";
import Environment from "../environment";
import { ISelection, IEvent, IEvent2, IUIElement, IComposite, IEvent3, SelectionMode, KeyboardState, ISelectComposite, IRect, IView, IUIElementProps } from "carbon-core";
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

    this.makeSelection(selection);
}

export class SelectionModel implements ISelection {
    [name: string]: any;
    private _activeGroup: any;
    private _previousElements: IUIElement[] = ArrayPool.EmptyArray;
    private _selectionMode: SelectionMode = "new";
    private _selectCompositeElement: SelectComposite;
    private _propertyComposite: SelectComposite;
    private _selectFrame = new SelectFrame();
    private _selectFrameStarted = false;
    private view: IView;

    latestGlobalBoundingBox: IRect = Rect.Zero;
    modeChangedEvent: IEvent<boolean>;
    onElementSelected: IEvent3<ISelectComposite, IUIElement[], boolean>;
    propertiesRequested:IEvent<ISelectComposite>;

    constructor(view: IView) {
        this._unlockedContainers = ArrayPool.EmptyArray;
        this._activeGroup = null;
        this.onElementSelected = selectionImpl.onElementSelected;
        this.startSelectionFrameEvent = selectionImpl.startSelectionFrameEvent;
        this.onSelectionFrameEvent = selectionImpl.onSelectionFrameEvent;
        this.stopSelectionFrameEvent = selectionImpl.stopSelectionFrameEvent;
        this.modeChangedEvent = selectionImpl.modeChangedEvent;
        this.propertiesRequested = selectionImpl.propertiesRequested;
        this.view = view;

        this._selectCompositeElement = new SelectComposite(view);
        this._propertyComposite = new SelectComposite(view);

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
        this.selectFrame.parent.remove(this.selectFrame);
        this._selectFrameStarted = false;
        this.stopSelectionFrameEvent.raise();
        this._selectFrame.complete(eventData);
    }

    cancelSelectFrame() {
        this.selectFrame.parent.remove(this.selectFrame);
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

    requestProperties(elements: IUIElement[]) {
        this._propertyComposite.unregisterAll();
        this._propertyComposite.registerAll(elements);
        this.propertiesRequested.raise(this._propertyComposite);
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

    useInCode(value: boolean) {
        let elements = this.selectedElements();
        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];
            e.prepareAndSetProps({ useInCode: value })
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

    private calculateGlobalBoundingBox() {
        if (this.elements.length) {
            this.latestGlobalBoundingBox = UIElement.getCombinedBoundingBoxGlobal(this.elements);
        }
    }

    private onSelectionMade(doNotTrack = false) {
        lockUnlockGroups.call(this, this.selectedElements());
        this.calculateGlobalBoundingBox();

        this.onElementSelected.raise(this._selectCompositeElement, this._previousElements, doNotTrack);

        this._propertyComposite.unregisterAll();
        this.propertiesRequested.raise(this._selectCompositeElement);
    }

    private unselectAll(refreshOnly = false) {
        if (!refreshOnly) {
            this._previousElements = this.elements;
        }

        let count = this._selectCompositeElement.count();
        this._selectCompositeElement.unregisterAll();
        return count !== 0;
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

let currentSelection;

export function setSelection(selection) {
    currentSelection = selection;
}

const EmptyComposite = new SelectComposite(null);

class SelectionImpl implements ISelection {
    [any: string]: any;
    constructor() {
        this.onElementSelected = EventHelper.createEvent3<ISelectComposite, IUIElement[], boolean>();
        this.startSelectionFrameEvent = EventHelper.createEvent();
        this.onSelectionFrameEvent = EventHelper.createEvent();
        this.stopSelectionFrameEvent = EventHelper.createEvent();
        this.modeChangedEvent = EventHelper.createEvent();
    }
    get elements(): IUIElement[] {
        if (!currentSelection) {
            return [];
        }

        return currentSelection.elements;
    }
    get previousElements(): IUIElement[] {
        if (!currentSelection) {
            return [];
        }

        return currentSelection.previousElements;
    }
    get latestGlobalBoundingBox(): IRect {
        if (!currentSelection) {
            return Rect.Zero;
        }

        return currentSelection.latestGlobalBoundingBox;
    }

    get selectFrame() {
        if (!currentSelection) {
            return null;
        }

        return currentSelection.selectFrame;
    }

    makeSelection(elements: any[], mode?: SelectionMode, refreshOnly?, doNotTrack?) {
        if (currentSelection) {
            return currentSelection.makeSelection.apply(currentSelection, arguments);
        }
    }

    getSelectionMode(keys: KeyboardState, extended: boolean): SelectionMode {
        if (currentSelection) {
            return currentSelection.getSelectionMode.apply(currentSelection, arguments);
        }
    }
    requestProperties(elements: IUIElement[]) {
        if (currentSelection) {
            return currentSelection.requestProperties.apply(currentSelection, arguments);
        }
    }
    selectComposite(): SelectComposite {
        if (currentSelection) {
            return currentSelection.selectComposite();
        }

        return EmptyComposite;
    }
    clearSelection(doNotTrack?: boolean) {
        if (currentSelection) {
            return currentSelection.clearSelection(doNotTrack);
        }
    }
    get view() {
        if (currentSelection) {
            return currentSelection.view;
        }
    }
    refreshSelection(elements?: IUIElement[], raiseEvents?: boolean) {
        if (currentSelection) {
            return currentSelection.refreshSelection.apply(currentSelection, arguments);
        }
    }
    isElementSelected(element: IUIElement): boolean {
        if (currentSelection) {
            return currentSelection.isElementSelected.apply(currentSelection, arguments);
        }

        return false;
    }
    lock() {
        if (currentSelection) {
            return currentSelection.lock();
        }
    }
    unlock() {
        if (currentSelection) {
            return currentSelection.unlock();
        }
    }
    show() {
        if (currentSelection) {
            return currentSelection.show();
        }
    }
    hide() {
        if (currentSelection) {
            return currentSelection.hide();
        }
    }
    useInCode(value: boolean) {
        if (currentSelection) {
            return currentSelection.useInCode(value);
        }
    }

    invertDirectSelection(value) {
        if (currentSelection) {
            return currentSelection.invertDirectSelection.apply(currentSelection, arguments);
        }
    }


    directSelectionEnabled(value?: boolean) {
        if (currentSelection) {
            return currentSelection.directSelectionEnabled.apply(currentSelection, arguments);
        }
    }

    startSelectFrame(eventData) {
        if (currentSelection) {
            return currentSelection.startSelectFrame.apply(currentSelection, arguments);
        }
    }

    updateSelectFrame(eventData) {
        if (currentSelection) {
            return currentSelection.updateSelectFrame.apply(currentSelection, arguments);
        }
    }

    completeSelectFrame(eventData) {
        if (currentSelection) {
            return currentSelection.completeSelectFrame.apply(currentSelection, arguments);
        }
    }

    cancelSelectFrame() {
        if (currentSelection) {
            return currentSelection.cancelSelectFrame.apply(currentSelection, arguments);
        }
    }

    areSelected(elements: IUIElement[]) {
        if (currentSelection) {
            return currentSelection.areSelected.apply(currentSelection, arguments);
        }
    }

    isOnlyElementSelected(el) {
        if (currentSelection) {
            return currentSelection.isOnlyElementSelected.apply(currentSelection, arguments);
        }
    }

    count() {
        if (currentSelection) {
            return currentSelection.count.apply(currentSelection, arguments);
        }
    }

    selectedElement() {
        if (currentSelection) {
            return currentSelection.selectedElement.apply(currentSelection, arguments);
        }
    }

    getSelection(): IUIElement[] {
        if (currentSelection) {
            return currentSelection.getSelection.apply(currentSelection, arguments);
        }
    }

    selectedElements() {
        if (currentSelection) {
            return currentSelection.selectedElements.apply(currentSelection, arguments);
        }
    }

    reselect(selection: IUIElement[] = this.selectedElements()) {
        if (currentSelection) {
            return currentSelection.reselect.apply(currentSelection, arguments);
        }
    }

    clear() {
        if (currentSelection) {
            return currentSelection.clear.apply(currentSelection, arguments);
        }
    }

    selectAll() {
        if (currentSelection) {
            return currentSelection.selectAll.apply(currentSelection, arguments);
        }
    }

    hasSelectionFrame() {
        if (currentSelection) {
            return currentSelection.hasSelectionFrame.apply(currentSelection, arguments);
        }
    }

    hideFrame(permanent = false) {
        if (currentSelection) {
            return currentSelection.hideFrame.apply(currentSelection, arguments);
        }
    }

    showFrame() {
        if (currentSelection) {
            return currentSelection.showFrame.apply(currentSelection, arguments);
        }
    }

    modeChangedEvent: IEvent<boolean>;
    onElementSelected: IEvent3<ISelectComposite, IUIElement[], boolean>;
    propertiesRequested = EventHelper.createEvent<ISelectComposite>();
}

// selection now make sense only in the context of a view, so add this temporary wrapper until
// global usage of Selection is not removed
const selectionImpl = new SelectionImpl();
export const Selection = selectionImpl;
export default Selection;