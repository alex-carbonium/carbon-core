import CarbonExtension from "./CarbonExtesion";
import SymbolActions from "./SymbolActions";
import PaletteActions from "./PaletteActions";
import { IEnvironment, IApp } from "carbon-core";

export function getBuiltInExtensions(app: IApp, workspace: IEnvironment): CarbonExtension[] {
    return [
        new SymbolActions(app, workspace),
        new PaletteActions(app, workspace)
    ];
}