import RepeatContainer from "./RepeatContainer";
import RepeatCell from "./RepeatCell";
import Selection from "framework/SelectionModel";
import {combineRects} from "math/math";
import Rect from "math/rect";
import GroupContainer from "framework/GroupContainer";

export default {
    run: function(elements) {
        if(elements.length !== 1) {
            return;
        }

        let container = elements[0];
        let parent = container.parent();
        let items = container.children;
        let index = container.index();
        let allChildren = [];
        let numX = container.getNumX();
        let numY = container.getNumY();

        for (let y = 0; y < numY; ++y){
            for (let x = 0; x < numX; ++x){
                let e = items[y * numX + x];
                if(e.children.length === 1) {
                    var gm = e.children[0].globalViewMatrix();
                    e = e.children[0].clone();
                    App.Current.activePage.nameProvider.assignNewName(e);
                } else {
                    var group = new GroupContainer();
                    App.Current.activePage.nameProvider.assignNewName(group);
                    group.setProps({m:e.props.m, br:e.props.br});
                    e.children.forEach(c=>{
                        var clone = c.clone();
                        App.Current.activePage.nameProvider.assignNewName(clone);
                        group.add(clone);
                    });
                    var gm = e.globalViewMatrix();
                    e = group;
                }
                
                parent.insert(e, index);
                e.setTransform(parent.globalViewMatrixInverted().appended(gm));      
                allChildren.push(e);          
            }
        }

        parent.remove(container);
        Selection.makeSelection(allChildren);
    }
}