define(function(){
    var p = sketch.framework.pubSub = {};
    "use strict";

    p.version = "1.0.2";

    var messages = {},
        lastUid = -1;

    function publish( message, data, sync ){
        // if there are no subscribers to this message, just return here
        if ( !messages.hasOwnProperty( message ) ){
            return false;
        }

        function deliverMessage(){
            var subscribers = messages[message],
                throwException = function(e){
                    return function(){
                        throw e;
                    };
                },
                i, j;
            for ( i = 0, j = subscribers.length; i < j; i++ ){
                try {
                    var subscriber = subscribers[i];
                    subscriber.func( message, data, subscriber.data );
                } catch( e ){
                    setTimeout( throwException(e), 0);
                }
            }
        }

        if ( sync === true ){
            deliverMessage();
        } else {
            setTimeout( deliverMessage, 0 );
        }
        return true;
    }

    /**
     * PubSub.publish( message[, data] ) -> Boolean
     * - message (String): The message to publish
     * - data: The data to pass to subscribers
     * - sync (Boolean): Forces publication to be syncronous, which is more confusing, but faster
     * Publishes the the message, passing the data to it's subscribers
     **/
    p.publish = function( message, data ){
        return publish( message, data, false );
    };

    /**
     * PubSub.publishSync( message[, data] ) -> Boolean
     * - message (String): The message to publish
     * - data: The data to pass to subscribers
     * - sync (Boolean): Forces publication to be syncronous, which is more confusing, but faster
     * Publishes the the message synchronously, passing the data to it's subscribers
     **/
    p.publishSync = function( message, data ){
        return publish( message, data, true );
    };

    /**
     * PubSub.subscribe( message, func ) -> String
     * - message (String): The message to subscribe to
     * - func (Function): The function to call when a new message is published
     * Subscribes the passed function to the passed message. Every returned token is unique and should be stored if you need to unsubscribe
     **/
    p.subscribe = function( message, func, data ){
        // message is not registered yet
        if ( !messages.hasOwnProperty( message ) ){
            messages[message] = [];
        }

        // forcing token as String, to allow for future expansions without breaking usage
        // and allow for easy use as key names for the 'messages' object
        var token = (++lastUid).toString();
        messages[message].push( { token : token, func : func, data: data } );

        // return token for unsubscribing
        return token;
    };

    /**
     * PubSub.unsubscribe( token ) -> String | Boolean
     * - token (String): The token of the function to unsubscribe
     * Unsubscribes a specific subscriber from a specific message using the unique token
     **/
    p.unsubscribe = function( token ){
        var m, i, j;
        for ( m in messages ){
            if ( messages.hasOwnProperty( m ) ){
                for ( i = 0, j = messages[m].length; i < j; i++ ){
                    if ( messages[m][i].token === token ){
                        messages[m].splice( i, 1 );
                        return token;
                    }
                }
            }
        }
        return false;
    };

    return p;
});

