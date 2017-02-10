import ExtensionBase from "./ExtensionBase";
import logger from "../logger";

var bind = function () {
    var that = this;

    window.onbeforeunload = function () {
        logger.info("quitting");

        that.app.quitting = true;
        that.app.saveWorkspaceState();

        if (that.app.state.isDirty()) {
            if (that.app.serverless()){
                that.app.actionManager.invoke("saveBackup");
            }
            else {
                that.app.actionManager.invoke("save");
            }
            return "leaving?";
        }
        //do not return anything, otherwise, IE still shows dialog
    }
};

export default class ClosePageDialog extends ExtensionBase {
    attach(app) {
        super.attach.apply(this, arguments);
        
        if (app.platform.richUI() && !app.props.noConfirmOnClose) {
            bind.call(this);
        }
    }
}
