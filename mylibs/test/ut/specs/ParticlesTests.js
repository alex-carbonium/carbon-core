// import UIElement from "framework/UIElement";
// import {ChangeMode} from "framework/Defs";
// import TestUtil from "../../Util";

// describe("Particles tests", function () {
//     beforeEach(function (done) {
//         this.app = TestUtil.setupApp();
//         this.app.relayout();
//         this.app.loaded.then(() => done());
//     });
//     afterEach(function () {
//         this.app.dispose();
//     });

//     it("Set props rollback recorded", function () {
//         //arrange
//         var element = new UIElement();
//         this.app.activePage.add(element, true);

//         element.setProps({width: 1, height: 2}, ChangeMode.Root);
//         var origWidth = element.width();
//         var origHeight = element.height();

//         element.setProps({width: 100, height: 200});
//         this.app.relayout();

//         this.app.actionManager.invoke("undo");
//         this.app.relayout();

//         assert.equal(element.width(), origWidth, "old width");
//         assert.equal(element.height(), origHeight, "old height");

//         this.app.actionManager.invoke("redo");
//         this.app.relayout();

//         assert.equal(element.width(), 100, "new width");
//         assert.equal(element.height(), 200, "new height");
//     });

//     it("New element rollback recorded", function () {
//         //arrange
//         var element = new UIElement();
//         this.app.activePage.add(element);
//         this.app.relayout();
//         var id = element.id();

//         this.app.actionManager.invoke("undo");
//         this.app.relayout();

//         assert.equal(null, this.app.activePage.getElementById(id), "element");

//         this.app.actionManager.invoke("redo");
//         this.app.relayout();

//         assert.notEqual(null, this.app.activePage.getElementById(id), "new element");
//     });

//     it("Change parent rollback recorded", function () {
//         //arrange
//         var element = new UIElement();
//         this.app.activePage.add(element);
//         var artboard = this.app.activePage.getActiveArtboard();
//         this.app.activePage.remove(element);
//         artboard.add(element);
//         this.app.relayout();
//         var id = element.id();

//         this.app.actionManager.invoke("undo");
//         this.app.relayout();

//         assert.equal(null, this.app.activePage.getElementById(id), "element");

//         this.app.actionManager.invoke("redo");
//         this.app.relayout();

//         var e = this.app.activePage.getElementById(id);
//         assert.equal(artboard.id(), e.parent().id(), "parent");
//     });
// });


