import Selection from "framework/SelectionModel";
import { unionRect } from "../math/geometry";
import Rect from "../math/rect";
import Matrix from "../math/matrix";

export default {
    run: function (elements, containerType, props?, setPosition?) {
        var sorted = elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        var element = elements[0];
        var parent = element.parent();
        var group = new containerType();
        let childrenTranslationMatrix = null;

        if (setPosition) {
            let box = sorted[0].getBoundingBox();
            for (let i = 0, l = sorted.length; i < l; ++i) {
                let element = sorted[i];
                box = unionRect(box, sorted[i].getBoundingBox());
            }
            props = props || {};
            props.br = new Rect(0, 0, box.width, box.height);
            props.m = Matrix.create().translate(box.x, box.y);
            childrenTranslationMatrix = props.m.inverted();
        }

        if (props) {
            group.prepareAndSetProps(props);
        }

        App.Current.activePage.nameProvider.assignNewName(group);
        parent.insert(group, parent.children.indexOf(sorted[sorted.length - 1]));

        for (let i = 0, l = sorted.length; i < l; ++i) {
            let element = sorted[i];
            group.insert(element, i);
            if (childrenTranslationMatrix) {
                element.applyTransform(childrenTranslationMatrix, false);
            }
        }

        group.performArrange();
        Selection.makeSelection([group]);

        return group;
    }
}
