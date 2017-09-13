import { IUIElement, IMatrix, IRect, LayoutProps, ChangeMode } from "carbon-core";

type PropsSnapshot = {[id: string]: LayoutProps};

export default class TransformationHelper {
    static getPropSnapshot(elements: IUIElement[]): PropsSnapshot {
        var snapshot = {};
        for (var e of elements) {
            snapshot[e.id()] = e.selectLayoutProps();
        }

        return snapshot;
    }

    static applyPropSnapshot(elements: IUIElement[], snapshot: PropsSnapshot, mode: ChangeMode) {
        for (var e of elements) {
            let props = snapshot[e.id()];
            if (props) {
                e.setProps(props, mode);
            }
        }
    }

    static moveBetweenSnapshots(elements: IUIElement[], oldSnapshot: PropsSnapshot, newSnapshot: PropsSnapshot) {
        TransformationHelper.applyPropSnapshot(elements, oldSnapshot, ChangeMode.Self);
        for (let i = 0; i < elements.length; ++i){
            let element = elements[i];
            element.performArrange({oldRect: newSnapshot[element.id()].br}, ChangeMode.Self);
        }

        TransformationHelper.applyPropSnapshot(elements, newSnapshot, ChangeMode.Model);
        for (let i = 0; i < elements.length; ++i){
            let element = elements[i];
            element.performArrange({oldRect: oldSnapshot[element.id()].br}, ChangeMode.Model);
        }
    }
}