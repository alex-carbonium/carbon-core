define(function(){
    var migrations = {};
    
    return {        
        register: function(type, toVersion, migration){
            var entry = klass(migration);
            entry.toVersion = toVersion;
            if (!migrations[type]){
                migrations[type] = [];
            }
            migrations[type].push(entry);
        },
        runMigrations: function(type, data, toVersion){
            var entries = migrations[type];
            if (!entries){
                return true;
            }
            var runnable = [];
            each(entries, function(e){
                if (e.toVersion > data.version && e.toVersion <= toVersion){
                    runnable.push(e);
                }
            });
            each(runnable.sort(function(a,b){ return a.toVersion - b.toVersion; }), function(m){
                var migration = new m();
                migration.up(data);
            });

            return runnable.length !== 0;
        }
    };
});