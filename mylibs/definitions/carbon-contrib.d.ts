declare module "carbon-contrib" {
    import { IAction, IShortcut, IShortcutScheme } from "carbon-app";

    /**
    * Defines contribution points of the extension.
    */
    export interface IContributions {
        /**
         * Registers the specified actions in the workspace.
         */
        addActions(actions: IAction[]);

        /**
         * Registers the context menu group. The group always appears in the context menu trigger by right click,
         * and optionally in the context bar if the contextBarPosition is specified.
         */
        addContextMenuGroup(groupName: string, actionIds: string[], contextBarPosition?: ContextBarPosition);

        /**
         * Registers the context menu item. The item always appears in the context menu trigger by right click,
         * and optionally in the context bar if the contextBarPosition is specified.
         */
        addContextMenuItem(actionId: string, contextBarPosition?: ContextBarPosition);

        /**
         * Registers the shortcuts for the extension for all supported platforms.
         */
        addShortcuts(scheme: IShortcutScheme | IShortcut[]);
    }

    export const enum ContextBarPosition {
        None = 0,
        Left = 1,
        Right = 2,
        Only = 4
    }
}