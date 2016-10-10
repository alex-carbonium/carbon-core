module.exports = function(args){
    var t = args.types;
    return {
        visitor: {
            CallExpression(path){
                var callee = path.get("callee");
                if (t.isIdentifier(callee.node) && callee.node.name === "debug"){
                    path.remove();
                }
            }
        }
    }
};