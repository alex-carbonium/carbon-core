import TestUtil from "../TestUtil";
import { IApp, IArtboard, model, IGroupContainer, Selection, Brush } from "carbon-core";
import { dragElementOnElement } from "../Interactions";
import { assert } from "chai";

describe("Dragging tests", function () {
    let app: IApp = null;
    let artboard: IArtboard = null;

    beforeEach(function (done) {
        app = TestUtil.setupApp();
        app.onLoad(function () {
            artboard = app.activePage.getActiveArtboard();
            return done();
        });
    });
    afterEach(function () {
        app.dispose();
    });

    it("Can drop copy into group", function () {
        // arrange
        let rect1 = model.createRectangle({ width: 100, height: 100 });
        rect1.translate(200, 200);

        let rect2 = model.createRectangle({ width: 100, height: 100 });
        rect2.translate(400, 400);

        artboard.add(rect1);
        artboard.add(rect2);

        Selection.makeSelection([rect1, rect2]);
        app.actionManager.invoke("group");

        let group = artboard.children[0] as IGroupContainer;

        let rect3 = model.createRectangle({ width: 50, height: 50 }, { fill: Brush.createFromColor("red") });
        rect3.translate(1000, 1000);
        artboard.add(rect3);

        // act
        dragElementOnElement(rect3, group, { ctrlKey: true, altKey: true });

        // assert
        assert.equal(artboard.children.length, 2, "Group and other element must still remain");
        assert.equal(group.children.length, 3, "Copied element must be in the group");

        let clone = group.children[2];
        assert.equal(clone.fill.value, "red", "Clone must be top element");

        assert.deepEqual(rect3.getBoundingBoxGlobal(), { x: 1000, y: 1000, width: 50, height: 50 }, "Original element must keep position");
    });

    it("Can drop image into shape", function () {
        // arrange
        let oval = model.createOval({ width: 100, height: 100 });
        oval.translate(200, 200);

        let image = model.createImage({ width: 400, height: 400 });
        image.translate(1000, 1000);

        artboard.add(oval);
        artboard.add(image);

        // act
        dragElementOnElement(image, oval, { ctrlKey: true });

        // assert
        assert.equal(artboard.children.length, 1);

        let group = artboard.children[0] as IGroupContainer;
        assert.strictEqual(group.children[0], oval, "Shape myst be first");
        assert.strictEqual(group.children[1], image, "Image must be second");

        assert.isTrue(oval.props.clipMask, "Shape must be clip mask");

        assert.deepEqual(oval.getBoundingBoxGlobal(), { x: 200, y: 200, width: 100, height: 100 }, "Wrong shape dimensions");
        assert.deepEqual(image.getBoundingBoxGlobal(), { x: 200, y: 200, width: 100, height: 100 }, "Wrong image dimensions");
    });
});