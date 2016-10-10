define(function(fwk){
    var fwk = sketch.framework;

    return klass2("sketch.ui.actions.ActionsViewModel", null, (function(){
        var sortOrder = {
            "Editing": 10,
            "Layering": 20,
            "Size": 30,
            "Align": 40,
            "Distribute": 50,
            "Group": 60,
            "Ungroup": 70,
            "Templating": 80
        };

        var findCategory = function(categories, name){
            var res;
            each(categories, function(c){
                if (c.name === name){
                    res = c;
                    return false;
                }
            });
            return res;
        };

        var findAction = function(actions, name){
            var res;
            each(actions, function(a){
                if (a.name === name){
                    res = a;
                    return false;
                }
            });
            return res;
        };

        var addCategory = function(categories, categoryName, pinned){
            if (pinned === undefined){
                pinned = false;
            }
            var actions = this.actionManager.getActionsInCategory(categoryName);
            var category = findCategory(categories, categoryName);

            if (!category){
                category = {
                    name: categoryName,
                    actions: [],
                    pinned: pinned,
                    fullDescription:''
                };
                categories.push(category);
            }

            var that = this;
            each(actions, function(a){
                var action = findAction(category.actions(), a.name);
                if (!action){
                    a.tabIndex = that.tabIndex++;
                    category.actions.push(a);
                }
            });

            return category;
        };

        var findPinnedCategories = function(categories){
            var result = [];
            each(categories, function(c){
                if (c.pinned){
                    result.push(c);
                }
            });
            return result;
        };

        var replaceCategories = function(newCategories){
            newCategories = newCategories.sort(function(a, b){
                if (a.pinned && !b.pinned){
                    return 1;
                }
                if (b.pinned && !a.pinned){
                    return - 1;
                }

                return sortOrder[a.name] > sortOrder[b.name];
            });
            this.categories = newCategories;
        };

        return {
            _constructor:function(actionManager, tabIndex){
                this.actionManager = actionManager;
                this.categories = [];
                this.tabIndex = tabIndex || 200;
            },
            tabIndex: function(){
                return this.tabIndex++;
            },
            updateActions: function(categories){
                var that = this;
                var newCategories = findPinnedCategories.call(this, this.categories);
                each(categories, function(name){
                    addCategory.call(that, newCategories, name);
                });
                replaceCategories.call(this, newCategories);
            },
            getCategories: function() {
                return this.categories;
            },
            executeAction: function(action){
                this.actionManager.invoke(action.name);
            },
            pinCategory: function(categoryName){
                var newCategories = $.merge([], this.categories);
                addCategory.call(this, newCategories, categoryName, true);
                replaceCategories.call(this, newCategories);
            },
            unpinCategory: function(categoryName){
                var c = findCategory(this.categories, categoryName);
                if (c){
                    var newCategories = $.merge([], this.categories);
                    sketch.util.spliceStrict(newCategories, c);
                    replaceCategories.call(this, newCategories);
                }
            }
        }
    })());
});