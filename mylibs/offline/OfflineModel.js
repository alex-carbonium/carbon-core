import IndexedDB from "./IndexedDB";

const projectsVersion = 101;

function OfflineModel(){
    this._db = IndexedDB.open("storage", projectsVersion, {
        "backups": {
            keyPath: "id", autoIncrement: true,
            indexes: {"appId": {key:"appId", unique: false }}
        }
    })
}

OfflineModel.prototype.getBackups = function(appId) {
    return this._db.findAllByIndexValue("backups", "appId", appId);
};

OfflineModel.prototype.saveBackup = function (app) {
    var changes = app.modelSyncProxy.getPendingChanges();
    if (DEBUG){
        for (var i = 0; i < changes.length; i++){
            var p = changes[i];
            delete p.toString;
        }
    }
    return this._db.put("backups", {appId: app.id(), appVersion: app.version(), changes, date: new Date().valueOf(), used: false});
};

OfflineModel.prototype.clear = function() {
    return this._db.clearAll();
};


export default OfflineModel;