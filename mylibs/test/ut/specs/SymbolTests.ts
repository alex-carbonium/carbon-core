import UIElement from "framework/UIElement";
import Text from "framework/text/Text";
import TestUtil from "../TestUtil";
import ContextStub from "../ContextStub";
import Artboard from "framework/Artboard";
import Constraints from "../../../framework/Constraints";
import CommandManager from "../../../framework/commands/CommandManager";
import Brush from "../../../framework/Brush";
import Font from "../../../framework/Font";
import GroupContainer from "../../../framework/GroupContainer";
import Selection from "../../../framework/SelectionModel";
import SymbolActions from "../../../extensions/SymbolActions";
import Rect from "../../../math/rect";
import Point from "../../../math/point";
import Symbol from "framework/Symbol";
import Environment from "environment";
import { assert } from "chai";

describe("Symbol tests", function () {
    beforeEach(function (done) {
        this.app = TestUtil.setupApp();
        this.app.onLoad(function () {
            return done();
        });

        var that = this;
        this.createArtboard = function () {
            var artboard = new Artboard();
            artboard.setProps({ width: 200, height: 100, name: "template" });
            this.app.activePage.add(artboard);
            return artboard;
        }
    });
    afterEach(function () {
        this.app.dispose();
    });

    it("Should get size from artboard", function () {
        // arrange
        var atc = new Symbol();
        var artboard = this.createArtboard();
        // act
        atc.setProps({ source: { pageId: this.app.activePage.id(), artboardId: artboard.id() } });

        // assert
        assert.equal(atc.width(), artboard.width());
        assert.equal(atc.height(), artboard.height());
    })

    it("Should respect child constraints", function () {
        // arrange
        var atc = new Symbol();
        this.app.activePage.getActiveArtboard().add(atc);

        var artboard = this.createArtboard();
        var child = new UIElement();
        artboard.setProps({ allowHorizontalResize: true, allowVerticalResize: true });
        child.setProps({
            width: 10, height: 20, constraints: Constraints.All
        });
        artboard.add(child);

        // act
        atc.setProps({ source: { pageId: this.app.activePage.id(), artboardId: artboard.id() }, width: 200, height: 100 });
        this.app.relayout();
        atc.setProps({ width: atc.width() * 2, height: atc.height() * 2 })
        this.app.relayout();
        atc.draw(new ContextStub());

        // assert
        assert.equal(210, atc.children[0].width());
        assert.equal(120, atc.children[0].height());
    });

    it("Should respect child constraints after child resize", function () {
        // arrange
        var child = new UIElement();
        this.app.activePage.add(child)
        child.boundaryRect(new Rect(0, 0, 100, 100));

        Selection.makeSelection([child]);

        var actions = new SymbolActions(this.app, Environment);
        var symbol = actions.createSymbolFromSelection(Selection);

        // act
        var clone = symbol.findClone(child.id());
        clone.boundaryRect(new Rect(0, 0, 80, 80));

        this.app.relayout();
        symbol.draw(new ContextStub());

        symbol.applyScaling(new Point(1.2, 1), Point.Zero);
        symbol.opacity(.5); //anything to trigger custom properties update

        this.app.relayout();
        symbol.draw(new ContextStub());

        // assert
        assert.equal(symbol.findClone(child.id()).width(), 80 * 1.2);
    });

    describe("Fill/stroke support", function () {
        it("Should initialize fill/stroke from child", function () {
            // arrange
            var child = new UIElement();

            child.fill(Brush.createFromColor("red"));
            child.stroke(Brush.createFromColor("green"));

            Selection.makeSelection([child]);

            var actions = new SymbolActions(this.app, Environment);
            var symbol = actions.createSymbolFromSelection(Selection);

            // act
            Selection.makeSelection([child]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub());

            // assert
            assert.equal(symbol.props.fill.value, "red");
            assert.equal(symbol.props.stroke.value, "green");
        });

        it("Should set fill/stroke on child, inner child", function () {
            // arrange
            var child = new UIElement();

            var group = new GroupContainer();
            group.add(child);
            Selection.makeSelection([group]);

            var actions = new SymbolActions(this.app, Environment);
            var symbol = actions.createSymbolFromSelection(Selection);

            // act
            Selection.makeSelection([child]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub());

            symbol.setProps({ fill: Brush.createFromColor("red"), stroke: Brush.createFromColor("green") });

            // assert
            var clone = symbol.findClone(child.id());
            assert.equal(clone.props.fill.value, "red", "Fill must change on chosen child");
            assert.equal(clone.props.stroke.value, "green", "Stroke must change on chosen child");
            assert.equal(symbol.props.fill.value, "red", "Own fill must change as well, but not be drawn");
            assert.equal(symbol.props.stroke.value, "green", "Own stroke must change as well, but not be drawn");
        });

        it("Should persist custom fill/stroke", function () {
            // arrange
            var child = new UIElement();

            Selection.makeSelection([child]);
            var actions = new SymbolActions(this.app, Environment);
            var symbol = actions.createSymbolFromSelection(Selection);

            Selection.makeSelection([child]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub());

            // act
            symbol.setProps({ fill: Brush.createFromColor("red") });
            child.setProps({ fill: Brush.createFromColor("green") });
            this.app.relayout();
            symbol.draw(new ContextStub());

            // assert
            var clone = symbol.findClone(child.id());
            assert.equal(clone.props.fill.value, "red", "Clone must preserve fill");
            assert.equal(symbol.props.fill.value, "red", "Symbol must preserve fill");
        });

        it("Should undo custom fill/stroke (on artboard)", function () {
            testUndo.call(this, this.app.activePage.getActiveArtboard());
        });
        it("Shoud undo custom fill/stroke (on page)", function () {
            testUndo.call(this, this.app.activePage);
        });
        function testUndo(container) {
            // arrange
            var child = new UIElement();
            child.setProps({ fill: Brush.createFromColor("red") });
            container.add(child);

            Selection.makeSelection([child]);
            var actions = new SymbolActions(this.app, Environment);
            var symbol = actions.createSymbolFromSelection(Selection);

            Selection.makeSelection([child]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub());

            // act
            symbol.setProps({ fill: Brush.createFromColor("green") });
            this.app.relayout();

            CommandManager.undoPrevious();
            this.app.relayout();

            // assert
            assert.equal(symbol.props.fill.value, "red", "Symbol must undo fill");
            var clone = symbol.findClone(child.id());
            assert.equal(clone.props.fill.value, "red", "Child must undo fill");
        }

        it("Should refresh fill/stroke if not overridden", function () {
            // arrange
            var child = new UIElement();

            Selection.makeSelection([child]);
            var actions = new SymbolActions(this.app, Environment);
            var symbol = actions.createSymbolFromSelection(Selection);

            Selection.makeSelection([child]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub());

            // act
            child.setProps({ fill: Brush.createFromColor("green") });
            this.app.relayout();
            symbol.draw(new ContextStub());

            // assert
            var clone = symbol.findClone(child.id());
            assert.equal(clone.props.fill.value, "green", "Clone must refresh");
            assert.equal(symbol.props.fill.value, "green", "Symbol must refresh");
        });

        it("Should handle background change on a child", function () {
            // arrange
            var child1 = new UIElement();
            var child2 = new UIElement();
            this.app.activePage.add(child1);
            this.app.activePage.add(child2);

            Selection.makeSelection([child1, child2]);
            var actions = new SymbolActions(this.app, Environment);
            var symbol = actions.createSymbolFromSelection(Selection);

            Selection.makeSelection([child1, child2]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub());

            // act
            var clone1 = symbol.findClone(child1.id());
            clone1.setProps({ fill: Brush.createFromColor("green") });
            this.app.relayout();
            symbol.draw(new ContextStub());

            // assert
            clone1 = symbol.findClone(child1.id());
            var clone2 = symbol.findClone(child2.id());
            assert.equal(clone1.props.fill.value, "green", "Child1 must change");
            assert.equal(clone2.props.fill.value, "green", "Child2 must change");
            assert.equal(symbol.props.fill.value, "green", "Symbol must change");
        });

        it("Can have multiple background elements", function () {
            // arrange
            var child1 = new UIElement();
            var child2 = new UIElement();
            this.app.activePage.add(child1);
            this.app.activePage.add(child2);


            child1.fill(Brush.createFromColor("red"));
            child2.fill(Brush.createFromColor("green"));

            Selection.makeSelection([child1, child2]);
            var actions = new SymbolActions(this.app, Environment);
            var symbol = actions.createSymbolFromSelection(Selection);

            // act
            Selection.makeSelection([child1, child2]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub());

            // assert
            assert.equal(child1.props.fill.value, "red", "Color on children should be the same");
            assert.equal(child2.props.fill.value, "red", "Color on children should be the same");

            var clone1 = symbol.findClone(child1.id());
            var clone2 = symbol.findClone(child2.id());
            assert.equal(clone1.props.fill.value, "red", "Color on clones should be the same");
            assert.equal(clone1.props.fill.value, "red", "Color on clones should be the same");
        });
    });

    describe("Text support", function () {
        it("Should initialize font from child", function () {
            // arrange
            var text = new Text();
            text.content(["hello"]);
            text.font(Font.createFromObject({ size: 20 }));

            Selection.makeSelection([text]);

            var actions = new SymbolActions(this.app, Environment);
            var symbol = actions.createSymbolFromSelection(Selection);

            // act
            Selection.makeSelection([text]);
            actions.markAsText(Selection);

            this.app.relayout();
            symbol.draw(new ContextStub());

            // assert
            var clone = symbol.findClone(text.id());
            assert.equal(symbol.props.font.size, 20);
            assert.equal(clone.props.font.size, 20);
        });

        it("Should handle font change on a child", function () {
            // arrange
            var child1 = new Text();
            var child2 = new Text();
            child1.content("Hello");
            child2.content("World");
            this.app.activePage.add(child1);
            this.app.activePage.add(child2);

            Selection.makeSelection([child1, child2]);
            var actions = new SymbolActions(this.app, Environment);
            var symbol = actions.createSymbolFromSelection(Selection);

            Selection.makeSelection([child1, child2]);
            actions.markAsText(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub());

            // act
            var clone1 = symbol.findClone(child1.id());
            clone1.setProps({ font: Font.createFromObject({ "color": "green" }) });
            this.app.relayout();
            symbol.draw(new ContextStub());

            // assert
            clone1 = symbol.findClone(child1.id());
            var clone2 = symbol.findClone(child2.id());
            assert.equal(clone1.props.font.color, "green", "Child1 must change");
            assert.equal(clone2.props.font.color, "green", "Child2 must change");
            assert.equal(symbol.props.font.color, "green", "Symbol must change");
        });

        it("Should extend overriden font", function () {
            // arrange
            var text = new Text();
            text.content(["hello"]);
            text.font(Font.createFromObject({ size: 20 }));

            Selection.makeSelection([text]);

            var actions = new SymbolActions(this.app, Environment);
            var symbol = actions.createSymbolFromSelection(Selection);

            Selection.makeSelection([text]);
            actions.markAsText(Selection);

            this.app.relayout();
            symbol.draw(new ContextStub());

            // act
            symbol.setProps({ font: Font.createFromObject({ color: "red" }) });
            text.font(Font.createFromObject({ size: 30 }));

            this.app.relayout();
            symbol.draw(new ContextStub());

            // assert
            assert.equal(symbol.props.font.size, 30);
            assert.equal(symbol.props.font.color, "red");
        });
    });
});