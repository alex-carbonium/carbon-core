import Page from "./Page";
import Selection from "./SelectionModel";
import Container from "./Container";
import { intersectRects, combineRectArray } from "../math/math";
import { IContainer } from "carbon-model";

export function choosePasteLocation(view, elements, rootRelativeBoundingBox = null, allowMoveIn = false): {parent: IContainer, x: number, y: number}{
    //candidates: selected element and all its parents || artboard
    //1. same position - must be visible on screen and on candidate
    //2. center of visible candidate area
    //3. center of viewport

    var bufferRect = combineRectArray(elements.map(x => x.getBoundingBox()));
    var tolerance = allowMoveIn ? 0 : bufferRect.width * bufferRect.height * .5;

    var viewport = view.viewportRect();
    var fallbackParent: IContainer = view.isolationLayer.isActive ?
        view.isolationLayer :
        view.page.getActiveArtboard();

    if (!fallbackParent) {
        fallbackParent = view.page;
    }

    var candidates = [];
    var selection = Selection.selectedElements();
    if (bufferRect){
        if (selection.length === 1){
            var current:any = selection[0];
            var allowMoveInCurrent = allowMoveIn;
            do{
                if (current.canAccept(elements, false, allowMoveInCurrent)){
                    candidates.push(current);
                }
                current = current.parent;
                allowMoveInCurrent = true;
            } while (current);
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
        parent: view.page as IContainer,
        x: viewport.x + viewport.width/2 - bufferRect.width/2,
        y: viewport.y + viewport.height/2 - bufferRect.height/2
    };
}
function tryPaste(viewport, parent, bufferRect, rootRelativeBoundingBox, tolerance): {parent: IContainer, x: number, y: number}{
    var visibleRect = null;
    if (parent instanceof Page){
        visibleRect = viewport;
    }
    else {
        var rect = parent.getBoundingBoxGlobal();
        visibleRect = intersectRects(viewport, rect);
    }
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
        if (intersection){
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