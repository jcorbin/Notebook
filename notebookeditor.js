goog.provide('wunjo.NotebookEditor');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.ui.Component');

wunjo.NotebookEditor = function(notebook, opt_domHelper) {
  wunjo.DrawingArea.call(this, opt_domHelper);

  this.setNotebook(notebook);
};
goog.inherits(wunjo.NotebookEditor, wunjo.DrawingArea);

wunjo.NotebookEditor.getDPI = function() {
  if (this.DPI == undefined) {
    var dpiTest = document.body.appendChild(
      document.createElement('div')
    );
    dpiTest.style.width = '1in';
    this.DPI = dpiTest.offsetWidth;
    document.body.removeChild(dpiTest);
  }
  return this.DPI;
};

wunjo.NotebookEditor.prototype.messageFont = 'normal bold 16px/18px sans-serif';
wunjo.NotebookEditor.prototype.notebook_ = null;
wunjo.NotebookEditor.prototype.message_ = null;
wunjo.NotebookEditor.prototype.autosizing_ = null;
wunjo.NotebookEditor.prototype.nbeh_ = null;
wunjo.NotebookEditor.prototype.curPage_ = null;

wunjo.NotebookEditor.prototype.enterDocument = function() {
  wunjo.NotebookEditor.superClass_.enterDocument.call(this);
  this.getCanvas().dpi = wunjo.NotebookEditor.getDPI();
  this.getHandler().listen(
    this.dom_.getWindow(), goog.events.EventType.RESIZE,
    this.onWindowResize_
  );
};

wunjo.NotebookEditor.prototype.getNotebook = function() {
  return this.notebook_;
};

wunjo.NotebookEditor.prototype.setNotebook = function(nb) {
  if (this.notebook_) {
    if (this.notebook_ === nb) return;
    this.unhookupNotebook_();
  }
  if (nb) {
    this.notebook_ = nb;
    this.hookupNotebook_();
  }

  if (! this.notebook_) {
    this.enabled = false;
    this.message_ = 'No Notebook Loaded';
  } else if (this.notebook_.getPageCount() <= 0) {
    this.enabled = false;
    this.message_ = 'Empty Notebook';
  } else {
    this.enabled = true;
    this.message_ = null;
    this.setCurrentPage(0);
  }

  this.dispatchEvent({
    type: 'notebookchanged',
    notebook: this.notebook_
  });

  if (this.inDocument_) {
    this.redraw();
  }

  return this.notebook_;
};

wunjo.NotebookEditor.prototype.hookupNotebook_ = function() {
  if (this.nbeh_) {
    this.nbeh_.dispose();
  }
  this.nbeh_ = new goog.events.EventHandler(this);
  this.nbeh_.listen(this.notebook_, 'pageadded', this.onPageAdded_);
  this.nbeh_.listen(this.notebook_, 'pageremoved', this.onPageRemoved_);
};

wunjo.NotebookEditor.prototype.unhookupNotebook_ = function() {
  if (this.nbeh_) {
    this.nbeh_.removeAll();
    this.nbeh_ = null;
  }
};

wunjo.NotebookEditor.prototype.onPageAdded_ = function(evt) {
  if (! this.curPage_) {
    this.setCurrentPage(evt.page);
  }
};

wunjo.NotebookEditor.prototype.onPageRemoved_ = function(evt) {
  if (this.curPage_ && this.curPage_ === evt.page) {
    var c = this.notebook_.getPageCount();
    if (c) {
      var i = evt.index;
      if (i >= c) i -= c-i+1;
      this.setCurrentPage(i);
    } else {
      this.setCurrentPage(null);
    }
  }
};

wunjo.NotebookEditor.prototype.setCurrentPage = function(page) {
  if (page != null && ! page instanceof wunjo.Notebook.Page) {
    page = this.notebook_.getPage(page);
  }
  if (this.message_) {
    this.message_ = null;
    this.enabled = true;
  }
  if (this.autosizing_) {
    this.autosizing_ = null;
  }
  this.curPage_ = page;
  this.dispatchEvent({
    type: 'currentpagechanged',
    notebook: this.notebook_,
    page: page
  });

  var canvas = this.getCanvas(), size = this.curPage_.getSize();
  canvas.width = size[0];
  canvas.height = size[1];
  this.draw_(canvas);
};

wunjo.NotebookEditor.prototype.getCurrentPage = function(page) {
  return this.curPage_;
};

wunjo.NotebookEditor.prototype.createDom = function() {
  var elt = this.dom_.createElement('div');
  goog.dom.classes.add(elt, 'wunjo-notebookeditor');
  elt.style.overflow = 'auto';
  elt = elt.appendChild(this.dom_.createElement('canvas'));
  elt.width = 1;
  elt.height = 1;
  this.decorateInternal(elt.parentNode);
};

wunjo.NotebookEditor.prototype.getCanvas = function() {
  var elt = this.getElement();
  if (elt.tagName.toLowerCase() == 'canvas') {
    return elt;
  }
  elt = elt.firstChild;
  if (elt.tagName.toLowerCase() == 'canvas') {
    return elt;
  }
  throw Error("Coludn't find canvas element");
};

wunjo.NotebookEditor.prototype.getAvailableArea = function() {
  var elt = this.getElement();
  if (elt.tagName.toLowerCase() == 'canvas') {
    throw Error('No container');
  }
  return [elt.clientWidth, Math.floor(elt.clientHeight*0.99)];
};

wunjo.NotebookEditor.prototype.setAutosize_ = function(minSize) {
  this.autosizing_ = minSize;
  this.updateSize_();
};

wunjo.NotebookEditor.prototype.updateSize_ = function() {
  var size = this.getAvailableArea();
  if (this.autosizing_) {
    size = [
      Math.max(size[0], this.autosizing_[0]),
      Math.max(size[1], this.autosizing_[1])
    ];
    var canvas = this.getCanvas();
    if (canvas.width != size[0]) {
      canvas.width = size[0];
    }
    if (canvas.height != size[1]) {
      canvas.height = size[1];
    }
  }
};

wunjo.NotebookEditor.prototype.onWindowResize_ = function() {
  if (this.autosizing_) {
    this.updateSize_();
    this.delayRedraw();
  }
};

wunjo.NotebookEditor.prototype.delayRedraw = function() {
  var win = this.dom_.getWindow();
  if (this.redrawTo_) {
    win.clearTimeout(this.redrawTo_);
    delete this.redrawTo_;
  }
  var self = this;
  this.redrawTo_ = win.setTimeout(function() {
    delete self.redrawTo_;
    self.draw_(self.getCanvas());
  }, 100);
};

wunjo.NotebookEditor.prototype.draw_ = function(canvas) {
  if (this.message_) {
    var
      canvas = this.getCanvas(),
      ctx = canvas.getContext('2d');
    ctx.font = this.messageFont;
    var met = ctx.measureText(this.message_);
    this.setAutosize_([Math.ceil(met.width*.15)*10, 24]);

    ctx.font = this.messageFont;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(this.message_, canvas.width/2, canvas.height/2);
  } else if (this.curPage_) {
    this.curPage_.draw(canvas);
  }

  wunjo.NotebookEditor.superClass_.draw_.call(this, canvas);
};

wunjo.NotebookEditor.prototype.finishStroke_ = function() {
  var points = this.points_;
  wunjo.NotebookEditor.superClass_.finishStroke_.call(this);
  if (this.curPage_) {
    var layer;
    if (! this.curPage_.getLayerCount()) {
      layer = this.curPage_.addLayer(
        new wunjo.Notebook.Layer('default')
      );
    } else {
      layer = this.curPage_.getLayer(0);
    }
    var stroke = new wunjo.Notebook.Stroke(this.pen_.size, this.pen_.color);
    for (var i=0; i<points.length; i++) {
      stroke.addPoint(points[i][0], points[i][1]);
    }
    layer.addItem(stroke);
  }
};

// vim:set ts=2 sw=2 expandtab:
