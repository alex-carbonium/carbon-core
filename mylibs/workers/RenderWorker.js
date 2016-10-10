onmessage = function(event) {
    var template = event.data;
    window = self;
    sketch = {};
    sketch.framework = {};
    sketch.params = {};
    require([
        "script",
        "framework/UIElement",
        "projects/Metadata",
        "framework/ContextExtensions",
        "framework/Template",
        "framework/Resources"], function(app) {
        postMessage('loaded');
    });
}
