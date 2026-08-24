/**
 * Instant Catalog "Visit Catalog" embed widget.
 *
 * Dropped onto a vendor's own site via:
 *   <script src="https://instantcatalog.app/widget.js"
 *           data-url="https://ypanda.instantcatalog.app/public/rugs-by-amit"
 *           data-text="Visit Catalog"
 *           data-color="#1a56db"
 *           data-position="bottom-right"
 *           data-mode="newtab"></script>
 *
 * data-url is the ONLY required attribute, and is always a fully-resolved
 * URL baked in at generation time by the dashboard (see catalogUrl.ts) —
 * this script never needs to know anything about subdomains/custom
 * domains, it just opens whatever URL it was given. Works identically
 * whether the vendor is on the shared domain, a branded subdomain, or
 * their own custom domain.
 *
 * No dependencies, no build step — this file is served as-is.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var url = script.getAttribute('data-url');
  if (!url) return;

  var text = script.getAttribute('data-text') || 'Visit Catalog';
  var color = script.getAttribute('data-color') || '#1a56db';
  var position = script.getAttribute('data-position') || 'bottom-right';
  var mode = script.getAttribute('data-mode') || 'newtab'; // 'newtab' | 'modal'
  var targetId = script.getAttribute('data-target'); // optional: id of a container for inline placement

  // Prefixed so nothing here can collide with the host site's own CSS.
  var PREFIX = 'qc-widget-';

  function injectStyles() {
    if (document.getElementById(PREFIX + 'styles')) return;
    var style = document.createElement('style');
    style.id = PREFIX + 'styles';
    style.textContent =
      '.' + PREFIX + 'btn{all:initial;box-sizing:border-box;display:inline-flex;align-items:center;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;font-weight:600;' +
      'padding:12px 22px;border-radius:9999px;cursor:pointer;color:#fff;text-decoration:none;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.18);border:none;transition:transform .15s ease,box-shadow .15s ease;}' +
      '.' + PREFIX + 'btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.24);}' +
      '.' + PREFIX + 'float{position:fixed;z-index:2147483000;}' +
      '.' + PREFIX + 'bottom-right{bottom:20px;right:20px;}' +
      '.' + PREFIX + 'bottom-left{bottom:20px;left:20px;}' +
      '.' + PREFIX + 'top-right{top:20px;right:20px;}' +
      '.' + PREFIX + 'top-left{top:20px;left:20px;}' +
      '.' + PREFIX + 'overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483001;' +
      'display:flex;align-items:center;justify-content:center;padding:20px;}' +
      '.' + PREFIX + 'modal{position:relative;width:100%;max-width:920px;height:85vh;background:#fff;' +
      'border-radius:14px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.35);}' +
      '.' + PREFIX + 'modal iframe{width:100%;height:100%;border:none;display:block;}' +
      '.' + PREFIX + 'close{all:initial;position:absolute;top:10px;right:10px;width:36px;height:36px;' +
      'border-radius:50%;background:#fff;border:none;cursor:pointer;font-size:20px;line-height:36px;' +
      'text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.25);z-index:1;font-family:sans-serif;color:#111;}';
    document.head.appendChild(style);
  }

  function openModal() {
    var overlay = document.createElement('div');
    overlay.className = PREFIX + 'overlay';
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    var modal = document.createElement('div');
    modal.className = PREFIX + 'modal';

    var close = document.createElement('button');
    close.className = PREFIX + 'close';
    close.innerHTML = '&times;';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', function () {
      document.body.removeChild(overlay);
    });

    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('title', text);

    modal.appendChild(close);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function handleClick(e) {
    if (mode === 'modal') {
      e.preventDefault();
      openModal();
    }
    // 'newtab' mode: let the anchor's own target="_blank" handle it
    // natively — no preventDefault, works even if JS partially fails.
  }

  function createButton() {
    var btn = document.createElement('a');
    btn.href = url;
    btn.className = PREFIX + 'btn';
    btn.style.backgroundColor = color;
    btn.textContent = text;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.addEventListener('click', handleClick);
    return btn;
  }

  injectStyles();
  var btn = createButton();

  var container = targetId ? document.getElementById(targetId) : null;
  if (container) {
    container.appendChild(btn);
  } else {
    btn.className += ' ' + PREFIX + 'float ' + PREFIX + position;
    document.body.appendChild(btn);
  }
})();
