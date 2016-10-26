// import {TextAlign} from "framework/Defs";
//
// define(["ui/common/Canvas", "ui/common/Label"], function(Canvas, Label){
//     var fwk = sketch.framework;
//     var cellCommonMethods = {
//         initProperties: function(){
//             this.properties.stroke.editable(false);
//             this.properties.strokeWidth.editable(false);
//             this.properties.createProperty("topstroke", "Top border color", fwk.Brush.Black).ofType(fwk.PropertyTypes.stroke);
//             this.properties.createProperty("bottomstroke", "Bottom border color", fwk.Brush.Black).ofType(fwk.PropertyTypes.stroke);
//             this.properties.createProperty("leftstroke", "Left border color", fwk.Brush.Black).ofType(fwk.PropertyTypes.stroke);
//             this.properties.createProperty("rightstroke", "Right border color", fwk.Brush.Black).ofType(fwk.PropertyTypes.stroke);
//             this.properties.createProperty("topstrokeWidth", "Top border width", 1).ofType(fwk.PropertyTypes.spinner);
//             this.properties.createProperty("bottomstrokeWidth", "Bottom border width", 1).ofType(fwk.PropertyTypes.spinner);
//             this.properties.createProperty("leftstrokeWidth", "Left border width", 1).ofType(fwk.PropertyTypes.spinner);
//             this.properties.createProperty("rightstrokeWidth", "Right border width", 1).ofType(fwk.PropertyTypes.spinner);
//         },
//
//         getStyle:function(){
//             var data = {};
//             this.properties.topstroke.toJSON(true, data, '');
//             this.properties.bottomstroke.toJSON(true, data, '');
//             this.properties.leftstroke.toJSON(true, data, '');
//             this.properties.rightstroke.toJSON(true, data, '');
//             this.properties.topstrokeWidth.toJSON(true, data, '');
//             this.properties.bottomstrokeWidth.toJSON(true, data, '');
//             this.properties.leftstrokeWidth.toJSON(true, data, '');
//             this.properties.rightstrokeWidth.toJSON(true, data, '');
//             this.properties.fill.toJSON(true, data, '');
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
//                 if(event.property === 'topstrokeWidth') {
//                     var table = that.parent();
//                     if(that.row() !== 0) {
//                         var relatedCell =  table.cell(that.row()-1, that.column());
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.bottomstrokeWidth(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'bottomstrokeWidth') {
//                     var table = that.parent();
//                     if(that.row() !== table.rowsCount() - 1) {
//                         var relatedCell =  table.cell(that.row()+1, that.column());
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.topstrokeWidth(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'topstroke') {
//                     var table = that.parent();
//                     if(that.row() !== 0) {
//                         var relatedCell =  table.cell(that.row()-1, that.column());
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.bottomstroke(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'bottomstroke') {
//                     var table = that.parent();
//                     if(that.row() !== table.rowsCount() - 1) {
//                         var relatedCell =  table.cell(that.row()+1, that.column());
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.topstroke(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'leftstrokeWidth') {
//                     var table = that.parent();
//                     if(that.column() !== 0) {
//                         var relatedCell =  table.cell(that.row(), that.column() - 1);
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.rightstrokeWidth(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'rightstrokeWidth') {
//                     var table = that.parent();
//                     if(that.column() !== table.columnsCount() - 1) {
//                         var relatedCell =  table.cell(that.row(), that.column() + 1);
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.leftstrokeWidth(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'leftstroke') {
//                     var table = that.parent();
//                     if(that.column() !== 0) {
//                         var relatedCell =  table.cell(that.row(), that.column() - 1);
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.rightstroke(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 } else if(event.property === 'rightstroke') {
//                     var table = that.parent();
//                     if(that.column() !== table.columnsCount() - 1) {
//                         var relatedCell =  table.cell(that.row(), that.column() + 1);
//                         relatedCell.unbindPropertyChanged();
//                         relatedCell.leftstroke(event.newValue);
//                         relatedCell.bindPropertyChanged();
//                     }
//                 }
//             });
//         },
//         topstroke:function(value) {
//             return this.properties.topstroke.value(value);
//         },
//         bottomstroke:function(value) {
//             return this.properties.bottomstroke.value(value);
//         },
//         leftstroke:function(value) {
//             return this.properties.leftstroke.value(value);
//         },
//         rightstroke:function(value) {
//             return this.properties.rightstroke.value(value);
//         },
//         topstrokeWidth:function(value) {
//             return this.properties.topstrokeWidth.value(value);
//         },
//         bottomstrokeWidth:function(value) {
//             return this.properties.bottomstrokeWidth.value(value);
//         },
//         leftstrokeWidth:function(value) {
//             return this.properties.leftstrokeWidth.value(value);
//         },
//         rightstrokeWidth:function(value) {
//             return this.properties.rightstrokeWidth.value(value);
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