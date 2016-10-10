import RepeatContainer from "../repeater/RepeatContainer";
import BuiltInDataProvider from "./BuiltInDataProvider";
import CustomDataProvider from "./CustomDataProvider";
import {createUUID} from "../../util";
import {PatchType} from "../Defs";
import Promise from "bluebird";
import Environment from "environment";

class DataManager{
    constructor(){
        this._providers = {};
    }

    registerProvider(id, instance){
        this._providers[id] = instance;
    }
    getProvider(id){
        return this._providers[id];
    }
    unregisterProvider(id){
        delete this._providers[id];
    }
    createCustomProvider(app, name, text){
        var data = text.split('\n');
        var provider = new CustomDataProvider(createUUID(), name, data, "list");
        app.patchProps(PatchType.Insert, "dataProviders", provider.toJSON());
    }
    getCustomProviders(){
        var result = [];
        for (var id in this._providers){
            var provider = this._providers[id];
            if (provider instanceof CustomDataProvider){
                result.push(provider);
            }
        }
        return result;
    }

    generate(app, providerName, propName, fieldName = "default"){
        var selection = Environment.view.getSelection();
        if (selection.length === 0){
            return;
        }

        var repeater = this._findRepeater(selection[0]);
        if (repeater){
            return this._generateForRepeater(providerName, fieldName, selection, repeater, propName);
        }

        return this._generateForSelection(providerName, fieldName, selection, propName);
    }

    _generateForRepeater(providerName, fieldName, selection, repeater, propName){
        var fieldMap = {};
        repeater.applyVisitorDepthFirst(x =>{
            if (selection.indexOf(x) !== -1){
                x.prepareAndSetProps({providerName, fieldName});
            }

            if (x.props.dataProvider){
                var fields = fieldMap[x.props.dataProvider];
                if (!fields){
                    fields = [];
                    fieldMap[x.props.dataProvider] = fields;
                }
                if (fields.indexOf(x.props.dataField) === -1){
                    fields.push(x.props.dataField);
                }
            }
        });

        return Promise.map(Object.keys(fieldMap), p => this._providers[p].fetch(fieldMap[p], repeater.children.length))
            .then(() =>{
                for (var i = 0; i < repeater.children.length; i++){
                    var cell = repeater.children[i];
                    cell.applyVisitorDepthFirst(x =>{

                    });
                }
                debugger;
            });
    }

    _generateForSelection(providerName, fieldName, selection, propName){
        var provider = this._providers[providerName];
        return provider.fetch([fieldName], selection.length)
            .then(data =>{
                for (var i = 0; i < data.length && i < selection.length; i++){
                    var record = data[i];
                    selection[i].prepareAndSetProps({
                        dataProvider: providerName,
                        dataField: fieldName,
                        [propName]: record[fieldName]
                    });
                }
            });
    }

    _findRepeater(element){
        var current = element.parent();
        do{
            if (current instanceof RepeatContainer){
                return current;
            }
            current = current.parent();
        } while(current);

        return null;
    }
}

var dataManager = new DataManager();
dataManager.registerProvider("builtin", new BuiltInDataProvider());

export default dataManager;