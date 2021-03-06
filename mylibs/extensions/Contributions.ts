import { IContributions, IAction, ContextBarPosition, IActionManager, IApp, ISelection, IShortcut, IShortcutScheme, IDisposable } from "carbon-core";
import ActionManager from "../ui/ActionManager";
import CoreIntl from "../CoreIntl";
import ContextMenuBuilder from "./ContextMenuBuilder";
import ShortcutManager from "../ui/ShortcutManager";

export class Contributions implements IContributions, IDisposable {
    dispose() {
        if (this._onBuildMenuToken) {
            this._onBuildMenuToken.dispose();
            this._onBuildMenuToken = null;
        }
    }
    private _contextMenuGroups: { groupName: string, actions: IAction[], contextBarPosition?: ContextBarPosition }[] = [];
    private _contextMenuItems: { actionId: string, contextBarPosition?: ContextBarPosition }[] = [];
    private _onBuildMenuToken: IDisposable;
    constructor(private app: IApp, private actionManager: ActionManager, private shortcutManager: ShortcutManager) {
        this._onBuildMenuToken = app.onBuildMenu.bind(this, this.onBuildMenu);
    }

    addActions(actions: IAction[]) {
        actions.forEach(action => this.actionManager.registerActionInstance(action));
    }

    addShortcuts(scheme: IShortcutScheme | IShortcut[]) {
        if (Array.isArray(scheme)) {
            scheme = { windows: scheme, mac: scheme };
        }
        this.shortcutManager.mapScheme(scheme);
    }
    addContextMenuItem(actionId: string, contextBarPosition?: ContextBarPosition) {
        this._contextMenuItems.push({ actionId, contextBarPosition });
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

    private onBuildMenu(context, menu, view) {
        var elements = context.selectComposite.elements;

        if (elements.length && !elements[0].contextBarAllowed()) {
            return;
        }

        var items = menu.items;
        ContextMenuBuilder.build(this.app, view, context, menu);

        for (let i = 0; i < this._contextMenuItems.length; i++) {
            let item = this._contextMenuItems[i];
            let action = this.actionManager.getAction(item.actionId);
            let contextMenuAction = this.contextMenuAction(action, context.selectComposite, item.contextBarPosition);
            if (!contextMenuAction.disabled) {
                items.push(contextMenuAction);
            }
        }

        for (let i = 0; i < this._contextMenuGroups.length; i++) {
            var group = this._contextMenuGroups[i];
            items.push("-");
            items.push({
                name: group.groupName,
                contextBar: group.contextBarPosition,
                items: group.actions.map(x => this.contextMenuAction(x, context.selectComposite)),
            })
        }
    }

    private contextMenuAction(action: IAction, selection: ISelection, contextBar?: ContextBarPosition) {
        return {
            name: action.name,
            actionId: action.id,
            disabled: action.condition && !action.condition(selection),
            icon: action.icon,
            contextBar
        }
    }
}