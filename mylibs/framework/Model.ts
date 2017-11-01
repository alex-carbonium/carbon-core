import { IModel, IText, ITextProps, IUIElement, IUIElementProps, ISize, ILineProps, ILine, IStarProps, IStar, IRectangle, IRectangleProps, IContainer } from "carbon-core";
import UIElement from "./UIElement";
import Text from "./text/Text";
import Rect from "../math/rect";
import Line from "./Line";
import Star from "./Star";
import Rectangle from "./Rectangle";
import Container from "./Container";
import { ArrangeStrategies } from "./Defs";
import InteractiveContainer from "./InteractiveContainer";

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
    createRectangle(size?: ISize, props?: Partial<IRectangleProps>): IRectangle {
        let rectangle = new Rectangle();
        this.setSizeAndProps(rectangle, size, props);
        return rectangle;
    }
    createStar(size?: ISize, props?: Partial<IStarProps>): IStar {
        let star = new Star();
        this.setSizeAndProps(star, size, props);
        return star;
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