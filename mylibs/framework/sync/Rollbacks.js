export default {
    create: function(primitive, app){
        return defaultHandler(primitive, app);
    }
};


function defaultHandler(p){
    var rollbackData = p._rollbackData;
    if(!rollbackData){
        return null;
    }

    delete p._rollbackData;

    return rollbackData;
}