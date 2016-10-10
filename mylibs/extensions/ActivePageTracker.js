import ExtensionBase from "./ExtensionBase";

function changeElements(page) {
    var pageId = page.id();
    if (this.cache[pageId]) {
        return;
    }
    page.applyVisitor(function (child) {
        if (child.props.selected !== undefined && child.pageLink() === pageId) {
            child.setProps({selected: true});
        }
    });
    this.cache[pageId] = true;
}

function bind() {
    this.cache = {};
    this._pageChangedHandler =  this.app.pageChanged.bind(this, function (oldPage, newPage) {
        changeElements.call(this, newPage);
    });
}
function unbind() {
    if(this._pageChangedHandler){
        this._pageChangedHandler.dispose();
        this._pageChangedHandler = null;
    }
}

function viewModeChanged() {
    if (this.app.viewModel.isPreviewMode()) {
        bind.call(this);
    }
    else {
        unbind.call(this);
    }
}

function subscribe() {
    if (this.app.isExporting) {
        bind.call(this);
    }
    else {
        this.registerForDispose(this.app.actionManager.subscribeToActionStart("switchViewMode", this, viewModeChanged));
    }
}
export default class ActivePageTracker extends ExtensionBase {
    attach (app, view, controller) {
        super.attach.apply(this, arguments);
        app.loaded.then(subscribe.bind(this));
    }
}