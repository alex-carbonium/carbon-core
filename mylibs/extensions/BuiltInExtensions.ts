import CarbonExtension from "./CarbonExtesion";
import SymbolActions from "./SymbolActions";
import ResourceActions from "./ResourceActions";
import { IEnvironment, IApp } from "carbon-core";
import PowerToys from "./PowerToys";
import { RepeaterActions } from "../framework/repeater/RepeaterActions";
import { GroupActions } from "./GroupActions";

export function getBuiltInExtensions(app: IApp, workspace: IEnvironment): CarbonExtension[] {
    return [
        new GroupActions(app, workspace),
        new SymbolActions(app, workspace),
        new ResourceActions(app, workspace),
        new RepeaterActions(app, workspace),
        new PowerToys(app, workspace)
    ];
}