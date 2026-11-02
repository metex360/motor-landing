/* METEX 360 — runtime mínimo para páginas con plantillas {{ }}, <sc-for> y <sc-if>.
   Uso: <template id="mx-tpl">…</template> + class Component extends DCLogic {…} + MX.mount(Component, props). */
(function () {
  var cache = {};
  function ev(expr, scope) {
    var f = cache[expr];
    if (!f) {
      try { f = cache[expr] = new Function('s', 'with(s){return (' + expr + ');}'); }
      catch (e) { f = cache[expr] = function () { return ''; }; }
    }
    try { return f(scope); } catch (e) { return undefined; }
  }
  var RE = /\{\{([\s\S]+?)\}\}/g;
  var FULL = /^\s*\{\{([\s\S]+?)\}\}\s*$/;
  function interp(str, scope) {
    return str.replace(RE, function (_, e) { var v = ev(e, scope); return v == null ? '' : String(v); });
  }
  var EVENTS = { onclick: 'click', onchange: 'input', oninput: 'input', onsubmit: 'submit', onkeydown: 'keydown' };
  var handlers = [];

  function renderChildren(src, out, scope, svg) {
    for (var c = src.firstChild; c; c = c.nextSibling) renderNode(c, out, scope, svg);
  }
  function renderNode(node, out, scope, svg) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      var m = FULL.exec(node.getAttribute('list') || '');
      var list = m ? ev(m[1], scope) : [];
      var as = node.getAttribute('as') || 'item';
      (list || []).forEach(function (item, i) {
        var s = Object.create(scope); s[as] = item; s.$index = i;
        renderChildren(node, out, s, svg);
      });
      return;
    }
    if (tag === 'sc-if') {
      var mv = FULL.exec(node.getAttribute('value') || '');
      if (mv && ev(mv[1], scope)) renderChildren(node, out, scope, svg);
      return;
    }
    var isSvg = svg || tag === 'svg';
    var el = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', node.localName) : document.createElement(tag);
    for (var i = 0; i < node.attributes.length; i++) {
      var a = node.attributes[i], name = a.name, val = a.value;
      if (name.indexOf('hint-') === 0) continue;
      if (EVENTS[name]) {
        var mh = FULL.exec(val);
        var fn = mh ? ev(mh[1], scope) : null;
        if (typeof fn === 'function') { handlers.push(fn); el.setAttribute('data-mx-' + EVENTS[name], String(handlers.length - 1)); }
        continue;
      }
      el.setAttribute(name, interp(val, scope));
    }
    if (tag === 'input' || tag === 'textarea') el.value = el.getAttribute('value') || '';
    renderChildren(node.content || node, el, scope, isSvg);
    out.appendChild(el);
  }

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (p) {
    var next = typeof p === 'function' ? p(this.state) : p;
    this.state = Object.assign({}, this.state, next);
    if (this.__mx) this.__mx.schedule();
  };
  window.DCLogic = DCLogic;

  window.MX = {
    mount: function (Component, props) {
      var tpl = document.getElementById('mx-tpl');
      var root = document.getElementById('mx-root');
      var comp = new Component(props || {});
      var pending = false, first = true;
      function render() {
        pending = false;
        handlers = [];
        var vals = comp.renderVals();
        var fresh = document.createElement('div');
        renderChildren(tpl.content, fresh, vals);
        morphdom(root, fresh, { childrenOnly: true });
        if (first) { first = false; if (comp.componentDidMount) comp.componentDidMount(); }
      }
      comp.__mx = { schedule: function () { if (!pending) { pending = true; requestAnimationFrame(render); } } };
      ['click', 'input', 'submit', 'keydown'].forEach(function (type) {
        root.addEventListener(type, function (e) {
          var t = e.target.closest && e.target.closest('[data-mx-' + type + ']');
          if (!t || !root.contains(t)) return;
          var fn = handlers[+t.getAttribute('data-mx-' + type)];
          if (fn) { if (type === 'submit') e.preventDefault(); fn(e); }
        });
      });
      render();
      return comp;
    }
  };
})();
