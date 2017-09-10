export default class TransformationHelper {
    static getPropSnapshot(elements) {
        var snapshot = {};
        for (var e of elements) {
            snapshot[e.id()] = extend({}, e.selectLayoutProps());
        }

        return snapshot;
    }

    static applyPropSnapshot(elements, snapshot, mode) {
        for (var e of elements) {
            let props = snapshot[e.id()];
            if (props) {
                e.setProps(props, mode);
            }
        }
    }
}