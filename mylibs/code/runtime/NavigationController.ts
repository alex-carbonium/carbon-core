import { INavigationController, IAnimationOptions, DataBag } from "carbon-runtime";
import { IDisposable } from "carbon-basics";

export class NavigationController implements INavigationController, IDisposable  {
    navigateBack() {

    }

    navigateTo(artboard:string, animationOptions:IAnimationOptions, data?:DataBag){
        alert(artboard);
    }

    dispose() {

    }
}