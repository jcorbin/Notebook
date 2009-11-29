goog.provide('wunjo.Notebook');

goog.require('goog.array');
goog.require('goog.events.EventTarget');

wunjo.Notebook.Page = function(width, height, options) {
  this.width_ = width;
  this.height_ = height;
  this.options = options || {};
  this.options.paper = this.options.paper || 'ruled';
  this.strokes = [];
};

wunjo.Notebook.Page.paperTypes = ['blank', 'ruled', 'lined', 'grid'];

wunjo.Notebook.Page.unserialize = function(data) {
  var page = new wunjo.Notebook.Page(data.width, data.height, data.options);
  if (data.strokes) {
    for (var i=0; i<data.strokes.length; i++) {
      page.strokes.push(wunjo.Notebook.Stroke.unserialize(data.strokes[i]));
    }
  }
  return page;
};

wunjo.Notebook.Page.prototype.serialize = function() {
  var data = {
    width: this.width_,
    height: this.height_,
    options: this.options,
    strokes: []
  };
  for (var i=0; i<this.strokes.length; i++) {
    data.strokes.push(this.strokes[i].serialize());
  }
  return data;
};

wunjo.Notebook.Page.prototype.getSize = function() {
  return [this.width_, this.height_];
};

wunjo.Notebook.Page.prototype.setSize = function(width, height) {
  this.width_ = width;
  this.height_ = height;
  this.dispatchEvent({
    type: 'resize',
    value: this.getSize()
  });
};

wunjo.Notebook.Page.prototype.draw = function(canvas) {
  if (typeof(this.options.paper) == "function") {
    this.options.paper(this, canvas);
  } else {
    this.drawPaper(canvas);
  }

  // Draw strokes
  for (var i=0; i<this.strokes.length; i++) {
    this.strokes[i].draw(canvas);
  }
};

wunjo.Notebook.Page.prototype.drawPaper = function(canvas) {
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

wunjo.Notebook.Page.prototype.addStroke = function(stroke) {
  this.strokes.push(stroke);
  return stroke;
};

wunjo.Notebook.Page.prototype.clear = function() {
  this.strokes = [];
};


wunjo.Notebook.Layer = function(name) {
  goog.events.EventTarget.call(this);

  this.name_ = name;
};
goog.inherits(wunjo.Notebook.Layer, goog.events.EventTarget);

wunjo.Notebook.Layer.itemTypes = {};

wunjo.Notebook.Layer.getItemType = function(item) {
  for (type in this.itemTypes) {
    if (item instanceof this.itemTypes[type]) {
      return type;
    }
  }
  return null;
};

wunjo.Notebook.Layer.unserialize = function(data) {
  var layer = new wunjo.Notebook.Layer(data.name);
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

wunjo.Notebook.Layer.prototype.items_ = null;

wunjo.Notebook.Layer.prototype.serialize = function() {
  var data = {
    name: this.name_
  };
  if (this.items_) {
    data.items = [];
    for (var i=0; i<this.items_.length; i++) {
      var itemdata = this.items_[i].serialize();
      itemdata.type = wunjo.Notebook.Layer.getItemType(this.items_[i]);
      data.items.push(itemdata);
    }
  }
  return data;
};

wunjo.Notebook.Layer.prototype.getName = function() {
  return this.name_;
};

wunjo.Notebook.Layer.prototype.setName = function(name) {
  this.name_ = name;
  this.dispatchEvent({
    type: 'namechanged',
    value: name
  });
};

wunjo.Notebook.Layer.prototype.draw = function(canvas) {
  for (var i=0; i<this.items_.length; i++) {
    this.items_[i].draw(canvas);
  }
};

wunjo.Notebook.Layer.prototype.getItemCount = function() {
  if (! this.items_) return 0;
  return this.items_.length;
};

wunjo.Notebook.Layer.prototype.getItem = function(i) {
  if (! this.items_) return null;
  return this.items_[i];
};

wunjo.Notebook.Layer.prototype.getItems = function() {
  if (! this.items_) return null;
  return goog.array.clone(this.items_);
};

wunjo.Notebook.Layer.prototype.clear = function() {
  while (this.items_.length) {
    this.removeItem(this.items_[0]);
  }
  this.items_ = null;
};

wunjo.Notebook.Layer.prototype.addItem = function(item) {
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

wunjo.Notebook.Layer.prototype.addItemAt = function(item, i) {
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

wunjo.Notebook.Layer.prototype.removeItem = function(item) {
  goog.array.remove(this.items_, item);
  if (! this.items_.length) {
    this.items_ = null;
  }
  this.dispatchEvent({
    type: 'itemremoved',
    item: item
  });
};


wunjo.Notebook.Stroke = function(width, color, startX, startY) {
  this.color = color;
  this.width = width;
  this.points = [];
  if (startX != undefined && startY != undefined) {
    this.addPoint(startX, startY);
  }
};

wunjo.Notebook.Layer.itemTypes['stroke'] = wunjo.Notebook.Stroke;

wunjo.Notebook.Stroke.unserialize = function(data) {
  var stroke = new wunjo.Notebook.Stroke(data.width, data.color);
  if (data.points) {
    for (var i=0, l=data.points; i<l.length; i++) {
      stroke.points.push([l[i][0], l[i][1]]);
    }
  }
  return stroke;
};

wunjo.Notebook.Stroke.prototype.serialize = function() {
  var data = {
    color: this.color,
    width: this.width,
    points: []
  };
  for (var i=0, l=this.points; i<l.length; i++) {
    data.points.push([l[i][0], l[i][1]]);
  }
  return data;
};

wunjo.Notebook.Stroke.prototype.addPoint = function(x, y) {
  this.points.push([x, y]);
};

wunjo.Notebook.Stroke.prototype.draw = function(canvas) {
  if (this.points.length <= 1) return;
  ctx = canvas.getContext('2d');
  ctx.strokeStyle = this.color;
  ctx.lineWidth = this.width;
  var half = this.width/2;
  ctx.beginPath();
  ctx.moveTo(this.points[0][0], this.points[0][1]);
  for (var i=1; i<this.points.length; i++) {
    ctx.lineTo(this.points[i][0], this.points[i][1]);
  }
  ctx.stroke();
};

// vim:set ts=2 sw=2 expandtab:
