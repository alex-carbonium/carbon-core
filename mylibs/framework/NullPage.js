import PropertyMetadata from "framework/PropertyMetadata";
import {Types} from "./Defs";

define(function () {
    // fwk.PropertyMetadata.extend("sketch.framework.Page", {
    //     "sketch.framework.NullPage": {
    //
    //     }
    // });

    var NullPage = klass2("NullPage", null, (function () {
        return {
            _constructor: function () {
                this.children = [];
                this.props = {};
            },
            parent: function () {

            },
            isInitialized: function () {
                return true;
            },
            init: function (view) {

            },
            getAllArtboards: function () {
                return [];
            },
            getArtboardAtPoint(){

            },
            getArtboardById(){

            },
            getElementsInRect(){
                return [];
            },
            initId: function () {
            },
            add: function (/*UIElement*/element) {
            },
            remove: function (/*UIElement*/element) {
            },
            clear: function () {
            },
            renderTile: function (canvas, options) {
            },
            invalidate: function () {

            },
            homeScreen(){

            },
            enablePropsTracking(){

            },
            disablePropsTracking(){

            },
            getActiveArtboard(){

            },
            renderContentTile: function (context, x, y, zoom) {
            },
            renderContentToDataURL: function () {
            },
            resize: function (rect) {
            },
            id: function () {
                return 0;
            },
            toJSON: function () {
            },
            fromJSON: function (data) {
            },
            timeStamp: function () {
            },
            name: function (value) {
            },
            encodedName(){
            },
            preview: function () {
                return false;
            },
            isPhoneVisible: function (visible) {
            },
            activating: function () {
            },
            deactivating: function () {
            },
            activated: function (previousPage) {
            },
            deactivated: function () {
            },
            getContentContainer: function () {
                return this;
            },
            scaleToSize: function () {
                return 1;
            },
            getEditableProperties: function () {
                return [];
            },
            isInvalidateRequired: function () {
                return false;
            },
            displayName: function () {
                return "Page";
            },
            viewportRect: function () {
                return {x: 0, y: 0, width: 0, height: 0};
            },
            scale: function () {
                return 1;
            },
            autoInsert: function () {

            },
            drawSelf: function (context, w, h) {

            },

            setProps(){

            },

            initPage(){

            },
            getHomeArtboard(){

            },
            scrollX(){

            },
            scrollY(){

            },
            hitElement(){
                return null;
            },
            pointToScroll(){
                return {scrollX: 0, scrollY: 0};
            }
        }
    })());

    NullPage.prototype.t = Types.NullPage;

    PropertyMetadata.registerForType(NullPage, {});


    return new NullPage();
});