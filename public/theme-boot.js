// Runs before the first paint so a returning Commander user never sees a
// flash of the parchment skin. Kept as an external file (rather than an inline
// script) so the production CSP can forbid inline script entirely.
(function () {
  var mode = 'pixel-center';
  try {
    if (localStorage.getItem('design-mode') === 'commander') mode = 'commander';
  } catch (e) {
    /* storage unavailable — keep the default */
  }
  document.documentElement.classList.remove('mode-commander', 'mode-pixel-center');
  document.documentElement.classList.add('mode-' + mode);
})();
