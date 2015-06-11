function aa_init_class(className, prototypeFunctions) {
  if (!ajaxart.classes[className]) {
    ajaxart.classes[className] = function(settings) {
      aa_extend(this, settings);
      if (this._ctor) this._ctor();
    };
    aa_extend(ajaxart.classes[className].prototype, prototypeFunctions);
  }
}

function aa_find_bart_context(elem) {
  for (; elem && elem.nodeType == 1; elem = elem.parentNode) {
    if (elem.jbContext) {
      var bartcontext = aa_var_first(elem.jbContext, '_AppContext');
      if (bartcontext) return bartcontext;
    }
  }
  return null;
}

function aa_getItemData(object) {
  var context = object.context;
  if (!context && object.vars && object.params) context = object;
  // TODO: handle a case where object is a html element

  return context.vars.Item || [];
}

function aa_scrollToShowElement(elem, direction, margins) {
  // Consider using scrollIntoView (DOM)
  // TODO: handle scrolling down + use the direction parameter

  direction = direction || ''; // direction can be: 'up','down' or ''

  var iter = elem;
  var parent = iter && iter.parentNode;
  margins = margins || {
    top: 0,
    bottom: 0
  };

  while (parent && parent.nodeType == 1 && parent.tagName.toLowerCase() != 'html') {
    var overflowy = $(parent).css('overflow-y');
    if (overflowy == 'scroll' || overflowy == 'auto' || parent == document.body) {

      var newScrollTop = parent.scrollTop + $(iter).position().top - $(parent).position().top - margins.top;
      newScrollTop = Math.max(0,newScrollTop);

      $(parent).scrollTop(newScrollTop);

      // var top = aa_relTop(iter, parent) - margins.top;
      // if (parent == document.body && jBart.headerHeight) {
      //   top -= jBart.headerHeight;
      // }

      // if (top < $(parent).scrollTop()) {
      //   $(parent).scrollTop(top);
      //   iter = parent;
      // }
    }
    parent = parent.parentNode;
  }
}

function aa_isParent(child, parent) {
  for (var iter = child; iter && iter.nodeType == 1; iter = iter.parentNode) {
    if (iter == parent) return true;
  }
  return false;
}

function aa_registerHeaderEvent(thead, eventType, func, ownerId, activation_mode) {
  if (thead.EventHandler == null) {
    aa_defineElemProperties(thead, 'handlers,EventHandler');
    thead.handlers = [];
    thead.EventHandler = function(e) {
      var elem = jQuery((typeof(event) == 'undefined') ? e.target : (event.tDebug || event.srcElement));
      e = e || event; // IE
      if (elem.hasClass('fieldtitle_info')) return false; // a bit ugly. it has its own handler

      if (elem.hasClass('fieldtitle')) var th = elem;
      else var th = elem.parents('th');
      if (th.length == 0) return true;

      if (e.type == 'mousedown') thead.LastMouseDown = {
        th: th[0]
      };
      if (e.type == 'mouseout') thead.LastMouseDown = null;

      for (var i = 0; i < thead.handlers.length; i++) {
        var handler = thead.handlers[i];
        if (handler.eventType != e.type) continue;
        if (e.button == 2) {
          if (handler.activation_mode == 'right mouse') handler.func(e, thead, th[0]);
        } else {
          var activate = (handler.activation_mode == 'no dominant' && thead.Owner == null) || (handler.activation_mode == 'suspect' && thead.Suspect != null && thead.Owner == null) || (handler.activation_mode == 'dominant' && thead.Owner == handler.ownerId);
          if (activate) handler.func(e, thead, th[0]);
        }
      }
    }
    thead.onmousedown = thead.onmouseout = thead.onmouseup = thead.onmousemove = thead.EventHandler;
  }
  thead.handlers.push({
    eventType: eventType,
    func: func,
    ownerId: ownerId,
    activation_mode: activation_mode
  })
}

function aa_empty(elem, clearMemoryLeaks) {
  var children = [];
  while (elem.firstChild) aa_remove(elem.firstChild, clearMemoryLeaks);
  aa_clear_virtual_inner_element(elem);
}

function aa_clear_virtual_inner_element(elem) {
  if (!elem.virtual_inner_elements) return;
  for (var i = 0; i < elem.virtual_inner_elements.length; i++) {
    aa_empty(elem.virtual_inner_elements[i]);
  }
}

function aa_bind_ui_event(elem, event1, func1) {
  if (!elem) return;
  if (event1 == "mouserightclick") {
    // Disable browser context menu (requires both selectors to work in IE/Safari + FF/Chrome)
    jQuery(elem).bind('contextmenu', function() {
      return false;
    });

    jQuery(elem).mousedown(function(e) {
      var evt = e;
      if (evt.button == 2) {
        aa_xFireEvent(this, 'click', null); // right-click is also click (for element selection)
        ajaxart.ui.lastEvent = (e) ? e : window.event;
        func1(e);
        ajaxart.ui.lastEvent = null;
        return false;
      }
      return true;
    });
    return;
  }
  if (elem.addEventListener) elem.addEventListener(event1, func1, false);
  else if (elem.attachEvent) {
    elem.attachEvent("on" + event1, func1);
    elem.jbEvents = elem.jbEvents || [];
    elem.jbEvents.push({
      event: "on" + event1,
      callback: func1
    });
  }
}

function aa_absLeft(elem, ignoreScroll) {
  if (elem == null) return 0;
  var orig = elem,
    left = 0,
    curr = elem;
  // This intentionally excludes body which has a null offsetParent.
  if (!ignoreScroll) {
    while (curr && curr.tagName && curr.tagName.toLowerCase() != 'body') {
      left -= curr.scrollLeft;
      curr = curr.parentNode; // scroll can not be calculated using offsetParent!
    }
  }
  while (elem) {
    left += elem.offsetLeft;
    elem = elem.offsetParent;
  }
  return left;
}

function aa_absTop(elem, ignoreScroll) {
  var top = 0,
    orig = elem,
    curr = elem;
  // This intentionally excludes body which has a null offsetParent.
  if (typeof(ignoreScroll) == "undefined") ignoreScroll = false;
  if (!ignoreScroll) {
    while (curr && curr.tagName && curr.tagName.toLowerCase() != 'body') {
      top -= curr.scrollTop;
      curr = curr.parentNode;
    }
  }
  while (elem) {
    top += elem.offsetTop;
    elem = elem.offsetParent;
  }
  return top;
}

function aa_relTop(elem, parent) {
  var top = 0,
    orig = elem,
    curr = elem;
  // This intentionally excludes body which has a null offsetParent.
  if (typeof(ignoreScroll) == "undefined") ignoreScroll = false;
  if (!ignoreScroll) {
    while (curr && curr.tagName && curr != parent) {
      top -= curr.scrollTop;
      curr = curr.parentNode;
    }
  }
  while (elem && elem != parent) {
    top += elem.offsetTop;
    elem = elem.offsetParent;
  }
  return top;
}

function aa_mousePos(e, removeWindowScroll) {
  var out = {};
  if (typeof(event) != 'undefined') var e = window.event;

  if (e.pageX || e.pageY) {
    out = {
      x: e.pageX,
      y: e.pageY
    };
  } else if (e.clientX || e.clientY) {
    var posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
    var posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    out = {
      x: posx,
      y: posy
    }
  }
  if (removeWindowScroll && out.y) out.y -= (window.pageYOffset || 0);
  if (removeWindowScroll && out.x) out.x -= (window.pageXOffset || 0);

  return out;
}

function aa_addWindowResizeEvent(elem, callback) {
  if (window.removeEventListener) window.removeEventListener('resize', callback);
  else window.detachEvent('resize', callback);

  aa_addEventListener(window,'resize', callback);

  aa_addOnDetach(elem, function() {
    aa_removeEventListener(window,'resize', callback);
  });

}