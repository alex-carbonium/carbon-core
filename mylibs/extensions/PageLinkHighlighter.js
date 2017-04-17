// import Invalidate from "framework/Invalidate";
//
// define(["decorators/PageLinkDecorator"], function(PageLinkDecorator){
//     var SIZE = 32;
//
//     function load(){
//         this._elementsPerPage = {};
//
//         //this._app.viewModel.showPageLinks.subscribe(proxy(this, toggleLinks));
//     }
//
//     function toggleLinks(show){
//         if (show){
//             this._app.pageChanged.bind(this, onPageChanged);
//             highlightPage.call(this, this._app.activePage);
//         }
//         else {
//             this._app.pageChanged.unbind(this, onPageChanged);
//             removeAllHighlight.call(this);
//         }
//         Invalidate.request();
//     }
//
//     function highlightPage(page){
//         if (!this._elementsPerPage.hasOwnProperty(page.id())){
//             var elements = [];
//             this._elementsPerPage[page.id()] = elements;
//
//             var that = this;
//             page.applyVisitor(function (e) {
//                 if (e.pageLink() !== null) {
//                     addDecorator.call(that, e);
//                     elements.push(e);
//                 }
//             });
//         }
//     }
//     function removePageHighlight(pageId){
//         var elements = this._elementsPerPage[pageId];
//         if (elements){
//             for (var i = 0, l = elements.length; i < l; ++i) {
//                 var element = elements[i];
//                 element.removeDecoratorByType(PageLinkDecorator);
//             }
//         }
//         delete this._elementsPerPage[pageId];
//     }
//     function removeAllHighlight(){
//         var pageIds = Object.keys(this._elementsPerPage);
//         for (var i = 0, l = pageIds.length; i < l; ++i) {
//             var pageId = pageIds[i];
//             removePageHighlight.call(this, pageId);
//         }
//         this._elementsPerPage = {};
//     }
//     function addDecorator(e){
//         e.addDecorator(new PageLinkDecorator());
//     }
//
//     function onPageChanged(oldPage, newPage){
//         removePageHighlight.call(this, oldPage.id());
//         highlightPage.call(this, newPage);
//     }
//
//     return klass2('sketch.extensions.PageLinkHighlighter', null, (function () {
//         return {
//             _constructor: function (app) {
//                 if (app.platform.richUI()) {
//                     this._app = app;
//                     // app.onLoad(load.bind(this));
//                 }
//             },
//             detach:function(){
//
//             }
//         };
//     })());
// });
