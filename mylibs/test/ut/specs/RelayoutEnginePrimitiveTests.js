// import UIElement from "framework/UIElement";
// import Container from "framework/Container";
// import CompositeCommand from "framework/commands/CompositeCommand";
// import CommandManager from "framework/commands/CommandManager";
// import TestUtil from "../../Util";

// describe("Relayout engine primitive tests", function(){
//     beforeEach(function(done){
//         this.app = TestUtil.setupApp();
//         this.app.loaded.then(function () {
//             return done();
//         });
//         this.runCommands = function(commands){
//             var command = new CompositeCommand(commands);
//             CommandManager.execute(command);
//         }
//     });
//     afterEach(function(){
//         this.app.dispose();
//     });

//     describe("Primitive processing", function(){
//         it("Should find child primitives after inserting", function(){
//             //arrange
//             var container1 = new Container();
//             var element = new UIElement();

//             container1.id("container1");
//             element.id("element");

//             this.app.activePage.add(container1);

//             //act
//             container1.add(element);
//             element.setProps({opacity: 0});

//             this.app.relayout();

//             //assert
//             assert.equal(container1.children.length, 1, 'Element not inserted');
//             assert.equal(container1.children[0].opacity(), 0, 'Boson is lost for an element');
//         });

//         it("Should find child primitives after changing parent up", function(){
//             //arrange
//             var container1 = new Container();
//             var container2 = new Container();
//             var element = new UIElement();

//             container1.id("container1");
//             container2.id("container2");
//             element.id("element");

//             this.app.activePage.add(container1);
//             container1.add(container2);
//             container2.add(element);

//             //act
//             this.runCommands([
//                 element.constructMoveCommand(container1),
//                 element.constructPropsChangedCommand({opacity: 0})
//             ]);
//             this.app.relayout();

//             //assert
//             assert.equal(container1.getElementById(element.id()).opacity(), 0, 'Primitive is lost for an element');
//         });

//         it("Should find child primitives after changing parent down", function(){
//             //arrange
//             var container1 = new Container();
//             var container2 = new Container();
//             var element = new UIElement();

//             container1.id("container1");
//             container2.id("container2");
//             element.id("element");

//             this.app.activePage.add(container1);
//             container1.add(container2);
//             container1.add(element);

//             //act
//             this.runCommands([
//                 element.constructMoveCommand(container2),
//                 element.constructPropsChangedCommand({opacity: 0})
//             ]);
//             this.app.relayout();

//             //assert
//             assert.equal(container2.getElementById(element.id()).opacity(), 0, 'Primitive is lost for an element');
//         });

//         it("Should find child primitives after changing parent from left subtree to right subtree", function(){
//             //arrange
//             var container1 = new Container();
//             var container2 = new Container();
//             var element = new UIElement();

//             container1.id("container1");
//             container2.id("container2");
//             element.id("element");

//             this.app.activePage.add(container1);
//             this.app.activePage.add(container2);
//             container1.add(element);

//             //act
//             this.runCommands([
//                 element.constructMoveCommand(container2),
//                 element.constructPropsChangedCommand({opacity: 0})
//             ]);
//             this.app.relayout();

//             //assert
//             assert.equal(container2.getElementById(element.id()).opacity(), 0, 'Primitive is lost for an element');
//         });

//         it("Should find child primitives after changing parent from right subtree to left subtree", function(){
//             //arrange
//             var container1 = new Container();
//             var container2 = new Container();
//             var element = new UIElement();

//             container1.id("container1");
//             container2.id("container2");
//             element.id("element");

//             this.app.activePage.add(container1);
//             this.app.activePage.add(container2);
//             container2.add(element);

//             //act
//             this.runCommands([
//                 element.constructMoveCommand(container1),
//                 element.constructPropsChangedCommand({opacity: 0})
//             ]);
//             this.app.relayout();

//             //assert
//             assert.equal(container1.getElementById(element.id()).opacity(), 0, 'Primitive is lost for an element');
//         });

//         it("Should be able to move element from self to container in self", function(){
//             //arrange
//             var container1 = new Container();
//             var container2 = new Container();
//             var element = new UIElement();

//             container1.id("container1");
//             container2.id("container2");
//             element.id("element");

//             this.app.activePage.add(container1);
//             container1.add(element);
//             container1.add(container2);

//             //act
//             this.runCommands([
//                 element.constructMoveCommand(container2),
//             ]);
//             this.app.relayout();

//             //assert
//             assert.equal(container1.children.length, 1, 'Element not removed from previous parent');
//             assert.equal(container2.children.length, 1, 'Element not moved to new parent');
//         });

//         it("Should be able to change parent up twice", function(){
//             //arrange
//             var container1 = new Container();
//             var container2 = new Container();
//             var container3 = new Container();
//             var element = new UIElement();

//             container1.id("container1");
//             container2.id("container2");
//             container3.id("container3");
//             element.id("element");

//             this.app.activePage.add(container1);
//             container1.add(container2);
//             container2.add(container3);
//             container3.add(element);

//             //act
//             container3.remove(element);
//             container2.add(element);
//             container2.remove(element);
//             container1.add(element);

//             this.app.relayout();
//             // this.app.actionManager.invoke('undo');
//             // this.app.actionManager.invoke('redo');

//             //assert
//             assert.equal(container1.children.length, 2, 'Container1 must contain new element and container2');
//             assert.isTrue(container1.children.some(x => x.id() === element.id()), 'Element not moved to correct parent');

//             assert.equal(container2.children.length, 1, 'Container2 must contain container3 only');
//             assert.equal(container3.children.length, 0, 'Container3 must be empty');
//         });

//         it("Should be able to change parent down twice", function(){
//             //arrange
//             var container1 = new Container();
//             var container2 = new Container();
//             var container3 = new Container();
//             var element = new UIElement();

//             container1.id("container1");
//             container2.id("container2");
//             container3.id("container3");
//             element.id("element");

//             this.app.activePage.add(container1);
//             container1.add(container2);
//             container1.add(element);
//             container2.add(container3);

//             //act

//             container1.remove(element);
//             container2.add(element);
//             container2.remove(element);
//             container3.add(element);

//             this.app.relayout();
//             // this.app.actionManager.invoke('undo');
//             // this.app.actionManager.invoke('redo');

//             //assert
//             assert.equal(container1.children.length, 1, 'Container1 must contain container2 only');
//             assert.equal(container2.children.length, 1, 'Container2 must contain container3 only');
//             assert.equal(container3.children.length, 1, 'Container3 must contain new element');
//             assert.isTrue(container3.children.some(x => x.id() === element.id()), 'Element not moved to correct parent');
//         });
//     });
// });