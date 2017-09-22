import PropertyMetadata, { PropertyDescriptor } from "./PropertyMetadata";
import UIElement from "./UIElement";
import Environment from "../environment";
import PropertyTracker from "./PropertyTracker";
import { leaveCommonProps } from "../util";
import { ChangeMode, PatchType } from "carbon-core";
import Font from "./Font";
import Shadow from "./Shadow";
import ArrayPool from "./ArrayPool";

export default class CommonPropsManager {
    private _origPropValues: any[] = [];
    private _affectingLayout: boolean = false;
    private _inPreview: boolean = false;

    private _nextTickTimer = 0;
    private _nextTickProps = null;
    private _propsChangedCallback: (mergedProps: any) => void = null;

    createGroups(elements: UIElement[]) {
        if (elements.length === 0) {
            return [];
        }

        var baseElement = elements[0];
        let baseMetadata = baseElement.propertyMetadata();
        let baseGroups = baseMetadata.groups(baseElement);
        for (var i = 1; i < elements.length; i++) {
            var other = elements[i];
            for (var j = 0; j < baseGroups.length; j++) {
                var group = baseGroups[j];
                for (var k = group.properties.length - 1; k >= 0; --k) {
                    var propertyName = group.properties[k];
                    var descriptor1 = baseElement.findPropertyDescriptor(propertyName);
                    var descriptor2 = other.findPropertyDescriptor(propertyName);
                    if (!descriptor1 || !descriptor2 || descriptor1.type !== descriptor2.type) {
                        group.properties.splice(k, 1);
                    }
                }
            }
        }

        return baseGroups;
    }

    getDisplayPropValue(elements: UIElement[], propertyName: string, descriptor: PropertyDescriptor) {
        if (elements.length === 1) {
            return elements[0].getDisplayPropValue(propertyName, descriptor);
        }

        var values = elements.map(x => x.getDisplayPropValue(propertyName, descriptor));
        let base = values[0];

        if (propertyName === "shadows") {
            for (let i = 1; i < values.length; ++i) {
                let next = values[i];
                if (next.length !== base.length) {
                    return ArrayPool.EmptyArray;
                }
                for (let j = 0; j < next.length; ++j){
                    if (!Shadow.areEqual(base[j], next[j])) {
                        return ArrayPool.EmptyArray;
                    }
                }
            }
            return base;
        }

        for (let i = 1; i < values.length; ++i) {
            let next = values[i];
            let isComplex = next && typeof next === "object" || Array.isArray(next);
            if (isComplex) {
                base = clone(base);
                leaveCommonProps(base, next);
            }
            else if (next !== base) {
                base = undefined;
                break;
            }
        }

        return base;
    }

    prepareDisplayPropsVisibility(elements: UIElement[], containerType: string) {
        if (elements.length === 0) {
            return {};
        }

        var type = this.allHaveSameType(elements) ?
            elements[0].systemType() :
            containerType;

        var metadata = PropertyMetadata.findAll(type);
        if (!metadata || !metadata.prepareVisibility) {
            return {};
        }

        var base = metadata.prepareVisibility(elements[0]);
        for (let i = 1; i < elements.length; ++i) {
            let element = elements[i];
            let next = metadata.prepareVisibility(element);
            if (next) {
                for (let p in next) {
                    let visible = next[p];
                    if (!visible) {
                        base[p] = false;
                    }
                }
            }
        }
        return base;
    }

    getAffectedDisplayProperties(elements: UIElement[], changes): string[]{
        if (elements.length === 1){
            return elements[0].getAffectedDisplayProperties(changes);
        }
        var result = [];
        for (let i = 0; i < elements.length; ++i){
            let element = elements[i];
            var properties = element.getAffectedDisplayProperties(changes);
            for (let j = 0; j < properties.length; ++j){
                let p = properties[j];
                if (result.indexOf(p) === -1){
                    result.push(p);
                }
            }
        }

        return result;
    }

    previewDisplayProps(elements: UIElement[], changes: any): boolean {
        if (!this._inPreview) {
            if (!this._affectingLayout && this.isChangeAffectingLayout(elements, changes)) {
                this._affectingLayout = true;
            }

            PropertyTracker.suspend();
        }
        this._inPreview = true;

        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            var elementChanges = this.prepareElementChanges(element, changes);
            if (!this._origPropValues[i]) {
                var properties = element.getAffectedProperties(changes);
                this._origPropValues[i] = element.selectProps(properties);
            }
            element.setDisplayProps(elementChanges, ChangeMode.Root);
        }

        return this._affectingLayout;
    }

    updateDisplayProps(elements: UIElement[], changes: any) {
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];

            var elementChanges = this.prepareElementChanges(element, changes);

            if (this._origPropValues.length) {
                var origProps = this._origPropValues[i];
                element.prepareAndSetProps(origProps, ChangeMode.Root);
            }
            element.setDisplayProps(elementChanges, ChangeMode.Model);
        }

        if (this._inPreview) {
            if (PropertyTracker.resume()) {
                PropertyTracker.flush();
            }
        }

        this._origPropValues.length = 0;
        this._affectingLayout = false;
        this._inPreview = false;
    }

    previewPatchProps(elements: UIElement[], propertyName: string, patchType: PatchType, value: any) {
        for (var i = 0; i < elements.length; i++){
            var element = elements[i];
            if (!this._origPropValues[i]){
                this._origPropValues[i] = {[propertyName]:element.props[propertyName]};
            }

            element.patchProps(patchType, propertyName, value, ChangeMode.Root);
        }

        this._inPreview = true;
    }

    patchProps(elements: UIElement[], propertyName: string, patchType: PatchType, value: any) {
        for (var i = 0; i < elements.length; i++){
            var element = elements[i];
            //element.props might be changed by preview, but the command should have original values as oldProps
            if (this._origPropValues && this._origPropValues.length) {
                var origProps = this._origPropValues[i];
                Object.assign(element.props, origProps);
            }
            element.patchProps(patchType, propertyName, value, ChangeMode.Model);
        }

        if (this._inPreview) {
            if (PropertyTracker.resume()) {
                PropertyTracker.flush();
            }
        }

        this._origPropValues.length = 0;
        this._inPreview = false;
    }

    onChildPropsChanged(newProps: any, callback: (mergedProps: any) => void){
        if (!this._nextTickProps) {
            this._nextTickProps = {};
        }

        this._nextTickProps = Object.assign(this._nextTickProps, newProps);

        if (this._nextTickTimer) {
            clearTimeout(this._nextTickTimer);
            this._nextTickTimer = 0;
        }
        this._propsChangedCallback = callback;
        this._nextTickTimer = setTimeout(this.onPropsChangedNextTick, 1);
    }

    private onPropsChangedNextTick = () => {
        var newProps = this._nextTickProps;
        this._nextTickProps = null;
        this._propsChangedCallback(newProps);
    }

    private prepareElementChanges(element: UIElement, changes: any) {
        var elementChanges = Object.assign({}, changes);
        for (var p in elementChanges) {
            if (p === 'font') {
                elementChanges[p] = Font.extend(element.props[p], elementChanges[p])
            }
        }
        return elementChanges;
    }

    private isChangeAffectingLayout(elements: UIElement[], changes: any){
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (element.isChangeAffectingLayout(changes)){
                return true;
            }
        }
        return false;
    }

    private matchingPropertyExists(metadata1, metadata2, propertyName): boolean {
        var propertyMetadata1 = metadata1[propertyName];
        if (!propertyMetadata1) {
            return false;
        }
        var propertyMetadata2 = metadata2[propertyName];
        if (!propertyMetadata2) {
            return false;
        }

        return propertyMetadata1.type === propertyMetadata2.type;
    }

    private allHaveSameType(elements: UIElement[]): boolean {
        var type = elements[0].systemType();
        for (var i = 1; i < elements.length; i++) {
            if (elements[i].systemType() !== type) {
                return false;
            }
        }

        return true;
    }
}