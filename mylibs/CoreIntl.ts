export default class CoreIntl {
    static instance: any = null;

    static label(id: string){
        if (CoreIntl.instance){
            return CoreIntl.instance.formatMessage({id, defaultMessage: id});
        }
        return id;
    }

    static registerTestInstance(){
        CoreIntl.instance = {
            formatMessage(msg, data){
                var result = msg.defaultMessage;
                if (data && data.index){
                    result += " " + data.index;
                }
                return result;
            }
        };
    }
}