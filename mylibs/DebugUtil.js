export default function(name){
    console.log("can use debug.enable('%s')", name);
    return require("debug")(name);
}