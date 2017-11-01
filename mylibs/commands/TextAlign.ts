import Text from "../framework/text/Text";
import { IApp, IUIElement } from "carbon-core";
import Font from "../framework/Font";
import { TextAlign } from "carbon-basics";

export class TextAlignCommand {
    static run(app: IApp, selection: IUIElement[], mode) {
        if (!selection || selection.length === 0) {
            return;
        }
        let align = TextAlign.left;
        switch (mode) {
            case "center":
                align = TextAlign.center;
                break;
            case "right":
                align = TextAlign.right;
                break;
        }
        selection.forEach(e => {
            if(e instanceof Text) {
                let text = e as Text;
                let font = text.font();
                font = Font.extend(font, {align});
                text.prepareAndSetProps({font});
            }
        });
    }
}