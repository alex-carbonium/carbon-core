import UIElement from "./UIElement";
import Selection from "./SelectionModel";
import Text from "./text/Text";
import Environment from "../environment";
import {combineRects} from "../math/math";
import {choosePasteLocation} from "./PasteLocator";
import {setClipboardContent, tryGetClipboardContent} from "../utils/dom";

class Clipboard {
    constructor(){
        this._htmlElement = null;
        this._app = null;
        this.buffer = null;
        this.globals = null;
        this.locals = null;

        this.pastingContent = false;
    }
    attach(app){
        this._app = app;

        if (this.testNativeSupport()){
            this._htmlElement = document;
            this._htmlElement.addEventListener("copy", this.onCopy);
            this._htmlElement.addEventListener("paste", this.onPaste);
        }
        else{
            //app.platform.registerClipboardShortcuts();
        }
    }
    hasValue(){
        return this.buffer !== null;
    }
    dispose(){
        if (this._htmlElement){
            this._htmlElement.removeEventListener("copy", this.onCopy);
            this._htmlElement.removeEventListener("paste", this.onPaste);
            this._htmlElement = null;
        }
    }

    onCopy=(e) => {
        if (e && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")){
            return;
        }

        e && e.preventDefault();

        if (e && Environment.controller.isInlineEditMode){
            var engine = Environment.controller.inlineEditor.engine;
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
            this.globals = [];
            this.locals = [];
            this.zOrder = -1;
            this.originalParent = elements[0].parent();

            for (var i = 0; i < elements.length; i++){
                var element = elements[i];
                this.buffer.push(element.toJSON());
                this.globals.push(element.getBoundaryRectGlobal());
                this.locals.push(element.getBoundaryRect());
                var zOrder = element.zOrder();
                if (zOrder > this.zOrder){
                    this.zOrder = zOrder;
                }
            }

            if (e){
                //clearing real clipboard does not work, so setting empty text
                setClipboardContent(e, "text/plain", "");
            }
        }
    };

    onPaste = (e) => {
        if (e && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")){
            return;
        }

        var textData = null;

        if (e){
            e.preventDefault();
            textData = tryGetClipboardContent(["text/plain", "text"], e);

            if (Environment.controller.isInlineEditMode){
                if (!textData){
                    this.buffer = null;
                    return;
                }

                var engine = Environment.controller.inlineEditor.engine;
                var selection = engine.getSelection();
                var range = engine.getRange(selection.start, selection.end);
                range.setText(textData);
                engine.select(selection.start + textData.length, selection.start + textData.length);

                this.buffer = null;
                return;
            }
        }

        var bufferElements = null;
        var globals = null;
        var locals = null;
        if (textData){
            var text = new Text();
            text.prepareAndSetProps({
                content: textData,
                font: this._app.props.defaultTextSettings.font,
                textStyleId: this._app.props.defaultTextSettings.textStyleId
            });
            bufferElements = [text];
            globals = [{x: 0, y: 0, width: text.width(), height: text.height()}];
        }
        else if (this.buffer){
            bufferElements = this.buffer.map(x =>{
                var e = UIElement.fromJSON(x);
                e.initId();
                return e;
            });
            globals = this.globals;
            locals = this.locals;
        }

        if (bufferElements){
            var bufferRect = combineRects.apply(null, globals);
            var bufferRectLocal = locals ? combineRects.apply(null, locals) : null;
            var location = choosePasteLocation(bufferElements, bufferRect, bufferRectLocal, this.pastingContent);
            if (location){
                Selection.makeSelection([]);
                for (var i = 0; i < bufferElements.length; i++){
                    var element = bufferElements[i];
                    element.prepareAndSetProps({
                        x: globals[i].x - bufferRect.x + location.x,
                        y: globals[i].y - bufferRect.y + location.y
                    });
                    if (location.parent === this.originalParent){
                        location.parent.insert(element, this.zOrder + 1);
                    }
                    else{
                        location.parent.add(element);
                    }
                }

                var newSelection;
                if (this.pastingContent && location.parent.canSelect()){
                    newSelection = [location.parent];
                }
                else{
                    newSelection = bufferElements;
                }
                //cause a little blink if new element was added into the same position
                setTimeout(() => Selection.makeSelection(newSelection), 50);
            }
        }

        this.pastingContent = false;
    };

    testNativeSupport(){
        return true;
    }
}

export default new Clipboard();