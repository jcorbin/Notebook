goog.provide('wunjo.ui.DrawingArea');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');
goog.require('goog.ui.Component');


wunjo.ui.DrawingArea = function(opt_domHelper) {
  goog.ui.Component.call(this, opt_domHelper);
  this.tools_ = [];
};
goog.inherits(wunjo.ui.DrawingArea, goog.ui.Component);

wunjo.ui.DrawingArea.EventType = {
  // Dispatched when a tool is added
  TOOL_ADDED: 'toolAdded',
  // Dispatched when a tool is removed
  TOOL_REMOVED: 'toolRemoved',
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

wunjo.ui.DrawingArea.prototype.decorateInternal = function(element) {
  wunjo.ui.DrawingArea.superClass_.decorateInternal.call(this, element);

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
  var canvas = this.getCanvas();
  this.draw_(canvas);
};

wunjo.ui.DrawingArea.prototype.exitDocument = function() {
  wunjo.ui.DrawingArea.superClass_.exitDocument.call(this);
};

wunjo.ui.DrawingArea.prototype.getCanvas = function() {
  return this.getElement();
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
};
goog.inherits(wunjo.ui.DrawingArea.Tool, goog.events.EventTarget);

wunjo.ui.DrawingArea.Tool.prototype.disposeInternal = function() {
  if (this.isActive())
    this.deactivate();
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
};

wunjo.ui.DrawingArea.Tool.prototype.getHandler = function() {
  return this.handler_ ||
         (this.handler_ = new goog.events.EventHandler(this));
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
};

wunjo.ui.DrawingArea.Tool.prototype.change_ = function() {
  this.area_.dispatchEvent({
    type: wunjo.ui.DrawingArea.EventType.TOOL_CHANGE,
    tool: this,
    props: goog.array.clone(arguments)
  });
};

// vim:set ts=2 sw=2 expandtab:
