require("babel-register")({
    presets: ['es2015']
});
global.DEBUG = true;

var Types = require("./Defs").Types;

var free = {};
var a = 'a'.charCodeAt(0);
var z = 'z'.charCodeAt(0);
var A = 'A'.charCodeAt(0);
var Z = 'Z'.charCodeAt(0);

for (var i = a; i <= z; i++){
    free[String.fromCharCode(i)] = true;
}
for (var i = A; i <= Z; i++){
    free[String.fromCharCode(i)] = true;
}

for (var t in Types){
    var c = Types[t];
    delete free[c];
}
console.log(Object.keys(free));