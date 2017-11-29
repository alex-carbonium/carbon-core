import { INavigationController, INavigationAnimationOptions, DataBag, AnimationType, EasingType } from "carbon-runtime";
import { IDisposable } from "carbon-basics";
import { IPreviewModel, IProxySource } from "carbon-app";
import DataNode from "../../framework/DataNode";
import { RuntimeProxy } from "./RuntimeProxy";

const DefaultAnimationOptions: INavigationAnimationOptions = {
    curve: EasingType.None,
    delay: 0,
    duration: 0,
    repeat: 1,
    type: AnimationType.None
}

export class NavigationController implements INavigationController, IDisposable, IProxySource {
    private history = [];

    constructor(private previewModel: IPreviewModel) {

    }

    proxyDefinition() {
        return {
            props:[],
            rprops:[],
            methods:["navigateBack", "navigateTo"]
        }
    }

    navigateBack() {

    }

    navigateTo(artboardName: string, animationOptions: INavigationAnimationOptions, data?: DataBag) {
        let artboard = App.Current.activePage.children.find(c => c.name === artboardName);
        if (!artboard) {
            throw `artboard '${artboardName}' not found `;
        }

        var that = RuntimeProxy.unwrap<NavigationController>(this);

        that.navigateToId(artboard.id, animationOptions, data);
    }

    navigateToId(artboardId: string, animationOptions: INavigationAnimationOptions, data?: DataBag) {
        var that = RuntimeProxy.unwrap<NavigationController>(this);

        let options = Object.assign({}, DefaultAnimationOptions, animationOptions);
        if(that.previewModel.activePage) {
            that.history.push(that.previewModel.activePage);
        }

        that.previewModel.navigateToPage.raise(artboardId, options, data);
    }

    dispose() {
        this.history = null;
    }
}