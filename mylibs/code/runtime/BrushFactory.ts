import { IProxySource } from "carbon-app";
import { Property } from "./Property";
import { Event } from "./Event";
import * as Runtime from "carbon-runtime";
import { ISize } from "carbon-geometry";
import { Model } from "../../framework/Model";
import Brush from "../../framework/Brush";
import Matrix from "math/matrix";

export class BrushFactoryClass implements IProxySource {
    proxyDefinition() {
        return {
            props: [],
            rprops: [],
            methods: [
                "createFromCssColor",
                "createFromLinearGradientObject",
            ],
            mixins:[]
        }
    }

    createFromCssColor(color) {
        return Brush.createFromCssColor(color);
    }

    createFromLinearGradientObject(color) {
        return Brush.createFromLinearGradientObject(color);
    }

}

export var BrushFactory = new BrushFactoryClass();