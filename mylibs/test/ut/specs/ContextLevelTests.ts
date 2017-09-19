import TestUtil, { createArtboard, createElement } from "../TestUtil";
import { assert } from "chai";
import Artboard from "../../../framework/Artboard";
import UIElement from "../../../framework/UIElement";
import Selection from "../../../framework/SelectionModel";
import { IApp, IUIElement } from "carbon-core";

describe("Context level tests", function () {
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

    it("Must place selected elements on next level", function () {
        // arrange
        let artboard = app.activePage.getActiveArtboard();

        let element1 = new UIElement();
        let element2 = new UIElement();

        artboard.add(element1);
        artboard.add(element2);

        // act
        Selection.makeSelection([element2]);

        // assert
        assert.deepEqual(mapLevels([artboard, element1, element2]), [1, 1, 2]);
    });

    it("Must place higher elements on next level", function () {
        // arrange
        let artboard = app.activePage.getActiveArtboard();

        let element1 = new UIElement();
        let element2 = new UIElement();

        artboard.add(element1);
        artboard.add(element2);

        // act
        Selection.makeSelection([element1]);

        // assert
        assert.deepEqual(mapLevels([artboard, element1, element2]), [1, 2, 4]);
    });

    it("Must place elements between selected together with selection", function () {
        // arrange
        let artboard = app.activePage.getActiveArtboard();

        let element1 = new UIElement();
        let element2 = new UIElement();
        let element3 = new UIElement();
        let element4 = new UIElement();

        artboard.add(element1);
        artboard.add(element2);
        artboard.add(element3);
        artboard.add(element4);

        // act
        Selection.makeSelection([element1, element3]);

        // assert
        assert.deepEqual(mapLevels([artboard, element1, element2, element3, element4]), [1, 2, 2, 2, 4]);
    });

    it("Must place artboards lower than elements on other artboards", function () {
        // arrange
        let artboard1 = new Artboard();
        let artboard2 = new Artboard();

        let element1 = new UIElement();
        let element2 = new UIElement();

        artboard1.add(element1);
        artboard2.add(element2);

        app.activePage.add(artboard1);
        app.activePage.add(artboard2);

        // act
        Selection.makeSelection([element1]);

        // assert
        assert.deepEqual(mapLevels([artboard1, artboard2, element1, element2]), [1, 1, 2, 1]);
    });

    it("Must place artboards lower than elements on other artboards (opposite)", function () {
        // arrange
        let artboard1 = new Artboard();
        let artboard2 = new Artboard();

        let element1 = new UIElement();
        let element2 = new UIElement();

        artboard1.add(element1);
        artboard2.add(element2);

        app.activePage.add(artboard1);
        app.activePage.add(artboard2);

        // act
        Selection.makeSelection([element2]);

        // assert
        assert.deepEqual(mapLevels([artboard1, artboard2, element1, element2]), [1, 1, 1, 2]);
    });

    it("Must place artboards elements on the same level as artboard", function () {
        // arrange
        let artboard = app.activePage.getActiveArtboard();
        let element = new UIElement();

        artboard.add(element);

        // act
        Selection.makeSelection([artboard]);

        // assert
        assert.deepEqual(mapLevels([artboard, element]), [2, 2]);
    });

    it("Must place selected artboards lower than page elements", function () {
        // arrange
        let artboard1 = app.activePage.getActiveArtboard();
        let artboard2 = createArtboard("artboard2");

        let element1 = createElement("element1");
        let element2 = createElement("element2");

        app.activePage.add(artboard2);
        app.activePage.add(element1);
        app.activePage.add(element2);

        // act
        Selection.makeSelection([artboard2]);

        // assert
        assert.deepEqual(mapLevels([artboard1, artboard2, element1, element2]), [1, 2, 4, 4]);
    });

    it("Must place selected artboards lower than page elements (active artboard in the middle)", function () {
        // arrange
        let artboard1 = app.activePage.getActiveArtboard();
        let artboard2 = createArtboard("artboard2");
        let artboard3 = createArtboard("artboard3");

        let element1 = createElement("element1");
        let element2 = createElement("element2");

        app.activePage.add(artboard2);
        app.activePage.add(artboard3);
        app.activePage.add(element1);
        app.activePage.add(element2);

        // act
        Selection.makeSelection([artboard2]);

        // assert
        assert.deepEqual(mapLevels([artboard1, artboard2, artboard3, element1, element2]), [1, 2, 1, 4, 4]);
    });

    function mapLevels(elements: IUIElement[]) {
        return elements.map(x => x.runtimeProps.ctxl);
    }
});