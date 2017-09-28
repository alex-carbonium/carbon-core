import Artboard from "../framework/Artboard";
import Page from "../framework/Page";
import { IApp, IUIElement } from "carbon-core";

export default class ChangeZOrder {
    static run(app: IApp, selection: IUIElement[], mode) {
        if (!selection || selection.length === 0) {
            return;
        }

        switch (mode) {
            case "front":
                selection.forEach(e => {
                    let max = e.parent().children.length;
                    e.parent().changePosition(e, max)
                });
                break;
            case "back":
                selection.forEach(e => {
                    let min = ChangeZOrder.findMinIndex(e);
                    e.parent().changePosition(e, min);
                });
                break;
            case "forward":
                selection.forEach(e => {
                    let max = e.parent().children.length;
                    var newPos = e.parent().children.indexOf(e) + 1;
                    if (newPos > max) {
                        newPos = max;
                    }
                    e.parent().changePosition(e, newPos);
                });
                break;
            case "backward":
                selection.forEach(e => {
                    let min = ChangeZOrder.findMinIndex(e);
                    var newPos = e.parent().children.indexOf(e) - 1;
                    if (newPos < min) {
                        newPos = min;
                    }
                    e.parent().changePosition(e, newPos);
                });
                break;
        }
        app.mapElementsToLayerMask();
    }

    private static findMinIndex(e: IUIElement) {
        let parent = e.parent();
        if (parent instanceof Page) {
            for (let i = parent.children.length - 1; i >= 0; --i) {
                let child = parent.children[i];
                if (child instanceof Artboard) {
                    return i + 1;
                }
            }
        }
        return 0;
    }
}