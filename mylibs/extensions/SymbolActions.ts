import CarbonExtension from "./CarbonExtesion";
import { IContributions, ContextBarPosition, IApp, ISelection, ChangeMode, IArtboardProps, ILayer, LayerTypes, IUIElement, IContainer, IRect, ArtboardResource, Constraints } from "carbon-core";
import ArtboardTemplateControl from "../framework/ArtboardTemplateControl";
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
                id: "symbols.editMaster",
                name: "@symbols.editMaster",
                callback: this.editMasterSymbol,
                condition: selection => selection.elements.length === 1 && selection.elements[0] instanceof ArtboardTemplateControl
            },
            {
                id: "symbols.detach",
                name: "@symbols.detach",
                callback: this.detachInstance,
                condition: selection => selection.elements.length && selection.elements.every(x => x instanceof ArtboardTemplateControl)
            }
        ]);

        contributions.addContextMenuGroup(
            "@symbols",
            [
                "symbols.create",
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
            resource: ArtboardResource.Symbol
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

        var artboardControl = new ArtboardTemplateControl();
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
    }

    editMasterSymbol = (selection: ISelection) => {
        var symbol = selection.elements[0] as ArtboardTemplateControl;

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
        var symbols = selection.elements as ArtboardTemplateControl[];
        var children = [];
        symbols.forEach(symbol => {
            var artboard = symbol.findSourceArtboard(this.app);
            if (artboard){
                var parent = symbol.parent()
                var index = symbol.zOrder();
                for (var i = 0; i < symbol.children.length; i++) {
                    var child = symbol.children[i];
                    var source = artboard.findNodeByIdBreadthFirst<IUIElement>(child.sourceId());
                    var clone = source.clone();
                    clone.setTransform(parent.globalMatrixToLocal(child.globalViewMatrix()));
                    parent.insert(clone, index++);
                    children.push(clone);
                }
                parent.remove(symbol);
            }
        });
        selection.makeSelection(children);
    }
}