define(function(){
    sketch.analytics = {
        event:function event(group, event, label, value){
            if (typeof ga === "function"){
                ga('send', 'event', group, event, label, value);
            }
        }
    };

    return sketch.analytics;
});