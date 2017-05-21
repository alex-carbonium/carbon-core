import { IContributions, IAction, ContextBarPosition, IActionManager, IApp, ISelection, IShortcut, IShortcutScheme } from "carbon-core";
import ActionManager from "../ui/ActionManager";
import CoreIntl from "../CoreIntl";
import ContextMenuBuilder from "./ContextMenuBuilder";
import Environment from "../environment";
import ShortcutManager from "../ui/ShortcutManager";

export class Contributions implements IContributions {
    private _contextMenuGroups: { groupName: string, actions: IAction[], contextBarPosition?: ContextBarPosition }[] = [];

    constructor(private app: IApp, private actionManager: ActionManager, private shortcutManager: ShortcutManager) {
        app.onBuildMenu.bind(this, this.onBuildMenu);
    }

    addActions(actions: IAction[]) {
        actions.forEach(action => this.actionManager.registerActionInstance(action));
    }
    addShortcuts(scheme: IShortcutScheme){
        this.shortcutManager.mapScheme(scheme);
    }
    addContextMenuGroup(groupName: string, actionIds: string[], contextBarPosition?: ContextBarPosition) {
        this._contextMenuGroups.push({
            groupName: CoreIntl.label(groupName),
            actions: actionIds.map(id => {
                var action = this.actionManager.getAction(id);
                if (!action) {
                    throw new Error("Could not find action " + id);
                }
                return action;
            }),
            contextBarPosition: contextBarPosition
        })
    }

    private onBuildMenu(context, menu) {
        var elements = context.selectComposite.elements;

        if (elements.length && !elements[0].contextBarAllowed()) {
            return;
        }

        var items = menu.items;
        ContextMenuBuilder.build(this.app, context, menu);

        for (var i = 0; i < this._contextMenuGroups.length; i++) {
            var group = this._contextMenuGroups[i];
            items.push("-");
            items.push({
                name: group.groupName,
                contextBar: group.contextBarPosition,
                items: group.actions.map(x => this.contextMenuAction(x, context.selectComposite)),
            })
        }
    }

    private contextMenuAction(action: IAction, selection: ISelection) {
        return {
            name: CoreIntl.label(action.name),
            callback: () => {
                this.actionManager.invoke(action.id);
            },
            disabled: action.condition && !action.condition(selection)
        }
    }
}