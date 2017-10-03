import CarbonExtension from "./CarbonExtesion";
import { IContributions, ContextBarPosition, IApp, ISelection, ChangeMode, IArtboardProps, ILayer, LayerType, IUIElement, IContainer, IRect, ArtboardType, IText, UIElementFlags, IArtboard, IGroupContainer } from "carbon-core";
import Constraints from "framework/Constraints";
import Symbol from "../framework/Symbol";
import Artboard from "../framework/Artboard";
import Text from "../framework/text/Text";
import GroupArrangeStrategy from "../framework/arrangeStrategy/GroupArrangeStrategy";
import Matrix from "../math/matrix";
import Rect from "../math/rect";
import Container from "../framework/Container";

export default class SymbolActions extends CarbonExtension {
    initialize(contributions: IContributions) {
        //TODO: add label registrations
        contributions.addActions([
            {
                id: "symbols.create",
                name: "@symbols.create",
                callback: this.createSymbolFromSelection,
                condition: selection => selection.elements.length && !selection.elements.some(x => x instanceof Artboard)
            },
            {
                id: "symbols.markAsText",
                name: "@symbols.markAsText",
                callback: this.markAsText,
                condition: selection => SymbolActions.isInSymbol(selection) && selection.elements.every(x => x instanceof Text)
            },
            {
                id: "symbols.markAsBackground",
                name: "@symbols.markAsBackground",
                callback: this.markAsBackground,
                condition: SymbolActions.isInSymbol
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

    static isInSymbol(selection: ISelection): boolean{
        return selection.elements.length && selection.elements.every(x => {
            let artboard = x.findAncestorOfType(Artboard);
            if (!artboard){
                return false;
            }
            if (artboard.props.type === ArtboardType.Symbol) {
                return true;
            }
            return !!x.findAncestorOfType(Symbol);
        });
    }

    createSymbolFromSelection = (selection: ISelection) => {
        let elements = selection.elements;
        let sorted: IUIElement[] = elements.slice().sort((a, b) => a.zOrder() - b.zOrder());
        let element: IUIElement = elements[0];
        let parent: IContainer = element.parent();
        let group = new MeasuringGroupContainer();

        selection.makeSelection([]);
        parent.add(group, ChangeMode.Self);

        for (let i = 0, l = sorted.length; i < l; ++i) {
            let element = sorted[i];
            group.insert(element.clone(), i, ChangeMode.Self);
        }
        GroupArrangeStrategy.arrange(group, null, ChangeMode.Self);

        let boundingBox: IRect = group.getBoundingBoxGlobal();
        let globalMatrix = group.globalViewMatrixInverted();

        // create artboard of the same size
        let page = App.Current.activePage;
        let position = page.getNextAvailiablePosition(boundingBox.width, boundingBox.height);
        let matrix = Matrix.createTranslationMatrix(position.x, position.y);

        let artboard = new Artboard();
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
            let vm = group.children[i].viewMatrix();
            e.setTransform(vm);
            e.prepareAndSetProps({
                constraints: Constraints.StretchAll
            });
            artboard.insert(e, i);
        }

        var symbol = new Symbol();
        parent.add(symbol);
        symbol.setProps({
            br: group.props.br,
            m: group.props.m,
            source: {
                pageId: page.id(),
                artboardId: artboard.id()
            },
            name: artboard.name()
        });
        App.Current.activePage.nameProvider.assignNewName(symbol);

        parent.remove(group, ChangeMode.Self);

        selection.makeSelection([symbol]);
        return symbol;
    }

    editMasterSymbol = (selection: ISelection) => {
        var symbol = selection.elements[0] as Symbol;

        let artboard = symbol.findSourceArtboard(this.app);
        if (!artboard) {
            return;
        }

        let page = this.app.pages.find(x => x.id() === symbol.props.source.pageId);
        this.app.setActivePage(page);
        this.workspace.view.ensureCentered([artboard]);
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
        var newSelection: string[] = [];

        var parentData = this.findArtboardAndSymbol(selection);
        this.clearSymbolFlags(parentData.artboard, UIElementFlags.SymbolBackground);

        for (var i = 0; i < selection.elements.length; i++) {
            var element = selection.elements[i];
            element = parentData.artboard.getElementById(element.sourceId()) as IText;
            element.addFlags(UIElementFlags.SymbolBackground);
            if (i) {
                element.prepareAndSetProps({fill, stroke});
            }
            if (parentData.symbol) {
                newSelection.push(element.sourceId());
            }
        }

        if (newSelection.length) {
            selection.clearSelection();
            //needs to happen after relayout
            setTimeout(() => selection.makeSelection(newSelection.map(x => parentData.symbol.findClone(x))), 1);
        }
    }

    markAsText = (selection: ISelection) => {
        var elements = selection.elements as IText[];
        var font = elements[0].font();
        var newSelection: string[] = [];

        var parentData = this.findArtboardAndSymbol(selection);
        this.clearSymbolFlags(parentData.artboard, UIElementFlags.SymbolText);

        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            element = parentData.artboard.getElementById(element.sourceId()) as IText;
            element.addFlags(UIElementFlags.SymbolText);
            if (i) {
                element.prepareAndSetProps({font});
            }
            if (parentData.symbol) {
                newSelection.push(element.sourceId());
            }
        }

        if (newSelection.length) {
            selection.clearSelection();
            //needs to happen after relayout
            setTimeout(() => selection.makeSelection(newSelection.map(x => parentData.symbol.findClone(x))), 1);
        }
    }

    private findArtboardAndSymbol(selection: ISelection){
        var artboard: IArtboard = null;
        var symbol = selection.elements[0].findAncestorOfType(Symbol);
        if (symbol) {
            artboard = symbol.findSourceArtboard(this.app);
        }
        else {
            artboard = selection.elements[0].findAncestorOfType(Artboard);
        }
        return {artboard, symbol};
    }

    private clearSymbolFlags(artboard: IArtboard, flags: UIElementFlags) {
        artboard.applyVisitor((x: IUIElement) => x.removeFlags(flags));
    }
}

class MeasuringGroupContainer extends Container implements IGroupContainer {
    translateChildren() {
        return true;
    }
    wrapSingleChild() {
        return false;
    }
}