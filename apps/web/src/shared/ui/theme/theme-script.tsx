import "server-only";

// Injected in <head> to set theme before paint.
// Uses localStorage key: "theme" = "light" | "dark" | "system"
export function ThemeScript() {
  const code = `
  (function() {
    try {
      var key = "theme";
      var stored = localStorage.getItem(key) || "system";
      var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      var theme = stored === "system" ? (prefersDark ? "dark" : "light") : stored;
      document.documentElement.dataset.theme = theme;
    } catch (e) {}
  })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
