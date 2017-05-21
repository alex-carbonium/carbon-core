import { IApp, IActionManager, IAction, ContextBarPosition, IContributions, IEnvironment } from "carbon-core";

export default class CarbonExtension {
    constructor(protected app: IApp, protected workspace: IEnvironment){
    }

    initialize(contributions: IContributions){
    }
}