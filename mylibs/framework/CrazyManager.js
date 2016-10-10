define(function(){
    var fwk = sketch.framework;

    var Manager = klass({
        _constructor: function(){
            this.isCrazy = false;
            this.offset = 1.8;
            this._stack = [];
        },
        push: function(value){
            this._stack.push(this.isCrazy);
            this.isCrazy = value;
        },
        pop: function(){
            this.isCrazy = this._stack.pop();
        },
        get: function(){
            return this.isCrazy;
        }
    });

    fwk.CrazyScope = new Manager();

    return fwk.CrazyScope;
});