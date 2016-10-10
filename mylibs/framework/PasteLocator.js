import Page from "./Page";
import Selection from "./SelectionModel";
import Environment from "../environment";
import {intersectRects} from "../math/math";

export function choosePasteLocation(elements, bufferRect, bufferRectLocal){
    //candidates: selected element and all its parents || artboard
    //1. same position - must be visible on screen and on candidate
    //2. center of visible candidate area
    //3. center of viewport

    var tolerance = bufferRect.width * bufferRect.height * .5;

    var viewport = Environment.view.viewportRect();
    var artboard = Environment.view.page.getActiveArtboard();

    var candidates = [];
    var selection = Selection.selectedElements();
    if (bufferRect && selection.length === 1){
        var current = selection[0];
        do{
            if (current.canAccept(elements[0])){
                candidates.push(current);
            }
            current = current.parent();
        } while (current && !(current instanceof Page));
    }
    else{
        candidates.push(artboard);
    }

    for (var i = 0; i < candidates.length; i++){
        var result = tryPaste(viewport, candidates[i], bufferRect, bufferRectLocal, tolerance);
        if (result){
            return result;
        }
    }
    return {
        parent: Environment.view.page,
        x: viewport.x + viewport.width/2 - bufferRect.width/2,
        y: viewport.y + viewport.height/2 - bufferRect.height/2
    };
}
function tryPaste(viewport, parent, bufferRect, bufferRectLocal, tolerance){
    var rect = parent.getBoundaryRectGlobal();
    var visibleRect = intersectRects(viewport, rect);
    if (visibleRect !== null){
        if (bufferRectLocal){
            let translated = parent.local2global(bufferRectLocal);
            var intersection = intersectRects(visibleRect, {x: translated.x, y: translated.y, width: bufferRectLocal.width, height: bufferRectLocal.height});
            if (intersection !== null && intersection.width * intersection.height > tolerance){
                return {
                    parent: parent,
                    x: bufferRectLocal.x,
                    y: bufferRectLocal.y
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
            let local = parent.global2local(visibleRect);
            return {
                parent: parent,
                x: local.x + visibleRect.width/2 - bufferRect.width/2,
                y: local.y + visibleRect.height/2 - bufferRect.height/2
            }
        }
    }
    return null;
}