// import UIElement from "framework/UIElement";
// import Container from "framework/Container";
// import CommandManager from "framework/commands/CommandManager";
// import {ArrangeStrategies, DockStyle, Overflow} from "framework/Defs";
// import Anchor from "framework/Anchor";
// import TestUtil from "../../Util";

// describe("Relayout engine arrange tests", function () {
//     beforeEach(function (done) {
//         this.app = TestUtil.setupApp();
//         this.app.onLoad(function () {
//             return done();
//         });
//         this.runCommands = function (commands) {
//             var command = new CompositeCommand(commands);
//             CommandManager.execute(command);
//         }
//     });
//     afterEach(function () {
//         this.app.dispose();
//     });

//     describe("Insert scenarios", function () {
//         it("Should arrange container when new element is inserted", function () {
//             //arrange
//             var container1 = new Container();
//             var element = new UIElement();

//             this.app.activePage.getActiveArtboard().add(container1, true);

//             container1.setProps({
//                 id: "container1",
//                 arrangeStrategy: ArrangeStrategies.Canvas,
//                 overflow: Overflow.ExpandBoth
//             });
//             element.setProps({
//                 id: "element"
//             });

//             //act
//             container1.add(element);
//             element.setProps({height: 20});
//             this.app.relayout();

//             //assert
//             assert.equal(container1.height(), 20, 'Container not auto resized');
//         });
//         it("Should arrange container when new container with content is inserted", function () {
//             //arrange
//             var container1 = new Container();
//             var container2 = new Container();
//             var element = new UIElement();

//             container1.setProps({
//                 id: "container1",
//                 arrangeStrategy: ArrangeStrategies.Canvas,
//                 overflow: Overflow.ExpandBoth
//             });
//             container2.setProps({
//                 id: "container2",
//                 arrangeStrategy: ArrangeStrategies.Canvas,
//                 overflow: Overflow.ExpandBoth
//             });
//             element.setProps({
//                 id: "element"
//             });

//             this.app.activePage.add(container1);

//             //act
//             container1.add(container2)
//             container2.add(element);
//             element.setProps({height: 20});
//             this.app.relayout();

//             //assert
//             assert.equal(container1.height(), 20, 'Container not auto resized');
//         });

//         it("Should auto-resize containers when element is moved from one to another", function () {
//             //arrange
//             var container1 = new Container();
//             var container2 = new Container();
//             var elements = [];

//             container1.setProps({
//                 id: "container1",
//                 arrangeStrategy: ArrangeStrategies.Dock,
//                 overflow: Overflow.AdjustBoth
//             });
//             container2.setProps({
//                 id: "container2",
//                 arrangeStrategy: ArrangeStrategies.Dock,
//                 overflow: Overflow.AdjustBoth
//             });

//             for (var i = 0; i < 5; ++i) {
//                 var element = new UIElement();
//                 element.setProps({
//                     id: "element" + (i + 1),
//                     dockStyle: DockStyle.Top,
//                     height: 10
//                 });
//                 elements.push(element);
//             }

//             this.app.activePage.add(container1);
//             this.app.activePage.add(container2);

//             container1.add(elements[0]);
//             container1.add(elements[1]);

//             container2.add(elements[2]);
//             container2.add(elements[3]);
//             container2.add(elements[4]);

//             //act
//             this.app.relayout();

//             //assert
//             assert.equal(container1.height(), 20, 'New parent not auto-resized');
//             assert.equal(container2.height(), 30, 'Old parent not auto-resized');
//         });
//     });

//     describe("Parent-children resize scenarios", function () {
//         it("Should respect anchor when resizing canvas", function () {
//             //arrange
//             var container1 = new Container();
//             var element = new UIElement();

//             container1.setProps({
//                 id: "container1",
//                 arrangeStrategy: ArrangeStrategies.Canvas,
//                 width: 100
//             });
//             element.setProps({
//                 id: "element",
//                 anchor: Anchor.createFromObject({left: false, right: true}),
//                 x: 90,
//                 width: 10
//             });

//             this.app.activePage.add(container1);
//             container1.add(element);

//             //act
//             container1.setProps({width: 200});
//             this.app.relayout();

//             //assert
//             assert.equal(element.x(), 190, 'Element not moved');
//         });

//         it("Should respect element changes after canvas arrange", function () {
//             //arrange
//             var container1 = new Container();
//             var element = new UIElement();

//             container1.setProps({
//                 id: "container1",
//                 arrangeStrategy: ArrangeStrategies.Canvas,
//                 width: 100
//             });
//             element.setProps({
//                 id: "element",
//                 anchor: Anchor.createFromObject({left: false, right: true}),
//                 x: 40,
//                 width: 20
//             });

//             this.app.activePage.add(container1);
//             container1.add(element);

//             container1.setProps({width: 100});
//             this.app.relayout();

//             //act
//             container1.setProps({width: 200});
//             this.app.relayout();

//             element.setProps({x: 10});
//             this.app.relayout();

//             //assert
//             assert.equal(element.x(), 10, 'Element changes after arrange are lost');
//         });

//         it("Should synchronize position of canvas children", function () {
//             //arrange
//             var container1 = new Container();
//             var element = new UIElement();

//             container1.setProps({
//                 id: "container1",
//                 arrangeStrategy: ArrangeStrategies.Canvas,
//                 width: 100
//             });
//             element.setProps({
//                 id: "element",
//                 anchor: Anchor.createFromObject({left: false, right: true}),
//                 x: 40,
//                 width: 20
//             });

//             this.app.activePage.add(container1);
//             container1.add(element);

//             container1.setProps({width: 100});
//             this.app.relayout();

//             var savepoint = this.app.createSavePoint();

//             //act
//             container1.setProps({width: 200});
//             this.app.relayout();

//             element.setProps({x: 10});
//             this.app.relayout();

//             //simulate external changes
//             this.app.replayFromSavePoint(savepoint);

//             //assert
//             assert.equal(this.app.activePage.getElementById(element.id).x(), 10, 'Element changes after arrange are lost');
//         });

//         it("Should restore auto-sized canvas", function () {
//             //arrange
//             var container1 = new Container();
//             var element = new UIElement();

//             container1.setProps({
//                 id: "container1",
//                 arrangeStrategy: ArrangeStrategies.Canvas,
//                 overflow: Overflow.AdjustBoth,
//                 width: 100
//             });
//             element.setProps({
//                 id: "element",
//                 width: 20
//             });

//             this.app.activePage.add(container1);
//             container1.add(element);

//             var savepoint = this.app.createSavePoint();

//             //act
//             element.setProps({width: 200});
//             this.app.relayout();

//             //simulate external changes
//             this.app.replayFromSavePoint(savepoint);
//             this.app.relayout();

//             //assert
//             assert.equal(this.app.activePage.getElementById(container1.id).width(), 200, 'Resized width is lost');
//         });
//         it("Should restore shifted canvas children", function () {
//             //arrange
//             var container1 = new Container();
//             var element1 = new UIElement();
//             var element2 = new UIElement();

//             container1.setProps({
//                 id: "container1",
//                 arrangeStrategy: ArrangeStrategies.Canvas,
//                 overflow: Overflow.AdjustBoth,
//                 width: 100
//             });
//             element1.setProps({
//                 id: "element1",
//                 x: 0,
//                 width: 20
//             });
//             element2.setProps({
//                 id: "element2",
//                 x: 50
//             });

//             this.app.activePage.add(container1);
//             container1.add(element1);
//             container1.add(element2);

//             var savepoint = this.app.createSavePoint();

//             //act
//             element1.setProps({x: -10});
//             this.app.relayout();

//             //simulate external changes
//             this.app.replayFromSavePoint(savepoint);
//             this.app.relayout();

//             //assert
//             assert.equal(this.app.activePage.getElementById(element1.id).x(), 0, 'Shift for element1 is lost');
//             assert.equal(this.app.activePage.getElementById(element2.id).x(), 60, 'Shift for element2 is lost');
//         });
//     });
// });