import Promise from "bluebird";

function createStorage(db, name, options){
    if (db.objectStoreNames.contains(name)){
        db.deleteObjectStore(name);
    }

    return db.createObjectStore(name, options);
}

function deferredRequest(req){
    return new Promise((resolve, reject) => {
        req.onsuccess = function (data) {
            resolve(data);
        };
        req.onerror = function (data) {
            reject(data);
        }
    });
}

function IndexedDB(name, version, schema){
    this._name = name;
    this._version = version;
    this._schema = schema;
}

IndexedDB.prototype.reopen = function(newName){
    this._name = newName;
    delete this._dbRequest;
};

IndexedDB.prototype.db = function(){
    if (this._dbRequest){
        return this._dbRequest;
    }
    this._dbRequest = new Promise((resolve, reject) =>{
        var request = indexedDB.open(this._name, this._version);
        var that = this;
        request.onsuccess = function(e){
            resolve(e.target.result);
        };

        request.onerror = function(e){
            reject(e);
        };

        request.onupgradeneeded = function(e){
            var db = e.target.result;

            // A versionchange transaction is started automatically.
            //e.target.transaction.onerror = onError.bind(that);

            for (var name in that._schema){
                var data = that._schema[name];
                var store = createStorage(db, name, {
                    keyPath: data.keyPath,
                    autoIncrement: data.autoIncrement || false
                });
                if (data.indexes){
                    for (var indexName in data.indexes){
                        var indexData = data.indexes[indexName];
                        store.createIndex(indexName, indexData.key, {unique: indexData.unique});
                    }
                }
            }
        };
    });

    return this._dbRequest;
};

IndexedDB.prototype.put = function(tableName, data){
    return this.db().then(function(db){
        var trans = db.transaction([tableName], "readwrite");
        var store = trans.objectStore(tableName);
        store.put(data);
    });
};

IndexedDB.prototype.findAll = function(tableName){
    return this.db().then(function(db){
        return new Promise((resolve, reject) =>{
            var trans = db.transaction([tableName], "readwrite");
            var store = trans.objectStore(tableName);

            // Get everything in the store;
            var keyRange = (typeof shimIDBKeyRange !== "undefined" ? shimIDBKeyRange : IDBKeyRange).lowerBound(0);
            var cursorRequest = store.openCursor(keyRange);

            var res = [];

            cursorRequest.onsuccess = function(e){
                var result = e.target.result;
                if (!!result === false){
                    resolve(res);
                    return;
                }

                res.push(result.value);
                result['continue'](); // hack for closure compiler
            };

            cursorRequest.onerror = function(e){
                reject(e);
            }
        })
    });
};

IndexedDB.prototype.findOneById = function(tableName, id){
    return this.db().then(function(db){
        return new Promise((resolve, reject) =>{
            var trans = db.transaction([tableName], "readwrite");
            var store = trans.objectStore(tableName);

            var request = store.get(id);

            request.onsuccess = function(e){
                var data = request.result;
                if (data){
                    resolve(data);
                }
                else{
                    reject('empty result');
                }
            };

            request.onerror = function(e){
                reject(e);
            }
        });
    });
}

IndexedDB.prototype.findAllByIndexValue = function(tableName, indexName, indexValue, callback){
    var that = this;
    return this.countByIndexValue(tableName, indexName, indexValue).then(function(expected){
        return that.db().then(function(db){
            return new Promise((resolve, reject) =>{
                var trans = db.transaction([tableName], "readwrite");
                var store = trans.objectStore(tableName);

                var index = store.index(indexName);
                var keyRange = IDBKeyRange.only(indexValue);
                var cursorRequest = index.openCursor(keyRange);

                var res = [];

                var count = 0;
                cursorRequest.onsuccess = function(e){
                    var result = e.target.result;
                    if (!!result === false || count >= expected){
                        resolve(res);
                        return;
                    }
                    var include = true;
                    if (callback && callback(result) === false){
                        include = false;
                    }
                    if (include){
                        var data = result.value;
                        res.push(data);
                    }
                    result['continue']();
                    count++;
                };

                cursorRequest.onerror = function(e){
                    reject(e);
                }
            });
        });
    });
}

IndexedDB.prototype.countByIndexValue = function(tableName, indexName, indexValue){
    return this.db().then(function(db){
        return new Promise((resolve, reject) =>{
            var trans = db.transaction([tableName], "readwrite");
            var store = trans.objectStore(tableName);

            var index = store.index(indexName);
            var keyRange = IDBKeyRange.only(indexValue);
            var cursorRequest = index.count(keyRange);

            cursorRequest.onsuccess = function(e){
                var result = e.target.result;
                resolve(result);
            };

            cursorRequest.onerror = function(e){
                reject(e);
            }
        });
    });
};

IndexedDB.prototype.getLastKeyByIndexValue = function(tableName, indexName, indexValue){
    return this.db().then(function(db){
        return new Promise((resolve, reject) =>{
            var trans = db.transaction([tableName], "readwrite");
            var store = trans.objectStore(tableName);

            var index = store.index(indexName);
            var keyRange = IDBKeyRange.only(indexValue);
            var cursorRequest = index.openKeyCursor(keyRange);

            var key = -1;
            cursorRequest.onsuccess = function(e){
                var cursor = cursorRequest.result;
                if (cursor){
                    if (cursor.primaryKey > key){
                        key = cursor.primaryKey;
                    }
                    cursor['continue']();
                } else{
                    resolve(key);
                }

            };

            cursorRequest.onerror = function(e){
                reject(e);
            }
        });
    });
}

IndexedDB.prototype.clearAll = function(){
    var that = this;
    return this.db()
        .then(function(db){
            var stores = [];
            for (var name in that._schema){
                stores.push(name);
            }
            var trans = db.transaction(stores, "readwrite");
            return Promise.map(stores, x => {
                var store = trans.objectStore(x);
                return deferredRequest(store.clear());
            })
        });
}

IndexedDB.prototype.removeById = function(tableName, id){
    return this.db().then(function(db){
        var trans = db.transaction([tableName], "readwrite");
        var store = trans.objectStore(tableName);
        var request = store['delete'](id);
        return deferredRequest(request);
    });
}

IndexedDB.prototype.removeAllByIndexValue = function(tableName, indexName, indexValue){
    var that = this;
    return this.countByIndexValue(tableName, indexName, indexValue).then(function(expected){
        return that.db().then(function(db){
            return new Promise((resolve, reject) => {
                var trans = db.transaction([tableName], "readwrite");
                var store = trans.objectStore(tableName);

                var index = store.index(indexName);
                var keyRange = (typeof shimIDBKeyRange !== "undefined" ? shimIDBKeyRange : IDBKeyRange).only(indexValue);
                var cursorRequest = index.openKeyCursor(keyRange);

                var count = 0;
                cursorRequest.onsuccess = function(e){
                    var cursor = cursorRequest.result;
                    if (cursor){
                        store['delete'](cursor.primaryKey);
                        cursor['continue']();
                    }
                    else{
                        resolve();
                    }
                    count++;
                    if (count >= expected){
                        return;
                    }
                };

                cursorRequest.onerror = function(e){
                    reject(e);
                }
            });
        });
    });
};

export default {
    open: function(name, version, schema){
        return new IndexedDB(name, version, schema);
    }
}