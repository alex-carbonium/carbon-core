// import {TextAlign} from "framework/Defs";
//
// define(["ui/common/Canvas", "ui/common/Label"], function(Canvas, Label){
//     var fwk = sketch.framework;
//     var cellCommonMethods = {
//         initProperties: function(){
//             this.properties.borderBrush.editable(false);
//             this.properties.borderWidth.editable(false);
//             this.properties.createProperty("topBorderBrush", "Top border color", fwk.Brush.Black).ofType(fwk.PropertyTypes.stroke);
//             this.properties.createProperty("bottomBorderBrush", "Bottom border color", fwk.Brush.Black).ofType(fwk.PropertyTypes.stroke);
//             this.properties.createProperty("leftBorderBrush", "Left border color", fwk.Brush.Black).ofType(fwk.PropertyTypes.stroke);
//             this.properties.createProperty("rightBorderBrush", "Right border color", fwk.Brush.Black).ofType(fwk.PropertyTypes.stroke);
//             this.properties.createProperty("topBorderWidth", "Top border width", 1).ofType(fwk.PropertyTypes.spinner);
//             this.properties.createProperty("bottomBorderWidth", "Bottom border width", 1).ofType(fwk.PropertyTypes.spinner);
//             this.properties.createProperty("leftBorderWidth", "Left border width", 1).ofType(fwk.PropertyTypes.spinner);
//             this.properties.createProperty("rightBorderWidth", "Right border width", 1).ofType(fwk.PropertyTypes.spinner);
//         },
//
//         getStyle:function(){
//             var data = {};
//             this.properties.topBorderBrush.toJSON(true, data, '');
//             this.properties.bottomBorderBrush.toJSON(true, data, '');
//             this.properties.leftBorderBrush.toJSON(true, data, '');
//             this.properties.rightBorderBrush.toJSON(true, data, '');
//             this.properties.topBorderWidth.toJSON(true, data, '');
//             this.properties.bottomBorderWidth.toJSON(true, data, '');
//             this.properties.leftBorderWidth.toJSON(true, data, '');
//             this.properties.rightBorderWidth.toJSON(true, data, '');
//             this.properties.backgroundBrush.toJSON(true, data, '');
//             this.properties.opacity.toJSON(true, data, '');
//
//             return data;
//         },
//         setStyle:function(style){
//             this.setProps(style);
//         },
//         propertiesChanged:function(events){
//             var that = this;
//             each(events, function(event) {
//                 if(event.property === 'topBorderWidth') {
//                     var table = that.parent();
//                     if(that.row() !== 0) {
//                         var relatedCell =  table.cell(that.row()-1, that.column());
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.bottomBorderWidth(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'bottomBorderWidth') {
//                     var table = that.parent();
//                     if(that.row() !== table.rowsCount() - 1) {
//                         var relatedCell =  table.cell(that.row()+1, that.column());
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.topBorderWidth(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'topBorderBrush') {
//                     var table = that.parent();
//                     if(that.row() !== 0) {
//                         var relatedCell =  table.cell(that.row()-1, that.column());
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.bottomBorderBrush(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'bottomBorderBrush') {
//                     var table = that.parent();
//                     if(that.row() !== table.rowsCount() - 1) {
//                         var relatedCell =  table.cell(that.row()+1, that.column());
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.topBorderBrush(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'leftBorderWidth') {
//                     var table = that.parent();
//                     if(that.column() !== 0) {
//                         var relatedCell =  table.cell(that.row(), that.column() - 1);
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.rightBorderWidth(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'rightBorderWidth') {
//                     var table = that.parent();
//                     if(that.column() !== table.columnsCount() - 1) {
//                         var relatedCell =  table.cell(that.row(), that.column() + 1);
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.leftBorderWidth(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'leftBorderBrush') {
//                     var table = that.parent();
//                     if(that.column() !== 0) {
//                         var relatedCell =  table.cell(that.row(), that.column() - 1);
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.rightBorderBrush(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'rightBorderBrush') {
//                     var table = that.parent();
//                     if(that.column() !== table.columnsCount() - 1) {
//                         var relatedCell =  table.cell(that.row(), that.column() + 1);
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.leftBorderBrush(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 }
//             });
//         },
//         topBorderBrush:function(value) {
//             return this.properties.topBorderBrush.value(value);
//         },
//         bottomBorderBrush:function(value) {
//             return this.properties.bottomBorderBrush.value(value);
//         },
//         leftBorderBrush:function(value) {
//             return this.properties.leftBorderBrush.value(value);
//         },
//         rightBorderBrush:function(value) {
//             return this.properties.rightBorderBrush.value(value);
//         },
//         topBorderWidth:function(value) {
//             return this.properties.topBorderWidth.value(value);
//         },
//         bottomBorderWidth:function(value) {
//             return this.properties.bottomBorderWidth.value(value);
//         },
//         leftBorderWidth:function(value) {
//             return this.properties.leftBorderWidth.value(value);
//         },
//         rightBorderWidth:function(value) {
//             return this.properties.rightBorderWidth.value(value);
//         },
//         column : function (/*Number*/value) {
//             return this.field("_column", value, 0);
//         },
//         row : function (/*Number*/value) {
//             return this.field("_row", value, 0);
//         },
//         canBeRemoved:function() {
//             return false;
//         },
//         canAlign:function(){
//             return false;
//         },
//         canChangeOrder:function(){
//             return false;
//         },
//         canGroup:function(){
//             return false;
//         },
//         select:function() {
//             if(this.parent()._showHeaders) {
//                 this.parent()._showHeaders(true);
//             }
//         },
//         unselect:function() {
//             if(this.parent()._showHeaders) {
//                 this.parent()._showHeaders(false);
//             }
//         },
//         resizeDimensions:function() {
//             return 0;//fwk.ResizeDimension.None;
//         },
//         getVisualActions:function() {
//             return {fromCategories: []};
//         }
//     };
//
//     klass2("sketch.ui.common.TableCell", Canvas, (function(){
//         return extend({
//             _constructor:function(){
//                 this.initProperties();
//             },
//             type:function(){
//                 return "custom";
//             }
//         }, cellCommonMethods);
//     })());
//
//     klass2("sketch.ui.common.TextTableCell", Label, (function(){
//
//         return extend({
//             _constructor:function(){
//                 this.initProperties();
//                 this.align({horizontal: TextAlign.center, top: TextAlign.top});
//                 this.text('');
//                 this.properties.scaleWithFontSize.editable(false);
//                     this.clipSelf(true);
//                     this.allowOverflow = true;
//             },
//             type:function(){
//                 return "text";
//             }
//         }, cellCommonMethods);
//     })());
//
// });