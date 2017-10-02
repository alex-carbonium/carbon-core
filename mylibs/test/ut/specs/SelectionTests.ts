import TestUtil, { createArtboard, createElement } from "../TestUtil";
import { assert } from "chai";
import { IApp, IUIElement, UIElement, workspace, Selection } from "carbon-core";

describe("Selection tests", function () {
    let app: IApp = null;

    beforeEach(function (done) {
        app = TestUtil.setupApp();
        app.onLoad(function () {
            return done();
        });
    });
    afterEach(function () {
        app.dispose();
    });

    it("Must not select artboards together with other elements", function () {
        // arrange
        let artboard = app.activePage.getActiveArtboard();
        let element = new UIElement();

        app.activePage.add(element);

        // act
        Selection.makeSelection([element, artboard]);

        // assert
        assert.equal(Selection.elements.length, 1);
        assert.strictEqual(Selection.elements[0], artboard);
        assert.equal(workspace.controller.currentTool, "artboardTool");
    });

    it("Must not select artboards together with other elements (add to selection)", function () {
        // arrange
        let artboard = app.activePage.getActiveArtboard();
        let element = new UIElement();

        app.activePage.add(element);

        // act
        Selection.makeSelection([element]);
        Selection.makeSelection([artboard], "add");

        // assert
        assert.equal(Selection.elements.length, 1);
        assert.strictEqual(Selection.elements[0], artboard);
    });
});