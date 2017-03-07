// import UIElement from "framework/UIElement";
// import TestUtil from "../Util";
// import ContextStub from "../ContextStub";
// import Artboard from "framework/Artboard";
// import ArtboardTemplateControl from "framework/ArtboardTemplateControl";
// import CompositeCommand from "framework/commands/CompositeCommand";
// import CommandManager from "framework/commands/CommandManager";
// import Environment from "environment";

// describe("ATControl tests", function () {

//     beforeEach(function (done) {
//         this.app = TestUtil.setupApp();
//         this.app.loaded.then(function () {
//             return done();
//         });
//         this.runCommands = function (commands) {
//             var command = new CompositeCommand(commands);
//             CommandManager.execute(command);
//         }


//         var that = this;
//         this.createArtboard = function () {
//             var artboard = new Artboard();
//             artboard.setProps({width: 200, height: 100, name: "template"});
//             this.app.activePage.add(artboard);
//             return artboard;
//         }
//     });
//     afterEach(function () {
//         this.app.dispose();
//     });

//     describe("Initialized from artboard", function () {
//         it("Get size from the artboard", function () {

//             // arrange
//             var atc = new ArtboardTemplateControl();
//             var artboard = this.createArtboard();
//             // act
//             atc.setProps({artboardId: artboard.id()});

//             // assert
//             assert.equal(atc.width(), artboard.width());
//             assert.equal(atc.height(), artboard.height());
//         })

//         it("Anchors work in the control", function () {
//             // arrange
//             var atc = new ArtboardTemplateControl();
//             this.app.activePage.getActiveArtboard().add(atc);

//             var artboard = this.createArtboard();
//             var child = new UIElement();
//             artboard.setProps({allowHorizontalResize: true, allowVerticalResize: true});
//             child.setProps({
//                 width: 10, height: 20, anchor: {
//                     left: true,
//                     top: true,
//                     right: true,
//                     bottom: true
//                 }
//             });
//             artboard.add(child);

//             // act
//             atc.setProps({artboardId: artboard.id(), width:200, height:100});
//             this.app.relayout();
//             atc.setProps({width: atc.width() * 2, height: atc.height() * 2})
//             this.app.relayout();
//             atc.draw(new ContextStub());

//             // assert
//             assert.equal(210, atc.innerChildren()[0].width());
//             assert.equal(120, atc.innerChildren()[0].height());
//         })
//     })


// })