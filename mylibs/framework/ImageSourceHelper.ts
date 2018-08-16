import Brush from "./Brush";
import backend from "../backend";
import { Types, FloatingPointPrecision } from "./Defs";
import Rect from "../math/rect";
import Matrix from "../math/matrix";
import { ContentSizing, ImageSource, ImageSourceType } from "carbon-model";
import { IRect } from "carbon-geometry";
import DataNode from "./DataNode";
import { ChangeMode, RenderEnvironment, RenderFlags } from "carbon-core";
import UserSettings from "../UserSettings";
import GlobalMatrixModifier from "./GlobalMatrixModifier";
import NullContainer from "./NullContainer";

export default class ImageSourceHelper {
    static draw(source: ImageSource, context, w, h, sourceElement, environment: RenderEnvironment) {
        let props = sourceElement.props;
        let runtimeProps = sourceElement.runtimeProps.sourceProps;

        switch (source.type) {
            case ImageSourceType.Url:
            case ImageSourceType.Loading:
                ImageSourceHelper.drawURL(context, runtimeProps);
                return;
            case ImageSourceType.Element:
                ImageSourceHelper.drawElement(context, w, h, sourceElement, props, runtimeProps, environment)
                return;
            case ImageSourceType.None:
                ImageSourceHelper.drawEmpty(context, w, h);
                return;
        }

        assertNever(source);
    }

    private static round(value: number) {
        return Math.round(value * FloatingPointPrecision) / FloatingPointPrecision;
    }

    private static drawEmpty(context, w, h) {
        context.save();
        context.fillStyle = UserSettings.image.emptyFill;
        context.fillRect(0, 0, w, h);

        let text = ImageSourceHelper.round(w) + "x" + ImageSourceHelper.round(h);
        let fontSize = Math.min(h - 8, 24);
        context.font = fontSize + "px Arial";

        let width = context.measureText(text).width + .5 | 0;
        if (width > w) {
            fontSize *= (w - 8) / width;
            if (fontSize > 4) {
                context.font = (fontSize | 0) + "px Arial";
                width = context.measureText(text).width + .5 | 0;
            }
        }

        if (fontSize > 4) {
            context.fillStyle = UserSettings.image.emptyTextFill;
            context.textBaseline = "middle";
            context.fillText(text, w / 2 - width / 2 + .5 | 0, h / 2 + .5 | 0);
        }

        context.restore();
    }

    private static drawFont(family, context, w, h, props, runtimeProps) {
        if (!runtimeProps || !runtimeProps.glyph) {
            return;
        }

        const s = Math.min(w, h) - 2;
        context.font = s + 'px ' + family;
        context.lineHeight = 1;
        context.textBaseline = 'middle';

        const measure = context.measureText(runtimeProps.glyph);
        if (props.fill !== Brush.Empty) {
            Brush.setFill(props.fill, context, 0, 0, w, h);
            context.fillText(runtimeProps.glyph, ~~((w - measure.width) / 2), ~~(h / 2));
        }
        if (props.stroke !== Brush.Empty) {
            Brush.setStroke(props.stroke, context, 0, 0, w, h);
            context.strokeText(runtimeProps.glyph, ~~((w - measure.width) / 2), ~~(h / 2));
        }
    }

    static hasValue(source: ImageSource) {
        switch (source.type) {
            case ImageSourceType.Url:
                return source.url;
            case ImageSourceType.Loading:
                return source.dataUrl;
            case ImageSourceType.Element:
                return source.elementId;

            default:
                return false;
        }
    }

    static size(source) {
        return {
            width: source.width,
            height: source.height
        }
    }
    static boundaryRect(source, runtimeProps): Rect | null {
        switch (source.type) {
            case ImageSourceType.Url:
            case ImageSourceType.Loading:
                if (!runtimeProps || !runtimeProps.image) {
                    return null;
                }
                return ImageSourceHelper.getUrlImageRect(runtimeProps);
            case ImageSourceType.Element:
                if (!runtimeProps || !runtimeProps.element) {
                    return null;
                }
                return runtimeProps.element.boundaryRect();
            default:
                return null;
        }
    };

    private static loadUrl(url: string, cors: boolean) {
        if (!url) {
            return Promise.resolve({ empty: true });
        }

        url = ImageSourceHelper.getImageUrl(url, cors);

        return new Promise((resolve, reject) => {
            ImageSourceHelper.loadImage(url, cors, resolve, reject);
        });
    }

    private static loadImage(url: string, cors: boolean, resolve: (e) => void, reject: (e) => void) {
        const image = new Image();

        url = ImageSourceHelper.getImageUrl(url, cors);

        //data: urls cannot be loaded in safari with crossOrigin flag
        if (!url.startsWith("data:")) {
            image.crossOrigin = "anonymous";
        }

        image.onload = function () {
            const runtimeProps = { image };
            resolve(runtimeProps);
            image.onload = null;
            image.onerror = null;
        };
        image.onerror = function () {
            if (cors) {
                ImageSourceHelper.loadImage(url, false, resolve, reject);
            }
            else {
                resolve({ error: true });
            }
            image.onload = null;
            image.onerror = null;
        };
        image.src = url;
    }

    private static getImageUrl(url: string, cors: boolean) {
        if (!cors && url[0] !== '/' && url[0] !== '.'
            && !url.startsWith(backend.fileEndpoint)
            && !url.startsWith("data:image/")
        ) {
            return backend.servicesEndpoint + "/api/proxy?" + url;
        }
        return url;
    }

    private static drawURL(context, runtimeProps) {
        if (!runtimeProps) {
            return;
        }
        const image = runtimeProps.image;
        if (image) {
            const sr = runtimeProps.sr;
            const dr = runtimeProps.dr;
            context.drawImage(image, sr.x, sr.y, sr.width, sr.height, dr.x, dr.y, dr.width, dr.height);
        }
    }

    private static drawElement(context, w, h, sourceElement, props, runtimeProps, environment: RenderEnvironment) {
        if (!runtimeProps || !runtimeProps.element) {
            return;
        }

        var element = runtimeProps.element;

        if(!element.runtimeProps.refclone) {
            element.runtimeProps.refclone = element.mirrorClone();
        }
        element = element.runtimeProps.refclone;

        context.save();

        var box = element.getBoundingBox();
        var scaleX = w / box.width;
        var scaleY = h / box.height;

        let matrix = Matrix.allocate();
        matrix.scale(scaleX, scaleY);
        element.props.m = matrix;
        element._parent = sourceElement;
        element.applyVisitor(e=>e.resetRuntimeProps());

        let originalCtxl = element.runtimeProps.ctxl;
        let originalFlags = environment.flags;
        let oldFill = environment.fill;
        let oldStroke = environment.stroke;
        try {
            element.applyVisitor(e=>e.runtimeProps.ctxl = sourceElement.runtimeProps.ctxl);

            environment.flags &= ~RenderFlags.UseParentClipping;
            environment.flags &= ~RenderFlags.CheckViewport;
            environment.flags |= RenderFlags.DisableCaching;
            environment.flags &= ~RenderFlags.ArtboardFill;
            environment.fill = props.fill;
            environment.stroke = props.stroke;

            element.draw(context, environment);
        }
        finally {
            environment.flags = originalFlags;
            environment.fill = oldFill;
            environment.stroke = oldStroke;
            element._parent = NullContainer;
            element.props.m = Matrix.Identity;
            matrix.free();
        }
        context.restore();
    }

    private static resizeImage(sizing: ContentSizing, newRect, runtimeProps, sourceRect) {
        switch (sizing) {
            case ContentSizing.original:
                runtimeProps.sr = runtimeProps.dr = newRect;
                return;
            case ContentSizing.fit:
                runtimeProps.sr = sourceRect;
                runtimeProps.dr = runtimeProps.sr.fit(newRect);
                return;
            case ContentSizing.fill:
                runtimeProps.sr = sourceRect;
                runtimeProps.dr = runtimeProps.sr.fill(newRect);
                return;
            case ContentSizing.center:
                const fsr = sourceRect;
                const sw = Math.min(fsr.width, newRect.width);
                const sh = Math.min(fsr.height, newRect.height);

                runtimeProps.sr = {
                    x: Math.abs(Math.min((newRect.width - fsr.width) / 2 + .5 | 0, 0)),
                    y: Math.abs(Math.min((newRect.height - fsr.height) / 2 + .5 | 0, 0)),
                    width: sw, height: sh
                };
                runtimeProps.dr = {
                    x: Math.max((newRect.width - fsr.width) / 2 + .5 | 0, 0),
                    y: Math.max((newRect.height - fsr.height) / 2 + .5 | 0, 0),
                    width: sw, height: sh
                };
                return;
            case ContentSizing.stretch:
                runtimeProps.sr = sourceRect;
                runtimeProps.dr = newRect;
                return;
            case ContentSizing.fixed:
                return;
        }
        assertNever(sizing);
    }

    private static getUrlImageRect(runtimeProps) {
        return new Rect(0, 0, runtimeProps.image.width, runtimeProps.image.height);
    }

    static prepareProps(source, sizing, oldRect, newRect, props, runtimeProps, changes, fitUrl) {
        //TODO: do distort the content resizing with some button, shift?
        if (runtimeProps) {
            switch (sizing) {
                case ContentSizing.fixed:
                    const dw = newRect.x + newRect.width - runtimeProps.dr.x - runtimeProps.dr.width;
                    const dh = newRect.y + newRect.height - runtimeProps.dr.y - runtimeProps.dr.height;
                    const sx = 1 + dw / runtimeProps.dr.width;
                    const sy = 1 + dh / runtimeProps.dr.height;
                    const ndr = Object.assign({}, runtimeProps.dr, {
                        width: runtimeProps.dr.width * sx,
                        height: runtimeProps.dr.height * sy
                    });
                    const nsr = Object.assign({}, runtimeProps.sr, {
                        width: runtimeProps.sr.width * sx,
                        height: runtimeProps.sr.height * sy
                    });
                    changes.sourceProps = Object.assign({}, props, { sr: nsr, dr: ndr });
                    break;
            }
        }

        if (props && props.urls && fitUrl) {
            const ar = props.width / props.height;
            let bestLink = null;
            for (let i = 0; i < props.urls.links.length; i++) {
                const link = props.urls.links[i];
                if (link.w >= newRect.width && link.w / ar >= newRect.height) {
                    bestLink = link;
                    break;
                }
            }
            if (bestLink === null) {
                bestLink = props.urls.links[props.urls.links.length - 1];
            }
            const bestUrl = props.urls.raw + bestLink.url;
            if (bestUrl !== source.url) {
                changes.source = ImageSourceHelper.createUrlSource(bestUrl);
                if (changes.sourceProps && changes.sourceProps.sr) {
                    const scale = bestLink.w / props.cw;
                    changes.sourceProps.sr = {
                        x: Math.round(changes.sourceProps.sr.x * scale),
                        y: Math.round(changes.sourceProps.sr.y * scale),
                        width: changes.sourceProps.sr.width * scale + .5 | 0,
                        height: changes.sourceProps.sr.height * scale + .5 | 0
                    };
                }
                changes.sourceProps = Object.assign({}, props, changes.sourceProps, { cw: bestLink.w });
            }
        }
    };

    static findElementById(pageId: string, artboardId: string, elementId: string) {
        var page = DataNode.getImmediateChildById(App.Current, pageId, false);
        if (page) {
            let artboard = DataNode.getImmediateChildById(page, artboardId, true);
            if (artboard) {
                return artboard.findNodeByIdBreadthFirst(elementId);
            }
        }

        return null;
    }

    static load(source: ImageSource, sourceProps): Promise<any> | null {
        switch (source.type) {
            case ImageSourceType.Loading:
                return ImageSourceHelper.loadUrl(source.dataUrl, true);
            case ImageSourceType.Url:
                return ImageSourceHelper.loadUrl(source.url, sourceProps && sourceProps.cors);
            case ImageSourceType.Element:
                return Promise.resolve({ element: ImageSourceHelper.findElementById(source.pageId, source.artboardId, source.elementId) });
            default:
                return null;
        }
    }

    static resize(source, sizing, newRect, runtimeProps) {
        if (runtimeProps) {
            if (runtimeProps.image) {
                ImageSourceHelper.resizeImage(sizing, newRect, runtimeProps, ImageSourceHelper.getUrlImageRect(runtimeProps)); //only one supported for now
            } else if (runtimeProps.element) {
                ImageSourceHelper.resizeImage(sizing, newRect, runtimeProps, runtimeProps.element.boundaryRect()); //only one supported for now
            }
        }
    }

    static shouldClip(source, w, h, runtimeProps) {
        switch (source.type) {
            case ImageSourceType.Loading:
            case ImageSourceType.Url:
                if (!runtimeProps) {
                    return false;
                }
                var dr = runtimeProps.dr;
                if (!dr) {
                    return false;
                }
                return dr.x < 0 || dr.x + dr.width > w || dr.y < 0 || dr.y + dr.height > h;
        }
        return false;
    }

    static isEditSupported(source: ImageSource) {
        if (!source) {
            return false;
        }
        return source.type === ImageSourceType.Url || source.type === ImageSourceType.Loading;
    };

    static shouldApplyViewMatrix(source) {
        return source.type !== ImageSourceType.Element;
    };

    static isFillSupported(source) {
        if (!source) {
            return false;
        }
        //TODO: should fill be supported for
        return false;
    }

    static createUrlSource(url: string): ImageSource {
        return { type: ImageSourceType.Url, url: url };
    }

    static createLoadingSource(dataUrl: string): ImageSource {
        return { type: ImageSourceType.Loading, dataUrl };
    }

    static createElementSource(pageId: string, artboardId: string, elementId: string): ImageSource {
        return { type: ImageSourceType.Element, pageId, artboardId, elementId };
    }
}