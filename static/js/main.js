document.addEventListener("DOMContentLoaded", () => {
  // DOM-Elemente
  const contextSwitcher = document.getElementById("context-switcher");
  const addContextBtn = document.getElementById("add-context-btn");
  const editContextBtn = document.getElementById("edit-context-btn");
  const setPathBtn = document.getElementById("set-path-btn"); // Neuer Button
  const mainTitle = document.getElementById("main-title");

  // Modal-Elemente
  const mainModal = document.getElementById("main-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalInput = document.getElementById("modal-input");
  const modalConfirm = document.getElementById("modal-confirm-btn");
  const modalCancel = document.getElementById("modal-cancel-btn");

  let currentContext = { id: "default", name: "Default" };
  let allContexts = [];
  let modalResolve = null;

  // --- Modal-Funktionen (verallgemeinert) ---
  function showModal({ title, value, placeholder, confirmText }) {
    modalTitle.textContent = title;
    modalInput.value = value;
    modalInput.placeholder = placeholder || "";
    modalConfirm.textContent = confirmText || "Speichern";

    mainModal.classList.remove("opacity-0", "pointer-events-none");
    modalInput.focus();
    modalInput.select();

    return new Promise((resolve) => {
      modalResolve = resolve;
    });
  }

  function handleConfirm() {
    const inputValue = modalInput.value.trim();
    if (inputValue) {
      if (modalResolve) modalResolve(inputValue);
      hideModal();
    } else {
      modalInput.classList.add("border-red-500", "animate-shake");
      setTimeout(
        () => modalInput.classList.remove("border-red-500", "animate-shake"),
        800
      );
    }
  }

  function hideModal() {
    mainModal.classList.add("opacity-0", "pointer-events-none");
    if (modalResolve) modalResolve(null); // Bei Abbruch null zurückgeben
    modalResolve = null;
  }

  // Event-Listener für das Modal
  modalConfirm.addEventListener("click", handleConfirm);
  modalCancel.addEventListener("click", hideModal);
  modalInput.addEventListener("keydown", (e) => {
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
    const newContextName = await showModal({
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
    const newName = await showModal({
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

  // --- EVENT-LISTENER FÜR DEN DATENPFAD ---
  setPathBtn.addEventListener("click", async () => {
    const newPath = await showModal({
      title: "Datenpfad ändern",
      value: "",
      placeholder: "z.B. C:\\Users\\DeinName\\Dokumente\\DailyData",
      confirmText: "Ändern",
    });

    if (newPath) {
      try {
        const response = await fetch("/set_data_path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: newPath }),
        });

        if (response.ok) {
          alert("Datenpfad erfolgreich geändert. Die Seite wird neu geladen.");
          window.location.reload();
        } else {
          const error = await response.json();
          alert(`Fehler: ${error.message}`);
        }
      } catch (err) {
        alert(
          "Ein Fehler ist aufgetreten. Der Pfad konnte nicht geändert werden."
        );
      }
    }
  });

  loadContexts();
});
