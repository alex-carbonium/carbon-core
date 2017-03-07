// import UIElement from "framework/UIElement";
// import Brush from "framework/Brush";
// import TestUtil from "../../Util";
// import styleManager from "framework/style/StyleManager";

// describe("Style tests", function () {
//     before(function () {

//     });
//     beforeEach(function (done) {
//         this.app = TestUtil.setupApp();
//         this.app.loaded.then(function () {
//             return done();
//         });
//     });
//     afterEach(function () {
//         this.app.dispose();
//     });

//     describe("Style update scenarios", function () {
//         it("Should take properties from style manager", function () {
//             //arrange
//             var styleProps = {
//                 backgroundBrush: Brush.createFromColor("#ccc")
//             };
//             var style = styleManager.createStyle("style1", 1, styleProps);

//             var element = new UIElement();

//             //actv
//             element.setProps({
//                 id: "element"
//             });
//             var props = {styleId: style.id};
//             element.prepareProps(props);
//             element.setProps(props);

//             //assert
//             assert.deepEqual(element.backgroundBrush(), styleProps.backgroundBrush);
//         });

//         it("Should be able to remove style", function () {
//             //arrange
//             var styleProps = {
//                 backgroundBrush: Brush.createFromColor("#ccc")
//             };

//             var style = styleManager.createStyle("style1", 1, styleProps);

//             var element = new UIElement();

//             var expectedBrush = Brush.createFromColor("#aaa");

//             var props = {styleId: style.id,
//                         backgroundBrush: expectedBrush};
//             element.setProps({
//                 id: "element"
//             });

//             element.prepareProps(props);
//             element.setProps(props);

//             //act
//             element.setProps({styleId: null});

//             //assert
//             assert.deepEqual(element.backgroundBrush(), styleProps.backgroundBrush);
//         });

//         it("Should create style from element properties", function () {
//             //arrange
//             var element = new UIElement();

//             var expectedBackgroundBrush = Brush.createFromColor("#aaa");
//             var expectedBorderBrush = Brush.createFromColor("#bbb");

//             element.setProps({
//                 backgroundBrush: expectedBackgroundBrush,
//                 borderBrush: expectedBorderBrush,
//                 opacity: 0.5,
//                 dashPattern: [1, 1]
//             });

//             //act

//             var props = element.getStyleProps();

//             //assert
//             assert.deepEqual(props.backgroundBrush, expectedBackgroundBrush);
//             assert.deepEqual(props.borderBrush, expectedBorderBrush);
//             assert.deepEqual(props.opacity, 0.5);
//             assert.deepEqual(props.dashPattern.join(','), [1, 1].join(','));
//         })

//         it("Should update style when element properties updated", function () {
//             //arrange
//             var element = new UIElement();

//             var expectedBackgroundBrush = Brush.createFromColor("#aaa");
//             var expectedBorderBrush = Brush.createFromColor("#bbb");
//             var style = styleManager.createStyle("style1", 1, {
//                 backgroundBrush: expectedBackgroundBrush,
//                 borderBrush: expectedBorderBrush,
//                 opacity: 0.5,
//                 dashPattern: [1, 1]
//             });

//             var props = {styleId: style.id};

//             element.prepareProps(props);
//             element.setProps(props);

//             //act
//             element.setProps({opacity: 1, dashPattern: null});

//             //assert
//             var props = element.props;

//             assert.equal(props.opacity, 1);
//             assert.equal(props.dashPattern, null);
//             assert.deepEqual(props.backgroundBrush, expectedBackgroundBrush);
//             assert.deepEqual(props.borderBrush, expectedBorderBrush);
//             assert.equal(element.hasPendingStyle(), true);
//         })

//         it("Should update element style when style is changed", function () {
//             //arrange
//             var element = new UIElement();
//             this.app.activePage.add(element);

//             var expectedBackgroundBrush = Brush.createFromColor("#aaa");
//             var expectedBorderBrush = Brush.createFromColor("#bbb");
//             var style = styleManager.createStyle("style1", 1, {
//                 backgroundBrush: expectedBackgroundBrush,
//                 borderBrush: expectedBorderBrush,
//                 opacity: 0.5,
//                 dashPattern: [1, 1]
//             });

//             element.prepareAndSetProps({styleId: style.id});

//             var element2 = new UIElement();
//             element2.prepareAndSetProps({styleId: style.id});
//             element2.setProps({opacity:1, dashPattern:null});

//             //act
//             this.app.updateStyle(1, style.id, element2.getStyleProps());
//             this.app.relayout();

//             //assert
//             var props = element.props;

//             assert.equal(props.opacity, 1);
//             assert.equal(props.dashPattern, null);
//             assert.deepEqual(props.backgroundBrush, expectedBackgroundBrush);
//             assert.deepEqual(props.borderBrush, expectedBorderBrush);
//         });


//         it("Should reset element pending style when style is updated", function () {
//             //arrange
//             var element = new UIElement();
//             this.app.activePage.add(element);

//             var expectedBackgroundBrush = Brush.createFromColor("#aaa");
//             var expectedBorderBrush = Brush.createFromColor("#bbb");
//             var style = styleManager.createStyle("style1", 1, {
//                 backgroundBrush: expectedBackgroundBrush,
//                 borderBrush: expectedBorderBrush,
//                 opacity: 0.5,
//                 dashPattern: [1, 1]
//             });

//             this.app.activePage.add(element);

//             element.prepareAndSetProps({styleId: style.id});
//             // make pending style
//             element.setProps({backgroundBrush:Brush.createFromColor("#eee")});

//             //act
//             assert.equal(element.hasPendingStyle(), true);


//             var element2 = new UIElement();
//             element2.setProps({styleId: style.id, opacity:1, dashPattern:null});

//             //act
//             this.app.updateStyle(1, style.id, element2.getStyleProps());
//             element.setProps({styleId: style.id});

//             this.app.relayout();

//             //assert
//             assert.equal(element.hasPendingStyle(), false);
//         });

//     });

// });