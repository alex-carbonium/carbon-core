module.exports = function(args) {
    var t = args.types;
    return {
        visitor: {
            ClassDeclaration(path) {
                var parent = path;
                if (t.isExportNamedDeclaration(path.parentPath.node) || t.isExportDefaultDeclaration(path.parentPath.node)){
                    parent = path.parentPath;
                }
                parent.insertAfter(t.assignmentExpression("=",
                    t.memberExpression(
                        t.memberExpression(
                            t.identifier(path.node.id.name),
                            t.identifier('prototype')
                        ),
                        t.identifier('__type__')
                    ),
                    t.stringLiteral(path.node.id.name)));
            }
        }
    };
}