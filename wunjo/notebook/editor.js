goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.ui.Component');

goog.require('wunjo.notebook');
goog.require('wunjo.ui.DrawingArea');

goog.provide('wunjo.notebook.Editor');

wunjo.notebook.Editor = function(notebook, opt_domHelper) {
  wunjo.ui.DrawingArea.call(this, opt_domHelper);

  this.setNotebook(notebook);
};
goog.inherits(wunjo.notebook.Editor, wunjo.ui.DrawingArea);

wunjo.notebook.Editor.getDPI = function() {
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

wunjo.notebook.Editor.prototype.messageFont = 'normal bold 16px/18px sans-serif';
wunjo.notebook.Editor.prototype.notebook_ = null;
wunjo.notebook.Editor.prototype.message_ = null;
wunjo.notebook.Editor.prototype.autosizing_ = null;
wunjo.notebook.Editor.prototype.nbeh_ = null;
wunjo.notebook.Editor.prototype.pgeh_ = null;
wunjo.notebook.Editor.prototype.curPage_ = null;
wunjo.notebook.Editor.prototype.dsize_ = null;

wunjo.notebook.Editor.prototype.enterDocument = function() {
  var elt = this.getElement();
  this.dsize_ = [
    elt.offsetWidth - elt.clientWidth,
    elt.offsetHeight - elt.clientHeight
  ];
  wunjo.notebook.Editor.superClass_.enterDocument.call(this);
  this.getCanvas().dpi = wunjo.notebook.Editor.getDPI();
  this.getHandler().listen(
    this.dom_.getWindow(), goog.events.EventType.RESIZE,
    this.onWindowResize_
  );
};

wunjo.notebook.Editor.prototype.setMessage = function(mess) {
  if (mess && ! mess.length) mess = null;
  this.message_ = mess;
  this.setEnabled(this.message_ ? false : true);
  this.delayRedraw();
};

wunjo.notebook.Editor.prototype.getNotebook = function() {
  return this.notebook_;
};

wunjo.notebook.Editor.prototype.setNotebook = function(nb) {
  if (this.notebook_) {
    if (this.notebook_ === nb) return;
    this.setCurrentPage(null);
    this.unhookupNotebook_();
    this.notebook_ = null;
  }
  if (nb) {
    this.notebook_ = nb;
    this.hookupNotebook_();
  }

  if (! this.notebook_) {
    this.setMessage('No Notebook Loaded');
  } else if (this.notebook_.getPageCount() <= 0) {
    this.setMessage('Empty Notebook');
  } else {
    this.setMessage(null);
    this.setCurrentPage(0);
  }

  this.dispatchEvent({
    type: 'notebookchanged',
    notebook: this.notebook_
  });

  this.delayRedraw();

  return this.notebook_;
};

wunjo.notebook.Editor.prototype.hookupNotebook_ = function() {
  if (this.nbeh_) {
    this.nbeh_.dispose();
  }
  this.nbeh_ = new goog.events.EventHandler(this);
  this.nbeh_.listen(this.notebook_, 'pageadded', this.onPageAdded_);
  this.nbeh_.listen(this.notebook_, 'pageremoved', this.onPageRemoved_);
};

wunjo.notebook.Editor.prototype.unhookupNotebook_ = function() {
  if (this.nbeh_) {
    this.nbeh_.dispose();
    this.nbeh_ = null;
  }
};

wunjo.notebook.Editor.prototype.onPageAdded_ = function(evt) {
  if (! this.curPage_) {
    this.setCurrentPage(evt.page);
  }
};

wunjo.notebook.Editor.prototype.onPageRemoved_ = function(evt) {
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

wunjo.notebook.Editor.prototype.setCurrentPage = function(page) {
  if (page != null && ! page instanceof wunjo.notebook.Page) {
    page = this.notebook_.getPage(page);
  }
  if (this.autosizing_) {
    this.autosizing_ = null;
  }
  if (this.pgeh_) {
    this.pgeh_.dispose();
    this.pgeh_ = null;
  }
  this.curPage_ = page;

  if (this.curPage_) {
    this.setMessage(null);
    this.pgeh_ = new goog.events.EventHandler(this);
    this.pgeh_.listen(this.curPage_, 'resize', this.onPageResize_);
    if (this.curPage_.options.autosize) {
      this.updateSize_();
    } else {
      this.updatePageSize_(this.curPage_.getSize());
    }
  } else {
    this.setMessage(this.notebook_.getPageCount() <= 0
      ? 'Empty Notebook' : 'No current page'
    );
  }

  this.dispatchEvent({
    type: 'currentpagechanged',
    notebook: this.notebook_,
    page: this.curPage_
  });

  this.delayRedraw();

  return this.curPage_;
};

wunjo.notebook.Editor.prototype.getCurrentPage = function(page) {
  return this.curPage_;
};

wunjo.notebook.Editor.prototype.decorateInternal = function(element) {
  if (! element.getElementsByTagName('canvas').length) {
    element.appendChild(this.dom_.createElement('canvas'));
  }

  wunjo.notebook.Editor.superClass_.decorateInternal.call(this, element);

  var elt = this.getElement();
  if (elt.tagName.toLowerCase() == 'div') {
    goog.dom.classes.add(elt, 'wunjo-notebookeditor');
    elt.style.overflow = 'clip';
  }
};

wunjo.notebook.Editor.prototype.createDom = function() {
  this.decorateInternal(this.dom_.createElement('div')
    .appendChild(this.dom_.createElement('canvas'))
    .parentNode
  );
};

wunjo.notebook.Editor.prototype.getCanvas = function() {
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

wunjo.notebook.Editor.prototype.getAvailableArea = function() {
  var elt = this.getElement();
  if (elt.tagName.toLowerCase() == 'canvas') {
    throw Error('No container');
  }
  return [
    elt.offsetWidth - this.dsize_[0],
    elt.offsetHeight - this.dsize_[1]
  ];
};

wunjo.notebook.Editor.prototype.setAutosize_ = function(minSize) {
  this.autosizing_ = minSize;
  this.updateSize_();
};

wunjo.notebook.Editor.prototype.updateSize_ = function() {
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

wunjo.notebook.Editor.prototype.onWindowResize_ = function() {
  if (this.autosizing_) {
    this.updateSize_();
    this.delayRedraw();
  } else if (this.curPage_ && this.curPage_.options.autosize) {
    this.curPage_.updateSize(this.getAvailableArea());
  }
};

wunjo.notebook.Editor.prototype.onPageResize_ = function(evt) {
  this.updatePageSize_(evt.value);
};

wunjo.notebook.Editor.prototype.updatePageSize_ = function(size) {
  var
    elt = this.getElement(),
    canvas = this.getCanvas(),
    avail = this.getAvailableArea();
  canvas.width = size[0];
  canvas.height = size[1];
  elt.style.overflow = (size[0] > avail[0] || size[1] > avail[1]) ? 'auto' : 'hidden';
  this.draw_(this.getCanvas());
};

wunjo.notebook.Editor.prototype.draw_ = function(canvas) {
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

  wunjo.notebook.Editor.superClass_.draw_.call(this, canvas);
};

wunjo.notebook.Editor.prototype.finishStroke_ = function() {
  var points = this.points_;
  wunjo.notebook.Editor.superClass_.finishStroke_.call(this);
  if (this.curPage_) {
    var layer;
    if (! this.curPage_.getLayerCount()) {
      layer = this.curPage_.addLayer(
        new wunjo.notebook.Layer('default')
      );
    } else {
      layer = this.curPage_.getLayer(0);
    }
    var stroke = new wunjo.notebook.Stroke(this.pen_.size, this.pen_.color);
    for (var i=0; i<points.length; i++) {
      stroke.addPoint(points[i][0], points[i][1]);
    }
    layer.addItem(stroke);
  }
};

// vim:set ts=2 sw=2 expandtab:
