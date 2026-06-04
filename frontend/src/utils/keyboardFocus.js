export function restoreKeyboardFocus(selector = "[data-keyboard-primary]") {
  window.requestAnimationFrame(() => {
    window.focus();

    const target =
      document.querySelector(selector) ||
      document.querySelector("input:not([disabled]), textarea:not([disabled]), select:not([disabled])");

    if (target && typeof target.focus === "function") {
      target.focus({ preventScroll: true });
      return;
    }

    if (!document.body.hasAttribute("tabindex")) {
      document.body.setAttribute("tabindex", "-1");
    }
    document.body.focus({ preventScroll: true });
  });
}

export function restoreFocusAfterNativeDialog(selector) {
  window.setTimeout(() => restoreKeyboardFocus(selector), 0);
  window.setTimeout(() => restoreKeyboardFocus(selector), 120);
  window.setTimeout(() => restoreKeyboardFocus(selector), 500);
  window.setTimeout(() => restoreKeyboardFocus(selector), 1200);
}
