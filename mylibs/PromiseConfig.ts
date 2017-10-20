import bluebird from "bluebird";

bluebird.config({
    warnings: false,
    longStackTraces: true,
    cancellation: true
});

// NOTE: event name is all lower case as per DOM convention
window.addEventListener("unhandledrejection", function(e) {
    // NOTE: e.preventDefault() must be manually called to prevent the default
    // action which is currently to log the stack trace to console.warn
    e.preventDefault();
    // NOTE: parameters are properties of the event detail property
    if(e['detail']) {
        var reason = e['detail'].reason;
        var promise = e['detail'].promise;
        // See Promise.onPossiblyUnhandledRejection for parameter documentation
        console.error(reason);
    } else {
        console.error(e);
    }
});