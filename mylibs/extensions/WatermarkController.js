// define(function(){
//     return klass((function(){
//         function show(){
//             this._app.viewModel.showWorkplaceMessage("watermarkWorkplaceMessage", this);
//         }
//         function viewModeChanged(){
//             if (this._app.viewModel.isPreviewMode()){
//                 show.call(this);
//                 this._app.pageChanged.bind(this, show);
//             }
//             else{
//                 this.close();
//                 this._app.pageChanged.unbind(this, show);
//             }
//         }
//
//         function subscribe(){
//             this._app.actionManager.subscribeToActionStart("switchViewMode", this, viewModeChanged);
//         }
//
//         return {
//             _constructor: function(app){
//                 if (!sketch.params.showWatermark){
//                     return;
//                 }
//                 this._app = app;
//
//                 app.loaded.bind(this, subscribe);
//             },
//             close: function(){
//                 this._app.viewModel.hideWorkplaceMessage();
//             }
//         }
//     })());
// });