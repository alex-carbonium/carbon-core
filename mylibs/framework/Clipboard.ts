import UIElement from "./UIElement";
import Selection from "./SelectionModel";
import Text from "./text/Text";
import Image from "./Image";
import {combineRectArray} from "../math/math";
import Rect from "../math/rect";
import Matrix from "../math/matrix";
import {choosePasteLocation} from "./PasteLocator";
import {setClipboardContent, tryGetClipboardContent} from "../utils/dom";
import Delete from "../commands/Delete";
import params from "../params";
import Shape from "./Shape";
import backend from "../backend";
import { IApp, IMatrix, IView, IController } from "carbon-core";
import { Origin } from "carbon-geometry";
import { IUIElement } from "carbon-model";

class Clipboard {
    [name: string]: any;
    _app: IApp;
    _view: IView;
    _controller:IController;
    globalBoundingBoxes: Rect[];
    rootBoundingBoxes: Rect[];
    globalMatrices: IMatrix[];
    isCutting = false;

    constructor(){
        this._htmlElement = null;
        this._app = null;
        this.buffer = null;
        this.globalBoundingBoxes = null;
        this.globalMatrices = null;
        this.rootBoundingBoxes = null;

        this.pastingContent = false;
    }
    attach(app, view, controller){
        this._app = app;
        this._view = view;
        this._controller = controller;
        if (this.testNativeSupport()){
            this._htmlElement = document;
            this._htmlElement.addEventListener("copy", this.onCopy);
            this._htmlElement.addEventListener("paste", this.onPaste);
            this._htmlElement.addEventListener("cut", this.onCut);
        }
    }
    hasValue(){
        return this.buffer !== null;
    }
    dispose(){
        if (this._htmlElement){
            this._htmlElement.removeEventListener("copy", this.onCopy);
            this._htmlElement.removeEventListener("paste", this.onPaste);
            this._htmlElement.removeEventListener("cut", this.onCut);
            this._htmlElement = null;
        }
    }

    onCopy=(e?) => {
        if (e && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")){
            return;
        }

        e && e.preventDefault();

        var controller = this._controller;
        if (e && controller.isInlineEditMode){
            var engine = controller.inlineEditor.engine;
            var selection = engine.getSelection();
            if (selection.end !== selection.start){
                var range = engine.getRange(selection.start, selection.end);
                setClipboardContent(e, "text/plain", range.plainText());
            }
            return;
        }

        var elements = Selection.selectedElements();
        if (elements.length){
            this.buffer = [];
            this.globalBoundingBoxes = [];
            this.globalMatrices = [];
            this.rootBoundingBoxes = [];
            this.zOrder = -1;
            this.originalParent = elements[0].parent;

            for (var i = 0; i < elements.length; i++){
                var element = elements[i];
                this.buffer.push(element.toJSON());
                this.globalBoundingBoxes.push(element.getBoundingBoxGlobal());
                this.globalMatrices.push(element.globalViewMatrix());
                this.rootBoundingBoxes.push(element.getBoundingBoxRelativeToRoot());
                var zOrder = element.zOrder();
                if (zOrder > this.zOrder){
                    this.zOrder = zOrder;
                }
            }

            this.isCutting = false;

            if (e){
                //clearing real clipboard does not work, so setting empty text
                setClipboardContent(e, "text/plain", "");
            }
        }
    };

    onPaste = (e?) => {
        if (e && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")){
            return;
        }

        let textData = null;
        let imageData = null;

        if (e){
            e.preventDefault();
            textData = tryGetClipboardContent(["text/plain", "text"], e);

            if (this._controller.isInlineEditMode){
                if (!textData){
                    this.buffer = null;
                    return;
                }

                var engine = this._controller.inlineEditor.engine;
                var selection = engine.getSelection();
                var range = engine.getRange(selection.start, selection.end);
                range.setText(textData);
                engine.select(selection.start + textData.length, selection.start + textData.length);

                this.buffer = null;
                return;
            }

            imageData = tryGetClipboardContent(["image/png", "image/jpeg", "image/jpg"], e);
        }

        var bufferElements: IUIElement[] = null;
        var globalBoundingBoxes = null;
        var globalMatrices = null;
        var rootBoundingBoxes = null;

        if (imageData) {
            let image = new Image();
            image.resizeOnLoad(Origin.Center);
            let br = new Rect(0, 0, Image.NewImageSize, Image.NewImageSize);
            image.boundaryRect(br);

            let reader = new FileReader();
            reader.onload = function(e) {
                backend.fileProxy.uploadUrl({content: this.result, name: imageData.lastModifiedDate.toLocaleString()})
                    .then(response => image.source(Image.createUrlSource(response.url)));
            };
            reader.readAsDataURL(imageData);

            bufferElements = [image];
            globalBoundingBoxes = [{x: 0, y: 0, width: br.width, height: br.height}];
            globalMatrices = [image.viewMatrix()];
        }
        else if (textData){
            let image = Image.tryCreateFromUrl(textData);
            if (image){
                image.resizeOnLoad(Origin.Center);
            }
            let newElement: IUIElement = image;
            if (newElement === null){
                newElement = new Text();
                newElement.prepareAndSetProps({
                    content: textData,
                    font: this._app.props.defaultTextSettings.font,
                    textStyleId: this._app.props.defaultTextSettings.textStyleId
                });
            }

            this._app.assignNewName(newElement);

            bufferElements = [newElement];
            globalBoundingBoxes = [{x: 0, y: 0, width: newElement.width, height: newElement.height}];
            globalMatrices = [newElement.viewMatrix()];
        }
        else if (this.buffer){
            bufferElements = this.buffer.map(x =>{
                var e = UIElement.fromJSON(x);
                e.initId();
                return e;
            });
            globalBoundingBoxes = this.globalBoundingBoxes;
            rootBoundingBoxes = this.rootBoundingBoxes;
            globalMatrices = this.globalMatrices;
        }

        if (bufferElements){
            var rootRelativeBoundingBox = rootBoundingBoxes && !this.isCutting ? combineRectArray(rootBoundingBoxes) : null;
            var globalBoundingBox = combineRectArray(globalBoundingBoxes);
            var location = choosePasteLocation(this._view, bufferElements, rootRelativeBoundingBox, this.pastingContent);
            if (location){
                Selection.clearSelection();
                for (var i = 0; i < bufferElements.length; i++){
                    var element = bufferElements[i];

                    if (location.parent === this.originalParent){
                        location.parent.insert(element, this.zOrder + 1);
                    }
                    else{
                        location.parent.add(element);
                    }

                    var gm = globalMatrices[i];
                    var bb = globalBoundingBoxes[i];
                    var offsetX = bb.x - globalBoundingBox.x;
                    var offsetY = bb.y - globalBoundingBox.y;
                    var newMatrix = gm.prependedWithTranslation(location.x - bb.x + offsetX, location.y - bb.y + offsetY);
                    element.setTransform(location.parent.globalMatrixToLocal(newMatrix));
                }

                var newSelection;
                if (this.pastingContent && location.parent.canSelect() && location.parent instanceof Shape){
                    newSelection = [location.parent];
                }
                else{
                    newSelection = bufferElements;
                }
                //cause a little blink if new element was added into the same position
                setTimeout(() => Selection.makeSelection(newSelection, "new", false, true), 50);
            }
        }

        this.pastingContent = false;
    };

    onCut = (e?) => {
        if (e && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")){
            return;
        }

        this.onCopy(e);

        if (this._controller.isInlineEditMode){
            var engine = this._controller.inlineEditor.engine;
            var selection = engine.getSelection();
            if (selection.end !== selection.start){
                var range = engine.getRange(selection.start, selection.end);
                range.clear();
                engine.select(selection.start, selection.start);
            }
        }
        else {
            Delete.run(Selection.selectedElements());
            this.isCutting = true;
        }
    };

    /** The only reliable check is to use known browser versions. This is how github does it. */
    testNativeSupport(){
        return (params.browser.name === "Chrome" && parseInt(params.browser.major) > 43)
            || (params.browser.name === "Firefox" && parseInt(params.browser.major) > 41);
    }
}

export default new Clipboard();