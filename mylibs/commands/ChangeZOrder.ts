
export default class ChangeZOrder {
    static run(selection, mode) {
        if (!selection || selection.length === 0) {
            return;
        }

        var allChildren = selection[0].parent().children;
        var max = allChildren.length - 1;
        var min = 0;

        switch (mode) {
            case "front":
                selection.forEach(e => e.parent().changePosition(e, max));
                break;
            case "back":
                selection.forEach(e => e.parent().changePosition(e, min));
                break;
            case "forward":
                selection.forEach(e => {
                    var newPos = allChildren.indexOf(e) + 1;
                    if (newPos > max) {
                        newPos = max;
                    }
                    e.parent().changePosition(e, newPos);
                });
                break;
            case "backward":
                selection.forEach(e => {
                    var newPos = allChildren.indexOf(e) - 1;
                    if (newPos < min) {
                        newPos = min;
                    }
                    e.parent().changePosition(e, newPos);
                });
                break;
        }
        App.Current.mapElementsToLayerMask();
    }
}