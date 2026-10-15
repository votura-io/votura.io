/* Votura: apply the visitor's saved theme before the page paints.
 * Loaded without defer on purpose; the switcher itself lives in main.js. */
(function () {
  try {
    var saved = window.localStorage.getItem('votura-theme');
    if (saved === 'tribar' || saved === 'monolith' || saved === 'blueprint') {
      document.documentElement.setAttribute('data-brand', saved);
    }
  } catch (error) {
    /* Storage unavailable (private mode, blocked site data): keep the default theme. */
  }
})();
