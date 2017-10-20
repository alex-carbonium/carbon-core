import { IModel, IText, ITextProps, IUIElement, IUIElementProps, ISize } from "carbon-core";
import UIElement from "./UIElement";
import Text from "./text/Text";
import Rect from "../math/rect";

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

    private setSizeAndProps(element: IUIElement, size: ISize, props: Partial<IUIElementProps>) {
        if (size) {
            element.prepareAndSetProps({ br: new Rect(0, 0, size.width, size.height) });
        }
        if (props) {
            element.prepareAndSetProps(props);
        }
    }
}

export const model = new Model();