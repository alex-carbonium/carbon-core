import RepeatContainer from "../repeater/RepeatContainer";
import RepeatCell from "../repeater/RepeatCell";
import PropertyTracker from "../PropertyTracker";
import Selection from "../SelectionModel";
import { IDisposable, IDataManager, IApp } from "carbon-core";
import Promise from "bluebird";

export default class DataManager implements IDataManager, IDisposable {
    [name: string]: any;

    constructor(app: IApp) {
        this._providers = {};
        this._disposables = [];
        this._refreshTimer = 0;
        this._newCells = [];
        this._app = app;

        this._disposables.push(PropertyTracker.elementInserted.bind(this, this._onElementInserted));
    }

    registerProvider(id, instance) {
        this._providers[id] = instance;
    }
    generateForSelection() {
        var selection = Selection.selectedElements();
        if (selection.length === 0) {
            return;
        }

        var repeater = RepeatContainer.tryFindRepeaterParent(selection[0]);
        if (repeater) {
            return this._generateForRepeater(repeater);
        }

        return this._generateIndependent(selection);
    }

    _generateForRepeater(repeater: RepeatContainer, cellFilter: RepeatCell[] = null ) {
        var fieldMap = {};
        repeater.children[0].applyVisitorDepthFirst(x => this._addToFieldMap(x, fieldMap));
        if (!Object.keys(fieldMap).length){
            return Promise.resolve();
        }

        var cells = cellFilter ? cellFilter : repeater.children;
        var rowCount = cells.length;
        return this._fetchAll(fieldMap, rowCount)
            .then(data => {
                for (var i = 0; i < cells.length && i < rowCount; i++) {
                    var cell = cells[i];
                    cell.applyVisitorDepthFirst(x => {
                        if (x.props.dp){
                            var providerData = data.find(d => d.provider === x.props.dp);
                            if (i < providerData.records.length){
                                x.initFromData(providerData.records[i][x.props.df]);
                            }
                        }
                    });
                }
            });
    }

    _generateIndependent(elements) {
        var fieldMap = {};
        elements.forEach(x => this._addToFieldMap(x, fieldMap));

        return this._fetchAll(fieldMap, elements.length)
            .then(data => {
                var records = data[0].records;
                for (var i = 0; i < records.length && i < elements.length; i++) {
                    var record = records[i];
                    var element = elements[i];
                    element.initFromData(record[element.props.df]);
                }
            });
    }

    _fetchAll(fieldMap, rows): Promise<any[]> {
        var providers = Object.keys(fieldMap);
        return Promise.map(providers, p => this._providers[p].fetch(fieldMap[p], rows))
            .then(data => {
                var result = [];
                for (var i = 0; i < providers.length; ++i){
                    result.push({provider: providers[i], records: data[i]});
                }
                return result;
            });
    }

    _addToFieldMap(element, fieldMap) {
        if (element.props.dp) {
            var fields = fieldMap[element.props.dp];
            if (!fields) {
                fields = [];
                fieldMap[element.props.dp] = fields;
            }
            if (fields.indexOf(element.props.df) === -1) {
                fields.push(element.props.df);
            }
        }
    }

    _onElementInserted(parent, child){
        if (parent instanceof RepeatContainer) {
            //refresh data on the next frame since multiple elements could be inserted during arrange,
            //and data will come asynchronously anyway
            if (this._refreshTimer){
               clearTimeout(this._refreshTimer);
            }
            this._refreshTimer = setTimeout(() => {
                this._generateForRepeater(parent, this._newCells)
                    .then(() => this._newCells.length = 0);
                this._refreshTimer = 0;
            }, 1);
            this._newCells.push(child);
        }
    }

    dispose(){
        this._disposables.forEach(x => x.dispose());
        this._disposables.length = 0;
    }
}