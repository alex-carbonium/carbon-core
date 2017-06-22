import CarbonExtension from "./CarbonExtesion";
import { IContributions, ContextBarPosition, IApp, ISelection, ChangeMode, IArtboardProps, ILayer, LayerTypes, IUIElement, IContainer, IRect, ArtboardType, IText, UIElementFlags, IArtboard } from "carbon-core";
import Constraints from "framework/Constraints";
import Symbol from "../framework/Symbol";
import Artboard from "../framework/Artboard";
import Text from "../framework/text/Text";
import GroupContainer from "../framework/GroupContainer";
import Matrix from "../math/matrix";
import Rect from "../math/rect";

export default class PaletteActions extends CarbonExtension {
    initialize(contributions: IContributions) {
        //TODO: add label registrations
        contributions.addActions([
            {
                id: "palette.addItem",
                name: "@resources.markAsPaletteItem",
                callback: this.markAsPaletteItem,
                condition: selection => PaletteActions.isInPalette(selection)
            },
            {
                id: "palette.removeItem",
                name: "@resources.removeFromPalette",
                callback: this.removeFromPalette,
                condition: selection =>selection.elements.length && selection.elements.some(x => x.hasFlags(UIElementFlags.PaletteItem))
            }
        ]);

        contributions.addContextMenuGroup(
            "@palette",
            [
                "palette.addItem",
                "palette.removeItem"
            ],
            ContextBarPosition.Right
        );

        // contributions.addShortcuts({
        //     windows: [
        //         { key: "ctrl+shift+e", action: "symbols.create" }
        //     ],
        //     mac: [
        //         { key: "meta+shift+e", action: "symbols.create" }
        //     ],
        // })
    }

    static isInPalette(selection: ISelection): boolean{
        return selection.elements.length && selection.elements.every(x => {
            let artboard = x.findAncestorOfType(Artboard);
            if (!artboard){
                return false;
            }

            return (artboard.props.type === ArtboardType.Palette);
        });
    }

    markAsPaletteItem = (selection: ISelection) => {
        var newSelection: string[] = [];

        for (var element of selection.elements) {
            element.addFlags(UIElementFlags.PaletteItem);
        }
    }

    removeFromPalette = (selection: ISelection) => {
        var newSelection: string[] = [];

        for (var element of selection.elements) {
            element.removeFlags(UIElementFlags.PaletteItem);
        }
    }
}