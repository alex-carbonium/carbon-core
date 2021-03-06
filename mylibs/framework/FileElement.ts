import UIElement from "./UIElement";
import { FileProps, IFileElement, IImage, ChangeMode, IUIElement, IGroupContainer, Origin, IContainer, IController } from "carbon-core";
import { Types } from "./Defs";
import PropertyMetadata from "./PropertyMetadata";
import Rect from "../math/rect";
import Image from "./Image";
import Selection from "./SelectionModel";
import Container from "./Container";
import { loadSVGFromString } from "../svg/SvgParser";

export class FileElement extends UIElement implements IFileElement {
    props: FileProps;

    linkedElement: IUIElement = null;

    private get image() {
        return this.linkedElement as Image;
    }
    private set image(value: Image) {
        this.linkedElement = value;
    }

    drop(file: File, controller:IController): Promise<void> {
        this.setProps({ name: file.name }, ChangeMode.Self);

        let parent = controller.getCurrentDropTarget() as Container;

        return new Promise<void>((resolve, reject) => {
            if (this.isSvg()) {
                this.readSvg(file, parent, resolve, reject);
            }
            else if (this.isImage()) {
                if (parent instanceof Image) {
                    this.registerImageLink(parent);
                }
                this.readDataUrl(file, parent, resolve, reject);
            }
        });
    }
    setExternalUrl(url: string) {
        if (this.isImage() && this.image) {
            if (this.image.isInTree()) {
                this.image.prepareAndSetProps({ source: Image.EmptySource}, ChangeMode.Self);
                this.image.prepareAndSetProps({ source: Image.createUrlSource(url) });
            }
            this.image = null;
        }
    }

    registerImageLink(image: Image) {
        this.image = image;
    }

    isImage() {
        return this.props.type === "image/jpeg" || this.props.type === "image/png";
    }
    isSvg() {
        return this.props.type === "image/svg+xml";
    }

    allowSnapping() {
        return false;
    }

    private readSvg(file: File, parent: Container, resolve, reject) {
        var reader = new FileReader();
        let gm = this.globalViewMatrix();
        reader.onload = () => {
            var text = reader.result;

            loadSVGFromString(text)
                .then((result: IGroupContainer) => {
                    if (result.performArrange) {
                        result.performArrange();
                    }
                    let br = result.boundaryRect();
                    let bb = result.getBoundingBox();
                    result.setTransform(gm);
                    result.translate(-bb.width/2 - br.x, -bb.height/2 - br.y);
                    result.name = (this.getNameWithoutExtension());

                    App.Current.actionManager.invoke("fitToViewportIfNeeded", {element:result});

                    this.parent.remove(this, ChangeMode.Self);
                    parent.transferElement(result, parent.children.length);
                    Selection.makeSelection([result]);
                    this.linkedElement = result;
                    resolve();
                })
                .catch(reject);
        }
        reader.onerror = reject;
        reader.readAsText(file);
    }

    private readDataUrl(file: File, parent: Container, resolve, reject) {
        let gm = this.globalViewMatrix();
        let reader = new FileReader();
        reader.onload = (e) => {
            let dataUrl = reader.result;

            let image = this.linkedElement;
            if (!image) {
                let image = new Image();
                image.size = { width: 1, height: 1 };
                image.name=(this.getNameWithoutExtension());
                image.setTransform(gm);
                image.resizeOnLoad(Origin.Center);
                this.registerImageLink(image);

                this.parent.remove(this, ChangeMode.Self);

                image.prepareAndSetProps({ source: Image.createLoadingSource(dataUrl) }, ChangeMode.Self);
                image.load().then(() => {
                    let source = image.source();
                    image.setProps({ source: Image.EmptySource }, ChangeMode.Self)
                    parent.transferElement(image, parent.children.length);
                    image.setProps({ source }, ChangeMode.Self)
                    Selection.makeSelection([image]);
                });
            }
            else {
                this.image.prepareAndSetProps({ source: Image.createLoadingSource(dataUrl) }, ChangeMode.Self);
            }

            resolve();
        }
        reader.onerror = reject;
        reader.readAsDataURL(file);
    }

    private getNameWithoutExtension() {
        var name = this.name;
        var extPos = name.lastIndexOf('.');
        if (extPos !== -1) {
            name = name.substr(0, extPos);
        }
        return name;
    }
}

FileElement.prototype.t = Types.File;

PropertyMetadata.registerForType(FileElement, {
    br: {
        defaultValue: new Rect(0, 0, 1, 1)
    }
});