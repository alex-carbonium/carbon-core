import CarbonExtension from "./CarbonExtesion";
import { IContributions, ContextBarPosition, IApp, ISelection, ChangeMode, IArtboardProps, ILayer, LayerType, IUIElement, IArtboard, IRect, ArtboardType, IText, UIElementFlags, IContainer, Origin } from "carbon-core";
import Matrix from "../math/matrix";
import Point from "../math/point";
import Container from "../framework/Container";

const GridMargin = 5;

export default class PowerToys extends CarbonExtension {
    initialize(contributions: IContributions) {
        //TODO: add label registrations
        contributions.addActions([
            {
                id: "toys.gridArrange",
                name: "@toys.gridArrange",
                callback: this.gridArrange,
                condition: selection => selection.elements.length > 3
            },
            {
                id: "toys.fitParentToChildren",
                name: "@toys.fitParentToChildren",
                callback: this.fitParentToChildren,
                condition: selection => selection.elements.length === 1 && selection.elements[0] instanceof Container
            },
            {
                id: "toys.fitSize",
                name: "@toys.fitSize",
                callback: this.fitSize,
                condition: selection => selection.elements.length > 0
            }
        ]);

        contributions.addShortcuts([
            { key: "w g", action: "toys.gridArrange" },
            { key: "w a", action: "toys.fitParentToChildren" },
            { key: "w f", action: "toys.fitSize" }
        ])
    }

    gridArrange = (selection: ISelection) => {
        let w = Number.NEGATIVE_INFINITY;
        let h = Number.NEGATIVE_INFINITY;
        let xmin = Number.POSITIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;

        for (let i = 0; i < selection.elements.length; i++) {
            let bb = selection.elements[i].getBoundingBox();
            w = Math.max(w, bb.width);
            h = Math.max(h, bb.height);
            xmin = Math.min(xmin, bb.x);
            ymin = Math.min(ymin, bb.y);
        }

        let cols = Math.ceil(Math.sqrt(selection.elements.length));
        let c = 0, x = xmin, y = ymin;
        for (let i = 0; i < selection.elements.length; i++) {
            let element = selection.elements[i];
            let bb = element.getBoundingBox();
            let v = Point.create(x - bb.x, y - bb.y);
            element.applyTranslation(v);

            if (++c % cols === 0) {
                x = xmin;
                y += h + GridMargin;
            }
            else {
                x += w + GridMargin;
            }
        }
    }

    fitSize = (selection: ISelection) => {
        const targetSize = 32;
        for (let i = 0; i < selection.elements.length; i++) {
            let element = selection.elements[i];
            let bb = element.getBoundingBoxGlobal();
            let sx = targetSize/bb.width;
            let sy = targetSize/bb.height;

            let min = Math.min(sx, sy);
            if (min < 1) {
                element.applyScaling2(min, min, Origin.Center);
            }
        }
    }

    fitParentToChildren = (selection: ISelection) => {
        let container = selection.elements[0] as IContainer;
        if (container.children.length === 0) {
            return;
        }

        let xmin = Number.POSITIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;
        let xmax = Number.NEGATIVE_INFINITY;
        let ymax = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < container.children.length; i++) {
            let bb = container.children[i].getBoundingBox();
            xmax = Math.max(xmax, bb.x + bb.width);
            ymax = Math.max(ymax, bb.y + bb.height);
            xmin = Math.min(xmin, bb.x);
            ymin = Math.min(ymin, bb.y);
        }

        let v = Point.create(xmin, ymin);
        container.applyDirectedTranslation(v);
        container.boundaryRect(container.boundaryRect().withSize(xmax - xmin, ymax - ymin));

        let dv = v.negate();
        for (let i = 0; i < container.children.length; i++) {
            container.children[i].applyTranslation(dv);
        }
    }
}