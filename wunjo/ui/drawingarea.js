goog.provide('wunjo.ui.DrawingArea');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');
goog.require('goog.ui.Component');


wunjo.ui.DrawingArea = function(opt_domHelper) {
  goog.ui.Component.call(this, opt_domHelper);
};
goog.inherits(wunjo.ui.DrawingArea, goog.ui.Component);

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

// vim:set ts=2 sw=2 expandtab:
