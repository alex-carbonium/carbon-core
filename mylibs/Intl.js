export default {
    instance: null,

    registerTestInstance: function(){
        this.instance = {
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