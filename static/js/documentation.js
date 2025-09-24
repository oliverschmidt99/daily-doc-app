window.addEventListener("contextReady", (e) => {
  const currentContext = e.detail.context;
  // Stellt sicher, dass dieses Modul nur auf Seiten läuft, wo die benötigten Elemente existieren
  if (document.getElementById("main-content-panel")) {
    initializeDocumentationModule(currentContext);
  }
});

async function initializeDocumentationModule(context) {
  let allData = {};
  let appData = {};
  let tagCategoryMap = {};

  const dom = {
    datePicker: document.getElementById("date-picker"),
    currentDateDisplay: document.getElementById("current-date-display"),
    statusSelect: document.getElementById("status-select"),
    startTimeInput: document.getElementById("start-time"),
    endTimeInput: document.getElementById("end-time"),
    breakTimeInput: document.getElementById("break-time"),
    overtimeDisplay: document.getElementById("overtime-display"),
    dailyEntriesContainer: document.getElementById("daily-entries-container"),
    saveDayBtn: document.getElementById("save-day-btn"),
    addEntryBtn: document.getElementById("add-entry-btn"),
    prevDayBtn: document.getElementById("prev-day-btn"),
    nextDayBtn: document.getElementById("next-day-btn"),
    tagLibrary: document.getElementById("tag-library"),
    newTagInput: document.getElementById("new-tag-input"),
    newTagCategorySelect: document.getElementById("new-tag-category"),
    addNewTagBtn: document.getElementById("add-new-tag-btn"),
    notificationEl: document.getElementById("notification"),
  };

  const CATEGORIES = [
    "Technik",
    "Analyse",
    "Dokumentation",
    "Organisation",
    "Soziales",
    "Sonstiges",
  ];
  const CATEGORY_CHART_COLORS = {
    Technik: "rgba(239, 68, 68, 0.8)",
    Analyse: "rgba(59, 130, 246, 0.8)",
    Dokumentation: "rgba(245, 158, 11, 0.8)",
    Organisation: "rgba(16, 185, 129, 0.8)",
    Soziales: "rgba(139, 92, 246, 0.8)",
    Sonstiges: "rgba(107, 114, 128, 0.8)",
  };

  const decimalToHHMM = (decimalHours) => {
    if (isNaN(decimalHours) || !isFinite(decimalHours)) return "00:00";
    const sign = decimalHours < 0 ? "-" : "";
    const absHours = Math.abs(decimalHours);
    const h = Math.floor(absHours);
    const m = Math.round((absHours - h) * 60);
    return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  const hhmmToDecimal = (timeString) => {
    if (typeof timeString !== "string" || !timeString.includes(":")) return 0;
    const [h, m] = timeString.split(":").map(Number);
    return isNaN(h) || isNaN(m) ? 0 : h + m / 60;
  };
  const objectToHHMM = (timeObj) => {
    if (!timeObj || (timeObj.h === null && timeObj.m === null)) return "";
    const h = String(timeObj.h || 0).padStart(2, "0");
    const m = String(timeObj.m || 0).padStart(2, "0");
    return `${h}:${m}`;
  };
  const hhmmToObject = (timeString) => {
    if (typeof timeString !== "string" || !timeString.includes(":"))
      return { h: null, m: null };
    const [h, m] = timeString.split(":").map(Number);
    return { h: isNaN(h) ? null : h, m: isNaN(m) ? null : m };
  };
  const formatTimeInput = (event) => {
    let value = event.target.value.trim();
    if (!value) return;
    let parts = value.split(":");
    let hours = parts[0] ? parts[0].padStart(2, "0") : "00";
    let minutes = parts[1] ? parts[1].padStart(2, "0") : "00";
    if (!value.includes(":")) {
      if (value.length <= 2) {
        hours = value.padStart(2, "0");
        minutes = "00";
      }
    }
    event.target.value = `${hours}:${minutes}`;
  };

  async function init() {
    await loadDataFromServer();
    populateCategorySelect();
    renderTagLibrary();
    setupEventListeners();
    const today = new Date().toISOString().split("T")[0];
    dom.datePicker.value = today;
    loadDay(today);
    checkPendingTodos();
  }

  function setupEventListeners() {
    dom.datePicker.addEventListener("change", () =>
      loadDay(dom.datePicker.value)
    );
    dom.saveDayBtn.addEventListener("click", saveCurrentDay);
    dom.addEntryBtn.addEventListener("click", () => renderDailyEntry());
    dom.prevDayBtn.addEventListener("click", () => changeDay(-1));
    dom.nextDayBtn.addEventListener("click", () => changeDay(1));
    dom.addNewTagBtn.addEventListener("click", addNewTag);
    dom.newTagInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addNewTag();
    });

    [dom.startTimeInput, dom.endTimeInput, dom.breakTimeInput].forEach(
      (input) => {
        if (input) {
          input.addEventListener("input", calculateAndDisplayOvertime);
          input.addEventListener("blur", formatTimeInput);
        }
      }
    );
  }

  function showNotification(message, isError = false) {
    dom.notificationEl.textContent = message;
    dom.notificationEl.classList.toggle("bg-green-500", !isError);
    dom.notificationEl.classList.toggle("bg-red-500", isError);
    dom.notificationEl.classList.remove("opacity-0", "translate-x-full");
    setTimeout(() => {
      dom.notificationEl.classList.add("opacity-0", "translate-x-full");
    }, 3000);
  }

  async function loadDataFromServer() {
    try {
      const response = await fetch(`/load/${context}`);
      allData = await response.json();
      appData = allData.appData || {};
      tagCategoryMap = allData.tagCategoryMap || {};
    } catch (e) {
      showNotification("Keine Verbindung zum Server.", true);
    }
  }

  async function saveData() {
    allData.appData = appData;
    allData.tagCategoryMap = tagCategoryMap;
    try {
      await fetch(`/save/${context}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allData),
      });
      showNotification("Gespeichert!", false);
    } catch (e) {
      showNotification("Speichern fehlgeschlagen.", true);
    }
  }

  function changeDay(offset) {
    const currentDate = new Date(dom.datePicker.value);
    currentDate.setUTCDate(currentDate.getUTCDate() + offset);
    dom.datePicker.value = currentDate.toISOString().split("T")[0];
    loadDay(dom.datePicker.value);
  }

  function loadDay(dateString) {
    dom.currentDateDisplay.textContent = new Date(
      dateString + "T00:00:00"
    ).toLocaleDateString("de-DE", { day: "numeric", month: "long" });
    dom.dailyEntriesContainer.innerHTML = "";
    const dayData = appData[dateString] || {
      entries: [],
      status: "dokumentiert",
      breakTime: { h: 0, m: 45 },
    };

    dom.statusSelect.value = dayData.status || "dokumentiert";
    dom.startTimeInput.value = objectToHHMM(dayData.startTime);
    dom.endTimeInput.value = objectToHHMM(dayData.endTime);
    dom.breakTimeInput.value = objectToHHMM(dayData.breakTime);

    (dayData.entries || []).forEach((e) => renderDailyEntry(e));
    if ((dayData.entries || []).length === 0) renderDailyEntry();

    calculateAndDisplayOvertime();
  }

  async function saveCurrentDay() {
    const dateString = dom.datePicker.value;
    const dailyEntries = [];
    dom.dailyEntriesContainer
      .querySelectorAll(".daily-entry-item")
      .forEach((item) => {
        const tagNames = Array.from(item.querySelectorAll(".tag-badge")).map(
          (b) => b.dataset.tagName
        );
        const time = hhmmToDecimal(
          item.querySelector(".entry-time-input").value
        );
        const note = item.querySelector(".entry-note-input").value.trim();
        if (tagNames.length > 0 || note || time > 0) {
          dailyEntries.push({ tagNames, time, note });
        }
      });

    if (!appData[dateString]) appData[dateString] = {};

    appData[dateString].entries = dailyEntries;
    appData[dateString].status = dom.statusSelect.value;
    appData[dateString].startTime = hhmmToObject(dom.startTimeInput.value);
    appData[dateString].endTime = hhmmToObject(dom.endTimeInput.value);
    appData[dateString].breakTime = hhmmToObject(dom.breakTimeInput.value);

    await saveData();
  }

  function calculateAndDisplayOvertime() {
    const startMins = hhmmToDecimal(dom.startTimeInput.value) * 60;
    const endMins = hhmmToDecimal(dom.endTimeInput.value) * 60;
    const breakMins = hhmmToDecimal(dom.breakTimeInput.value) * 60;
    if (endMins <= startMins) {
      dom.overtimeDisplay.textContent = "00:00 h";
      return;
    }
    const workedMins = endMins - startMins - breakMins;
    dom.overtimeDisplay.textContent = `${decimalToHHMM(workedMins / 60)} h`;
  }

  function renderDailyEntry(entry = { tagNames: [], time: 0, note: "" }) {
    const el = document.createElement("div");
    el.className =
      "daily-entry-item p-3 rounded-lg bg-gray-50 border border-gray-200";
    el.innerHTML = `<div class="flex items-start gap-3"><div class="flex-grow"><div class="selected-tags-container flex flex-wrap mb-2"></div><div class="relative"><input type="text" class="tag-search-input w-full rounded-md border-gray-300 shadow-sm p-1.5" placeholder="+ Tag hinzufügen..."><div class="autocomplete-suggestions absolute w-full bg-white border rounded-md z-10 hidden"></div></div></div><div class="flex items-center"><input type="text" value="${decimalToHHMM(
      entry.time || 0
    )}" class="entry-time-input w-20 text-center rounded-md border-gray-300 p-1" placeholder="hh:mm"><span class="text-gray-500 ml-1">h</span><button type="button" class="remove-entry-btn text-red-500 hover:text-red-700 font-bold text-xl ml-2">&times;</button></div></div><div class="mt-2"><input type="text" class="entry-note-input block w-full rounded-md border-gray-200 shadow-sm p-1.5" placeholder="Notiz..." value="${
      entry.note || ""
    }"></div>`;
    el.querySelector(".selected-tags-container").append(
      ...(entry.tagNames || []).map(createTagBadge)
    );
    setupEntryEventListeners(el);
    dom.dailyEntriesContainer.appendChild(el);
  }

  function setupEntryEventListeners(el) {
    el.querySelector(".entry-time-input").addEventListener(
      "blur",
      formatTimeInput
    );
    el.querySelector(".remove-entry-btn").addEventListener("click", () => {
      if (dom.dailyEntriesContainer.children.length > 1) el.remove();
      else
        showNotification("Letzter Eintrag kann nicht gelöscht werden.", true);
    });
    const searchInput = el.querySelector(".tag-search-input");
    const suggestionsContainer = el.querySelector(".autocomplete-suggestions");
    searchInput.addEventListener("input", () =>
      handleTagAutocomplete(searchInput, suggestionsContainer, el)
    );
    document.addEventListener("click", (e) => {
      if (!el.contains(e.target)) suggestionsContainer.innerHTML = "";
    });
  }

  function handleTagAutocomplete(input, suggestions, entryEl) {
    const q = input.value.toLowerCase();
    suggestions.innerHTML = "";
    if (!q) {
      suggestions.classList.add("hidden");
      return;
    }
    const existing = new Set(
      Array.from(entryEl.querySelectorAll(".tag-badge")).map(
        (b) => b.dataset.tagName
      )
    );
    const filtered = Object.keys(tagCategoryMap)
      .filter((tag) => tag.toLowerCase().includes(q) && !existing.has(tag))
      .slice(0, 5);

    filtered.forEach((tag) => {
      const item = document.createElement("a");
      item.href = "#";
      item.className = "block p-2 hover:bg-gray-100";
      item.textContent = tag;
      item.onclick = (e) => {
        e.preventDefault();
        addTagToEntry(tag, entryEl);
        input.value = "";
        suggestions.innerHTML = "";
        suggestions.classList.add("hidden");
      };
      suggestions.appendChild(item);
    });
    suggestions.classList.toggle("hidden", filtered.length === 0);
  }

  function addTagToEntry(tagName, entryEl) {
    entryEl
      .querySelector(".selected-tags-container")
      .appendChild(createTagBadge(tagName));
  }

  function createTagBadge(tagName) {
    const b = document.createElement("span");
    b.className = "tag-badge text-xs";
    b.textContent = tagName;
    b.dataset.tagName = tagName;
    b.style.backgroundColor = tagCategoryMap[tagName]
      ? CATEGORY_CHART_COLORS[tagCategoryMap[tagName]]
      : "#6c757d";
    const r = document.createElement("span");
    r.className = "tag-badge-remove";
    r.innerHTML = "&times;";
    r.onclick = () => b.remove();
    b.appendChild(r);
    return b;
  }

  function populateCategorySelect() {
    if (!dom.newTagCategorySelect) return;
    dom.newTagCategorySelect.innerHTML = CATEGORIES.map(
      (c) => `<option value="${c}">${c}</option>`
    ).join("");
  }

  function renderTagLibrary() {
    if (!dom.tagLibrary) return;
    dom.tagLibrary.innerHTML = "";
    Object.keys(tagCategoryMap)
      .sort()
      .forEach((tag) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className =
          "tag-button text-sm font-medium py-1 px-3 rounded-full";
        button.textContent = tag;
        button.style.backgroundColor = tagCategoryMap[tag]
          ? CATEGORY_CHART_COLORS[tagCategoryMap[tag]]
          : "rgba(107, 114, 128, 0.8)";
        button.title = tagCategoryMap[tag];
        dom.tagLibrary.appendChild(button);
      });
  }

  async function addNewTag() {
    const tagName = dom.newTagInput.value.trim();
    if (tagName && !tagCategoryMap[tagName]) {
      tagCategoryMap[tagName] = dom.newTagCategorySelect.value;
      renderTagLibrary();
      await saveData();
      showNotification(`Tag "${tagName}" hinzugefügt.`);
      dom.newTagInput.value = "";
    } else if (tagName) {
      showNotification(`Tag "${tagName}" existiert bereits.`, true);
    }
  }

  function checkPendingTodos() {
    window.addEventListener("addTodoToDoku", async () => {
      const pendingTodo = localStorage.getItem("pendingTodo");
      if (pendingTodo) {
        const todo = JSON.parse(pendingTodo);

        const today = new Date().toISOString().split("T")[0];
        if (dom.datePicker.value !== today) {
          loadDay(today);
          dom.datePicker.value = today;
        }

        renderDailyEntry({
          tagNames: todo.tags || [],
          time: 0.25,
          note: `Aus To-Do: "${todo.text}"`,
        });
        showNotification(`"${todo.text}" zur Doku hinzugefügt.`, false);
        localStorage.removeItem("pendingTodo");
        await saveCurrentDay();
      }
    });
  }

  init();
}
