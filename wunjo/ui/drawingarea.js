goog.provide('wunjo.ui.DrawingArea');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');
goog.require('goog.ui.Component');


wunjo.ui.DrawingArea = function(opt_domHelper) {
  goog.ui.Component.call(this, opt_domHelper);

  this.pen_ = {color: 'rgb(0, 0, 0)', size: 3};
};
goog.inherits(wunjo.ui.DrawingArea, goog.ui.Component);

wunjo.ui.DrawingArea.prototype.last_ = null;
wunjo.ui.DrawingArea.prototype.points_ = null;
wunjo.ui.DrawingArea.prototype.enabled_ = true;
wunjo.ui.DrawingArea.prototype.penButton_ =
  goog.events.BrowserEvent.MouseButton.LEFT;


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

wunjo.ui.DrawingArea.prototype.getPoints = function() {
  if (! this.points_) {
    throw Error('Not drawing, no points');
  }
  return this.points_;
};

wunjo.ui.DrawingArea.prototype.setPen = function(color, size) {
  this.pen_ = {color: color, size: size};
  if (this.points_) {
    this.redraw();
  }
};

wunjo.ui.DrawingArea.prototype.getPen = function() {
  return this.pen_;
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
  this.getHandler().listen(
    this.getElement(), goog.events.EventType.MOUSEDOWN,
    this.onMouseDown_
  );
  this.draw_(this.getCanvas());
};

wunjo.ui.DrawingArea.prototype.exitDocument = function() {
  wunjo.ui.DrawingArea.superClass_.exitDocument.call(this);
  this.last_ = null;
  this.points_ = null;
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

wunjo.ui.DrawingArea.prototype.drawPath_ = function drawPath(canvas, points, pen) {
  wunjo.notebook.Stroke.draw(canvas, pen.color, pen.size, points);
};

wunjo.ui.DrawingArea.prototype.draw_ = function(canvas) {
  if (this.points_) {
    this.drawPath_(canvas, this.points_, this.pen_);
  }
};

wunjo.ui.DrawingArea.prototype.addPoint_ = function(x, y) {
  if (! this.points_)
    this.points_ = [];
  if (this.last_) {
    if (x == this.last_[0] && y == this.last_[1]) return;
    if (this.pen_.halfSizeSq == undefined) {
      this.pen_.halfSizeSq = Math.pow(this.pen_.size/2, 2);
    }
    var dSq = Math.pow(this.last_[0] - x, 2) + Math.pow(this.last_[1] - y, 2);
    if (dSq <= this.pen_.halfSizeSq) return;
  }
  this.last_ = [x, y];
  this.points_.push(this.last_);
  this.redraw();
};

wunjo.ui.DrawingArea.prototype.finishStroke_ = function() {
  var points = this.points_;
  var elt = this.getElement(), hndl = this.getHandler();
  hndl.unlisten(elt, goog.events.EventType.MOUSEMOVE, this.onMouseMove_);
  hndl.unlisten(elt, goog.events.EventType.MOUSEUP, this.onMouseUp_);
  hndl.unlisten(elt, goog.events.EventType.MOUSEOUT, this.onMouseOut_);
  this.last_ = null;
  this.points_ = null;

  this.dispatchEvent({type: 'stroke', points: points});
};

wunjo.ui.DrawingArea.prototype.onMouseDown_ = function(evt) {
  if (! this.enabled_) return;
  if (evt.button != this.penButton_)
    return;

  var elt = this.getElement(), hndl = this.getHandler();
  hndl.listen(elt, goog.events.EventType.MOUSEMOVE, this.onMouseMove_);
  hndl.listen(elt, goog.events.EventType.MOUSEUP, this.onMouseUp_);
  hndl.listen(elt, goog.events.EventType.MOUSEOUT, this.onMouseOut_);
  this.addPoint_(evt.offsetX, evt.offsetY);
};

wunjo.ui.DrawingArea.prototype.onMouseMove_ = function(evt) {
  this.addPoint_(evt.offsetX, evt.offsetY);
};

wunjo.ui.DrawingArea.prototype.onMouseUp_ = function(evt) {
  this.addPoint_(evt.offsetX, evt.offsetY);
  this.finishStroke_();
};

wunjo.ui.DrawingArea.prototype.onMouseOut_ = function(evt) {
  this.finishStroke_();
};

// vim:set ts=2 sw=2 expandtab:
