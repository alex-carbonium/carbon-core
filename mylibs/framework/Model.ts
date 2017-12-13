import { IModel, IText, ITextProps, IUIElement, IUIElementProps, ISize, ILineProps, ILine, IStarProps, IStar, IRectangle, IRectangleProps, IContainer, IArtboardProps, IArtboard, IStateboard, IStateboardProps, ICircleProps, ICircle, IImageProps, IImage, FileProps, IFileElement, IPath, IPathProps, IArtboardFrameControl, IArtboardFrameControlProps } from "carbon-core";
import UIElement from "./UIElement";
import Text from "./text/Text";
import Rect from "../math/rect";
import Path from "../framework/Path";
import Image from "./Image";
import Line from "./Line";
import Star from "./Star";
import Circle from "./Circle";
import { FileElement } from "./FileElement";
import Rectangle from "./Rectangle";
import Container from "./Container";
import Artboard from "./Artboard";
import Stateboard from "./StateBoard";
import { ArrangeStrategies } from "./Defs";
import InteractiveContainer from "./InteractiveContainer";
import { IPathPoint } from "carbon-geometry";
import ArtboardFrameControl from "./ArtboardFrame";

export class Model implements IModel {
    createElement(size?: ISize, props?: Partial<IUIElementProps>): IUIElement {
        let element = new UIElement();
        this.setSizeAndProps(element, size, props);
        return element;
    }
    createText(size?: ISize, props?: Partial<ITextProps>): IText {
        let text = new Text();
        this.setSizeAndProps(text, size, props);
        return text;
    }
    createImage(size?: ISize, props?: Partial<IImageProps>): IImage {
        let image = new Image();
        this.setSizeAndProps(image, size, props);
        return image;
    }
    createFile(props?: Partial<FileProps>): IFileElement {
        let file = new FileElement();
        this.setSizeAndProps(file, null, props);
        return file;
    }
    createRectangle(size?: ISize, props?: Partial<IRectangleProps>): IRectangle {
        let rectangle = new Rectangle();
        this.setSizeAndProps(rectangle, size, props);
        return rectangle;
    }
    createOval(size?: ISize, props?: Partial<ICircleProps>): ICircle {
        let oval = new Circle();
        this.setSizeAndProps(oval, size, props);
        return oval;
    }
    createStar(size?: ISize, props?: Partial<IStarProps>): IStar {
        let star = new Star();
        this.setSizeAndProps(star, size, props);
        return star;
    }
    createPath(points:IPathPoint[], size?: ISize, props?: Partial<IPathProps>): IPath {
        let path = new Path();
        points.forEach(p=>path.addPoint(p));
        this.setSizeAndProps(path, size, props);
        path.adjustBoundaries();

        return path;
    }

    createArtboardFrame(artboardName:string, size?: ISize, props?: Partial<IArtboardFrameControlProps>): IArtboardFrameControl {
        let frame = new ArtboardFrameControl();
        this.setSizeAndProps(frame, size, props);
        frame.artboardName = artboardName;
        return frame;
    }

    createLine(props?: Partial<ILineProps>): ILine {
        let line = new Line();
        this.setSizeAndProps(line, null, props);
        return line;
    }
    createCanvas(size?: ISize, props?: Partial<IUIElementProps>): IContainer {
        let canvas = new InteractiveContainer();
        this.setSizeAndProps(canvas, size, props);
        this.setSizeAndProps(canvas, null, { arrangeStrategy: ArrangeStrategies.Canvas });
        return canvas;
    }

    createArtboard(size?: ISize, props?: Partial<IArtboardProps>): IArtboard {
        let artboard = new Artboard();
        this.setSizeAndProps(artboard, size, props);
        return artboard;
    }
    createStateboard(size?: ISize, props?: Partial<IStateboardProps>): IStateboard {
        let stateboard = new Stateboard();
        this.setSizeAndProps(stateboard, size, props);
        return stateboard;
    }

    private setSizeAndProps(element: IUIElement, size?: ISize, props?: Partial<IUIElementProps>) {
        if (size) {
            element.prepareAndSetProps({ br: new Rect(0, 0, size.width, size.height) });
        }
        if (props) {
            element.prepareAndSetProps(props);
        }
    }
}

export const model = new Model();