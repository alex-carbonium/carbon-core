import { IApp, IActionManager, IAction, ContextBarPosition, IContributions, IView, IController } from "carbon-core";

export default class CarbonExtension {
    constructor(protected app: IApp, protected view: IView, protected controller:IController){
    }

    initialize(contributions: IContributions){
    }
}