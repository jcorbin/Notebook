goog.provide('wunjo.ui.DrawingArea');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');
goog.require('goog.ui.Component');

// TODO split this out of the "notebook" namespace
goog.require('wunjo.notebook.Stroke');


wunjo.ui.DrawingArea = function(opt_domHelper) {
  goog.ui.Component.call(this, opt_domHelper);
  this.currentTool_ = null;
  this.tools_ = [];
};
goog.inherits(wunjo.ui.DrawingArea, goog.ui.Component);

wunjo.ui.DrawingArea.EventType = {
  // Dispatched when a tool is added
  TOOL_ADDED: 'toolAdded',
  // Dispatched when a tool is removed
  TOOL_REMOVED: 'toolRemoved',
  // Dispatched when the current tool changes
  CURRENT_TOOL_CHANGE: 'currentToolChanged',
  // Dispatched when a tool activates
  TOOL_ACTIVATE: 'toolActivate',
  // Dispatched when a tool deactivates
  TOOL_DEACTIVATE: 'toolDeactivate',
  // Dispatched when a tool finishes an operation
  TOOL_FINISH: 'toolFinish',
  // Dispatched when some property of a tool changes
  TOOL_CHANGE: 'toolChange'
};

wunjo.ui.DrawingArea.prototype.enabled_ = true;
wunjo.ui.DrawingArea.prototype.autosizing_ = null;

wunjo.ui.DrawingArea.prototype.setEnabled = function(enable) {
  if (this.enabled_ != enable) {
    this.dispatchEvent(enable
      ? goog.ui.Component.EventType.ENABLE
      : goog.ui.Component.EventType.DISABLE
    );
  }
  this.enabled_ = enable;
};

wunjo.ui.DrawingArea.prototype.isEnabled = function(enable) {
  return this.enabled_;
};

wunjo.ui.DrawingArea.prototype.setAutoSizing = function(minSize) {
  this.autosizing_ = minSize;
  this.updateSize();
};

wunjo.ui.DrawingArea.prototype.getAutoSizing = function() {
  return this.autosizing_;
};

wunjo.ui.DrawingArea.prototype.updateSize = function() {
  if (! this.isInDocument()) return;
  if (this.autosizing_) {
    var size = this.getAvailableArea();
    size.width = Math.max(size.width, this.autosizing_.width);
    size.height = Math.max(size.height, this.autosizing_.height);
    var canvas = this.getCanvas();
    if (canvas.width != size.width)
      canvas.width = size.width;
    if (canvas.height != size.height)
      canvas.height = size.height;
    this.delayRedraw();
    return true;
  }
  return false;
};

wunjo.ui.DrawingArea.prototype.setCurrentTool = function(tool) {
  if (tool && ! goog.array.contains(this.tools_, tool))
    throw new Error("Tool not in area");
  if (this.currentTool_) {
    if (this.isInDocument())
      this.currentTool_.unhookup(this.getCanvas());
    else if (this.currentTool_.isActive())
      this.currentTool_.deactivate();
    this.currentTool_ = null;
  }
  if (tool) {
    this.currentTool_ = tool;
    if (this.isInDocument())
      this.currentTool_.hookup(this.getCanvas());
    else if (this.currentTool_.isActive())
      this.currentTool_.deactivate();
  }
  this.dispatchEvent({
    type: wunjo.ui.DrawingArea.EventType.CURRENT_TOOL_CHANGE,
    tool: tool
  });
  return tool;
};

wunjo.ui.DrawingArea.prototype.getCurrentTool = function() {
  return this.currentTool_;
};

wunjo.ui.DrawingArea.prototype.decorateInternal = function(element) {
  wunjo.ui.DrawingArea.superClass_.decorateInternal.call(this, element);

  var elt = this.getElement();
  if (elt.tagName.toLowerCase() != 'canvas') {
    if (! elt.getElementsByTagName('canvas').length)
      elt.appendChild(this.dom_.createElement('canvas'));
    goog.dom.classes.add(elt, 'wunjo-drawingarea-container');
  }

  var canvas = this.getCanvas();
  goog.dom.classes.add(canvas, 'wunjo-drawingarea');
  canvas.width = 1;
  canvas.height = 1;
};

wunjo.ui.DrawingArea.prototype.createDom = function() {
  this.decorateInternal(this.dom_.createElement('canvas'));
};

wunjo.ui.DrawingArea.prototype.enterDocument = function() {
  wunjo.ui.DrawingArea.superClass_.enterDocument.call(this);
  var
    hndl = this.getHandler(),
    win = this.dom_.getWindow(),
    canvas = this.getCanvas();
  hndl.listen(
    win, goog.events.EventType.RESIZE, this.onWindowResize_
  );
  hndl.listen(
    win, goog.events.EventType.LOAD, this.onWindowResize_
  );
  this.updateSize();
  if (this.currentTool_)
    this.currentTool_.hookup(canvas);
  this.draw_(canvas);
};

wunjo.ui.DrawingArea.prototype.exitDocument = function() {
  wunjo.ui.DrawingArea.superClass_.exitDocument.call(this);
  if (this.currentTool_)
    this.currentTool_.unhookup(this.getCanvas());
};

wunjo.ui.DrawingArea.prototype.getContainer = function() {
  var elt = this.getElement();
  if (elt.tagName.toLowerCase() == 'canvas')
    throw Error('No container');
  return elt;
};

wunjo.ui.DrawingArea.prototype.getCanvas = function() {
  var elt = this.getElement();
  if (elt.tagName.toLowerCase() == 'canvas') return elt;
  var c = elt.getElementsByTagName('canvas');
  if (c.length) return c[0];
  throw Error("Coludn't find canvas element");
};

wunjo.ui.DrawingArea.prototype.getAvailableArea = function() {
  return goog.style.getSize(this.getContainer());
};

wunjo.ui.DrawingArea.prototype.delayRedraw = function() {
  if (! this.isInDocument()) return;
  var win = this.dom_.getWindow();
  if (this.redrawTo_) {
    win.clearTimeout(this.redrawTo_);
    delete this.redrawTo_;
  }
  this.redrawTo_ = win.setTimeout(goog.bind(this.redraw, this), 100);
};

wunjo.ui.DrawingArea.prototype.redraw = function() {
  if (! this.isInDocument()) return;
  if (this.redrawTo_) {
    this.dom_.getWindow().clearTimeout(this.redrawTo_);
    delete this.redrawTo_;
  }
  var canvas = this.getCanvas();
  canvas.width = canvas.width;
  this.draw_(canvas);
};

wunjo.ui.DrawingArea.prototype.draw_ = function(canvas) {
  if (this.currentTool_ && this.currentTool_.isActive())
    this.currentTool_.draw(canvas);
};

wunjo.ui.DrawingArea.prototype.onWindowResize_ = function() {
  this.updateSize();
};


goog.require('goog.events.EventTarget');

wunjo.ui.DrawingArea.Tool = function(area) {
  goog.events.EventTarget.call(this);
  if (! area || ! area instanceof wunjo.ui.DrawingArea)
    throw new Error('Invalid DrawingArea');
  this.area_ = area;
  this.area_.tools_.push(this);
  this.area_.dispatchEvent({
    type: wunjo.ui.DrawingArea.EventType.TOOL_ADDED,
    tool: this
  });
  if (! this.area_.currentTool_)
    this.area_.setCurrentTool(this);
};
goog.inherits(wunjo.ui.DrawingArea.Tool, goog.events.EventTarget);

wunjo.ui.DrawingArea.Tool.prototype.disposeInternal = function() {
  if (this.isActive())
    this.deactivate();
  if (this.area_.currentTool_ === this)
    this.area_.setCurrentTool(null);
  goog.array.remove(this.area_.tools_, this);
  this.dispatchEvent({
    type: wunjo.ui.DrawingArea.EventType.TOOL_REMOVED,
    tool: this
  });
  delete this.area_;
  if (this.handler_) {
    this.handler_.dispose();
    delete this.handler_;
  }
  if (this.activeHandler_) {
    this.activeHandler_.dispose();
    delete this.activeHandler_;
  }
};

wunjo.ui.DrawingArea.Tool.prototype.getHandler = function() {
  return this.handler_ ||
         (this.handler_ = new goog.events.EventHandler(this));
};

wunjo.ui.DrawingArea.Tool.prototype.getActiveHandler = function() {
  return this.activeHandler_ ||
         (this.activeHandler_ = new goog.events.EventHandler(this));
};

wunjo.ui.DrawingArea.Tool.prototype.active_ = false;

wunjo.ui.DrawingArea.Tool.prototype.getArea = function() {
  return this.area_;
};

wunjo.ui.DrawingArea.Tool.prototype.isActive = function() {
  return this.active_;
};

wunjo.ui.DrawingArea.Tool.prototype.activate = function() {
  if (this.active_) return;
  this.active_ = true;
  this.area_.dispatchEvent({
    type: wunjo.ui.DrawingArea.EventType.TOOL_ACTIVATE,
    tool: this
  });
};

wunjo.ui.DrawingArea.Tool.prototype.deactivate = function() {
  if (! this.active_) return;
  if (this.activeHandler_)
    this.activeHandler_.removeAll();
  this.active_ = false;
  this.area_.dispatchEvent({
    type: wunjo.ui.DrawingArea.EventType.TOOL_DEACTIVATE,
    tool: this
  });
};

wunjo.ui.DrawingArea.Tool.prototype.hookup = function(canvas) {
  if (this.active_)
    this.deactivate();
};

wunjo.ui.DrawingArea.Tool.prototype.unhookup = function(canvas) {
  if (this.active_)
    this.deactivate();
  if (this.handler_)
    this.handler_.removeAll();
};

wunjo.ui.DrawingArea.Tool.prototype.redraw = function() {
  return this.getArea().redraw();
};

wunjo.ui.DrawingArea.Tool.prototype.draw = function(canvas) {
};

wunjo.ui.DrawingArea.Tool.prototype.finish_ = function(action, data) {
  this.area_.dispatchEvent({
    type: wunjo.ui.DrawingArea.EventType.TOOL_FINISH,
    tool: this,
    action: action,
    data: data
  });
  this.deactivate();
};

wunjo.ui.DrawingArea.Tool.prototype.change_ = function() {
  this.area_.dispatchEvent({
    type: wunjo.ui.DrawingArea.EventType.TOOL_CHANGE,
    tool: this,
    props: goog.array.clone(arguments)
  });
};


wunjo.ui.DrawingArea.Pen = function(area, color, size) {
  wunjo.ui.DrawingArea.Tool.call(this, area);
  this.color_ = color || '#000';
  this.size_ = size || 3;
};
goog.inherits(wunjo.ui.DrawingArea.Pen, wunjo.ui.DrawingArea.Tool);

wunjo.ui.DrawingArea.Pen.prototype.button_ =
  goog.events.BrowserEvent.MouseButton.LEFT;

wunjo.ui.DrawingArea.Pen.prototype.getColor = function() {
  return this.color_;
};

wunjo.ui.DrawingArea.Pen.prototype.setColor = function(color) {
  this.color_ = color;
  this.change_('color');
};

wunjo.ui.DrawingArea.Pen.prototype.getSize = function() {
  return this.size_;
};

wunjo.ui.DrawingArea.Pen.prototype.setSize = function(size) {
  this.size_ = size;
  delete this.halfSizeSq_;
  this.change_('size');
};

wunjo.ui.DrawingArea.Pen.prototype.draw = function(canvas) {
  wunjo.notebook.Stroke.draw(canvas, this.color_, this.size_, this.points_);
};

wunjo.ui.DrawingArea.Pen.prototype.hookup = function(canvas) {
  wunjo.ui.DrawingArea.Pen.superClass_.hookup.call(this, canvas);
  this.getHandler().listen(
    canvas, goog.events.EventType.MOUSEDOWN, this.onMouseDown_
  );
};

wunjo.ui.DrawingArea.Pen.prototype.addPoint = function(x, y) {
  if (! this.points_)
    this.points_ = [];
  if (this.last_) {
    if (x == this.last_[0] && y == this.last_[1])
      return;
    if (this.halfSizeSq_ == undefined)
      this.halfSizeSq_ = Math.pow(this.size_/2, 2);
    var dSq =
      Math.pow(this.last_[0] - x, 2) +
      Math.pow(this.last_[1] - y, 2);
    if (dSq <= this.halfSizeSq_)
      return;
  }
  this.last_ = [x, y];
  this.points_.push(x, y);
  this.redraw();
};

wunjo.ui.DrawingArea.Pen.prototype.onMouseDown_ = function(evt) {
  if (evt.button != this.button_)
    return;
  var hndl = this.getHandler();
  hndl.listen(evt.target, goog.events.EventType.MOUSEMOVE, this.onMouseMove_);
  hndl.listen(evt.target, goog.events.EventType.MOUSEUP, this.onMouseUp_);
  hndl.listen(evt.target, goog.events.EventType.MOUSEOUT, this.onMouseOut_);
  this.addPoint(evt.offsetX, evt.offsetY);
  this.activate();
  evt.preventDefault();
};

wunjo.ui.DrawingArea.Pen.prototype.onMouseMove_ = function(evt) {
  this.addPoint(evt.offsetX, evt.offsetY);
};

wunjo.ui.DrawingArea.Pen.prototype.onMouseUp_ = function(evt) {
  this.addPoint(evt.offsetX, evt.offsetY);
  this.finishStroke_(evt.target);
};

wunjo.ui.DrawingArea.Pen.prototype.onMouseOut_ = function(evt) {
  this.finishStroke_(evt.target);
};

wunjo.ui.DrawingArea.Pen.prototype.finishStroke_ = function(canvas) {
  var points = this.points_;
  var hndl = this.getHandler();
  hndl.unlisten(canvas, goog.events.EventType.MOUSEMOVE, this.onMouseMove_);
  hndl.unlisten(canvas, goog.events.EventType.MOUSEUP, this.onMouseUp_);
  hndl.unlisten(canvas, goog.events.EventType.MOUSEOUT, this.onMouseOut_);
  delete this.last_;
  delete this.points_;
  this.finish_('stroke', points);
};

// vim:set ts=2 sw=2 expandtab:
