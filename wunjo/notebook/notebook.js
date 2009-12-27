goog.require('goog.array');
goog.require('goog.events.EventTarget');

goog.provide('wunjo.notebook');
goog.provide('wunjo.notebook.Page');
goog.provide('wunjo.notebook.Layer');
goog.provide('wunjo.notebook.Stroke');

wunjo.notebook = function(title, options) {
  goog.events.EventTarget.call(this);

  this.title = title;
  this.options = options || {};
};
goog.inherits(wunjo.notebook, goog.events.EventTarget);

wunjo.notebook.prototype.pages_ = null;

wunjo.notebook.prototype.disposeInternal = function() {
  wunjo.notebook.superClass_.disposeInternal.call(this);
  if (this.pages_) {
    for (var i=0; i<this.pages_.length; i++) {
      this.pages_[i].dispose();
    }
    this.pages_ = null;
  }
};

wunjo.notebook.unserialize = function(data) {
  var notebook = new Notebook(data.title, data.options);
  if (data.pages) {
    var pages = [];
    for (var i=0; i<data.pages.length; i++) {
      pages.push(
        wunjo.notebook.Page.unserialize(data.pages[i])
      );
    }
    if (pages.length) {
      notebook.pages_ = pages;
    }
  }
};

wunjo.notebook.prototype.serialize = function() {
  var data = {
    title: this.title,
    options: this.options
  };
  if (this.pages_) {
    data.pages = [];
    for (var i=0; i<this.pages_.length; i++) {
      data.pages.push(this.pages_[i].serialize());
    }
  }
  return data;
};

wunjo.notebook.prototype.getPageCount = function() {
  if (! this.pages_) return 0;
  return this.pages_.length;
};

wunjo.notebook.prototype.getPage = function(i) {
  if (! this.pages_) return null;
  return this.pages_[i];
};

wunjo.notebook.prototype.getPages = function() {
  if (! this.pages_) return null;
  return goog.array.clone(this.pages_);
};

wunjo.notebook.prototype.clear = function() {
  while (this.pages_.length) {
    this.removePage(this.pages_[0]);
  }
  this.pages_ = null;
};

wunjo.notebook.prototype.addPage = function(page) {
  if (! this.pages_) {
    this.pages_ = [];
  }
  goog.array.insert(this.pages_, page);
  this.dispatchEvent({
    type: 'pageadded',
    page: page
  });
  return page;
};

wunjo.notebook.prototype.addPageAt = function(page, i) {
  if (! this.pages_) {
    this.pages_ = [];
  }
  goog.array.insertAt(this.pages_, page, i);
  this.dispatchEvent({
    type: 'pageadded',
    page: page
  });
  return page;
};

wunjo.notebook.prototype.removePage = function(page) {
  var i = goog.array.indexOf(this.pages_, page);
  if (i < 0) return;
  goog.array.remove(this.pages_, page);
  if (! this.pages_.length) {
    this.pages_ = null;
  }
  this.dispatchEvent({
    type: 'pageremoved',
    page: page,
    index: i
  });
};


wunjo.notebook.Page = function(title, width, height, options) {
  goog.events.EventTarget.call(this);

  this.title_ = title;
  this.width_ = width;
  this.height_ = height;
  this.options = options || {};
  this.options.paper = this.options.paper || 'ruled';
};
goog.inherits(wunjo.notebook.Page, goog.events.EventTarget);

wunjo.notebook.Page.paperTypes = ['blank', 'ruled', 'lined', 'grid'];

wunjo.notebook.Page.unserialize = function(data) {
  var page = new wunjo.notebook.Page(data.title, data.width, data.height, data.options);
  if (data.layers) {
    var layers = [];
    for (var i=0; i<data.layers.length; i++) {
      layers.push(
        wunjo.notebook.Layer.unserialize(data.layers[i])
      );
    }
    if (layers.length) {
      page.layers_ = layers;
    }
  }
  return page;
};

wunjo.notebook.Page.prototype.layers_ = null;

wunjo.notebook.Page.prototype.serialize = function() {
  var data = {
    title: this.title_,
    width: this.width_,
    height: this.height_,
    options: this.options
  };
  if (this.layers_) {
    data.layers = []
    for (var i=0; i<this.layers_.length; i++) {
      data.layers.push(this.layers_[i].serialize());
    }
  }
  return data;
};

wunjo.notebook.Page.prototype.disposeInternal = function() {
  wunjo.notebook.Page.superClass_.disposeInternal.call(this);
  if (this.layers_) {
    for (var i=0; i<this.layers_.length; i++) {
      this.layers_[i].dispose();
    }
    this.layers_ = null;
  }
};

wunjo.notebook.Page.prototype.getTitle = function() {
  return this.title_;
};

wunjo.notebook.Page.prototype.setTitle = function(title) {
  this.title_ = title;
  this.dispatchEvent({
    type: 'titlechanged',
    value: title
  });
};

wunjo.notebook.Page.prototype.getSize = function() {
  return [this.width_, this.height_];
};

wunjo.notebook.Page.prototype.setSize = function(width, height) {
  this.width_ = width;
  this.height_ = height;
  this.dispatchEvent({
    type: 'resize',
    value: this.getSize()
  });
};

wunjo.notebook.Page.prototype.updateSize = function(size) {
  if (this.options.minsize) {
    size = [
      Math.max(size[0], this.options.minsize[0]),
      Math.max(size[1], this.options.minsize[1])
    ];
  }
  this.setSize(size[0], size[1]);
};

wunjo.notebook.Page.prototype.draw = function(canvas) {
  if (typeof(this.options.paper) == "function") {
    this.options.paper(this, canvas);
  } else {
    this.drawPaper(canvas);
  }

  // Draw layers
  if (this.layers_) {
    for (var i=0; i<this.layers_.length; i++) {
      this.layers_[i].draw(canvas);
    }
  }
};

wunjo.notebook.Page.prototype.drawPaper = function(canvas) {
  if (this.options.paper == "blank") return;

  var ctx = canvas.getContext('2d');

  switch (this.options.paper) {
    case 'ruled':
      var margin = 4/5*canvas.dpi, marginRuleWidth = 3;
      ctx.fillStyle = 'rgba(192, 64, 64, 0.25)';
      ctx.fillRect(margin - marginRuleWidth/2, 0, marginRuleWidth, canvas.height);
    case 'lined':
      var spacing = canvas.dpi/5, width = 2, half=width/2, start = canvas.dpi;
      ctx.fillStyle = 'rgba(64, 64, 192, 0.25)';
      for (var i=start; i<canvas.height; i+=spacing) {
        ctx.fillRect(0, i-half, canvas.width, width);
      }
      break;
    case 'grid':
      var spacing = canvas.dpi/5, width = 2, half = width/2;
      ctx.fillStyle = 'rgba(32, 96, 32, 0.25)';
      for (var i=spacing; i<canvas.width; i+=spacing) {
        ctx.fillRect(i-half, 0, width, canvas.height);
      }
      for (var i=spacing; i<canvas.height; i+=spacing) {
        ctx.fillRect(0, i-half, canvas.width, width);
      }
      break;
  }
};

wunjo.notebook.Page.prototype.getLayerCount = function() {
  if (! this.layers_) return 0;
  return this.layers_.length;
};

wunjo.notebook.Page.prototype.getLayer = function(i) {
  if (! this.layers_) return null;
  return this.layers_[i];
};

wunjo.notebook.Page.prototype.getLayers = function() {
  if (! this.layers_) return null;
  return goog.array.clone(this.layers_);
};

wunjo.notebook.Page.prototype.clear = function() {
  while (this.layers_.length) {
    this.removeLayer(this.layers_[0]);
  }
  this.layers_ = null;
};

wunjo.notebook.Page.prototype.addLayer = function(layer) {
  if (! this.layers_) {
    this.layers_ = [];
  }
  goog.array.insert(this.layers_, layer);
  this.dispatchEvent({
    type: 'layeradded',
    layer: layer
  });
  return layer;
};

wunjo.notebook.Page.prototype.addLayerAt = function(layer, i) {
  if (! this.layers_) {
    this.layers_ = [];
  }
  goog.array.insertAt(this.layers_, layer, i);
  this.dispatchEvent({
    type: 'layeradded',
    layer: layer
  });
  return layer;
};

wunjo.notebook.Page.prototype.removeLayer = function(layer) {
  goog.array.remove(this.layers_, layer);
  if (! this.layers_.length) {
    this.layers_ = null;
  }
  this.dispatchEvent({
    type: 'layerremoved',
    layer: layer
  });
};


wunjo.notebook.Layer = function(name) {
  goog.events.EventTarget.call(this);

  this.name_ = name;
};
goog.inherits(wunjo.notebook.Layer, goog.events.EventTarget);

wunjo.notebook.Layer.itemTypes = {};

wunjo.notebook.Layer.getItemType = function(item) {
  for (type in this.itemTypes) {
    if (item instanceof this.itemTypes[type]) {
      return type;
    }
  }
  return null;
};

wunjo.notebook.Layer.unserialize = function(data) {
  var layer = new wunjo.notebook.Layer(data.name);
  if (data.items) {
    var items = [];
    for (var i=0; i<data.items.length; i++) {
      var itemtype = data.items[i].type;
      if (! itemtype in this.itemTypes) {
        throw Error('invalid item type '+itemtype);
      }
      items.push(
        this.itemTypes[itemtype].unserialize(data.items[i])
      );
    }
    if (items.length) {
      layer.items_ = items;
    }
  }
  return layer;
};

wunjo.notebook.Layer.prototype.items_ = null;

wunjo.notebook.Layer.prototype.serialize = function() {
  var data = {
    name: this.name_
  };
  if (this.items_) {
    data.items = [];
    for (var i=0; i<this.items_.length; i++) {
      var itemdata = this.items_[i].serialize();
      itemdata.type = wunjo.notebook.Layer.getItemType(this.items_[i]);
      data.items.push(itemdata);
    }
  }
  return data;
};

wunjo.notebook.Layer.prototype.getName = function() {
  return this.name_;
};

wunjo.notebook.Layer.prototype.setName = function(name) {
  this.name_ = name;
  this.dispatchEvent({
    type: 'namechanged',
    value: name
  });
};

wunjo.notebook.Layer.prototype.draw = function(canvas) {
  for (var i=0; i<this.items_.length; i++) {
    this.items_[i].draw(canvas);
  }
};

wunjo.notebook.Layer.prototype.getItemCount = function() {
  if (! this.items_) return 0;
  return this.items_.length;
};

wunjo.notebook.Layer.prototype.getItem = function(i) {
  if (! this.items_) return null;
  return this.items_[i];
};

wunjo.notebook.Layer.prototype.getItems = function() {
  if (! this.items_) return null;
  return goog.array.clone(this.items_);
};

wunjo.notebook.Layer.prototype.clear = function() {
  while (this.items_.length) {
    this.removeItem(this.items_[0]);
  }
  this.items_ = null;
};

wunjo.notebook.Layer.prototype.addItem = function(item) {
  if (! this.items_) {
    this.items_ = [];
  }
  goog.array.insert(this.items_, item);
  this.dispatchEvent({
    type: 'itemadded',
    item: item
  });
  return item;
};

wunjo.notebook.Layer.prototype.addItemAt = function(item, i) {
  if (! this.items_) {
    this.items_ = [];
  }
  goog.array.insertAt(this.items_, item, i);
  this.dispatchEvent({
    type: 'itemadded',
    item: item
  });
  return item;
};

wunjo.notebook.Layer.prototype.removeItem = function(item) {
  goog.array.remove(this.items_, item);
  if (! this.items_.length) {
    this.items_ = null;
  }
  this.dispatchEvent({
    type: 'itemremoved',
    item: item
  });
};


wunjo.notebook.Stroke = function(width, color, startX, startY) {
  this.color = color;
  this.width = width;
  if (startX != undefined && startY != undefined)
    this.addPoint(startX, startY);
  else if (goog.isArrayLike(startX))
    this.points = goog.array.clone(startX);
};

wunjo.notebook.Layer.itemTypes['stroke'] = wunjo.notebook.Stroke;

wunjo.notebook.Stroke.unserialize = function(data) {
  return new wunjo.notebook.Stroke(data.width, data.color, data.points);
};

wunjo.notebook.Stroke.prototype.serialize = function() {
  var data = {
    color: this.color,
    width: this.width
  };
  if (this.points)
    data.points = goog.array.clone(this.points);
  return data;
};

wunjo.notebook.Stroke.prototype.addPoint = function(x, y) {
  if (! this.points)
    this.points = [];
  this.points.push(x, y);
};

wunjo.notebook.Stroke.prototype.draw = function(canvas) {
  wunjo.notebook.Stroke.draw(canvas, this.color, this.width, this.points);
};

wunjo.notebook.Stroke.draw = function(canvas, color, width, points) {
  if (points.length <= 0) return;
  var ctx = canvas.getContext('2d');
  if (points.length == 2) {
    var half = width/2;
    ctx.fillRect(points[0]-half, points[1]-half, width, width);
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (var i=2; i<points.length; i+=2)
      ctx.lineTo(points[i], points[i+1]);
    ctx.stroke();
  }
  return ctx;
};

// vim:set ts=2 sw=2 expandtab:
