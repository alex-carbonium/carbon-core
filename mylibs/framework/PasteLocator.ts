import Page from "./Page";
import Selection from "./SelectionModel";
import Container from "./Container";
import Environment from "../environment";
import { intersectRects, combineRectArray } from "../math/math";
import { IContainer } from "carbon-model";

export function choosePasteLocation(elements, rootRelativeBoundingBox = null, allowMoveIn = false): {parent: IContainer, x: number, y: number}{
    //candidates: selected element and all its parents || artboard
    //1. same position - must be visible on screen and on candidate
    //2. center of visible candidate area
    //3. center of viewport

    var bufferRect = combineRectArray(elements.map(x => x.getBoundingBox()));
    var tolerance = allowMoveIn ? 0 : bufferRect.width * bufferRect.height * .5;

    var viewport = Environment.view.viewportRect();
    var fallbackParent = Environment.view.isolationLayer.isActive ?
        Environment.view.isolationLayer :
        Environment.view.page.getActiveArtboard();

    var candidates = [];
    var selection = Selection.selectedElements();
    if (bufferRect){
        if (selection.length === 1){
            var current = selection[0];
            do{
                if (current.canAccept(elements, false, allowMoveIn)){
                    candidates.push(current);
                }
                current = current.parent();
            } while (current && !(current instanceof Page));
        }
        else if (selection.length > 1 && Selection.selectComposite().canAccept(elements, false, allowMoveIn)){
            candidates.push(Selection.selectComposite());
        }
    }

    if (candidates.indexOf(fallbackParent) === -1 && fallbackParent.canAccept(elements, false, allowMoveIn)) {
        candidates.push(fallbackParent);
    }

    for (var i = 0; i < candidates.length; i++){
        var result = tryPaste(viewport, candidates[i], bufferRect, rootRelativeBoundingBox, tolerance);
        if (result){
            return result;
        }
    }
    return {
        parent: Environment.view.page as IContainer,
        x: viewport.x + viewport.width/2 - bufferRect.width/2,
        y: viewport.y + viewport.height/2 - bufferRect.height/2
    };
}
function tryPaste(viewport, parent, bufferRect, rootRelativeBoundingBox, tolerance): {parent: IContainer, x: number, y: number}{
    var rect = parent.getBoundingBoxGlobal();
    var visibleRect = intersectRects(viewport, rect);
    if (visibleRect !== null){
        if (rootRelativeBoundingBox){
            let globalPos = parent.primitiveRoot().local2global(rootRelativeBoundingBox);
            var intersection = intersectRects(visibleRect, {x: globalPos.x, y: globalPos.y, width: rootRelativeBoundingBox.width, height: rootRelativeBoundingBox.height});
            if (intersection !== null && intersection.width * intersection.height > tolerance){
                return {
                    parent: parent as IContainer,
                    x: globalPos.x,
                    y: globalPos.y
                }
            }
        }

        let centerRect = {
            x: visibleRect.x + visibleRect.width/2 - bufferRect.width/2,
            y: visibleRect.y + visibleRect.height/2 - bufferRect.height/2,
            width: bufferRect.width,
            height: bufferRect.height
        };
        intersection = intersectRects(centerRect, visibleRect);
        if (intersection != null){
            intersection = intersectRects(intersection, viewport);
        }
        if (intersection !== null && intersection.width * intersection.height > tolerance){
            return {
                parent: parent as IContainer,
                x: visibleRect.x + visibleRect.width/2 - bufferRect.width/2,
                y: visibleRect.y + visibleRect.height/2 - bufferRect.height/2
            }
        }
    }
    return null;
}