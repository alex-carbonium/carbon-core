// import UIElement from "framework/UIElement";
// import CompositeElement from "framework/CompositeElement";
// import PropertyMetadata from "framework/PropertyMetadata";
// import Font from "framework/Font";

// describe("Composite element common properties tests", function(){
//     it("No matching groups", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 groups: function(){
//                     return [{label: "text1", properties: []}, {label: "font1", properties: []}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 groups: function(){
//                     return [{label: "text2", properties: []}, {label: "font2", properties: []}];
//                 }
//             }});

//         var composite = new CompositeElement();
//         composite.add(new Label_1());
//         composite.add(new Label_2());

//         //act
//         var groups = composite.createPropertyGroups();

//         //assert
//         jsonEqual(groups, []);
//     });

//     it("One matching group", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 groups: function(){
//                     return [{label: "text1", properties: []}, {label: "font", properties: []}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 groups: function(){
//                     return [{label: "text2", properties: []}, {label: "font", properties: []}];
//                 }
//             }});

//         var composite = new CompositeElement();
//         composite.add(new Label_1());
//         composite.add(new Label_2());

//         //act
//         var groups = composite.createPropertyGroups();

//         //assert
//         jsonEqual(groups, [{label: "font", properties: []}]);
//     });

//     it("One non-matching group in first type", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 groups: function(){
//                     return [{label: "text", properties: []}, {label: "font", properties: []}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 groups: function(){
//                     return [{label: "text", properties: []}];
//                 }
//             }});

//         var composite = new CompositeElement();
//         composite.add(new Label_1());
//         composite.add(new Label_2());

//         //act
//         var groups = composite.createPropertyGroups();

//         //assert
//         jsonEqual(groups, [{label: "text", properties: []}]);
//     });

//     it("One non-matching group in second type", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 groups: function(){
//                     return [{label: "text", properties: []}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 groups: function(){
//                     return [{label: "text", properties: []}, {label: "font", properties: []}];
//                 }
//             }});

//         var composite = new CompositeElement();
//         composite.add(new Label_1());
//         composite.add(new Label_2());

//         //act
//         var groups = composite.createPropertyGroups();

//         //assert
//         jsonEqual(groups, [{label: "text", properties: []}]);
//     });

//     it("Two identical groups", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 groups: function(){
//                     return [{label: "text", properties: []}, {label: "font", properties: []}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 groups: function(){
//                     return [{label: "text", properties: []}, {label: "font", properties: []}];
//                 }
//             }});

//         var composite = new CompositeElement();
//         composite.add(new Label_1());
//         composite.add(new Label_2());

//         //act
//         var groups = composite.createPropertyGroups();

//         //assert
//         jsonEqual(groups, [{label: "text", properties: []}, {label: "font", properties: []}]);
//     });

//     it("Two identical groups in reverse order", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 groups: function(){
//                     return [{label: "text", properties: []}, {label: "font", properties: []}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 groups: function(){
//                     return [{label: "font", properties: []}, {label: "text", properties: []}];
//                 }
//             }});

//         var composite = new CompositeElement();
//         composite.add(new Label_1());
//         composite.add(new Label_2());

//         //act
//         var groups = composite.createPropertyGroups();

//         //assert
//         jsonEqual(groups, [{label: "text", properties: []}, {label: "font", properties: []}]);
//     });

//     it("Non-matching group with three types", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         var Label_3 = klass2("TestLabel_3", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 groups: function(){
//                     return [{label: "text", properties: []}, {label: "font", properties: []}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 groups: function(){
//                     return [{label: "font", properties: []}, {label: "text", properties: []}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_3: {
//                 groups: function(){
//                     return [{label: "align", properties: []}, {label: "font", properties: []}, {label: "text", properties: []}];
//                 }
//             }});

//         var composite = new CompositeElement();
//         composite.add(new Label_1());
//         composite.add(new Label_2());
//         composite.add(new Label_3());

//         //act
//         var groups = composite.createPropertyGroups();

//         //assert
//         jsonEqual(groups, [{label: "text", properties: []}, {label: "font", properties: []}]);
//     });

//     it("Common properties from non-matching groups", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 text: { type: "text"},
//                 color: { type: "color"},
//                 border: { type: "color"},
//                 groups: function(){
//                     return [{properties: ["text", "color", "border"]}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 text: { type: "longText"},
//                 color: { type: "color"},
//                 border: { type: "color"},
//                 groups: function(){
//                     return [{properties: ["text", "color", "border"]}];
//                 }
//             }});

//         var composite = new CompositeElement();
//         composite.add(new Label_1());
//         composite.add(new Label_2());

//         //act
//         var groups = composite.createPropertyGroups();

//         //assert
//         jsonEqual(groups, [{label: "Common", properties: ["color", "border"]}]);
//     });

//     it("Common values should be kept", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 text: { type: "text"},
//                 groups: function(){
//                     return [{label: "text", properties: ["text"]}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 text: { type: "text"},
//                 groups: function(){
//                     return [{label: "text", properties: ["text"]}];
//                 }
//             }});

//         var label1 = new Label_1();
//         var label2 = new Label_2();
//         label1.setProps({text: "value"});
//         label2.setProps({text: "value"});

//         var composite = new CompositeElement();
//         composite.add(label1);
//         composite.add(label2);

//         //act
//         composite.createPropertyGroups();

//         //assert
//         assert.equal(composite.commonProps.text, "value");
//     });
//     it("Different values should be cleared", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 text: { type: "text"},
//                 groups: function(){
//                     return [{label: "text", properties: ["text"]}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 text: { type: "text"},
//                 groups: function(){
//                     return [{label: "text", properties: ["text"]}];
//                 }
//             }});

//         var label1 = new Label_1();
//         var label2 = new Label_2();
//         label1.setProps({text: "value1"});
//         label2.setProps({text: "value2"});

//         var composite = new CompositeElement();
//         composite.add(label1);
//         composite.add(label2);

//         //act
//         composite.createPropertyGroups();

//         //assert
//         assert.equal(composite.commonProps.text, undefined);
//     });
//     it("Complex values should be analyzed", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 font: { type: "font"},
//                 groups: function(){
//                     return [{label: "text", properties: ["font"]}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 font: { type: "font"},
//                 groups: function(){
//                     return [{label: "text", properties: ["font"]}];
//                 }
//             }});

//         var label1 = new Label_1();
//         var label2 = new Label_2();
//         label1.setProps({font: Font.createFromObject({size: 10, family: "Arial"})});
//         label2.setProps({font: Font.createFromObject({size: 11, family: "Arial"})});

//         var composite = new CompositeElement();
//         composite.add(label1);
//         composite.add(label2);

//         //act
//         composite.createPropertyGroups();

//         //assert
//         assert.equal(composite.commonProps.font.size, undefined);
//         assert.equal(composite.commonProps.font.family, "Arial");
//     });
//     it("Complex values with 3 levels", function () {
//         //arrange
//         var Label_1 = klass2("TestLabel_1", UIElement);
//         var Label_2 = klass2("TestLabel_2", UIElement);
//         PropertyMetadata.extend({
//             TestLabel_1: {
//                 font: { type: "font"},
//                 groups: function(){
//                     return [{label: "text", properties: ["font"]}];
//                 }
//             }});
//         PropertyMetadata.extend({
//             TestLabel_2: {
//                 font: { type: "font"},
//                 groups: function(){
//                     return [{label: "text", properties: ["font"]}];
//                 }
//             }});

//         var label1 = new Label_1();
//         var label2 = new Label_2();
//         label1.setProps({font: Font.createFromObject({size: 10, color:{type: "brush", value: "red"}})});
//         label2.setProps({font: Font.createFromObject({size: 10, color:{type: "brush", value: "green"}})});

//         var composite = new CompositeElement();
//         composite.add(label1);
//         composite.add(label2);

//         //act
//         composite.createPropertyGroups();

//         //assert
//         assert.equal(composite.commonProps.font.size, 10);
//         assert.equal(composite.commonProps.font.color.type, "brush");
//         assert.equal(composite.commonProps.font.color.value, undefined);
//     });

//     //qunit does not print full json on test failure
//     function jsonEqual(actual, expected){
//         assert.equal(JSON.stringify(actual), JSON.stringify(expected));
//     }
// });


