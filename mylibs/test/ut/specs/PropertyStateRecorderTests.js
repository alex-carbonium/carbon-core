// import PropertyStateRecorder from "framework/PropertyStateRecorder";
// import UIElement from "framework/UIElement";
// import TestUtil from "../../Util";

// describe("Property state tests", function () {
//     beforeEach(function (done) {
//         this.app = TestUtil.setupApp();
//         this.app.loaded.then(function () {
//             return done();
//         });

//         var target = new UIElement();
//         var artboard = this.app.activePage.getActiveArtboard();
//         artboard.add(target);

//         this.target = target;
//         this.recorder = artboard.getRecorder();
//         this.relayout = ()=> {
//             this.app.relayout();
//         };

//         this.relayout();
//     });
//     afterEach(function () {
//         this.recorder.stop();
//         this.app.dispose();
//     });

//     it("Add state", function () {
//         //arrange
//         var target = this.target;
//         var recorder = this.recorder;

//         // act
//         recorder.addState("state1");
//         this.app.relayout();

//         // assert
//         var actual = recorder.getState('state1');
//         assert.notEqual(actual, null, 'State');
//     });

//     it("Remember default value", function () {
//         //arrange
//         var target = this.target;
//         var recorder = this.recorder;
//         recorder.addState("state1", "state1");

//         target.setProps({width: 10});
//         target.setProps({width: 10});

//         // act
//         recorder.trackSetProps("state1", target.id(), {width: 11}, {width: 10});
//         recorder.trackSetProps("state1", target.id(), {width: 12}, {width: 10});

//         // assert
//         var actual = recorder.getValue('default', target.id(), 'width');
//         assert.equal(actual, 10, 'Default value recorded');
//         actual = recorder.getValue('state1', target.id(), 'width');
//         assert.equal(actual, 12, 'State1 value recorded');
//     });

//     //api changed
//     // it("Test start recording", function () {
//     //     //arrange
//     //     var target = this.target;
//     //     var recorder = this.recorder;
//     //
//     //     recorder.addState('s1', 's1');
//     //     recorder.changeState('s1');
//     //     target.width(10);
//     //
//     //     // act
//     //     target.width(2);
//     //
//     //     // assert
//     //     var actual = recorder.getValue('s1', target.id(), 'width');
//     //     assert.equal(actual, null, 'Default value recorded');
//     //
//     //     recorder.record();
//     //     target.width(3);
//     //
//     //     var actual = recorder.getValue('s1', target.id(), 'width');
//     //     assert.equal(actual, 3, 'Default value recorded');
//     // });

//     //api changed
//     // it("must stop recording after after call the stop method", function () {
//     //     //arrange
//     //     var target = this.target;
//     //     var recorder = this.recorder;
//     //
//     //     target.width(1);
//     //     recorder.addState('s1');
//     //     recorder.changeState('s1');
//     //     // act
//     //
//     //     recorder.record();
//     //     recorder.stop();
//     //     target.width(2);
//     //
//     //     // assert
//     //     var actual = recorder.getValue('default', target.id(), 'width');
//     //     assert.equal(actual, null, 'Default value recorded');
//     // });

//     //api changed
//     // it("change state to default", function () {
//     //     //arrange
//     //     var target = this.target;
//     //     var recorder = this.recorder;
//     //     target.width(1);
//     //
//     //     recorder.addState("state1");
//     //     recorder.changeState("state1");
//     //     recorder.record();
//     //
//     //     // act
//     //     target.width(3);
//     //     recorder.stop();
//     //     recorder.changeState("Default");
//     //
//     //     // assert
//     //     assert.equal(target.width(), 1, 'Default state value');
//     //
//     //     recorder.changeState("state1");
//     //
//     //     assert.equal(target.width(), 3, 'state1 state value');
//     // });

//     //api changed
//     // it("Add element after recording started", function () {
//     //     //arrange
//     //     var target = new UIElement();
//     //     var recorder = this.recorder;
//     //
//     //     recorder.addState("state1", "state1");
//     //     recorder.record();
//     //
//     //     // act
//     //     this.app.activePage.getActiveArtboard().add(target);
//     //     this.relayout();
//     //     target.width(10);
//     //
//     //     // assert
//     //     var actual = recorder.getValue('state1', target.id(), 'width');
//     //     assert.equal(actual, 10, 'State 1 value recorded');
//     // });

//     it("Remove element after recording started", function () {
//         //arrange
//         var target = new UIElement();
//         var recorder = this.recorder;
//         this.app.activePage.getActiveArtboard().add(target);

//         recorder.addState("state1", "state1");
//         recorder.changeState("state1");
//         recorder.record();

//         // act
//         this.relayout();
//         target.width(10);

//         target.parent().remove(target);
//         this.relayout();

//         recorder.stop();

//         // assert
//         var actual = recorder.getValue('state1', target.id(), 'width');
//         assert.equal(actual, null, 'State 1 value');
//     });


// });