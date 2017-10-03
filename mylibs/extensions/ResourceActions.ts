import CarbonExtension from "./CarbonExtesion";
import { IContributions, ContextBarPosition, IApp, ISelection, ChangeMode, IArtboardProps, ILayer, LayerType, IUIElement, IContainer, IRect, ArtboardType, IText, UIElementFlags, IArtboard } from "carbon-core";
import Constraints from "framework/Constraints";
import Symbol from "../framework/Symbol";
import Artboard from "../framework/Artboard";
import Text from "../framework/text/Text";
import GroupContainer from "../framework/GroupContainer";
import Matrix from "../math/matrix";
import Rect from "../math/rect";

export default class ResourceActions extends CarbonExtension {
    initialize(contributions: IContributions) {
        //TODO: add label registrations
        contributions.addActions([
            {
                id: "palette.addItem",
                name: "@resources.markAsPaletteItem",
                callback: this.markAsPaletteItem,
                condition: selection => ResourceActions.isInPalette(selection) &&
                            selection.elements.length &&
                            selection.elements.every(x => !x.hasFlags(UIElementFlags.PaletteItem))
            },
            {
                id: "palette.removeItem",
                name: "@resources.removeFromPalette",
                callback: this.removeFromPalette,
                condition: selection =>selection.elements.length && selection.elements.some(x => x.hasFlags(UIElementFlags.PaletteItem))
            },
            {
                id: "iconset.addItem",
                name: "@resources.markAsIcon",
                callback: this.markAsIconItem,
                condition: selection => ResourceActions.isInIconSet(selection) &&
                            selection.elements.length &&
                            selection.elements.every(x => !x.hasFlags(UIElementFlags.Icon))
            },
            {
                id: "iconset.removeItem",
                name: "@resources.removeFromIconSet",
                callback: this.removeFromIcon,
                condition: selection =>selection.elements.length && selection.elements.some(x => x.hasFlags(UIElementFlags.Icon))
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

        contributions.addContextMenuGroup(
            "@iconset",
            [
                "iconset.addItem",
                "iconset.removeItem"
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

    static isInIconSet(selection: ISelection): boolean{
        return selection.elements.length && selection.elements.every(x => {
            let artboard = x.findAncestorOfType(Artboard);
            if (!artboard){
                return false;
            }

            return (artboard.props.type === ArtboardType.IconSet);
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

    markAsIconItem = (selection: ISelection) => {
        var newSelection: string[] = [];

        for (var element of selection.elements) {
            element.addFlags(UIElementFlags.Icon);
        }
    }

    removeFromIcon = (selection: ISelection) => {
        var newSelection: string[] = [];

        for (var element of selection.elements) {
            element.removeFlags(UIElementFlags.Icon);
        }
    }
}