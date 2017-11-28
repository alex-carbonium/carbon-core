import TestUtil from "../TestUtil";
import { assert } from "chai";
import ContextStub from "../ContextStub";
import {
    Artboard, Matrix, Brush, Rect, Point, Symbol, UIElement, Constraints, Selection,
    SymbolActions, CommandManager, GroupContainer, Text, Font, RenderEnvironment, RenderFlags, workspace
} from "carbon-core";
import { HorizontalConstraint, VerticalConstraint } from "carbon-basics";

describe("Symbol tests", function () {
    beforeEach(function (done) {
        this.app = TestUtil.setupApp();
        this.app.onLoad(function () {
            return done();
        });

        var that = this;
        this.createArtboard = function () {
            var artboard = new Artboard();
            artboard.prepareAndSetProps({ width: 200, height: 100, name: "template" });
            this.app.activePage.add(artboard);
            return artboard;
        }

        this.drawContext = {
            flags: RenderFlags.Final,
            pageMatrix: Matrix.create(),
            setupContext: (context) => { },
            scale: 1,
            contextScale: 1
        } as RenderEnvironment;
    });
    afterEach(function () {
        this.app.dispose();
    });

    it("Should get size from artboard", function () {
        // arrange
        var atc = new Symbol();
        var artboard = this.createArtboard();
        // act
        atc.prepareAndSetProps({ source: { pageId: this.app.activePage.id, artboardId: artboard.id } });

        // assert
        assert.equal(atc.width, artboard.width);
        assert.equal(atc.height, artboard.height);
    })

    it("Should respect child constraints", function () {
        // arrange
        var atc = new Symbol();
        this.app.activePage.getActiveArtboard().add(atc);

        var artboard = this.createArtboard();
        var child = new UIElement();
        artboard.prepareAndSetProps({ allowHorizontalResize: true, allowVerticalResize: true });
        child.prepareAndSetProps({
            width: 10, height: 20, constraints: Constraints.All
        });
        artboard.add(child);

        // act
        atc.prepareAndSetProps({ source: { pageId: this.app.activePage.id, artboardId: artboard.id }, width: 200, height: 100 });
        this.app.relayout();
        atc.prepareAndSetProps({ width: atc.width * 2, height: atc.height * 2 })
        this.app.relayout();
        atc.draw(new ContextStub(), this.drawContext);

        // assert
        assert.equal(210, atc.children[0].width);
        assert.equal(120, atc.children[0].height);
    });

    it("Should ignore child resize inside symbol", function () {
        // arrange
        var child = new UIElement();
        this.app.activePage.add(child)
        child.boundaryRect(new Rect(0, 0, 100, 100));

        Selection.makeSelection([child]);

        var actions = new SymbolActions(this.app, workspace);
        var symbol = actions.createSymbolFromSelection(Selection);

        var artboard = symbol.findSourceArtboard(this.app);
        artboard.children[0].constraints(Constraints.StretchAll);

        // act
        var clone = symbol.findClone(child.id);
        clone.boundaryRect(new Rect(0, 0, 80, 80));

        this.app.relayout();
        symbol.draw(new ContextStub(), this.drawContext);

        symbol.applyScaling(new Point(1.2, 1), Point.Zero);
        symbol.opacity(.5); //anything to trigger custom properties update

        this.app.relayout();
        symbol.draw(new ContextStub(), this.drawContext);

        // assert
        assert.equal(symbol.findClone(child.id).width, 100 * 1.2);
    });

    it("Must support undo for changing inner elements", function () {
        // arrange
        var child = new UIElement();
        child.prepareAndSetProps({ fill: Brush.createFromColor("red") });
        this.app.activePage.add(child);

        Selection.makeSelection([child]);
        var actions = new SymbolActions(this.app, workspace);
        var symbol = actions.createSymbolFromSelection(Selection);
        this.app.relayout();

        // act
        var clone = symbol.findClone(child.id);
        clone.prepareAndSetProps({ fill: Brush.createFromColor("green") });
        this.app.relayout();
        symbol.draw(new ContextStub(), this.drawContext);

        CommandManager.undoPrevious();
        this.app.relayout();

        // assert
        clone = symbol.findClone(child.id);
        assert.equal(clone.props.fill.value, "red", "Clone must have original values");
    });

    describe("Fill/stroke support", function () {
        it("Should initialize fill/stroke from child", function () {
            // arrange
            var child = new UIElement();

            child.fill(Brush.createFromColor("red"));
            child.stroke(Brush.createFromColor("green"));

            Selection.makeSelection([child]);

            var actions = new SymbolActions(this.app, workspace);
            var symbol = actions.createSymbolFromSelection(Selection);

            // act
            Selection.makeSelection([child]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub(), this.drawContext);

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

            var actions = new SymbolActions(this.app, workspace);
            var symbol = actions.createSymbolFromSelection(Selection);

            // act
            Selection.makeSelection([child]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub(), this.drawContext);

            symbol.prepareAndSetProps({ fill: Brush.createFromColor("red"), stroke: Brush.createFromColor("green") });

            // assert
            var clone = symbol.findClone(child.id);
            assert.equal(clone.props.fill.value, "red", "Fill must change on chosen child");
            assert.equal(clone.props.stroke.value, "green", "Stroke must change on chosen child");
            assert.equal(symbol.props.fill.value, "red", "Own fill must change as well, but not be drawn");
            assert.equal(symbol.props.stroke.value, "green", "Own stroke must change as well, but not be drawn");
        });

        it("Should persist custom fill/stroke", function () {
            // arrange
            var child = new UIElement();

            Selection.makeSelection([child]);
            var actions = new SymbolActions(this.app, workspace);
            var symbol = actions.createSymbolFromSelection(Selection);

            Selection.makeSelection([child]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub(), this.drawContext);

            // act
            symbol.prepareAndSetProps({ fill: Brush.createFromColor("red") });
            child.prepareAndSetProps({ fill: Brush.createFromColor("green") });
            this.app.relayout();
            symbol.draw(new ContextStub(), this.drawContext);

            // assert
            var clone = symbol.findClone(child.id);
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
            child.prepareAndSetProps({ fill: Brush.createFromColor("red") });
            container.add(child);

            Selection.makeSelection([child]);
            var actions = new SymbolActions(this.app, workspace);
            var symbol = actions.createSymbolFromSelection(Selection);

            Selection.makeSelection([child]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub(), this.drawContext);

            // act
            symbol.prepareAndSetProps({ fill: Brush.createFromColor("green") });
            this.app.relayout();

            CommandManager.undoPrevious();
            this.app.relayout();

            // assert
            assert.equal(symbol.props.fill.value, "red", "Symbol must undo fill");
            var clone = symbol.findClone(child.id);
            assert.equal(clone.props.fill.value, "red", "Child must undo fill");
        }

        it("Should refresh fill/stroke if not overridden", function () {
            // arrange
            var child = new UIElement();

            Selection.makeSelection([child]);
            var actions = new SymbolActions(this.app, workspace);
            var symbol = actions.createSymbolFromSelection(Selection);

            Selection.makeSelection([child]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub(), this.drawContext);

            // act
            child.prepareAndSetProps({ fill: Brush.createFromColor("green") });
            this.app.relayout();
            symbol.draw(new ContextStub(), this.drawContext);

            // assert
            var clone = symbol.findClone(child.id);
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
            var actions = new SymbolActions(this.app, workspace);
            var symbol = actions.createSymbolFromSelection(Selection);

            Selection.makeSelection([child1, child2]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub(), this.drawContext);

            // act
            var clone1 = symbol.findClone(child1.id);
            clone1.prepareAndSetProps({ fill: Brush.createFromColor("green") });
            this.app.relayout();
            symbol.draw(new ContextStub(), this.drawContext);

            // assert
            clone1 = symbol.findClone(child1.id);
            var clone2 = symbol.findClone(child2.id);
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
            var actions = new SymbolActions(this.app, workspace);
            var symbol = actions.createSymbolFromSelection(Selection);

            // act
            Selection.makeSelection([child1, child2]);
            actions.markAsBackground(Selection);
            this.app.relayout();
            symbol.draw(new ContextStub(), this.drawContext);

            // assert
            assert.equal(child1.props.fill.value, "red", "Color on children should be the same");
            assert.equal(child2.props.fill.value, "red", "Color on children should be the same");

            var clone1 = symbol.findClone(child1.id);
            var clone2 = symbol.findClone(child2.id);
            assert.equal(clone1.props.fill.value, "red", "Color on clones should be the same");
            assert.equal(clone1.props.fill.value, "red", "Color on clones should be the same");
        });

        it("Symbol respects custom properties after reload", function () {
            // arrange
            var child1 = new UIElement();
            var child2 = new Text();
            child2.prepareAndSetProps({font:Font.Default, content:[{text:`text`}]});
            this.app.activePage.add(child1);
            this.app.activePage.add(child2);

            Selection.makeSelection([child1, child2]);
            var actions = new SymbolActions(this.app, workspace);
            var symbol = actions.createSymbolFromSelection(Selection);

            var artboard = child1.parent();
            var originalHeight = child2.height;
            artboard.prepareAndSetProps({width: 100, height: originalHeight+2});
            child1.prepareAndSetProps({
                width: 100, height: 2
            });
            child1.applyTranslation(new Point(0, originalHeight));

            child2.prepareAndSetProps({
                width: 100
            });

            child1.constraints({h:HorizontalConstraint.LeftRight, v:VerticalConstraint.Bottom});
            child2.constraints(Constraints.All);

            symbol.prepareAndSetProps({
                width: 100, height: originalHeight+2
            });

            this.app.relayout();
            symbol.draw(new ContextStub(), this.drawContext);

            // act
            var clone2 = symbol.findClone(child2.id);
            var newContent = [{text:`fasdfasdfjas

                        kdl;jfadskjf`}];
            clone2.prepareAndSetProps({content:newContent});

            var cloneHeight = clone2.height;
            var dh = cloneHeight - originalHeight;
            assert.notEqual(0, dh, "label content should change label height");
            assert.equal(100, symbol.width, "initial symbol width");
            assert.equal(originalHeight+2 + dh, symbol.height, "initial symbol height");

            symbol.onArtboardChanged(); // should trigger refresh
            clone2 = symbol.findClone(child2.id);
            assert.equal(newContent, clone2.content(), "content should restore from custom props");
            assert.equal(cloneHeight, clone2.height, "result text height");
        });
    });
});