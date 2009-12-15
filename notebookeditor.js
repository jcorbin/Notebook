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
wunjo.NotebookEditor.prototype.pgeh_ = null;
wunjo.NotebookEditor.prototype.curPage_ = null;
wunjo.NotebookEditor.prototype.dsize_ = null;

wunjo.NotebookEditor.prototype.enterDocument = function() {
  var elt = this.getElement();
  this.dsize_ = [
    elt.offsetWidth - elt.clientWidth,
    elt.offsetHeight - elt.clientHeight
  ];
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
    this.notebook_ = null;
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
    this.nbeh_.dispose();
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
  if (this.pgeh_) {
    this.pgeh_.dispose();
    this.pgeh_ = null;
  }
  this.curPage_ = page;
  this.pgeh_ = new goog.events.EventHandler(this);
  this.pgeh_.listen(this.curPage_, 'resize', this.onPageResize_);
  if (this.curPage_.options.autosize) {
    this.updateSize_();
  } else {
    this.updatePageSize_(this.curPage_.getSize());
  }

  this.dispatchEvent({
    type: 'currentpagechanged',
    notebook: this.notebook_,
    page: this.curPage_
  });
};

wunjo.NotebookEditor.prototype.getCurrentPage = function(page) {
  return this.curPage_;
};

wunjo.NotebookEditor.prototype.decorateInternal = function(element) {
  if (! element.getElementsByTagName('canvas').length) {
    element.appendChild(this.dom_.createElement('canvas'));
  }

  wunjo.NotebookEditor.superClass_.decorateInternal.call(this, element);

  var elt = this.getElement();
  if (elt.tagName.toLowerCase() == 'div') {
    goog.dom.classes.add(elt, 'wunjo-notebookeditor');
    elt.style.overflow = 'clip';
  }
};

wunjo.NotebookEditor.prototype.createDom = function() {
  this.decorateInternal(this.dom_.createElement('div')
    .appendChild(this.dom_.createElement('canvas'))
    .parentNode
  );
};

wunjo.NotebookEditor.prototype.getCanvas = function() {
  var elt = this.getElement();
  if (elt.tagName.toLowerCase() == 'canvas') {
    return elt;
  }
  var c = elt.getElementsByTagName('canvas');
  if (c.length) {
    return c[0];
  }
  throw Error("Coludn't find canvas element");
};

wunjo.NotebookEditor.prototype.getAvailableArea = function() {
  var elt = this.getElement();
  if (elt.tagName.toLowerCase() == 'canvas') {
    throw Error('No container');
  }
  return [
    elt.offsetWidth - this.dsize_[0],
    elt.offsetHeight - this.dsize_[1]
  ];
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
  } else if (this.curPage_ && this.curPage_.options.autosize) {
    this.curPage_.updateSize(size);
  }
};

wunjo.NotebookEditor.prototype.onWindowResize_ = function() {
  if (this.autosizing_) {
    this.updateSize_();
    this.delayRedraw();
  } else if (this.curPage_ && this.curPage_.options.autosize) {
    this.curPage_.updateSize(this.getAvailableArea());
  }
};

wunjo.NotebookEditor.prototype.onPageResize_ = function(evt) {
  this.updatePageSize_(evt.value);
};

wunjo.NotebookEditor.prototype.updatePageSize_ = function(size) {
  var
    elt = this.getElement(),
    canvas = this.getCanvas(),
    avail = this.getAvailableArea();
  canvas.width = size[0];
  canvas.height = size[1];
  elt.style.overflow = (size[0] > avail[0] || size[1] > avail[1]) ? 'auto' : 'hidden';
  this.draw_(this.getCanvas());
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
