import Environment from "../environment";
import {ChangeMode, ContentSizing} from "./Defs";
import {intersectRects, areRectsEqual} from "../math/math";
import FrameSource from "./FrameSource";
import FrameContent from "./FrameContent";
import SnapController from "./SnapController";

export class FrameEditTool{
    constructor(){
        this._frame = null;
        this._clone = null;
        this._tokens = null;
        this._cropRect = null;
        this._origContentRect = null;
    }
    attach(frame){
        this._tokens = [];
        this._frame = frame;

        //full source rect {0, 0, 1000, 500}
        var fsr = FrameSource.boundaryRect(frame.source(), frame.runtimeProps.sourceProps);
        var sr = frame.runtimeProps.sourceProps.sr;
        var dr = frame.runtimeProps.sourceProps.dr;
        var sh = dr.width/sr.width;
        var sv = dr.height/sr.height;
        if (sr && dr){
            fsr.x = Math.round(dr.x - sr.x * sh);
            fsr.y = Math.round(dr.y - sr.y * sv);
            fsr.width = fsr.width*sh + .5|0;
            fsr.height = fsr.height*sv + .5|0;
        }

        fsr.x += this._frame.x();
        fsr.y += this._frame.y();

        var clone = this._frame.clone();
        clone.prepareAndSetProps({
            x: 0, y: 0, sizing: ContentSizing.stretch, angle: 0
        });
        var pos = this._frame.parent().local2global(fsr);
        var contentProps = {
            x: pos.x, y: pos.y, width: fsr.width, height: fsr.height
        };
        var content = new FrameContent(clone, this._frame.getBoundaryRectGlobal());
        content.prepareAndSetProps(contentProps, ChangeMode.Self);
        content.activate();

        //original frame is hidden, so it does not take part in snapping
        this._snapClone = this._frame.clone();
        this._snapClone.prepareAndSetProps({angle: 0}, ChangeMode.Self);
        this._clipClone = clone;
        this._content = content;
        this._cropRect = this._frame.getBoundaryRectGlobal();
        this._origContentRect = this._content.getBoundaryRectGlobal();

        this._frame.setProps({visible: false}, ChangeMode.Self);
        //leave the selection, but remove action frame
        this._frame.decorators.forEach(x => this._frame.removeDecorator(x));
        this._tokens.push(Environment.controller.clickEvent.bind(this.onClicked));
        this._tokens.push(Environment.view.layer3.ondraw.bindHighPriority(this, this.layerdraw));

        Environment.view.layer3.add(this._content);
        SnapController.snapGuides.push(this._content, this._snapClone);

        this._tokens.push(Environment.controller.actionManager.subscribe("cancel", () => {
            this.detach();
        }));
        this._tokens.push(Environment.controller.actionManager.subscribe("enter", () => {
            this.detach();
        }));
        this._tokens.push(Environment.controller.actionManager.subscribeToActionStart("delete", (a, e) => {
            this.detach(false);
            this._frame.setProps({source: FrameSource.Empty});
            e.handled = true;
        }));
    }
    detach(saveChanges = true){
        if (saveChanges){
            this._saveChanges();
        }

        SnapController.removeGuides(this._content, this._snapClone);

        if (this._tokens){
            this._tokens.forEach(x => x.dispose());
            this._tokens = null;
        }
        if (this._content){
            this._content.deactivate();
            Environment.view.layer3.remove(this._content);
            this._content.dispose();
            this._content = null;
        }
        if (this._snapClone){
            this._snapClone.dispose();
            this._snapClone = null;
        }
        if (this._clipClone){
            this._clipClone.dispose();
            this._clipClone = null;
        }

        this._frame.setProps({visible: true}, ChangeMode.Self);
    }

    _saveChanges(){
        var cr = this._content.getBoundaryRectGlobal();
        if (areRectsEqual(cr, this._origContentRect)){
            return;
        }
        var fr = this._frame.getBoundaryRectGlobal();
        var ir = intersectRects(fr, cr);

        var fsr = FrameSource.boundaryRect(this._frame.source(), this._frame.runtimeProps.sourceProps);
        var sh = cr.width / fsr.width;
        var sv = cr.height / fsr.height;

        this._frame.prepareAndSetProps({
            sourceProps: Object.assign({}, this._frame.props.sourceProps, {
                sr: {x: (ir.x - cr.x) / sh + .5|0, y: (ir.y - cr.y) / sv + .5|0, width: ir.width / sh + .5|0, height: ir.height / sv + .5|0},
                dr: {x: ir.x - fr.x, y: ir.y - fr.y, width: ir.width, height: ir.height}
            }),
            sizing: ContentSizing.manual
        });
    }

    onClicked = e => {
        if (!this._content.hitTest(e, Environment.view.scale())){
            this.detach();
            e.handled = true;
        }
    };

    layerdraw(context, environment){
        var cr = this._cropRect;
        context.save();
        context.rectPath(cr.x, cr.y, cr.width, cr.height);
        context.clip();
        this._content.globalViewMatrix().applyToContext(context);
        this._clipClone.draw(context, environment);
        context.restore();

        context.save();
        context.setLineDash([20, 10]);
        context.strokeStyle = "#444";
        context.strokeRect(cr.x + .5, cr.y + .5, cr.width - 1, cr.height - 1);
        context.restore();
    }
}

export default new FrameEditTool();