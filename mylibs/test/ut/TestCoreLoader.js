window.endpoints = {
    services: '',
    storage: '',
    cdn: '',
    file: ''
};

window.c = {
    coreCallback: null,
    api: null,
    core: null
};

window.__carbonapi = function(api){
    window.c.api = api;
};
window.__carboncore = function(core){
    window.c.core = core;
};