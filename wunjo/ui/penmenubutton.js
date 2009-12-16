goog.provide('wunjo.ui.PenMenuButtonRenderer');

goog.require('goog.ui.ColorMenuButtonRenderer');

wunjo.ui.PenMenuButtonRenderer = function() {
  goog.ui.ColorMenuButtonRenderer.call(this);
};
goog.inherits(wunjo.ui.PenMenuButtonRenderer, goog.ui.ColorMenuButtonRenderer);
goog.addSingletonGetter(wunjo.ui.PenMenuButtonRenderer);

wunjo.ui.PenMenuButtonRenderer.CSS_CLASS = 'wunjo-pen-menu-button';

wunjo.ui.PenMenuButtonRenderer.prototype.setValue = function(element, value) {
  if (element) {
    wunjo.ui.PenMenuButtonRenderer.setCaptionValue(
        this.getContentElement(element), value);
  }
};

wunjo.ui.PenMenuButtonRenderer.setCaptionValue = function(caption, value) {
  goog.ui.ColorMenuButtonRenderer.setCaptionValue(caption, value && value.color);
  if (value && caption && value.size && caption.firstChild) {
    caption.firstChild.style.borderBottomWidth = value.size.toString()+'px';
  }
};

//////////////////////////////////////////////////////////////////////////

goog.provide('wunjo.ui.ToolbarPenMenuButtonRenderer');

goog.require('goog.ui.ColorMenuButtonRenderer');

wunjo.ui.ToolbarPenMenuButtonRenderer = function() {
  goog.ui.ColorMenuButtonRenderer.call(this);
};
goog.inherits(wunjo.ui.ToolbarPenMenuButtonRenderer, goog.ui.ToolbarColorMenuButtonRenderer);
goog.addSingletonGetter(wunjo.ui.ToolbarPenMenuButtonRenderer);

wunjo.ui.ToolbarPenMenuButtonRenderer.CSS_CLASS = 'wunjo-toolbar-pen-menu-button';

wunjo.ui.ToolbarPenMenuButtonRenderer.prototype.setValue = function(element, value) {
  if (element) {
    wunjo.ui.PenMenuButtonRenderer.setCaptionValue(
        this.getContentElement(element), value);
  }
};

//////////////////////////////////////////////////////////////////////////

goog.provide('wunjo.ui.PenSizeMenuItem');
goog.require('goog.ui.MenuItem');

wunjo.ui.PenSizeMenuItem = function(label, size, opt_domHelper) {
  // TODO custom renderer
  goog.ui.MenuItem.call(this, label, size, opt_domHelper);
  this.setSelectable(true);
};
goog.inherits(wunjo.ui.PenSizeMenuItem, goog.ui.MenuItem);

//////////////////////////////////////////////////////////////////////////

goog.provide('wunjo.ui.PenMenuButton');

goog.require('goog.ui.ColorMenuButton');
goog.require('goog.ui.MenuSeparator');

wunjo.ui.PenMenuButton = function(content, value, opt_menu, opt_renderer,
    opt_domHelper) {
  goog.ui.ColorMenuButton.call(this, content || 'Pen', opt_menu,
      opt_renderer || wunjo.ui.PenMenuButtonRenderer.getInstance(),
      opt_domHelper);
  this.setValue(value || {color: '#000', size :3});
};
goog.inherits(wunjo.ui.PenMenuButton, goog.ui.ColorMenuButton);

wunjo.ui.PenMenuButton.newDefaultMenu = function(opt_domHelper) {
  var
    items = [],
    sizes = {
      'Thin': 1,
      'Medium': 3,
      'Thick': 5,
      'Thicker': 7
    };

  for (size in sizes) {
    items.push(
      new wunjo.ui.PenSizeMenuItem(size, sizes[size], opt_domHelper)
    );
  }

  items.push(new goog.ui.MenuSeparator(opt_domHelper));

  return goog.ui.ColorMenuButton.newColorMenu(items, opt_domHelper);
};

wunjo.ui.PenMenuButton.prototype.setOpen = function(open) {
  if (open && this.getItemCount() == 0) {
    this.setMenu(
        wunjo.ui.PenMenuButton.newDefaultMenu(this.getDomHelper()));
    this.setValue(this.getValue());
  }
  wunjo.ui.PenMenuButton.superClass_.setOpen.call(this, open);
};

wunjo.ui.PenMenuButton.prototype.handleMenuAction = function(e) {
  var handled = false;
  if (typeof e.target.getSelectedColor == 'function') {
    // User clicked something that looks like a color palette.
    this.setValue({
      color: e.target.getSelectedColor(),
      size: this.getSelectedSize()
    });
    handled = true;
  } else if (e.target instanceof wunjo.ui.PenSizeMenuItem) {
    this.setValue({
      color: this.getSelectedColor(),
      size: e.target.getValue()
    });
    handled = true;
  }

  if (handled) e.stopPropagation();
  goog.ui.MenuButton.prototype.handleMenuAction.call(this, e);
  if (handled) this.dispatchEvent(goog.ui.Component.EventType.ACTION);
};

wunjo.ui.PenMenuButton.prototype.getSelectedColor = function() {
  return this.getValue().color;
};

wunjo.ui.PenMenuButton.prototype.getSelectedSize = function() {
  return this.getValue().size;
};

wunjo.ui.PenMenuButton.prototype.setSelectedColor = function(color) {
  for (var i=0, item; item=this.getItemAt(i); i++) {
    if (typeof item.setSelectedColor == 'function') {
      // This menu item looks like a color palette.
      item.setSelectedColor(color);
    }
  }
};

wunjo.ui.PenMenuButton.prototype.setSelectedSize = function(size) {
  for (var i=0, item; item=this.getItemAt(i); i++) {
    if (item instanceof wunjo.ui.PenSizeMenuItem) {
      item.setSelected(item.getValue() == size);
    }
  }
};

wunjo.ui.PenMenuButton.prototype.setValue = function(val) {
  if (typeof val == 'string') {
    var match = /^\s*(.+?):(\d+)\s*$/.exec(val);
    if (match == null)
      throw new Error('invalid pen value "'+val+'"');
    val = {color: match[1], size: parseInt(match[2])};
  } else {
    if (! 'color' in val || ! 'size' in val)
      throw new Error('invalid pen value '+JSON.stringify(val));
    val = {color: val.color, size: val.size};
    if (typeof val.color != 'string')
      throw new Error('invalid pen value color '+JSON.stringify(val.color));
    if (typeof val.size != 'number') {
      var n = parseInt(val.size);
      if (isNaN(n))
        throw new Error('invalid pen value size '+JSON.stringify(val.size));
      val.size = n;
    }
  }
  goog.ui.MenuButton.prototype.setValue.call(this, val);
  this.setSelectedColor(val.color);
  this.setSelectedSize(val.size);
};

goog.ui.registry.setDecoratorByClassName(
  wunjo.ui.PenMenuButtonRenderer.CSS_CLASS, function() {
    return new wunjo.ui.PenMenuButton(null, null);
  });

goog.ui.registry.setDecoratorByClassName(
  wunjo.ui.ToolbarPenMenuButtonRenderer.CSS_CLASS, function() {
    return new wunjo.ui.PenMenuButton(null, null, null,
      wunjo.ui.ToolbarPenMenuButtonRenderer.getInstance());
  });
