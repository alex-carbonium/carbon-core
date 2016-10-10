import DataProvider from "./DataProvider";

export default class CustomDataProvider extends DataProvider{
    constructor(id, name, data, format){
        super();

        this.id = id;
        this.name = name;
        this.data = data;
        this.format = format;
    }
    fetch(fields, rowCount){
        var result = [];
        if (this.data.length === 0){
            return Promise.resolve(result);
        }
        if (this.format === "list"){
            var field = fields[0];
            var dataIndex = 0;
            for (var i = 0; i < rowCount; ++i){
                result.push({[field]: this.data[dataIndex]});

                if (++dataIndex === this.data.length){
                    dataIndex = 0;
                }
            }
        }
        return Promise.resolve(result);
    }
    getConfig(){
        return [
            {
                name: "",
                examples: this.data.slice(0, 2)
            }
        ]
    }

    toJSON(){
        return {id: this.id, name: this.name, data: this.data, format: this.format};
    }
    static fromJSON(json){
        return new CustomDataProvider(json.id, json.name, json.data, json.format);
    }
}
