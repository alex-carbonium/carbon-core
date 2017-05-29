import TestUtil from "../TestUtil";
import UIElement from "framework/UIElement";
import Text from "framework/text/Text";
import Container from "framework/Container";
import GroupContainer from "framework/GroupContainer";
import Rectangle from "framework/Rectangle";
import PropertyMetadata from "framework/PropertyMetadata";
import Circle from "framework/Circle";
import RepeatContainer from "framework/repeater/RepeatContainer";
import {ArrangeStrategies, DockStyle, Overflow} from "framework/Defs";
import Selection from "framework/SelectionModel";
import Point from "../../../math/point";
import Rect from "../../../math/rect";

describe("Repeater tests", function(){
    before(function(){
        this.makeRepeater = function(elements){
            Selection.makeSelection(elements);
            this.app.actionManager.invoke("groupInRepeater");
            this.app.relayout();

            return this.app.activePage.findSingleChildOrDefault(x => x instanceof RepeatContainer);
        };
        this.getChildren = function(repeater){
            return repeater.children
                .map(x => x.children)
                .reduce((a, b) => a.concat(b));
        };
        this.mapChildren = function(repeater, func){
            return this.getChildren(repeater).map(func);
        };

        var repeaterDefaults = PropertyMetadata.getDefaultTypeProps(RepeatContainer);
        this._origRepeaterDefaults = {
            innerMarginX: repeaterDefaults.innerMarginX,
            innerMarginY: repeaterDefaults.innerMarginY
        };
        repeaterDefaults.innerMarginX = 0;
        repeaterDefaults.innerMarginY = 0;
    });
    after(function(){
        var repeaterDefaults = PropertyMetadata.getDefaultTypeProps(RepeatContainer);
        Object.assign(repeaterDefaults, this._origRepeaterDefaults);
    });
    beforeEach(function(done){
        this.app = TestUtil.setupApp();
        this.app.onLoad(function () {
            return done();
        });
    });
    afterEach(function(){
        this.app.dispose();
    });

    describe("Creation and positioning scenarios", function(){
        it("Should repeat horizontally", function(){
            //arrange
            var element = new UIElement();
            element.setProps({
                id: "element",
                width: 100
            });

            this.app.activePage.add(element);
            var repeater = this.makeRepeater([element]);

            //act

            repeater.prepareAndSetProps({width: 300});
            this.app.relayout();

            //assert
            assert.deepEqual(repeater.children.map(x => x.x()), [0, 100, 200]);
        });
        it("Should repeat vertically", function(){
            //arrange
            var element = new UIElement();
            element.setProps({
                id: "element",
                height: 100
            });

            this.app.activePage.add(element);
            var repeater = this.makeRepeater([element]);

            //act
            repeater.prepareAndSetProps({height: 300});
            this.app.relayout();

            //assert
            assert.deepEqual(repeater.children.map(x => x.y()), [0, 100, 200]);
        });
        it("Should repeat vertically, increase twice", function(){
            //arrange
            var element = new UIElement();
            element.setProps({
                id: "element",
                height: 100
            });

            this.app.activePage.add(element);
            var repeater = this.makeRepeater([element]);

            //act
            repeater.prepareAndSetProps({br: repeater.boundaryRect().withHeight(300)});
            this.app.relayout();

            repeater.prepareAndSetProps({br: repeater.boundaryRect().withHeight(400)});
            this.app.relayout();

            //assert
            assert.deepEqual(repeater.children.map(x => x.y()), [0, 100, 200, 300]);
        });
        it("Should repeat horizontally and vertically", function(){
            //arrange
            var element = new UIElement();
            element.setProps({
                id: "element",
                width: 100,
                height: 100
            });

            this.app.activePage.add(element);
            var repeater = this.makeRepeater([element]);

            //act
            repeater.prepareAndSetProps({width: 400, height: 300});
            this.app.relayout();

            //assert
            assert.equal(repeater.children.length, 12);
        });
        it("Should remove elements when shrinking", function(){
            //arrange
            var element = new UIElement();
            element.setProps({
                id: "element",
                width: 100,
                height: 100
            });

            this.app.activePage.add(element);
            var repeater = this.makeRepeater([element]);

            repeater.prepareAndSetProps({width: 300, height: 300});
            this.app.relayout();

            //act
            repeater.prepareAndSetProps({width: 200, height: 200});
            this.app.relayout();

            //assert
            assert.equal(repeater.children.length, 4);
        });

        it("Should repeat containers with children", function(){
            //arrange
            var rectangle = new Rectangle();
            rectangle.setProps({
                id: "rectangle",
                width: 100
            });
            var circle = new Circle();
            circle.setProps({
                id: "circle",
                width: 200
            });
            var container = new Container();
            container.setProps({
                id: "container",
                width: 200
            });

            this.app.activePage.add(container);
            container.add(rectangle);
            container.add(circle);

            var repeater = this.makeRepeater([container]);

            //act

            repeater.prepareAndSetProps({width: 400});
            this.app.relayout();

            //assert
            var slaveCircle = repeater.findSingleChildOrDefault(x => x instanceof Circle && x.id() !== circle.id());
            var slaveRectangle = repeater.findSingleChildOrDefault(x => x instanceof Rectangle && x.id() !== rectangle.id());
            assert.isNotNull(slaveCircle, "Circle not repeated")
            assert.isNotNull(slaveRectangle, "Rectangle not repeated")
        });

        it("Should properly update runtime props", function(){
            //arrange
            var element = new UIElement();
            element.setProps({
                id: "element",
                width: 50,
                height: 50,
                x: 100,
                y: 100
            });

            this.app.activePage.add(element);
            var repeater = this.makeRepeater([element]);

            //act
            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //assert
            var points = [];
            for (var i = 0; i < 4; i++){
                points.push({
                    x: repeater.x() + element.width()/2 + (element.width())*i,
                    y: repeater.y() + element.height()/2
                });
            }
            assert.deepEqual(this.mapChildren(repeater, (x, i) => x.hitTest(points[i], 1)), [true, true, true, true], "All elements should be hit testable");
        });
    });

    describe("Property update scenarios", function(){
        it("Should create elements with same properties", function(){
            //arrange
            var element = new UIElement();

            element.setProps({
                id: "element",
                width: 100
            });

            this.app.activePage.add(element);

            var repeater = this.makeRepeater([element]);

            //act
            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //assert
            assert.deepEqual(repeater.children.map(x => x.width()), [100, 100]);
        });

        it("Should react to updating master elements", function(){
            //arrange
            var element = new UIElement();

            element.setProps({
                id: "master",
                width: 100
            });

            this.app.activePage.add(element);

            var repeater = this.makeRepeater([element]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //act
            var master = repeater.findSingleChildOrDefault(x => x.id() === element.id());

            master.prepareAndSetProps({width: 50});

            this.app.relayout();

            //assert
            assert.deepEqual(this.mapChildren(repeater, x => x.width()), [50, 50], "Elements not repeated");
        });
        it("Should react to updating slave elements", function(){
            //arrange
            var element = new UIElement();

            element.setProps({
                id: "master",
                width: 100
            });

            this.app.activePage.add(element);

            var repeater = this.makeRepeater([element]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //act
            var slave = repeater.findSingleChildOrDefault(x => x.id() !== element.id());

            slave.prepareAndSetProps({width: 50});
            ;
            this.app.relayout();

            //assert
            assert.deepEqual(this.mapChildren(repeater, x => x.width()), [50, 50], "Elements not repeated");
        });
        it("Should react to updating inner elements", function(){
            //arrange
            var container = new Container();
            container.setProps({
                id: "container",
                width: 100
            });

            var element = new UIElement();
            element.setProps({
                id: "element",
                width: 100
            });

            this.app.activePage.add(container);
            container.add(element);

            var repeater = this.makeRepeater([container]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //act
            container = repeater.children[0].getImmediateChildById(container.id());
            element = container.getImmediateChildById(element.id());

            element.prepareAndSetProps({width: 50});
            this.app.relayout();

            //assert
            var items = this.getChildren(repeater);
            assert.deepEqual(items.map(x => x.width()), [100, 100], "Parent containers must not be changed");
            assert.equal(items[0].children[0].width(), 50, "Master inner element must be updated");
            assert.equal(items[1].children[0].width(), 50, "Slave inner element must be updated");
        });

        it("Should respect different text, width and height for autosize labels", function(){
            //arrange
            var label = new Text();

            label.prepareAndSetProps({
                id: "master",
                content: "text 1"
            });

            this.app.activePage.add(label);

            var repeater = this.makeRepeater([label]);
            repeater.setProps({width: label.width()*2});
            this.app.relayout();

            //act
            var slave = repeater.findSingleChildOrDefault(x => x.id() !== label.id() && x instanceof Text);
            slave.prepareAndSetProps({content: "text 222"});
            this.app.relayout();

            //assert
            var texts = this.mapChildren(repeater, x => x.props.content);
            assert.deepEqual(texts, ["text 1", "text 222"], "Text must be different");

            var widths = this.mapChildren(repeater, x => x.width());
            assert.isAbove(widths[1], widths[0], "Label2 should be expanded")
        });
        it("Should sync width and height, but have different text not non-autosize labels", function(){
            //arrange
            var label = new Text();

            label.prepareAndSetProps({
                id: "master",
                content: "text 1",
                autoWidth: false
            });

            this.app.activePage.add(label);

            var repeater = this.makeRepeater([label]);

            repeater.prepareAndSetProps({width: label.width()*2});
            this.app.relayout();

            //act
            var slave = repeater.findSingleChildOrDefault(x => x.id() !== label.id() && x instanceof Text);
            slave.prepareAndSetProps({content: "text 222"});
            this.app.relayout();

            //assert
            var texts = this.mapChildren(repeater, x => x.props.content);
            assert.deepEqual(texts, ["text 1", "text 222"], "Text must be different");

            var widths = this.mapChildren(repeater, x => x.width());
            assert.equal(widths[1], widths[0], "Labels should have the same width")
        });
        //TODO: ensure that text area split is reset when changing text style properties in repeater
        it("Should re-sync width and height if label is changed from autosize to no-autosize", function(){
            //arrange
            var label = new Text();

            label.prepareAndSetProps({
                id: "master",
                content: "text 1"
            });

            this.app.activePage.add(label);

            var repeater = this.makeRepeater([label]);

            repeater.prepareAndSetProps({width: label.width()*2});
            this.app.relayout();

            var slave = repeater.findSingleChildOrDefault(x => x.id() !== label.id() && x instanceof Text);
            slave.prepareAndSetProps({content: "text 222"});
            this.app.relayout();

            //act
            slave.prepareAndSetProps({autoWidth: false, br: slave.boundaryRect().withWidth(6)});
            this.app.relayout();

            //assert
            var texts = this.mapChildren(repeater, x => x.props.content);
            assert.deepEqual(texts, ["text 1", "text 222"], "Text must be different");

            var widths = this.mapChildren(repeater, x => x.width());
            assert.deepEqual(widths, [6, 6], "Labels should have the same width")
        });

        it("Should increase margins when changing width and height", function(){
            //arrange
            var element = new UIElement();

            element.setProps({
                id: "master",
                width: 100,
                height: 100
            });

            this.app.activePage.add(element);

            var repeater = this.makeRepeater([element]);

            repeater.prepareAndSetProps({width: 200})
            this.app.relayout();
            var positions = this.mapChildren(repeater, x => x.position());

            //act
            var master = repeater.findSingleChildOrDefault(x => x.id() === element.id());

            master.prepareAndSetProps({width: 50, height: 80});
            this.app.relayout();

            //assert
            assert.deepEqual(this.mapChildren(repeater, x => x.position()), positions, "Elements must keep their positions");
            assert.deepEqual(this.mapChildren(repeater, x => x.selectProps(["width", "height"])),
                [{width: 50, height: 80}, {width: 50, height: 80}]);
        });
        it("Should react to changing x and y", function(){
            //arrange
            var element = new UIElement();

            element.setProps({
                id: "master",
                width: 100,
                height: 100
            });

            this.app.activePage.add(element);

            var repeater = this.makeRepeater([element]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            var master = repeater.findSingleChildOrDefault(x => x.id() === element.id());

            master.prepareAndSetProps({br: master.boundaryRect().withSize(50, 60)});
            this.app.relayout();

            //act
            this.mapChildren(repeater, x => x.getBoundaryRectGlobal()); //cache rects

            master.applyTranslation(new Point(20, 30));
            this.app.relayout();

            //assert
            var viewMatrices = this.mapChildren(repeater, x => x.viewMatrix().decompose());
            assert.deepEqual(viewMatrices[0].translation, viewMatrices[1].translation, "All elements should have the same view matrix");

            var ys = this.mapChildren(repeater, x => x.getBoundaryRectGlobal().y);
            assert.deepEqual(ys, [30, 30], "y offset should be updated");

            var xs = this.mapChildren(repeater, x => x.getBoundaryRectGlobal().x);
            assert.deepEqual(xs, [20, 120], "x offset should be updated");
        });

        it("Should correctly arrange all cells when moving slaves", function(){
            //arrange
            var element1 = new UIElement();
            var element2 = new UIElement();

            element1.setProps({
                id: "master1",
                br: new Rect(0, 0, 100, 100)
            });
            element2.setProps({
                id: "master2",
                br: new Rect(0, 0, 100, 100)
            });

            this.app.activePage.add(element1);
            this.app.activePage.add(element2);

            var repeater = this.makeRepeater([element1, element2]);
            repeater.prepareAndSetProps({width: 300});
            this.app.relayout();

            //act
            var slave = repeater.children[2].children[1];
            slave.applyTranslation(new Point(-10, 0));
            this.app.relayout();

            //assert
            assert.deepEqual(repeater.children.map(x => x.width()), [110, 110, 110]);
        });
    });

    describe("Insertion scenarios", function(){
        it("Should repeat inserted elements", function(){
            //arrange
            var element = new UIElement();

            element.setProps({
                id: "master",
                name: "old",
                width: 100,
                height: 100
            });

            this.app.activePage.add(element);

            var repeater = this.makeRepeater([element]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //act
            var circle = new Circle();
            circle.setProps({id: "circle", width: 100, height: 100, name: "new"});

            repeater.children[1].insert(circle, 0);
            this.app.relayout();

            //assert
            assert.deepEqual(repeater.children.map(x => x.children.length), [2, 2], "Inserted element not repeated");
            assert.deepEqual(repeater.children.map(x => x.children.map(e => e.name())),
                [["new", "old"], ["new", "old"]], "Wrong position for repeated elements");
        });
        it("Insertions should re-arrange cells", function(){
            //arrange
            var element = new UIElement();

            element.setProps({
                id: "master",
                name: "old",
                width: 100,
                height: 100
            });

            this.app.activePage.add(element);

            var repeater = this.makeRepeater([element]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //act
            var circle = new Circle();
            circle.setProps({id: "circle", width: 110, height: 100, name: "new"});
            repeater.children[1].insert(circle, 0);

            this.app.relayout();

            //assert
            assert.deepEqual(repeater.children.map(x => x.width()), [110, 110]);
        });
        it("Should repeat insertions into nested containers", function(){
            //arrange
            var containers = [];
            for (var i = 0; i < 3; i++){
                var container = new Container();
                container.setProps({width: 100, height: 100, name: "container" + i});
                for (var j = 0; j < 3; j++){
                    var inner = new Container();
                    inner.setProps({name: "container" + i + "_" + j});
                    container.add(inner);

                    for (var k = 0; k < 3; k++){
                        var child = new UIElement();
                        child.setProps({name: "child" + i + "_" + j + "_" + k});
                        inner.add(child);
                    }
                }
                containers.push(container);
            }

            containers.forEach(x => this.app.activePage.add(x));

            var repeater = this.makeRepeater(containers);

            repeater.prepareAndSetProps({width: 300});
            this.app.relayout();

            //act
            var circle = new Circle();
            circle.setProps({id: "circle", width: 100, height: 100, name: "circle"});
            var parent = repeater.children[1].children[2].children[0];

            parent.insert(circle, 1);

            this.app.relayout();

            //assert
            var names = repeater.children.map(x => x.children[2].children[0].children[1].name());
            assert.deepEqual(names, ["circle", "circle", "circle"], "Wrong position for repeated elements");
        });
        it("Should sync deletions", function(){
            //arrange
            var element1 = new UIElement();
            element1.setProps({name: "element1", width: 100, height: 100});

            var element2 = new UIElement();
            element2.setProps({name: "element2", width: 100, height: 100});

            var element3 = new UIElement();
            element3.setProps({name: "element3", width: 100, height: 100});

            this.app.activePage.add(element1);
            this.app.activePage.add(element2);
            this.app.activePage.add(element3);

            var repeater = this.makeRepeater([element1, element2, element3]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //act
            var clone2 = repeater.children[1].findElementByName(element2.name());

            repeater.children[1].remove(clone2);
            this.app.relayout();

            //assert
            var names = repeater.children.map(x => x.children.map(e => e.name()));
            assert.deepEqual(names, [["element1", "element3"], ["element1", "element3"]]);
        });
        it("Should sync z-order changes", function(){
            //arrange
            var element1 = new UIElement();
            element1.setProps({name: "element1", width: 100, height: 100});

            var element2 = new UIElement();
            element2.setProps({name: "element2", width: 100, height: 100});

            var element3 = new UIElement();
            element3.setProps({name: "element3", width: 100, height: 100});

            this.app.activePage.add(element1);
            this.app.activePage.add(element2);
            this.app.activePage.add(element3);

            var repeater = this.makeRepeater([element1, element2, element3]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //act
            var clone3 = repeater.children[1].findElementByName(element3.name());
            clone3.parent().changePosition(clone3, 1);
            this.app.relayout();

            //assert
            var names = repeater.children.map(x => x.children.map(e => e.name()));
            assert.deepEqual(names, [["element1", "element3", "element2"], ["element1", "element3", "element2"]]);
        });
        it("Should handle creation of inner groups", function(){
            //arrange
            var element1 = new UIElement();
            element1.setProps({name: "element1", width: 100, height: 100});

            var element2 = new UIElement();
            element2.setProps({name: "element2", width: 100, height: 100});

            this.app.activePage.add(element1);
            this.app.activePage.add(element2);

            var repeater = this.makeRepeater([element1, element2]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //act
            Selection.makeSelection(repeater.children[1].children);
            this.app.actionManager.invoke("groupElements");
            this.app.relayout();

            //assert
            var groups = repeater.children.map(x => x.children[0] instanceof GroupContainer);
            assert.deepEqual(groups, [true, true], "Groups not created");

            var counts = repeater.children.map(x => x.children[0].count());
            assert.deepEqual(counts, [2, 2], "Wrong group contents");
        });
        it("Should repeat moves within nested containers", function(){
            //arrange
            var container1 = new Container();
            var container2 = new Container();

            container1.setProps({width: 100, height: 100, name: "container1"});
            container2.setProps({width: 100, height: 100, name: "container1"});

            var circle = new Circle();
            circle.setProps({id: "circle", width: 100, height: 100, name: "circle"});
            container1.add(circle);

            this.app.activePage.add(container1);
            this.app.activePage.add(container2);

            var repeater = this.makeRepeater([container1, container2]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //act
            circle = repeater.children[1].children[0].children[0];
            container2 = repeater.children[1].children[0];

            container2.add(circle);
            this.app.relayout();

            //assert
            var names = repeater.children.map(x => x.children[0].children[0].name());
            assert.deepEqual(names, ["circle", "circle"], "Element must change parent in all cells");
        });
    });

    describe("Sync scenarios", function(){
        it("Should restore repeater and operations from primitives", function(){
            //arrange
            var element = new UIElement();
            element.setProps({
                id: "element",
                br: new Rect(0, 0, 100, 0)
            });

            this.app.activePage.add(element);
            var repeater = this.makeRepeater([element]);
            var savepoint = this.app.createSavePoint();

            repeater.prepareAndSetProps({width: 300});
            this.app.relayout();

            var slave = repeater.children[2].children[0];

            slave.prepareAndSetProps({br: new Rect(0, 0, 50, 0)});
            this.app.relayout();

            //act
            this.app.replayFromSavePoint(savepoint);

            //assert
            repeater = this.app.activePage.getElementById(repeater.id());
            assert.deepEqual(repeater.children.map(x => x.x()), [0, 100, 200], "Wrong cell positions");
            assert.deepEqual(this.mapChildren(repeater, x => x.width()), [50, 50, 50], "Wrong element width");
        });
        it("Should restore elements with custom properties", function(){
            //arrange
            var element = new UIElement();
            element.setProps({
                id: "element",
                name: "master",
                width: 100
            });

            this.app.activePage.add(element);
            var repeater = this.makeRepeater([element]);
            var savepoint = this.app.createSavePoint();

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            var slave = repeater.children[1].children[0];

            slave.prepareAndSetProps({name: "slave"});
            this.app.relayout();

            //act
            this.app.replayFromSavePoint(savepoint);

            //assert
            repeater = this.app.activePage.getElementById(repeater.id());
            assert.deepEqual(this.mapChildren(repeater, x => x.name()), ["master", "slave"]);
        });
        it("Should correctly restore repeater from scratch", function(){
            //arrange
            var savepoint = this.app.createSavePoint();

            var element1 = new UIElement();
            element1.setProps({name: "element1", width: 100, height: 100});

            this.app.activePage.add(element1);

            var repeater = this.makeRepeater([element1]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            //act
            this.app.replayFromSavePoint(savepoint);

            repeater = this.app.activePage.getElementById(repeater.id());

            repeater.prepareAndSetProps({width: 300});
            this.app.relayout();

            //assert
            var counts = repeater.children.map(x => x.children.length);
            assert.deepEqual(counts, [1, 1, 1], "No new elements should be added or removed");

            var matrices = repeater.children.map(x => !!x.children[0].viewMatrix());
            assert.deepEqual(matrices, [true, true, true], "View matrices should be initialized");
        });

        it("Should correctly restore repeater with insertions from scratch", function(){
            //arrange
            var savepoint = this.app.createSavePoint();

            var element1 = new UIElement();
            element1.setProps({name: "element1", width: 100, height: 100});

            this.app.activePage.add(element1);

            var repeater = this.makeRepeater([element1]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            var circle = new Circle();
            circle.setProps({id: "circle", width: 100, height: 100, name: "new"});

            repeater.children[1].insert(circle, 0);
            this.app.relayout();

            //act
            this.app.replayFromSavePoint(savepoint);

            repeater = this.app.activePage.getElementById(repeater.id());

            //assert
            var counts = repeater.children.map(x => x.children.length);
            assert.deepEqual(counts, [2, 2], "New element must be preserved in all cells");

            var matrices = this.mapChildren(repeater, x => !!x.viewMatrix());
            assert.deepEqual(matrices, [true, true, true, true], "View matrices should be initialized");
        });
        it("Should correctly restore repeater with deletions from scratch", function(){
            //arrange
            var savepoint = this.app.createSavePoint();

            var element1 = new UIElement();
            var element2 = new UIElement();

            element1.setProps({name: "element1", width: 100, height: 100});
            element2.setProps({name: "element2", width: 100, height: 100});

            this.app.activePage.add(element1);
            this.app.activePage.add(element2);

            var repeater = this.makeRepeater([element1, element2]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            element1 = repeater.getElementById(element1.id());

            element1.parent().remove(element1);
            this.app.relayout();

            //act
            this.app.replayFromSavePoint(savepoint);

            repeater = this.app.activePage.getElementById(repeater.id());

            //assert
            var counts = repeater.children.map(x => x.children.length);
            assert.deepEqual(counts, [1, 1]);
        });
        it("Should correctly restore repeater with z-order changes from scratch", function(){
            //arrange
            var savepoint = this.app.createSavePoint();

            var element1 = new UIElement();
            var element2 = new UIElement();

            element1.setProps({name: "element1", width: 100, height: 100});
            element2.setProps({name: "element2", width: 100, height: 100});

            this.app.activePage.add(element1);
            this.app.activePage.add(element2);

            var repeater = this.makeRepeater([element1, element2]);

            repeater.prepareAndSetProps({width: 200});
            this.app.relayout();

            element2 = repeater.getElementById(element2.id());

            element2.parent().changePosition(element2, 0);
            this.app.relayout();

            //act
            this.app.replayFromSavePoint(savepoint);

            repeater = this.app.activePage.getElementById(repeater.id());

            //assert
            var counts = this.mapChildren(repeater, x => x.name());
            assert.deepEqual(counts, ["element2", "element1", "element2", "element1"]);
        });
    });

    describe("Clone scenarios", function(){
        it("Should clone repeater correctly", function(){
            //arrange
            var element = new UIElement();

            element.setProps({
                id: "master",
                width: 100,
                height: 100
            });

            this.app.activePage.add(element);

            var repeater = this.makeRepeater([element]);

            repeater.prepareAndSetProps({width: 200, height: 200});
            this.app.relayout();

            //act
            Selection.makeSelection([repeater]);
            this.app.actionManager.invoke("duplicate");
            this.app.relayout();

            //assert
            var clone = this.app.activePage.findSingleChildOrDefault(x => x instanceof RepeatContainer && x.id() !== repeater.id());
            assert.equal(repeater.children.length, clone.children.length);
        });
    });
});