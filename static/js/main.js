document.addEventListener("DOMContentLoaded", () => {
  // DOM-Elemente
  const contextSwitcher = document.getElementById("context-switcher");
  const addContextBtn = document.getElementById("add-context-btn");
  const editContextBtn = document.getElementById("edit-context-btn");
  const mainTitle = document.getElementById("main-title");

  // Modal-Elemente
  const contextModal = document.getElementById("context-modal");
  const contextModalTitle = document.getElementById("context-modal-title");
  const contextModalInput = document.getElementById("context-modal-input");
  const contextModalConfirm = document.getElementById("context-modal-confirm");
  const contextModalCancel = document.getElementById("context-modal-cancel");

  let currentContext = { id: "default", name: "Default" };
  let allContexts = [];
  let modalResolve = null;

  // --- Modal-Funktionen ---
  function showContextModal({ title, value, placeholder, confirmText }) {
    contextModalTitle.textContent = title;
    contextModalInput.value = value;
    contextModalInput.placeholder = placeholder || "";
    contextModalConfirm.textContent = confirmText || "Speichern";

    contextModal.classList.remove("opacity-0", "pointer-events-none");
    contextModalInput.focus();
    contextModalInput.select();

    return new Promise((resolve) => {
      modalResolve = resolve;
    });
  }

  function handleConfirm() {
    const inputValue = contextModalInput.value.trim();
    if (inputValue) {
      if (modalResolve) modalResolve(inputValue);
      hideModal();
    } else {
      contextModalInput.classList.add("border-red-500", "animate-shake");
      setTimeout(
        () =>
          contextModalInput.classList.remove("border-red-500", "animate-shake"),
        800
      );
    }
  }

  function hideModal() {
    contextModal.classList.add("opacity-0", "pointer-events-none");
    if (modalResolve) modalResolve(null); // Bei Abbruch null zurückgeben
    modalResolve = null;
  }

  // Event-Listener für das Modal
  contextModalConfirm.addEventListener("click", handleConfirm);
  contextModalCancel.addEventListener("click", hideModal);
  contextModalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") hideModal();
  });

  // --- Hauptlogik ---
  async function loadContexts() {
    try {
      const response = await fetch("/contexts");
      allContexts = await response.json();

      let selectedContextId =
        localStorage.getItem("selectedContextId") ||
        (allContexts.length > 0 ? allContexts[0].id : "default");

      currentContext = allContexts.find((c) => c.id === selectedContextId) ||
        allContexts[0] || { id: "default", name: "Default" };

      contextSwitcher.innerHTML = allContexts
        .map(
          (c) =>
            `<option value="${c.id}" ${
              c.id === currentContext.id ? "selected" : ""
            }>${c.name}</option>`
        )
        .join("");

      mainTitle.textContent = currentContext.name;

      window.dispatchEvent(
        new CustomEvent("contextReady", {
          detail: { context: currentContext.id },
        })
      );
    } catch (e) {
      console.error("Kontexte konnten nicht geladen werden.", e);
      contextSwitcher.innerHTML = `<option value="default">Default</option>`;
      mainTitle.textContent = "Tägliche Dokumentation";
      window.dispatchEvent(
        new CustomEvent("contextReady", { detail: { context: "default" } })
      );
    }
  }

  contextSwitcher.addEventListener("change", () => {
    const newContextId = contextSwitcher.value;
    localStorage.setItem("selectedContextId", newContextId);
    window.location.reload();
  });

  addContextBtn.addEventListener("click", async () => {
    const newContextName = await showContextModal({
      title: "Neue Doku erstellen",
      value: "",
      placeholder: "Name der Doku (z.B. Arbeit)",
      confirmText: "Erstellen",
    });

    if (newContextName) {
      const safeId = newContextName.toLowerCase().replace(/[^a-z0-9]/gi, "");
      if (safeId) {
        if (allContexts.some((c) => c.id === safeId)) {
          alert(
            "Eine Dokumentation mit diesem Namen (oder einem sehr ähnlichen) existiert bereits."
          );
          return;
        }

        try {
          const response = await fetch("/create_context", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: safeId, name: newContextName }),
          });

          if (response.ok) {
            localStorage.setItem("selectedContextId", safeId);
            window.location.reload();
          } else {
            const error = await response.json();
            alert(`Fehler: ${error.message}`);
          }
        } catch (err) {
          alert(
            "Ein Fehler ist aufgetreten. Die Doku konnte nicht erstellt werden."
          );
        }
      } else {
        alert("Ungültiger Name. Bitte nur Buchstaben und Zahlen verwenden.");
      }
    }
  });

  editContextBtn.addEventListener("click", async () => {
    const newName = await showContextModal({
      title: "Doku umbenennen",
      value: currentContext.name,
      confirmText: "Umbenennen",
    });

    if (newName && newName !== currentContext.name) {
      try {
        const loadResponse = await fetch(`/load/${currentContext.id}`);
        if (!loadResponse.ok)
          throw new Error("Daten zum Umbenennen konnten nicht geladen werden.");
        const data = await loadResponse.json();

        data.contextName = newName;

        const saveResponse = await fetch(`/save/${currentContext.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (saveResponse.ok) {
          window.location.reload();
        } else {
          alert("Der Name konnte nicht geändert werden.");
        }
      } catch (err) {
        console.error("Fehler beim Umbenennen:", err);
        alert("Ein Fehler ist aufgetreten.");
      }
    }
  });

  loadContexts();
});
