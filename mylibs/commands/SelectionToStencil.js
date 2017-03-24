import Selection from "framework/SelectionModel";
import GroupContainer from "framework/GroupContainer";
import { ChangeMode, ArtboardResource } from "framework/Defs";
import { IUIElement, IContainer, IGroupContainer, IRect } from "carbon-core"
import Artboard from "framework/Artboard";
import Rect from "math/rect";
import Matrix from "math/matrix";
import ArtboardTemplateControl from "framework/ArtboardTemplateControl";
import Constraints from "framework/Constraints";

export default {
    run: function (elements: IUIElement[]) {
        var sorted: IUIElement[] = elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        var element: IUIElement = elements[0];
        var parent: IContainer = element.parent();
        var group: IGroupContainer = new GroupContainer();

        Selection.makeSelection([]);
        parent.add(group, ChangeMode.Self);

        for (let i = 0, l = sorted.length; i < l; ++i) {
            let element = sorted[i];
            group.insert(element.clone(), i);
        }
        group.performArrange();

        var boundingBox: IRect = group.getBoundingBoxGlobal();
        var globalMatrix = group.globalViewMatrixInverted();

        // create artboard of the same size
        var page = App.Current.activePage;
        var position = page.getNextAvailiablePosition(boundingBox.width, boundingBox.height);
        var matrix = new Matrix(1, 0, 0, 1, position.x, position.y);

        var artboard = new Artboard();
        page.add(artboard);

        artboard.setProps({
            br:new Rect(0,0, boundingBox.width, boundingBox.height),
            m: matrix,
            allowVerticalResize:true,
            allowHorizontalResize:true
        });
        App.Current.activePage.nameProvider.assignNewName(artboard);

        // find where to place artboard
        for (let i = 0, l = sorted.length; i < l; ++i) {
            let e = sorted[i];
            var vm = group.children[i].viewMatrix();
            e.setTransform(vm);
            e.setProps({
                constraints:Constraints.StretchAll
            });
            artboard.insert(e, i);
        }

        artboard.setProps({
            resource: ArtboardResource.Stencil
        });

        var artboardControl = new ArtboardTemplateControl();
        parent.add(artboardControl);
        artboardControl.setProps({
            br:group.props.br,
            m:group.props.m,
            source: {
                pageId:page.id(),
                artboardId:artboard.id()
            }
        });
        App.Current.activePage.nameProvider.assignNewName(artboardControl);

        parent.remove(group);

        Selection.makeSelection([artboardControl]);
    }
}
