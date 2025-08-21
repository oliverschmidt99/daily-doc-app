document.addEventListener("DOMContentLoaded", async () => {
  // --- Globale Variablen & Konstanten ---
  let appData = {};
  let tagCategoryMap = {};
  let barChart, radarChart;
  const CATEGORIES = [
    "Technik",
    "Analyse",
    "Dokumentation",
    "Organisation",
    "Soziales",
    "Sonstiges",
  ];
  const RADAR_CATEGORIES = [
    "Technik",
    "Analyse",
    "Dokumentation",
    "Organisation",
    "Soziales",
  ];
  const CATEGORY_BACKGROUND_COLORS = {
    Technik: "rgba(239, 68, 68, 0.1)",
    Analyse: "rgba(59, 130, 246, 0.1)",
    Dokumentation: "rgba(245, 158, 11, 0.1)",
    Organisation: "rgba(16, 185, 129, 0.1)",
    Soziales: "rgba(139, 92, 246, 0.1)",
    Sonstiges: "rgba(107, 114, 128, 0.1)",
  };
  const CATEGORY_CHART_COLORS = {
    Technik: "rgba(239, 68, 68, 0.8)",
    Analyse: "rgba(59, 130, 246, 0.8)",
    Dokumentation: "rgba(245, 158, 11, 0.8)",
    Organisation: "rgba(16, 185, 129, 0.8)",
    Soziales: "rgba(139, 92, 246, 0.8)",
    Sonstiges: "rgba(107, 114, 128, 0.8)",
  };
  const DAILY_WORK_HOURS = {
    1: 8.25,
    2: 8.25,
    3: 8.25,
    4: 8.25,
    5: 7.0,
    6: 0,
    0: 0,
  };

  // --- DOM-Elemente ---
  const dom = {
    datePicker: document.getElementById("date-picker"),
    currentDateDisplay: document.getElementById("current-date-display"),
    statusSelect: document.getElementById("status-select"),
    workHoursInput: document.getElementById("work-hours"),
    dailyEntriesContainer: document.getElementById("daily-entries-container"),
    totalHoursEl: document.getElementById("total-hours"),
    saveDayBtn: document.getElementById("save-day-btn"),
    tagLibrary: document.getElementById("tag-library"),
    notificationEl: document.getElementById("notification"),
    mainContentPanel: document.getElementById("main-content-panel"),
    tagLibraryContainer: document.getElementById("tag-library-container"),
    prevDayBtn: document.getElementById("prev-day-btn"),
    nextDayBtn: document.getElementById("next-day-btn"),
    addEntryBtn: document.getElementById("add-entry-btn"),
  };

  // --- Initialisierung ---
  async function init() {
    await loadDataFromServer();
    initializeDefaultTags();
    renderTagLibrary();
    setupEventListeners();
    const today = new Date().toISOString().split("T")[0];
    initCharts();
    loadDay(today);
    checkPendingTodos();
  }

  function setupEventListeners() {
    if (!dom.datePicker) return; // Sicherheits-Abbruch, falls HTML nicht stimmt
    dom.datePicker.addEventListener("change", () =>
      loadDay(dom.datePicker.value)
    );
    dom.statusSelect.addEventListener("change", handleStatusChange);
    dom.saveDayBtn.addEventListener("click", saveCurrentDay);
    dom.prevDayBtn.addEventListener("click", () => changeDay(-1));
    dom.nextDayBtn.addEventListener("click", () => changeDay(1));
    dom.addEntryBtn.addEventListener("click", () => renderDailyEntry());
    document
      .getElementById("generate-week-report")
      .addEventListener("click", () => handleGenerateReport("week"));
    document
      .getElementById("generate-month-report")
      .addEventListener("click", () => handleGenerateReport("month"));
    document
      .getElementById("generate-all-report")
      .addEventListener("click", () => handleGenerateReport("all"));
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
      const response = await fetch("/load");
      const data = await response.json();
      appData = data.appData || {};
      tagCategoryMap = data.tagCategoryMap || {};
    } catch (e) {
      showNotification("Keine Verbindung zum Server.", true);
    }
  }

  async function saveDataToServer() {
    try {
      await fetch("/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appData, tagCategoryMap }),
      });
      showNotification("Daten gespeichert!", false);
    } catch (e) {
      showNotification("Speichern fehlgeschlagen.", true);
    }
  }

  function initializeDefaultTags() {
    const defaultTags = {
      Messen: "Technik",
      Programmieren: "Technik",
      Simuliert: "Analyse",
      Analysieren: "Analyse",
      "Berechnen (Herleiten)": "Analyse",
      "Lesen von Dokumenten": "Analyse",
      Dokumentieren: "Dokumentation",
      "Tabellen ausfüllen": "Dokumentation",
      "Bachelorarbeit schreiben": "Dokumentation",
      Planung: "Organisation",
      Meetings: "Organisation",
      "System einrichten": "Organisation",
      Orga: "Dokumentation",
      Soziales: "Soziales",
      "Mitarbeiter gespräch": "Soziales",
    };
    for (const [tag, category] of Object.entries(defaultTags)) {
      if (!tagCategoryMap[tag]) tagCategoryMap[tag] = category;
    }
  }

  function changeDay(offset) {
    const currentDate = new Date(dom.datePicker.value + "T00:00:00");
    currentDate.setDate(currentDate.getDate() + offset);
    loadDay(currentDate.toISOString().split("T")[0]);
  }

  function loadDay(dateString) {
    dom.datePicker.value = dateString;
    dom.currentDateDisplay.textContent = new Date(
      dateString + "T00:00:00"
    ).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    dom.dailyEntriesContainer.innerHTML = "";
    const dayOfWeek = new Date(dateString + "T00:00:00").getDay();
    const defaultWorkHours = DAILY_WORK_HOURS[dayOfWeek] ?? 8;
    const dayData = appData[dateString] || {
      status: "dokumentiert",
      workHours: defaultWorkHours,
      entries: [],
    };

    if (dayData.tags && !dayData.entries) {
      dayData.entries = dayData.tags.map((tag) => ({
        tagNames: [tag.name],
        time: tag.time,
        note: tag.note,
      }));
      delete dayData.tags;
    }

    appData[dateString] = dayData;
    dom.statusSelect.value = dayData.status;
    dom.workHoursInput.value = dayData.workHours;
    (dayData.entries || []).forEach((entry) => renderDailyEntry(entry));
    if ((dayData.entries || []).length === 0) renderDailyEntry();
    updateTotals();
    handleStatusChange();
  }

  function saveCurrentDay() {
    const dateString = dom.datePicker.value;
    const dailyEntries = [];
    dom.dailyEntriesContainer
      .querySelectorAll(".daily-entry-item")
      .forEach((item) => {
        const tagNames = Array.from(item.querySelectorAll(".tag-badge")).map(
          (badge) => badge.dataset.tagName
        );
        const time =
          parseFloat(item.querySelector(".entry-time-input").value) || 0;
        const note = item.querySelector(".entry-note-input").value.trim();
        if (tagNames.length > 0 || note)
          dailyEntries.push({ tagNames, time, note });
      });
    appData[dateString] = {
      status: dom.statusSelect.value,
      workHours: parseFloat(dom.workHoursInput.value) || 8,
      entries: dailyEntries,
    };
    saveDataToServer();
  }

  function renderDailyEntry(entry = { tagNames: [], time: 0, note: "" }) {
    const entryEl = document.createElement("div");
    entryEl.className =
      "daily-entry-item p-3 rounded-lg bg-gray-50 border border-gray-200";
    entryEl.innerHTML = `<div class="flex items-start gap-3"><div class="flex-grow"><div class="selected-tags-container flex flex-wrap items-center"></div><div class="relative mt-2"><input type="text" class="tag-search-input w-full rounded-md border-gray-300 shadow-sm p-1.5" placeholder="+ Tag hinzufügen..."><div class="autocomplete-suggestions hidden"></div></div></div><div class="flex items-center"><input type="number" value="${
      entry.time || 0
    }" min="0" step="0.25" class="entry-time-input w-20 text-center rounded-md border-gray-300 shadow-sm p-1"><span class="text-gray-500 ml-1">h</span><button type="button" class="remove-entry-btn text-red-500 hover:text-red-700 font-bold text-xl ml-2">&times;</button></div></div><div class="mt-2"><input type="text" class="entry-note-input block w-full rounded-md border-gray-200 shadow-sm p-1.5" placeholder="Notiz für diesen Eintrag..." value="${
      entry.note || ""
    }"></div>`;
    const tagsContainer = entryEl.querySelector(".selected-tags-container");
    (entry.tagNames || []).forEach((tagName) => {
      tagsContainer.appendChild(createTagBadge(tagName));
    });
    setupEntryEventListeners(entryEl);
    dom.dailyEntriesContainer.appendChild(entryEl);
  }

  function setupEntryEventListeners(entryEl) {
    entryEl
      .querySelector(".entry-time-input")
      .addEventListener("input", updateTotals);
    entryEl.querySelector(".remove-entry-btn").addEventListener("click", () => {
      if (dom.dailyEntriesContainer.children.length > 1) {
        entryEl.remove();
        updateTotals();
      } else {
        showNotification("Letzter Eintrag kann nicht gelöscht werden.", true);
      }
    });
  }

  function createTagBadge(tagName) {
    const badge = document.createElement("div");
    badge.className = "tag-badge";
    badge.textContent = tagName;
    badge.dataset.tagName = tagName;
    badge.style.backgroundColor =
      CATEGORY_CHART_COLORS[tagCategoryMap[tagName]] || "#6B7280";
    const removeBtn = document.createElement("span");
    removeBtn.className = "tag-badge-remove";
    removeBtn.innerHTML = "&times;";
    removeBtn.onclick = () => {
      badge.remove();
      updateTotals();
    };
    badge.appendChild(removeBtn);
    return badge;
  }

  function renderTagLibrary() {
    if (!dom.tagLibrary) return;
    dom.tagLibrary.innerHTML = "";
    Object.keys(tagCategoryMap)
      .sort()
      .forEach((tag) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = tag;
        button.style.backgroundColor =
          CATEGORY_CHART_COLORS[tagCategoryMap[tag]] || "#6B7280";
        button.className =
          "tag-button text-sm font-medium py-1 px-3 rounded-full";
        dom.tagLibrary.appendChild(button);
      });
  }

  function handleStatusChange() {
    const isDocumented = dom.statusSelect.value === "dokumentiert";
    dom.mainContentPanel.style.opacity = isDocumented ? "1" : "0.5";
    dom.mainContentPanel
      .querySelectorAll("input, textarea, button, select")
      .forEach((el) => (el.disabled = !isDocumented));
    dom.saveDayBtn.disabled = false;
    dom.tagLibraryContainer.style.opacity = isDocumented ? "1" : "0.5";
    updateBackgroundColor();
  }

  function updateTotals() {
    const total = Array.from(
      dom.dailyEntriesContainer.querySelectorAll(".entry-time-input")
    ).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
    dom.totalHoursEl.textContent = total.toFixed(2);
    updateBackgroundColor();
  }

  function updateBackgroundColor() {
    const categoryHours = CATEGORIES.reduce(
      (acc, cat) => ({ ...acc, [cat]: 0 }),
      {}
    );
    dom.dailyEntriesContainer
      .querySelectorAll(".daily-entry-item")
      .forEach((item) => {
        const time =
          parseFloat(item.querySelector(".entry-time-input").value) || 0;
        const tags = item.querySelectorAll(".tag-badge");
        if (tags.length > 0) {
          const timePerTag = time / tags.length;
          tags.forEach((badge) => {
            const category = tagCategoryMap[badge.dataset.tagName];
            if (category) categoryHours[category] += timePerTag;
          });
        }
      });
    let dominantCategory = null;
    let maxHours = 0;
    for (const [cat, hours] of Object.entries(categoryHours)) {
      if (hours > maxHours) {
        maxHours = hours;
        dominantCategory = cat;
      }
    }
    if (dominantCategory && dom.statusSelect.value === "dokumentiert") {
      dom.mainContentPanel.style.backgroundColor =
        CATEGORY_BACKGROUND_COLORS[dominantCategory];
    } else {
      dom.mainContentPanel.style.backgroundColor = "#ffffff";
    }
  }

  function checkPendingTodos() {
    const pendingTodo = localStorage.getItem("pendingTodo");
    if (pendingTodo) {
      const todo = JSON.parse(pendingTodo);
      if (!tagCategoryMap[todo.text]) {
        tagCategoryMap[todo.text] = "Sonstiges";
        renderTagLibrary();
        saveDataToServer();
      }
      renderDailyEntry({
        tagNames: [todo.text],
        time: 0.25,
        note: "Aus To-do-Liste übernommen",
      });
      updateTotals();
      showNotification(`"${todo.text}" zur Doku hinzugefügt.`, false);
      localStorage.removeItem("pendingTodo");
    }
  }

  function initCharts() {
    if (
      !document.getElementById("bar-chart") ||
      !document.getElementById("radar-chart")
    )
      return;
    const barCtx = document.getElementById("bar-chart").getContext("2d");
    barChart = new Chart(barCtx, {
      type: "bar",
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (c) => `${c.dataset.label}: ${c.formattedValue}h`,
            },
          },
        },
      },
    });
    const radarCtx = document.getElementById("radar-chart").getContext("2d");
    radarChart = new Chart(radarCtx, {
      type: "radar",
      data: { labels: RADAR_CATEGORIES },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { r: { beginAtZero: true, suggestedMax: 4 } },
      },
    });
  }

  function handleGenerateReport(periodType) {
    showNotification("Berichtsfunktion ist in Arbeit.", false);
  }

  // --- App starten ---
  init();
});
