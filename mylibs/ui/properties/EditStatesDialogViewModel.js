define(["viewmodels/DialogViewModel", "text!../../../../templates/dialogs.editStates.jstmpl.html"], function(DialogViewModel, template){
    // TODO: handle deletion of states and properties
    // TODO: handle state and property renaming
    return klass2("sketch.ui.EditStatesDialogViewModel", DialogViewModel, (function(){
        return {
            template: template,
            _constructor: function(element, states) {
                var template = element.getTemplate();
                this.states = map(states, function(value){return {name:value.name(), data:ko.observableArray([])};});
                this.properties = ko.observableArray([{name:'$firstChild', type:'trueFalse'}, {name:'$lastChild', type:'trueFalse'}].concat(template.getCustomProperties()));
                this.element = element;
                var combinations = template._propertyCombinations;
                this.enabledProperties = ko.observableArray([]);
                var that = this;
                if(combinations) {
                    each(combinations.properties, function(name, index){
                        var property = sketch.util.firstOrDefault(that.properties(), function(p){return p.name == name});
                        that.enabledProperties.push(property)
                        that.properties.remove(property);

                        for(var stateName in combinations.values) {
                            var state = sketch.util.firstOrDefault(that.states, function(s){return s.name == stateName});
                            var data = state.data;
                            data.push({
                                value: combinations.values[stateName][index],
                                type: property.type
                            })
                        }
                    });
                }


                this.newPropertyValue = ko.computed({
                    read:function(){
                        return null;
                    },
                    write:function(value){
                        if(value && value.type !== 'none'){
                            that.addNewProperty(value);
                        }
                    }
                });

                this.canAddProperty = ko.computed({
                    read:function() {
                        return that.properties().length > 0;
                    }
                });
            },
            init: function(dialog, options){
                options.title = "Manage states";
                this.dialog = dialog;
            },
            addNewProperty:function(data){
                this.enabledProperties.push(data)
                //this.properties.remove(data);
                each(this.states, function(state){
                    state.data.push({
                        value: data.defaultValue,
                        type: data.type
                    });
                });
            },
            removeProperty:function(data) {
                this.enabledProperties.remove(data);
                //this.properties.push(data);
            },
            save:function() {
                var template = this.element.getTemplate();
                var values = {};
                each(this.states, function(state){
                    values[state.name] = map(state.data(), function(d) {
                        if(d.value === undefined){
                            if(d.type === 'trueFalse'){
                                return false;
                            } else if(d.type === 'text'){
                                return '';
                            }
                        }
                        return d.value;
                    });
                });
                var combinations = {
                    properties:map(this.enabledProperties(), function(p){
                        return p.name;
                    }),
                    values:values
                };

                template.setCombinations(combinations);

                this.dialog.close();
            },
            cancel:function() {

            }
        }
    })());
});