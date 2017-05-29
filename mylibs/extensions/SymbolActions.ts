import CarbonExtension from "./CarbonExtesion";
import { IContributions, ContextBarPosition, IApp, ISelection, ChangeMode, IArtboardProps, ILayer, LayerTypes, IUIElement, IContainer, IRect, ArtboardType, IText } from "carbon-core";
import Constraints from "framework/Constraints";
import Symbol, {TextMarker, BackgroundMarker} from "../framework/Symbol";
import Artboard from "../framework/Artboard";
import GroupContainer from "../framework/GroupContainer";
import Matrix from "../math/matrix";
import Rect from "../math/rect";

export default class SymbolActions extends CarbonExtension {
    initialize(contributions: IContributions) {
        //TODO: add label registrations
        contributions.addActions([
            {
                id: "symbols.create",
                name: "@symbols.create",
                callback: this.createSymbolFromSelection,
                condition: selection => !!selection.elements.length
            },
            {
                id: "symbols.markAsText",
                name: "@symbols.markAsText",
                callback: this.markAsText,
                condition: SymbolActions.isOnMasterArtboard
            },
            {
                id: "symbols.markAsBackground",
                name: "@symbols.markAsBackground",
                callback: this.markAsBackground,
                condition: SymbolActions.isOnMasterArtboard
            },
            {
                id: "symbols.editMaster",
                name: "@symbols.editMaster",
                callback: this.editMasterSymbol,
                condition: selection => selection.elements.length === 1 && selection.elements[0] instanceof Symbol
            },
            {
                id: "symbols.detach",
                name: "@symbols.detach",
                callback: this.detachInstance,
                condition: selection => selection.elements.length && selection.elements.every(x => x instanceof Symbol)
            }
        ]);

        contributions.addContextMenuGroup(
            "@symbols",
            [
                "symbols.create",
                "symbols.markAsBackground",
                "symbols.markAsText",
                "symbols.editMaster",
                "symbols.detach",
            ],
            ContextBarPosition.Right
        );

        contributions.addShortcuts({
            windows: [
                { key: "ctrl+shift+e", action: "symbols.create" }
            ],
            mac: [
                { key: "meta+shift+e", action: "symbols.create" }
            ],
        })
    }

    static isOnMasterArtboard(selection: ISelection): boolean{
        return selection.elements.every(x => {
            var artboard = x.findAncestorOfType(Artboard);
            if (!artboard){
                return false;
            }
            return artboard.props.type === ArtboardType.Symbol;
        })
    }

    createSymbolFromSelection = (selection: ISelection) => {
        var elements = selection.elements;
        var sorted: IUIElement[] = elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        var element: IUIElement = elements[0];
        var parent: IContainer = element.parent();
        var group = new GroupContainer();

        selection.makeSelection([]);
        parent.add(group, ChangeMode.Self);

        for (let i = 0, l = sorted.length; i < l; ++i) {
            let element = sorted[i];
            group.insert(element.clone(), i, ChangeMode.Self);
        }
        group.performArrange(null, ChangeMode.Self);

        var boundingBox: IRect = group.getBoundingBoxGlobal();
        var globalMatrix = group.globalViewMatrixInverted();

        // create artboard of the same size
        var page = App.Current.activePage;
        var position = page.getNextAvailiablePosition(boundingBox.width, boundingBox.height);
        var matrix = Matrix.createTranslationMatrix(position.x, position.y);

        var artboard = new Artboard();
        page.add(artboard);

        artboard.setProps({
            br: new Rect(0, 0, boundingBox.width, boundingBox.height),
            m: matrix,
            allowVerticalResize: true,
            allowHorizontalResize: true,
            type: ArtboardType.Symbol
        });
        App.Current.activePage.nameProvider.assignNewName(artboard, "");

        // find where to place artboard
        for (let i = 0, l = sorted.length; i < l; ++i) {
            let e: any = sorted[i];
            var vm = group.children[i].viewMatrix();
            e.setTransform(vm);
            e.setProps({
                constraints: Constraints.StretchAll
            });
            artboard.insert(e, i);
        }

        var artboardControl = new Symbol();
        parent.add(artboardControl);
        artboardControl.setProps({
            br: group.props.br,
            m: group.props.m,
            source: {
                pageId: page.id(),
                artboardId: artboard.id()
            },
            name: artboard.name()
        });
        App.Current.activePage.nameProvider.assignNewName(artboardControl);

        parent.remove(group, ChangeMode.Self);

        selection.makeSelection([artboardControl]);
        return artboardControl;
    }

    editMasterSymbol = (selection: ISelection) => {
        var symbol = selection.elements[0] as Symbol;

        var artboard = symbol.findSourceArtboard(this.app);
        if (!artboard) {
            return;
        }

        var page = this.app.pages.find(x => x.id() === symbol.props.source.pageId);
        this.app.setActivePage(page);
        this.workspace.view.ensureVisible(artboard);
        selection.makeSelection([artboard]);
    }

    detachInstance = (selection: ISelection) => {
        var symbols = selection.elements as Symbol[];
        var children = [];
        symbols.forEach(symbol => {
            var parent = symbol.parent()
            var index = symbol.zOrder();
            for (var i = 0; i < symbol.children.length; i++) {
                var child = symbol.children[i];
                var clone = child.clone();
                clone.setTransform(parent.globalMatrixToLocal(child.globalViewMatrix()));
                parent.insert(clone, index++);
                children.push(clone);
            }
            parent.remove(symbol);
        });
        selection.makeSelection(children);
    }

    markAsBackground = (selection: ISelection) => {
        var fill = selection.elements[0].fill();
        var stroke = selection.elements[0].stroke();

        for (var i = 0; i < selection.elements.length; i++) {
            var element = selection.elements[i];
            element.name(BackgroundMarker);
            if (i){
                element.prepareAndSetProps({fill, stroke});
            }
        }
    }

    markAsText = (selection: ISelection) => {
        var elements = selection.elements as IText[];
        var font = elements[0].font();

        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            element.name(TextMarker);
            if (i){
                element.prepareAndSetProps({font});
            }
        }
    }
}