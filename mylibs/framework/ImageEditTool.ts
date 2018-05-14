import { intersectRects } from "../math/math";
import ImageSourceHelper from "./ImageSourceHelper";
import ImageContent from "./ImageContent";
import Rect from "../math/rect";
import Selection from "./SelectionModel";
import PropertyTracker from "./PropertyTracker";
import { ContentSizing, IImage, ImageSource } from "carbon-model";
import { ChangeMode, RenderEnvironment, IView, IController } from "carbon-core";

export class ImageEditTool {
    [name: string]: any;
    view:IView;
    controller:IController;

    constructor() {
        this._frame = null;
        this._tokens = null;
        this._origLayoutProps = null;
        this._snapClone = null;
        this._content = null;
    }

    attach(view:IView, controller:IController, frame: IImage, emptySource: ImageSource) {
        this._tokens = [];
        this._frame = frame;
        this.view = view;
        this.controller = controller;

        //full source rect {0, 0, 1000, 500}
        var fsr = ImageSourceHelper.boundaryRect(frame.source(), frame.runtimeProps.sourceProps);
        var sr = frame.runtimeProps.sourceProps.sr;
        var dr = frame.runtimeProps.sourceProps.dr;
        var sh = dr.width / sr.width;
        var sv = dr.height / sr.height;
        if (sr && dr) {
            fsr.x = Math.round(dr.x - sr.x * sh);
            fsr.y = Math.round(dr.y - sr.y * sv);
            fsr.width = fsr.width * sh + .5 | 0;
            fsr.height = fsr.height * sv + .5 | 0;
        }

        var contentProps = {
            br: Rect.Zero.withSize(fsr.width, fsr.height),
            m: this._frame.globalViewMatrix()
        };
        var content = new ImageContent(frame);
        content.prepareAndSetProps(contentProps, ChangeMode.Self);
        content.applyDirectedTranslation(fsr.topLeft(), ChangeMode.Self);
        content.activate();
        this._content = content;

        //TODO: add snapping inside rotated containers
        if (this._frame.globalViewMatrix().isTranslatedOnly()) {
            this._snapClone = this._frame.clone();
        }
        this._origLayoutProps = this._content.selectLayoutProps(true);

        //original frame is hidden, so it does not take part in snapping
        this._frame.setProps({ visible: false }, ChangeMode.Self);
        //leave the selection, but remove action frame
        if (this._frame.decorators && this._frame.decorators.length) {
            this._frame.decorators.forEach(x => this._frame.removeDecorator(x));
        }
        this._tokens.push(this.controller.clickEvent.bind(this.onClicked));
        this._tokens.push(this.view.interactionLayer.ondraw.bindHighPriority(this, this.layerdraw));

        this.view.interactionLayer.add(this._content);
        if (this._snapClone) {
            this.view.snapController.snapGuides.push(this._content, this._snapClone);
        }

        this._tokens.push(this.controller.actionManager.subscribe("cancel", () => {
            this.detach();
        }));

        this._tokens.push(this.controller.actionManager.subscribe("enter", () => {
            this.detach();
        }));

        this._tokens.push(this.controller.actionManager.subscribeToActionStart("delete", (a, e) => {
            this.detach(false);
            this._frame.setProps({ source: emptySource });
            e.handled = true;
        }));

        Selection.makeSelection([this._content], "new", false, true);
        App.Current.allowSelection(false);
    }
    detach(saveChanges = true) {
        if (saveChanges) {
            this._saveChanges();
        }

        if (this._snapClone) {
            this.view.snapController.removeGuides(this._content, this._snapClone);
        }

        if (this._tokens) {
            this._tokens.forEach(x => x.dispose());
            this._tokens = null;
        }
        if (this._content) {
            this._content.deactivate();
            this.view.interactionLayer.remove(this._content);
            //disposed content sometimes is still in the old selection...
            //this._content.dispose();
            this._content = null;
        }
        if (this._snapClone) {
            this._snapClone.dispose();
            this._snapClone = null;
        }
        if (this._clipClone) {
            this._clipClone.dispose();
            this._clipClone = null;
        }

        this._frame.setProps({ visible: true }, ChangeMode.Self);

        App.Current.allowSelection(true);
        Selection.makeSelection([this._frame], "new", false, true);
    }

    _saveChanges() {
        var layoutProps = this._content.selectLayoutProps(true);
        if (this._areSameLayoutProps(layoutProps, this._origLayoutProps)) {
            return;
        }

        var cr = this._content.boundaryRect();
        var globalCorner = this._content.globalViewMatrix().transformPoint(cr.topLeft());
        var localCorner = this._frame.globalViewMatrixInverted().transformPoint(globalCorner, true);
        cr = cr.withPosition(localCorner.x, localCorner.y);
        var fr = this._frame.boundaryRect();
        var ir = intersectRects(fr, cr);

        var fsr = ImageSourceHelper.boundaryRect(this._frame.source(), this._frame.runtimeProps.sourceProps);
        var sh = cr.width / fsr.width;
        var sv = cr.height / fsr.height;

        this._frame.prepareAndSetProps({
            sourceProps: Object.assign({}, this._frame.props.sourceProps, {
                sr: { x: (ir.x - cr.x) / sh + .5 | 0, y: (ir.y - cr.y) / sv + .5 | 0, width: ir.width / sh + .5 | 0, height: ir.height / sv + .5 | 0 },
                dr: { x: ir.x - fr.x, y: ir.y - fr.y, width: ir.width, height: ir.height }
            }),
            sizing: ContentSizing.fixed
        });
    }

    onClicked = e => {
        if (!this._content.hitTest(e, e.view)) {
            this.detach();
            e.handled = true;
        }
    };

    layerdraw(context, environment: RenderEnvironment) {
        context.save();
        context.setLineDash([20, 10]);
        context.strokeStyle = "#444";
        context.beginPath();
        this._frame.drawBoundaryPath(context);
        context.stroke();
        context.restore();
    }

    _areSameLayoutProps(props1, props2) {
        return props1.m.equals(props2.m) && props1.br.equals(props2.br);
    }
}

export default new ImageEditTool();