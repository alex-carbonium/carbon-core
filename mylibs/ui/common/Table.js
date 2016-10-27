// import CompositeCommand from "../../framework/commands/CompositeCommand";
// import Selection from "framework/SelectionModel";
// import Invalidate from "framework/Invalidate";
//
// define(["framework/Container", "framework/CompositeElement"], function(Container, CompositeElement){
//     var fwk = sketch.framework;
//     var ui = sketch.ui;
//     var tags = sketch.framework.smarttags;
//     var CellGroup = klass2("sketch.ui.common.CellGroup", fwk.CompositeElement, (function(){
//
//         function onTypeChanged(type){
//             fwk.commandManager.execute(new sketch.commands.ChangeColumnType(this, type));
//         }
//         return {
//             _constructor:function(orientation, index, cells) {
//                 if(arguments.length) {
//                     this._orientation = orientation;
//                     this._index = index;
//                     var that = this;
//                     each(cells, function(cell) {
//                         that.add(cell);
//                     });
//                     this.createCommonProperties(cells);
//                 }
//                 if(orientation == 'vertical') {
//                     var type = cells[0].parent().getColumnType(this._index);
//                     var prop = this.commonProperties.createProperty("columnType", "Column type", type)
//                         .ofType(fwk.PropertyTypes.choice)
//                         .editable(true)
//                         .possibleValues({custom:"Custom", text:"Text"});
//
//                 }
//                 this.properties.angle.editable(false);
//             },
//             propsUpdated:function(props, oldProps){
//                 fwk.CompositeElement.prototype.propsUpdated.apply(this, arguments);
//                 if(props.columnType !== undefined) {
//                     onTypeChanged.call(this, props.columnType);
//                 }
//             },
//             canBeAccepted: function(parent){
//                 return parent instanceof ui.common.Table;
//             },
//             fromJSON:function(data) {
//                 this.clearCommonProperties();
//                 this.clear();
//                 this._index = data.index;
//                 this._orientation = data.orientation;
//                 var that = this;
//                 each(data.elements, function(element){
//                    that.add(fwk.UIElement.fromJSON(element));
//                 });
//                 this.createCommonProperties(this.elements);
//             },
//             toJSON:function(includeDefaults) {
//                 var data = {};
//                 data.type = this.t;
//                 data.index = this._index;
//                 data.orientation = this._orientation;
//                 data.elements = map(this.elements, function(element){
//                     var data =  element.toJSON(includeDefaults);
//                     delete data.id;
//                     return data;
//                 });
//                 return data;
//             },
//             clone:function(){
//                 var data = this.toJSON();
//                 var clone = new CellGroup();
//                 clone.fromJSON(data);
//                 return clone;
//             },
//             getBoundaryRectGlobal:function() {
//                 return this.getBoundaryRect();
//             },
//
//             autoSelectOnPaste:function(){
//                 return false;
//             },
//             select:function() {
//                 this.parent()._showHeaders(true);
//             },
//             unselect:function() {
//                 this.parent()._showHeaders(false);
//             },
//             //TODO: use constructDeleteCommand instead
//             deleteCommandOverride:function() {
//                 return sketch.commands.DeleteCellGroup;
//             },
//             //TODO: override commands instead
//             constructElementNewPrimitive: function(){
//                 return fwk.sync.Primitive.element_change(this.parent());
//             },
//             constructElementDeletePrimitive: function(){
//                 return fwk.sync.Primitive.element_change(this.parent());
// 	    }
//         }
//     })());
//
//     klass2("sketch.ui.common.Table", Container, (function(){
//
//         var HEADERSIZE = 9,
//             HEADEROFFSET = 7,
//             MINCELLSIZE = 5,
//             DEFAULTTYPE='text';
//
//         function initCell(cell, column, row) {
//
//              cell.canDrag(false);
//              cell.column(column);
//              cell.minWidth(MINCELLSIZE);
//              cell.minHeight(MINCELLSIZE);
//              cell.row(row);
//
//         }
//         function checkDimensions(cols, rows, count){
//             if(!cols || !rows) {
//                 return false;
//             }
//
//             if(cols * rows !== count) {
//                 var res = checkDimensions.call(this, cols - 1, rows, count);
//                 if (!res) {
//                     res = checkDimensions.call(this, cols, rows - 1, count);
//                 }
//             } else {
//                 for(var i = 0; i < rows; i++) {
//                     var h = this.children.elementAt(i*cols+0).height();
//                     for(var j = 1; j < cols; j++){
//                         if(h !== this.children.elementAt(i*cols+j).height()){
//                             return false;
//                         }
//                     }
//                 }
//
//                 for(var j = 0; j < cols; j++){
//                     var w = this.children.elementAt(j).width();
//                     for(var i = 1; i < rows; i++) {
//                         if(w !== this.children.elementAt(i*cols+j).width()){
//                             return false;
//                         }
//                     }
//                 }
//                 this._updating = true;
//                 this.rowsCount(rows);
//                 this.columnsCount(cols);
//                 this._updating = false;
//
//                 return true;
//             }
//
//             return res;
//         }
//
//         function fixTableDimensions(){
//             var cols = this.columnsCount();
//             var rows = this.rowsCount();
//             var count = this.children.count();
//             checkDimensions.call(this, cols, rows, count);
//         }
//
//         function createCell(type, column, row, width, height, colsCount, rowsCount) {
//             var cell = this.createCell(type);
//             initCell(cell, column, row);
//             cell.setProps({
//                 width:width,
//                 height:height,
//                 zOrder: row * colsCount + column
//             });
//             return cell;
//         }
//
//         function hitTopHeader(rect, event) {
//             if(!this._topHeaderVisible) {
//                 return false;
//             }
//             return (event.x>rect.x && event.x < rect.x + rect.width && event.y < rect.y && event.y > rect.y - 24 / App.Current.view.scale());
//         }
//
//         function hitLeftHeader(rect, event) {
//             if(!this._leftHeaderVisible) {
//                 return false;
//             }
//             return (event.y>rect.y && event.y < rect.y + rect.height && event.x < rect.x && event.x > rect.x - 24 / App.Current.view.scale());
//         }
//
//         function hitVerticalLine(x, y) {
//             var offset = 0;
//             if(this._topHeaderVisible) {
//
//                 offset = -(HEADERSIZE + HEADEROFFSET) / App.Current.view.scale();
//             }
//
//             if(y < offset || y > this.height()) {
//                 return null;
//             }
//
//             var columnsCount = this.columnsCount();
//
//             for(var i = 1; i < columnsCount; ++i) {
//                 var cell = this.cell(0, i);
//                 if(Math.abs(cell.x() - x) <= 3) {
//                     return i;
//                 }
//             }
//
//             return null;
//         }
//
//         function hitHorizontalLine(x, y) {
//             var offset = 0;
//             if(this._leftHeaderVisible) {
//                 offset = -(HEADERSIZE + HEADEROFFSET) / App.Current.view.scale();
//             }
//             if(x < offset || x > this.width()) {
//                 return null;
//             }
//
//             var rowsCount = this.rowsCount();
//             for(var i = 1; i < rowsCount; ++i) {
//                 var cell = this.cell(i,0);
//                 if(Math.abs(cell.y() - y) <= 3) {
//                     return i;
//                 }
//             }
//
//             return null;
//         }
//
//
//         function findColumnByX(x) {
//             var columnsCount = this.columnsCount();
//             var res = columnsCount - 1;
//
//             for(var i = 1; i < columnsCount; ++i) {
//                 if(this.cell(0, i).x() > x) {
//                     res = i - 1;
//                     break;
//                 }
//             }
//
//             return res;
//         }
//
//         function findRowByY(y){
//             var rowsCount = this.rowsCount();
//             var res = rowsCount - 1;
//             for(var i = 1; i < rowsCount; ++i) {
//                 if(this.cell(i, 0).y() > y) {
//                     res = i - 1;
//                     break;
//                 }
//             }
//
//             return res;
//         }
//
//         function drawBorders(context) {
//             context.save();
//             context.translate(this.x(), this.y());
//             var x = 0, y = 0, lastBrush, lastWidth;
//             var rowsCount = this.rowsCount();
//             var colsCount = this.columnsCount();
//             for(var i = 0; i < rowsCount; ++i) {
//                 for(var j = 0; j < colsCount; ++j) {
//                     var cell = this.cell(i, j);
//                     // draw top border
//                     var brush = cell.topstroke();
//                     var width = cell.topstrokeWidth();
//                     var rect = cell.getBoundaryRect();
//                     if(!lastBrush) {
//                         lastBrush = brush;
//                         lastWidth = width;
//                         x = rect.x;
//                         y = rect.y;
//                     } else if(width !== lastWidth || brush !== lastBrush) {
//                         var x2 = rect.x;
//                         context.lineWidth = lastWidth;
//                         context.linePath(x, y, x2, y);
//                         fwk.Brush.stroke(lastBrush, context, x, y, x2, y);
//                         lastBrush = brush;
//                         lastWidth = width;
//                         x = x2;
//                     }
//
//                     // draw left
//                     context.lineWidth = cell.leftstrokeWidth();
//                     context.linePath(rect.x, rect.y, rect.x, rect.y+rect.height);
//                     fwk.Brush.stroke(cell.leftstroke(), context, rect.x, rect.y, rect.x, rect.y+rect.height);
//                 }
//
//                 x2 = cell.x() + cell.width();
//                 context.lineWidth = lastWidth;
//                 context.linePath(x, y, x2, y);
//                 fwk.Brush.stroke(lastBrush, context, x, y, x2, y);
//                 lastBrush = null;
//                 lastWidth = null;
//                 // draw right
//                 context.lineWidth = cell.rightstrokeWidth();
//                 context.linePath(rect.x+rect.width, rect.y, rect.x+rect.width, rect.y+rect.height);
//                 fwk.Brush.stroke(cell.rightstroke(), context, rect.x+rect.width, rect.y, rect.x+rect.width, rect.y+rect.height);
//             }
//
//             for(var j = 0; j < colsCount; ++j) {
//                 var cell = this.cell(rowsCount - 1, j);
//                 // draw top border
//                 var brush = cell.bottomstroke();
//                 var width = cell.bottomstrokeWidth();
//                 if(!lastBrush) {
//                     lastBrush = brush;
//                     lastWidth = width;
//                     x = cell.x();
//                     y = cell.y() + cell.height();
//                 } else if(width !== lastWidth || brush !== lastBrush) {
//                     var x2 = cell.x();
//                     context.lineWidth = lastWidth;
//                     context.linePath(x, y, x2, y);
//                     fwk.Brush.stroke(lastBrush, context, x, y, x2, y);
//                     lastBrush = brush;
//                     lastWidth = width;
//                     x = x2;
//                 }
//             }
//
//             x2 = cell.x() + cell.width();
//             context.lineWidth = width;
//             context.linePath(x, y, x2, y);
//             fwk.Brush.stroke(brush, context, x, y, x2, y);
//
//             context.restore();
//         }
//
//         function drawHeaders(context, rect) {
//             var scale = App.Current.view.scale();
//             var headerSize = HEADERSIZE / scale, headerOffset = HEADEROFFSET / scale;
//             context.save();
//             context.fillStyle = 'rgba(109, 161, 249, 0.8)';
//             if(this._topHeaderVisible) {
//                 var x = rect.x;
//                 var colsCount = this.columnsCount();
//                 for(var i = 0; i < colsCount; ++i) {
//                     var cell = this.cell(0, i);
//                     var cw = cell.width();
//                     context.rectPath(x + 1, rect.y - headerSize - headerOffset, cw - 2, headerSize, false);
//                     context.fill();
//                     x += cw;
//                 }
//             }
//             if(this._leftHeaderVisible) {
//                  var y = rect.y;
//                 var rowsCount = this.rowsCount();
//                 for(var i = 0; i < rowsCount; ++i) {
//                     var cell = this.cell(i, 0);
//                     var ch = cell.height();
//                     context.rectPath(rect.x - headerSize - headerOffset, y, headerSize, ch - 2, false);
//                     context.fill();
//                     y += ch;
//                 }
//             }
//             context.restore();
//         }
//
//         function getColumnCells(columnIdx) {
//             var cells = [];
//             var count = this.rowsCount();
//             for (var i = 0; i < count; ++i) {
//                 cells.push(this.cell(i, columnIdx));
//             }
//             return cells;
//         }
//
//         function selectColumn(columnIdx) {
//             var cells = getColumnCells.call(this, columnIdx);
//             var group = new CellGroup('vertical', columnIdx, cells);
//             group.parent(this);
//             Selection.makeSelection([group]);
//         }
//
//         function getRowCells(rowIdx) {
//             var cells = [];
//             var count = this.columnsCount();
//             for (var i = 0; i < count; ++i) {
//                 cells.push(this.cell(rowIdx, i));
//             }
//             return cells;
//         }
//
//         function selectRow(rowIdx) {
//             var cells = getRowCells.call(this, rowIdx);
//             var group = new CellGroup('horizontal', rowIdx, cells);
//             group.parent(this);
//             Selection.makeSelection([group]);
//         }
//
//         function showColumnInsertTag(event, rect) {
//             var columnIdx = findColumnByX.call(this, event.x - rect.x);
//             var scale = App.Current.view.scale();
//             var size = 24 / scale;
//             // TODO: use column metadata
//             var column = this.cell(0, columnIdx);
//             var rect = column.getBoundaryRectGlobal();
//             var type = 'left';
//             var x = rect.x;
//             if(event.x > rect.x + rect.width/2) {
//                 type = 'right';
//                 x = rect.x + rect.width - size;
//             }
//
//             if(this._insertTag && this._insertTag.index === columnIdx && this._insertTag.type === type) {
//                 return;
//             }
//
//             if(this._insertTag) {
//                 this._insertTag.dispose();
//             }
//
//             var that = this;
//             // this._insertTag = new tags.SmartTag({cssClass:"tableInsertTag " + type});
//             // this._insertTag.index = columnIdx;
//             // this._insertTag.type = type;
//             // this._insertTag.onClick.bind(function(){
//             //     var idx;
//             //     if(type === 'left') {
//             //         idx = columnIdx;
//             //     } else {
//             //         idx = columnIdx + 1;
//             //     }
//             //
//             //     var columnStyle = that.getColumnStyle(columnIdx);
//             //     var insertCommand = new sketch.commands.InsertColumn(that, idx, that.cell(0, columnIdx).width(), columnStyle);
//             //     fwk.commandManager.execute(insertCommand);
//             // })
//             // this._insertTag.show(x, rect.y - size - (HEADERSIZE + HEADEROFFSET)/scale)
//         }
//
//         function showRowInsertTag(event, rect) {
//             var rowIdx = findRowByY.call(this, event.y - rect.y);
//             var scale = App.Current.view.scale();
//             var size = 24 / scale;
//             var cell = this.cell(rowIdx, 0);
//             var rect = cell.getBoundaryRectGlobal();
//             var type = 'up';
//             var y = rect.y;
//             if(event.y > rect.y + rect.height/2) {
//                 type = 'down';
//                 y = rect.y + rect.height - size;
//             }
//
//             if(this._insertTag && this._insertTag.index === rowIdx && this._insertTag.type === type) {
//                 return;
//             }
//
//             if(this._insertTag) {
//                 this._insertTag.dispose();
//             }
//
//             var that = this;
//             // this._insertTag = new tags.SmartTag({cssClass:"tableInsertTag " + type});
//             // this._insertTag.index = rowIdx;
//             // this._insertTag.type = type;
//             // this._insertTag.onClick.bind(function(){
//             //     var idx;
//             //     if(type === 'up') {
//             //         idx = rowIdx;
//             //     } else {
//             //         idx = rowIdx + 1;
//             //     }
//             //
//             //     var rowStyle = that.getRowStyle(rowIdx);
//             //     var insertCommand = new sketch.commands.InsertRow(that, idx, that.cell(rowIdx, 0).height(), rowStyle);
//             //     fwk.commandManager.execute(insertCommand);
//             // })
//             // this._insertTag.show(rect.x - size - (HEADERSIZE + HEADEROFFSET)/scale, y);
//         }
//
//         function updateResizingLine(line, pos) {
//             line.currentPos = pos;
//             if (line.minPos > line.currentPos) {
//                 line.currentPos = line.minPos;
//             }
//
//             if (line.maxPos < line.currentPos) {
//                 line.currentPos = line.maxPos;
//             }
//             Invalidate.requestUpperOnly();
//         }
//
//         function cleanupTags(){
//             Cursor.removeGlobalCursor(true);
//             if (this._insertTag) {
//                 this._insertTag.dispose();
//                 delete this._insertTag;
//             }
//         }
//
//         function onMouseMove(event) {
//             var rect = this.getBoundaryRectGlobal();
//
//             if(this._resizingColumn) {
//                 updateResizingLine(this._resizingColumn, event.x);
//                 event.handled = true;
//             } else if(this._resizingRow) {
//                 updateResizingLine(this._resizingRow, event.y);
//                 event.handled = true;
//             }
//
//             if(!event.handled) {
//                 if(hitVerticalLine.call(this, event.x - rect.x, event.y - rect.y)) {
//                     Cursor.setGlobalCursor('col-resize', true);
//                     event.handled = true;
//                 }
//                 else if(hitHorizontalLine.call(this, event.x - rect.x, event.y - rect.y)) {
//                     Cursor.setGlobalCursor('row-resize', true);
//                     event.handled = true;
//                 } else if(this._topHeaderVisible && hitTopHeader.call(this, rect, event)) {
//                     Cursor.setGlobalCursor('pointer', true);
//                     showColumnInsertTag.call(this, event, rect);
//                     event.handled = true;
//                 } else if(this._leftHeaderVisible && hitLeftHeader.call(this, rect, event)) {
//                     Cursor.setGlobalCursor('pointer', true);
//                     showRowInsertTag.call(this, event, rect);
//                     event.handled = true;
//                 }
//                 else {
//                     cleanupTags.call(this);
//                 }
//             }
//         }
//
//         function onMouseDown(event) {
//             var rect = this.getBoundaryRectGlobal();
//             var lineNum;
//             if(lineNum = hitVerticalLine.call(this, event.x - rect.x, event.y - rect.y)) {
//                 var cell = this.cell(0, lineNum);
//                 this._resizingColumn = {
//                     lineNum:lineNum,
//                     currentPos: rect.x + cell.x(),
//                     originalPos: rect.x + cell.x(),
//                     minPos: this.cell(0, lineNum - 1).x() + rect.x + MINCELLSIZE,
//                     maxPos: cell.x() + cell.width() + rect.x - MINCELLSIZE
//                 };
//                 if(!(this._topHeaderVisible || this._leftHeaderVisible)) {
//                     this.registerForLayerDraw(2, this);
//                 }
//                 this.captureMouse(this);
//                 event.handled = true;
//             } else if(lineNum = hitHorizontalLine.call(this, event.x - rect.x, event.y - rect.y)) {
//                 var cell = this.cell(lineNum, 0);
//                 this._resizingRow = {
//                     lineNum:lineNum,
//                     currentPos: rect.y + cell.y(),
//                     originalPos: rect.y + cell.y(),
//                     minPos: this.cell(lineNum - 1, 0).y() + rect.y + MINCELLSIZE,
//                     maxPos: cell.y() + cell.height() + rect.y - MINCELLSIZE
//                 };
//                 if(!(this._topHeaderVisible || this._leftHeaderVisible)) {
//                     this.registerForLayerDraw(2, this);
//                 }
//                 this.captureMouse(this);
//                 event.handled = true;
//             } else if(this._topHeaderVisible && hitTopHeader.call(this, rect, event)) {
//                 var columnIdx = findColumnByX.call(this, event.x - rect.x);
//                 selectColumn.call(this, columnIdx);
//                 event.handled = true;
//             } else if(this._leftHeaderVisible && hitLeftHeader.call(this, rect, event)) {
//                 var rowIdx = findRowByY.call(this, event.y - rect.y);
//                 selectRow.call(this, rowIdx);
//                 event.handled = true;
//             }
//         }
//
//         function onMouseUp(event) {
//             if(this._resizingColumn) {
//                 this.releaseMouse(this);
//                 if(!(this._topHeaderVisible || this._leftHeaderVisible)) {
//                     this.unregisterForLayerDraw(2, this);
//                 }
//                 Cursor.removeGlobalCursor(true);
//                 var d = this._resizingColumn.originalPos - this._resizingColumn.currentPos;
//                 if(d !== 0) {
//                     fwk.commandManager.execute(new sketch.commands.ResizeColumn(this, this._resizingColumn.lineNum, d, event.event.shiftKey));
//                 }
//                 delete this._resizingColumn;
//                 Invalidate.requestUpperOnly();
//                 event.handled = true;
//             } else if(this._resizingRow) {
//                 this.releaseMouse(this);
//                 if(!(this._topHeaderVisible || this._leftHeaderVisible)) {
//                     this.unregisterForLayerDraw(2, this);
//                 }
//                 Cursor.removeGlobalCursor(true);
//                 var d = this._resizingRow.originalPos - this._resizingRow.currentPos;
//                 if(d !== 0) {
//                     fwk.commandManager.execute(new sketch.commands.ResizeRow(this, this._resizingRow.lineNum, d, event.event.shiftKey));
//                 }
//                 delete this._resizingRow;
//                 Invalidate.requestUpperOnly();
//                 event.handled = true;
//             }
//         }
//
//         function onStartDragging(){
//             this._showHeaders(false);
//         }
//
//         function onStopDragging() {
//             this._showHeaders(true);
//         }
//
//         function columnsCountChanged(newValue, oldValue) {
//             if(this._updating || this.__state == 1) {
//                 return;
//             }
//
//             this._updating = true;
//
//             var delta = newValue - oldValue;
//             var commands = [];
//             this.columnsCount(this.columnsCount()-delta);
//             if(delta > 0) {
//                 var columnsCount = this.columnsCount();
//                 for(var i = 0; i < delta; ++i) {
//                     commands.push(new sketch.commands.InsertColumn(this, columnsCount+i, 100));
//                 }
//             } else {
//                 var columnsCount = this.columnsCount();
//                 for(var i = 0; i < -delta; ++i) {
//                     var cells = getColumnCells.call(this, columnsCount - 1 - i);
//                     var group = new CellGroup('vertical', columnsCount - 1 - i, cells);
//                     group.parent(this);
//                     commands.push(new sketch.commands.DeleteCellGroup(App.Current, App.Current.activePage, [group]));
//                 }
//             }
//
//             var cmd = new CompositeCommand(commands);
//             fwk.commandManager.execute(cmd);
//
//             this._updating = false;
//         }
//
//         function rowsCountChanged(newValue, oldValue) {
//             if(this._updating || this.__state == 1) {
//                 return;
//             }
//
//             this._updating = true;
//
//             var delta = newValue - oldValue;
//             var commands = [];
//             this.rowsCount(this.rowsCount()-delta);
//             if(delta > 0) {
//                 var lastCell = this.cell(oldValue - 1, 0);
//                 var rowsCount = this.rowsCount();
//                 for(var i = 0; i < delta; ++i) {
//                     commands.push(new sketch.commands.InsertRow(this, rowsCount+i, lastCell.height()));
//                 }
//             } else {
//                 var rowsCount = this.rowsCount();
//                 for(var i = 0; i < -delta; ++i) {
//                     var cells = getRowCells.call(this, rowsCount - 1 - i);
//                     var group = new CellGroup('horizontal', rowsCount - 1 - i, cells);
//                     group.parent(this);
//                     commands.push(new sketch.commands.DeleteCellGroup(App.Current, App.Current.activePage, [group]));
//                 }
//             }
//
//             var cmd = new CompositeCommand(commands);
//             fwk.commandManager.execute(cmd);
//
//             this._updating = false;
//         }
//
//         return {
//             __version__:2,
//             _constructor: function(){
//
//                 this.properties.createProperty("columnsCount", 0).minMax(1, 1000).transparent(true);
//                 this.properties.createProperty("rowsCount", 0).minMax(1, 1000).transparent(true);
//                 this.properties.metadataType("sketch.ui.common.Table");
//
//                 this.visibleWhenDrag(false);
//                 this.minWidth(MINCELLSIZE);
//                 this.minHeight(MINCELLSIZE);
//
//                 this.setProps({
//                     clipSelf: true,
//                     enableGroupLocking:false,
//                     width:400,
//                     height:300
//                 });
//
//                 this._topHeaderVisible = false;
//                 this._leftHeaderVisible = false;
//
//                 this.enableGroupLocking(true);
//                 this.properties.angle.editable(false);
//             },
//             propsUpdated:function(props,oldProps) {
//                 Container.prototype.propsUpdated.apply(this, arguments);
//
//                 if(props.columnsCount !== undefined){
//                     columnsCountChanged.call(this, props.columnsCount, oldProps.columnsCount)
//                 }
//                 if(props.rowsCount !== undefined){
//                     rowsCountChanged.call(this, props.rowsCount, oldProps.rowsCount)
//                 }
//             },
//             columnsCount :function(value){
//                 return this.properties.columnsCount.value(value);
//             },
//             rowsCount :function(value){
//                 return this.properties.rowsCount.value(value);
//             },
//             eachInTheRow:function(row, callback) {
//                 var columnsCount = this.columnsCount();
//                 for(var j = 0; j < columnsCount; ++j) {
//                     callback(this.cell(row, j), j);
//                 }
//             },
//
//             eachInTheColumn:function(col, callback) {
//                 var rowsCount = this.rowsCount();
//                 for(var j = 0; j < rowsCount; ++j) {
//                     callback(this.cell(j, col), j);
//                 }
//             },
//
//             createCell:function(type) {
//                 if(type === 'text'){
//                     return new ui.common.TextTableCell();
//                 }
//                 return new ui.common.TableCell();
//             },
//             performArrange:function(resizeEvent){
//                 if (this._arrangeLocked) {
//                     this._arrangeRequested = true;
//                     return;
//                 }
//
//                 var sw = 1, sh = 1;
//                 if(resizeEvent) {
//                     if(resizeEvent.oldValue.width !== resizeEvent.newValue.width) {
//                         sw = resizeEvent.newValue.width / resizeEvent.oldValue.width;
//                     }
//
//                     if(resizeEvent.oldValue.height !== resizeEvent.newValue.height) {
//                         sh = resizeEvent.newValue.height / resizeEvent.oldValue.height;
//                     }
//                 }
//
//                 isolatedCall(this, function() {
//                     var dx = 0, dy = 0;
//                     var rowsCount = this.rowsCount();
//                     var colsCount = this.columnsCount();
//                     for(var i = 0; i < rowsCount; ++i) {
//                         dx = 0;
//                         for(var j = 0; j < colsCount; ++j) {
//                             var cell = this.cell(i, j);
//                             var r = cell.getBoundaryRect();
//                             var w = cell.width() * sw,
//                                 h = cell.height() * sh;
//                             cell.resize({x:dx, y: dy, width:w, height:h});
//                             dx += w;
//                             if(r.width !== w || r.height !== h || r.x !== dx || r.y !== dy) {
//                                 App.Current.registerElementResize(cell);
//                             }
//                         }
//                         dy += h;
//                     }
//                 });
//             },
//             drawSelf:function(context, w, h, environment) {
//                 Container.prototype.drawSelf.apply(this, arguments);
//                 drawBorders.call(this, context);
//             },
//             setupTable:function(colls, rows) {
//                 var w = this.width(),
//                     h = this.height(),
//                     cellWidth = w / colls,
//                     cellHeight = h / rows;
//                 this._updating = true;
//                 this.columnsCount(colls);
//                 this.rowsCount(rows);
//                 this._updating = false;
//                 this.lockArrange();
//                 for(var i = 0; i < rows; ++i) {
//                     for(var j = 0; j < colls; ++j) {
//                         var cell = createCell.call(this, DEFAULTTYPE, j, i, cellWidth, cellHeight, colls, rows);
//                         this.add(cell);
//                     }
//                 }
//                 this.unlockArrange();
//             },
//             fromJSON:function(data) {
//                 this.lockArrange();
//
//                 this._updating = true;
//                 this.clear();
//                 Container.prototype.fromJSON.apply(this, arguments);
//
//                 fixTableDimensions.call(this);
//
//                 for(var i = 0; i < this.rowsCount(); ++i){
//                     for(var j = 0; j < this.columnsCount(); ++j){
//                         initCell(this.cell(i, j), i, j);
//                     }
//                 }
//                 this._updating = false;
//                 this.unlockArrange();
//             },
//             hitTest : function(/*Point*/point, scale) {
//                 if(!this.visible()){
//                     return false;
//                 }
//                 var rect= this.getBoundaryRectGlobal();
//
//                 return Container.prototype.hitTest.apply(this, arguments) || hitLeftHeader.call(this, rect, point) || hitTopHeader.call(this, rect, point);
//             },
//             mousemove:function(event){
//                 onMouseMove.call(this, event);
//                 Container.prototype.mousemove.apply(this, arguments);
//             },
//             mousedown:function(event){
//                 onMouseDown.call(this, event);
//                 Container.prototype.mousedown.apply(this, arguments);
//             },
//             canAccept:function(e) {
//                 return e instanceof sketch.ui.common.TableCell
//                     || e instanceof sketch.ui.common.TextTableCell
//                     || e instanceof CellGroup;
//             },
//             onLayerDraw:function(layer, context) {
//                 var rect = this.getBoundaryRectGlobal();
//
//                 if(this._resizingColumn) {
//                     var x = this._resizingColumn.currentPos;
//                     context.save();
//                     context.strokeStyle = '#6495ED';
//                     fwk.CrazyScope.push(false);
//                     context.linePath(x, rect.y, x, rect.y + rect.height);
//                     context.stroke();
//                     fwk.CrazyScope.pop();
//                     context.restore();
//                 } else if(this._resizingRow) {
//                     var y = this._resizingRow.currentPos;
//                     context.save();
//                     context.strokeStyle = '#6495ED';
//                     fwk.CrazyScope.push(false);
//                     context.linePath(rect.x, y, rect.x + rect.width, y);
//                     context.stroke();
//                     fwk.CrazyScope.pop();
//                     context.restore();
//                 }
//
//                 drawHeaders.call(this, context, rect);
//             },
//             mouseup:function(event){
//                 onMouseUp.call(this, event);
//                 Container.prototype.mouseup.apply(this, arguments);
//             },
//             click:function(event){
//                 var rect = this.getBoundaryRectGlobal();
//                 if(hitLeftHeader.call(this, rect, event) || hitTopHeader.call(this, rect, event)) {
//                     event.handled = true;
//                 } else {
//                     Container.prototype.click.apply(this, arguments);
//                 }
//             },
//             mouseLeaveElement : function(event) {
//                 Cursor.removeGlobalCursor(true);
//                 dispose(this._insertTag);
//             },
//             rowHeight:function(i){
//                 return this.cell(i, 0).height();
//             },
//             columnWidth:function(i){
//                 return this.cell(0, i).width();
//             },
//             removeColumn:function(index) {
//                 var width = this.columnWidth(index);
//                 this.lockArrange();
//
//                 var count = this.rowsCount();
//                 for(var i = count-1; i >= 0; --i) {
//                     var cell = this.cell(i, index);
//                     this.remove(cell);
//                 }
//                 this._updating = true;
//                 this.columnsCount(this.columnsCount()-1);
//                 this._updating = false;
//                 this.width(this.width() - width);
//                 this.children.each(function(i, e){
//                     e.zOrder(i);
//                 });
//                 this.unlockArrange();
//             },
//             removeRow:function(index) {
//                 this.lockArrange();
//                 var height = this.rowHeight(index);
//                 var count = this.columnsCount();
//                 for(var i = count-1; i >=0; --i) {
//                     var cell = this.cell(index, i);
//                     this.remove(cell);
//                 }
//                 this.height(this.height() - height);
//                 this._updating = true;
//                 this.rowsCount(this.rowsCount()-1);
//                 this._updating = false;
//                 this.children.each(function(i, e){
//                     e.zOrder(i);
//                 });
//                 this.unlockArrange();
//             },
//             changeColumnType:function(column, type){
//                 var oldCells = getColumnCells.call(this, column);
//                 var cells = [];
//                 for(var i = 0; i < oldCells.length; ++i){
//                     var oldCell = oldCells[i];
//                     var cell = createCell.call(this, type, column, i, oldCell.width(), oldCell.height(), this.columnsCount(), this.rowsCount());
//                     cell.setStyle(oldCell.getStyle());
//                     cells.push(cell);
//                 }
//                 var w = this.columnWidth(column);
//                 this.removeColumn(column);
//                 this.insertColumn(column, w, cells);
//             },
//             insertColumn:function(index, width, cells) {
//                 this.lockArrange();
//                 var rowsCount = this.rowsCount();
//                 this._updating = true;
//                 var columnsCount = this.columnsCount();
//                 var colsCount = this.columnsCount(columnsCount+1);
//                 this._updating = false;
//                 for(var i = 0; i < rowsCount; ++i) {
//                     if(cells) {
//                         var cell = cells[i];
//                     } else {
//                         var cellLeft = this.cell(i, columnsCount - 1);
//                         cell = createCell.call(this, DEFAULTTYPE, index, i, width, this.rowHeight(i), colsCount, this.rowsCount());
//                         cell.setStyle(cellLeft.getStyle());
//                     }
//                     fwk.Container.prototype.insert.call(this, cell, i * colsCount + index);
//                 }
//                 this.children.each(function(i, e){
//                     e.zOrder(i);
//                 });
//
//                 this.width(this.width() + width);
//                 this.unlockArrange();
//             },
//             insertRow:function(index, height, cells) {
//                 this.lockArrange();
//                 this._updating = true;
//                 var rowsCount = this.rowsCount();
//                 this.rowsCount(rowsCount+1);
//                 this._updating = false;
//                 var colsCount = this.columnsCount();
//                 for(var i = 0; i < colsCount; ++i) {
//                     if(cells) {
//                         var cell = cells[i];
//                     } else {
//                         var cellUp = this.cell(rowsCount - 1, i);
//                         cell = createCell.call(this, cellUp.type(), i, index, this.columnWidth(i), height, colsCount, this.rowsCount());
//                         cell.setStyle(cellUp.getStyle());
//                     }
//
//                     fwk.Container.prototype.insert.call(this, cell, index * colsCount + i);
//                 }
//
//                 this.children.each(function(i, e){
//                     e.zOrder(i);
//                 });
//                 this.height(this.height() + height);
//                 this.unlockArrange();
//             },
//             insert:function(element, index){
//                 if(element instanceof CellGroup) {
//                     if(element._orientation === 'vertical') {
//                         var rowsCount = this.rowsCount();
//                         if(element.elements.length === rowsCount) {
//                             this.lockArrange();
//                             var columnIdx = element._index+1;
//                             var colsCount = this.columnsCount()+1;
//                             if(colsCount <= columnIdx) {
//                                 columnIdx = colsCount - 1 ;
//                             }
//                             for(var i = 0; i < rowsCount; ++i) {
//                                 var cell = element.elements[i];
//                                 initCell(cell, columnIdx, i);
//                                 Container.prototype.insert.call(this, cell, i*colsCount+columnIdx);
//                             }
//                             this._updating = true;
//                             this.columnsCount(colsCount);
//                             this._updating = false;
//                             this.width(this.width() + element.width());
//                             this.unlockArrange();
//                             this.performArrange();
//                             selectColumn.call(this, columnIdx);
//                         }
//                     } else {
//                         var columnsCount = this.columnsCount();
//                         if(element.elements.length === columnsCount) {
//                             this.lockArrange();
//                             var rowIdx = element._index+1;
//                             var rowsCount = this.rowsCount()+1;
//                             var colsCount = this.columnsCount()
//                             if(rowsCount <= rowIdx) {
//                                 rowIdx = rowsCount - 1;
//                             }
//                             var that = this;
//                             each(element.elements, function(cell, column) {
//                                 initCell(cell, column, rowIdx);
//                                 Container.prototype.insert.call(that, cell, rowIdx*colsCount+column);
//                             });
//                             this._updating = true;
//                             this.rowsCount(rowsCount);
//                             this._updating = false;
//                             this.height(this.height() + element.height());
//                             this.unlockArrange();
//                             this.performArrange();
//                             selectRow.call(this, rowIdx);
//                         }
//                     }
//                     element.parent(this);
//                 }
//             },
//             remove:function(/*UIElement*/element, /*bool*/ logicalParent) {
//                 if(element instanceof CellGroup) {
//                     if(element._orientation === 'vertical') {
//                         this.removeColumn(element._index+1);
//                     } else {
//                         this.removeRow(element._index+1);
//                     }
//                 } else {
//                     return Container.prototype.remove.apply(this, arguments);
//                 }
//             },
//             changePosition: function(){
//                 //not supported
//             },
//             resizeColumn:function(index, dw, resizeOneOnly) {
//                 this.lockArrange();
//                 var rowsCount = this.rowsCount();
//                 for(var i = 0; i < rowsCount; ++i) {
//                     var cell = this.cell(i, index);
//                     var prevCell = this.cell(i, index - 1);
//                     if(!resizeOneOnly) {
//                         cell.width(cell.width() + dw);
//                     }
//                     prevCell.width(prevCell.width() - dw);
//                 }
//
//                 if(resizeOneOnly) {
//                     this.width(this.width()-dw);
//                 }
//
//                 this.unlockArrange();
//                 this.performArrange();
//             },
//             resizeRow:function(index, dh, resizeOneOnly) {
//                 this.lockArrange();
//                 var colsCount = this.columnsCount();
//                 for(var i = 0; i < colsCount; ++i) {
//                     var cell = this.cell(index, i);
//                     var prevCell = this.cell(index-1, i);
//                     if(!resizeOneOnly) {
//                         cell.height(cell.height() + dh);
//                     }
//                     prevCell.height(prevCell.height() - dh);
//                 }
//                 if(resizeOneOnly) {
//                     this.height(this.height()-dh);
//                 }
//                 this.unlockArrange();
//                 this.performArrange();
//             },
//             _showHeaders:function(visible) {
//                 if(this._topHeaderVisible == visible) {
//                     return;
//                 }
//                 this._topHeaderVisible = visible;
//                 this._leftHeaderVisible = visible;
//
//                 if(visible) {
//                     this.registerForLayerDraw(2, this);
//                     this._mousemoveHandler = App.Current.controller.mousemoveEvent.bind(this, onMouseMove);
//                     this._mouseDownHandler = App.Current.controller.mousedownEvent.bind(this, onMouseDown);
//                     this._mouseUpHandler =   App.Current.controller.mouseupEvent.bind(this, onMouseUp);
//                 } else {
//                     cleanupTags.call(this);
//                     this.unregisterForLayerDraw(2, this);
//                     this._mousemoveHandler.dispose();
//                     this._mouseDownHandler.dispose();
//                     this._mouseUpHandler.dispose();
//                     delete this._mousemoveHandler;
//                     delete this._mouseDownHandler;
//                     delete this._mouseUpHandler;
//                 }
//
//                 Invalidate.requestUpperOnly();
//             },
//             select:function(multiselect) {
//                 Container.prototype.select.apply(this, arguments);
//                 if(multiselect) {
//                     return;
//                 }
//
//                 this._showHeaders(true);
//                 this._startDraggingHandler = App.Current.controller.startDraggingEvent.bind(this, onStartDragging);
//                 this._stopDraggingHandler =  App.Current.controller.stopDraggingEvent.bind(this, onStopDragging);
//             },
//             unselect:function() {
//                 Container.prototype.unselect.apply(this, arguments);
//                 this._showHeaders(false);
//                 if(this._startDraggingHandler) {
//                     this._startDraggingHandler.dispose();
//                     delete this._startDraggingHandler;
//                 }
//                 if(this._stopDraggingHandler) {
//                     this._stopDraggingHandler.dispose();
//                     delete this._stopDraggingHandler;
//                 }
//             },
//             selectColumn: function(columnIdx){
//                 selectColumn.call(this, columnIdx);
//             },
//             cell:function(row, column){
//                 return this.children.elementAt(row * this.columnsCount() + column);
//             },
//             getRowStyle:function(row){
//                 return map(getRowCells.call(this, row), function(cell){
//                     return cell.getStyle();
//                 });
//             },
//             setRowStyle:function(row, style){
//                 each(getRowCells.call(this, row), function(cell, i){
//                     cell.setStyle(style[i]);
//                 });
//             },
//             getColumnStyle:function(column){
//                 return map(getColumnCells.call(this, column), function(cell){
//                     return cell.getStyle();
//                 });
//             },
//             setColumnStyle:function(column, style){
//                 each(getColumnCells.call(this, column), function(cell, i){
//                     cell.setStyle(style[i]);
//                 });
//             },
//             getColumnType:function(column) {
//                 return this.cell(0, column).type();
//             }
//         };
//     })());
//
//     fwk.PropertyMetadata.extend("sketch.framework.UIElement", {
//         "sketch.ui.common.Table": {
//             columnsCount: {
//                 displayName: "Columns",
//                 type: "numeric",
//                 useInModel: true,
//                 editable: true
//             },
//             angle: {
//                 editable:false,
//                 useInModel:false
//             },
//             rowsCount: {
//                 displayName: "Rows",
//                 type: "numeric",
//                 useInModel: true,
//                 editable: true
//             }
//         }
//
//     });
//
// });