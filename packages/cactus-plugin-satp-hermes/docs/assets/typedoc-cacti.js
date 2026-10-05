// Cacti design system: light is the default theme, matching the MkDocs site.
// Dark (or OS) stays available in Settings, and a saved choice is kept.
try {
  if (!localStorage.getItem("tsd-theme")) {
    localStorage.setItem("tsd-theme", "light");
    document.documentElement.dataset.theme = "light";
    const select = document.getElementById("tsd-theme");
    if (select) select.value = "light";
  }
} catch {
  // localStorage unavailable: fall back to TypeDoc's OS-based default
}
