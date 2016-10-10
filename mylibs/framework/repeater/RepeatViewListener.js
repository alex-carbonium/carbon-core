var attached = false;
import Invalidate from "framework/Invalidate";

export default {
    ensureSubscribed: function(controller){
        if (!attached){
            controller.resizingEvent.bind(updateLayer0);
            controller.rotatingEvent.bind(updateLayer0);
            controller.draggingEvent.bind(updateLayer0);
            attached = true;
        }
    }
}

function updateLayer0(e){
    if (e.element.runtimeProps.repeatNext){
        Invalidate.request(0);
    }
}