import {registerExample} from "./example";
import { Rect, Brush, Rectangle, StrokePosition, renderer, model, IRectangle, Matrix, Container, Origin } from "carbon-core";

registerExample("dataUrl: artboard zoomed out", function(app, view, artboard){
    artboard.boundaryRect(Rect.fromSize(400, 800));
    artboard.fill = (Brush.createFromCssColor("green"));
    artboard.translate(1000, 0);

    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1', fill: Brush.createFromCssColor("red")});
    artboard.add(rect1);

    var rect2 = rect1.clone();
    rect2.setProps({name: 'rect 2'});
    rect2.translate(300, 700);
    artboard.add(rect2);

    view.draw();

    var dataUrl = renderer.elementToDataUrlScaled(artboard, Rect.fromSize(300, 300), 4);
    logDataUrl(dataUrl);
});

registerExample("dataUrl: page", function(app, view, artboard){
    let size = Rect.fromSize(400, 800);
    let bg = model.createRectangle(size, { fill: Brush.createFromCssColor("green")});

    artboard.boundaryRect(size);
    artboard.add(bg);
    artboard.translate(1000, 0);

    bg = bg.clone() as IRectangle;
    bg.setProps({ fill: Brush.createFromCssColor("red") });
    var artboard2 = artboard.clone();
    artboard2.add(bg);
    artboard2.translate(600, 0);
    app.activePage.add(artboard2);

    view.draw();

    //TODO: does not work
    var dataUrl = renderer.elementToDataUrlScaled(app.activePage, Rect.fromSize(300, 300), 4);
    logDataUrl(dataUrl);
});

registerExample("dataUrl: detached element", function(app, view, artboard){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1',
        fill: Brush.createFromCssColor("red"),
        stroke: Brush.createFromCssColor("black"),
        strokePosition: StrokePosition.Inside,
        strokeWidth: 5
    });

    view.draw();

    var dataUrl = renderer.elementToDataUrlScaled(rect1, Rect.fromSize(300, 300), 4);
    logDataUrl(dataUrl);
});

registerExample("dataUrl: sprite", function(app, view, artboard){
    var rect1 = new Rectangle();
    rect1.setProps({width: 100, height: 100, name: 'rect 1',
        fill: Brush.createFromCssColor("red"),
        stroke: Brush.createFromCssColor("black"),
        strokePosition: StrokePosition.Inside,
        strokeWidth: 5
    });
    rect1.translate(100, 100);

    var rect2 = rect1.clone();
    rect2.setProps({
        fill: Brush.createFromCssColor("green"),
        stroke: Brush.createFromCssColor("blue"),
    });
    rect2.translate(200, 200);

    artboard.add(rect1);
    artboard.add(rect2);

    let context = renderer.contextPool.getContext(200, 100, 2);
    renderer.elementToContext(rect1, context, 2);

    let tileMatrix = Matrix.create();
    tileMatrix.translate(100, 0);
    tileMatrix.scale(.5, .5, 50, 50);
    renderer.elementToContext(rect2, context, 2, tileMatrix);

    var dataUrl = context.canvas.toDataURL();
    logDataUrl(dataUrl);

    renderer.contextPool.releaseContext(context);
});

function logDataUrl(data: string) {
    console.log("%c                                                             ",`font-size:128px;display:block;width:240px;height:240px;background-repeat:no-repeat;background-size:contain;background-image:url('${data}');`);
}