import CarbonExtension from "./CarbonExtesion";
import SymbolActions from "./SymbolActions";
import ResourceActions from "./ResourceActions";
import { IApp, IController, IView } from "carbon-core";
import PowerToys from "./PowerToys";
import { RepeaterActions } from "../framework/repeater/RepeaterActions";
import { GroupActions } from "./GroupActions";

export function getBuiltInExtensions(app: IApp, view:IView, controller:IController): CarbonExtension[] {
    return [
        new GroupActions(app, view, controller),
        new SymbolActions(app, view, controller),
        new ResourceActions(app, view, controller),
        new RepeaterActions(app, view, controller),
        new PowerToys(app, view, controller)
    ];
}