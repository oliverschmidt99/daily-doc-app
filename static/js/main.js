document.addEventListener("DOMContentLoaded", () => {
  const contextSwitcher = document.getElementById("context-switcher");
  const addContextBtn = document.getElementById("add-context-btn");
  let currentContext = "default";

  async function loadContexts() {
    try {
      const response = await fetch("/contexts");
      const contexts = await response.json();
      currentContext =
        localStorage.getItem("selectedContext") || contexts[0] || "default";

      contextSwitcher.innerHTML = contexts
        .map(
          (c) =>
            `<option value="${c}" ${c === currentContext ? "selected" : ""}>${
              c.charAt(0).toUpperCase() + c.slice(1)
            }</option>`
        )
        .join("");

      if (!contexts.includes(currentContext) && contexts.length > 0) {
        currentContext = contexts[0];
        localStorage.setItem("selectedContext", currentContext);
      }
      // Dispatch a custom event to notify other scripts that the context is ready
      window.dispatchEvent(
        new CustomEvent("contextReady", { detail: { context: currentContext } })
      );
    } catch (e) {
      console.error("Could not load contexts.", e);
      // Fallback
      contextSwitcher.innerHTML = `<option value="default">Default</option>`;
      window.dispatchEvent(
        new CustomEvent("contextReady", { detail: { context: "default" } })
      );
    }
  }

  contextSwitcher.addEventListener("change", () => {
    const newContext = contextSwitcher.value;
    localStorage.setItem("selectedContext", newContext);
    window.location.reload();
  });

  addContextBtn.addEventListener("click", () => {
    const newContextName = prompt(
      "Wie soll die neue Doku heißen? (z.B. Feuerwehr, Arbeit)"
    );
    if (newContextName && newContextName.trim()) {
      const safeName = newContextName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, ""); // Sanitize name
      if (safeName) {
        localStorage.setItem("selectedContext", safeName);
        window.location.reload();
      } else {
        alert("Ungültiger Name. Bitte nur Buchstaben und Zahlen verwenden.");
      }
    }
  });

  loadContexts();
});
