document.addEventListener("DOMContentLoaded", async () => {
  // --- Globale Variablen & Konstanten ---
  let allData = {};
  let appData = {},
    tagCategoryMap = {};
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

  const dom = {
    datePicker: document.getElementById("date-picker"),
    currentDateDisplay: document.getElementById("current-date-display"),
    statusSelect: document.getElementById("status-select"),
    workHoursInput: document.getElementById("work-hours"),
    dailyEntriesContainer: document.getElementById("daily-entries-container"),
    totalHoursEl: document.getElementById("total-hours"),
    saveDayBtn: document.getElementById("save-day-btn"),
    tagLibrary: document.getElementById("tag-library"),
    newTagInput: document.getElementById("new-tag-input"),
    newTagCategorySelect: document.getElementById("new-tag-category"),
    addNewTagBtn: document.getElementById("add-new-tag-btn"),
    notificationEl: document.getElementById("notification"),
    mainContentPanel: document.getElementById("main-content-panel"),
    addEntryBtn: document.getElementById("add-entry-btn"),
    prevDayBtn: document.getElementById("prev-day-btn"),
    nextDayBtn: document.getElementById("next-day-btn"),
    diagramViewRadios: document.querySelectorAll('input[name="diagram-view"]'),
    weekViewControls: document.getElementById("week-view-controls"),
    dayViewControls: document.getElementById("day-view-controls"),
    diagramWeekPicker: document.getElementById("diagram-week-picker"),
    diagramDayPicker: document.getElementById("diagram-day-picker"),
    barChartTitle: document.getElementById("bar-chart-title"),
    radarChartTitle: document.getElementById("radar-chart-title"),
  };

  function decimalToHHMM(decimalHours) {
    if (isNaN(decimalHours) || decimalHours < 0) return "00:00";
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  function hhmmToDecimal(timeString) {
    if (typeof timeString !== "string" || !timeString.includes(":")) return 0;
    const [h, m] = timeString.split(":").map(Number);
    return isNaN(h) || isNaN(m) ? 0 : h + m / 60;
  }

  async function init() {
    await loadDataFromServer();
    initializeDefaultTags();
    populateCategorySelect();
    renderTagLibrary();
    setupEventListeners();
    const today = new Date().toISOString().split("T")[0];
    initCharts();
    setInitialDiagramDates();
    loadDay(today);
    checkPendingTodos();
  }

  function setupEventListeners() {
    dom.datePicker.addEventListener("change", () =>
      loadDay(dom.datePicker.value)
    );
    dom.statusSelect.addEventListener("change", handleStatusChange);
    dom.saveDayBtn.addEventListener("click", saveCurrentDay);
    dom.addEntryBtn.addEventListener("click", () => renderDailyEntry());
    dom.addNewTagBtn.addEventListener("click", addNewTag);
    dom.newTagInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addNewTag();
    });
    dom.prevDayBtn.addEventListener("click", () => changeDay(-1));
    dom.nextDayBtn.addEventListener("click", () => changeDay(1));
    dom.diagramViewRadios.forEach((radio) =>
      radio.addEventListener("change", handleDiagramViewChange)
    );
    dom.diagramWeekPicker.addEventListener("change", updateCharts);
    dom.diagramDayPicker.addEventListener("change", updateCharts);
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
      allData = data; // Store the whole data
      // Stellt sicher, dass die benötigten Schlüssel immer vorhanden sind
      appData = data.appData || {};
      tagCategoryMap = data.tagCategoryMap || {};
    } catch (e) {
      showNotification("Keine Verbindung zum Server.", true);
      appData = {};
      tagCategoryMap = {};
    }
  }

  async function saveDataToServer() {
    try {
      // We need to update the allData object before saving.
      allData.appData = appData;
      allData.tagCategoryMap = tagCategoryMap;
      await fetch("/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allData), // Save the whole object
      });
      showNotification("Daten gespeichert!", false);
    } catch (e) {
      showNotification("Speichern fehlgeschlagen.", true);
    }
  }
  function initializeDefaultTags() {
    const defaults = {
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
    for (const [tag, cat] of Object.entries(defaults)) {
      if (!tagCategoryMap[tag]) tagCategoryMap[tag] = cat;
    }
  }
  function populateCategorySelect() {
    if (!dom.newTagCategorySelect) return;
    dom.newTagCategorySelect.innerHTML = CATEGORIES.map(
      (c) => `<option value="${c}">${c}</option>`
    ).join("");
  }

  function changeDay(offset) {
    const currentDate = new Date(dom.datePicker.value);
    currentDate.setUTCDate(currentDate.getUTCDate() + offset);
    loadDay(currentDate.toISOString().split("T")[0]);
  }

  function loadDay(dateString) {
    dom.datePicker.value = dateString;
    dom.diagramDayPicker.value = dateString;
    dom.currentDateDisplay.textContent = new Date(
      dateString + "T00:00:00"
    ).toLocaleDateString("de-DE", { day: "numeric", month: "long" });
    dom.dailyEntriesContainer.innerHTML = "";
    const d = new Date(dateString + "T00:00:00");
    const dayData = appData[dateString] || {
      status: "dokumentiert",
      workHours: DAILY_WORK_HOURS[d.getDay()] ?? 8,
      entries: [],
    };
    if (dayData.tags && !dayData.entries) {
      dayData.entries = dayData.tags.map((t) => ({
        tagNames: [t.name],
        time: t.time,
        note: t.note,
      }));
      delete dayData.tags;
    }
    appData[dateString] = dayData;
    dom.statusSelect.value = dayData.status;
    dom.workHoursInput.value = dayData.workHours;
    (dayData.entries || []).forEach((e) => renderDailyEntry(e));
    if ((dayData.entries || []).length === 0) renderDailyEntry();
    updateTotals();
    handleStatusChange();
    updateCharts();
  }

  function saveCurrentDay() {
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
        if ((tagNames.length > 0 || note) && time > 0) {
          dailyEntries.push({ tagNames, time, note });
        }
      });
    appData[dateString] = {
      status: dom.statusSelect.value,
      workHours: parseFloat(dom.workHoursInput.value) || 8,
      entries: dailyEntries,
    };
    saveDataToServer();
    updateCharts();
  }

  function renderDailyEntry(entry = { tagNames: [], time: 0, note: "" }) {
    const el = document.createElement("div");
    el.className =
      "daily-entry-item p-3 rounded-lg bg-gray-50 border border-gray-200";
    el.innerHTML = `<div class="flex items-start gap-3"><div class="flex-grow"><div class="selected-tags-container flex flex-wrap mb-2"></div><div class="relative"><input type="text" class="tag-search-input w-full rounded-md border-gray-300 shadow-sm p-1.5" placeholder="+ Tag hinzufügen..."><div class="autocomplete-suggestions absolute w-full bg-white border rounded-md z-10"></div></div></div><div class="flex items-center"><input type="text" value="${decimalToHHMM(
      entry.time || 0
    )}" class="entry-time-input w-20 text-center rounded-md border-gray-300 shadow-sm p-1" placeholder="hh:mm"><span class="text-gray-500 ml-1">h</span><button type="button" class="remove-entry-btn text-red-500 hover:text-red-700 font-bold text-xl ml-2">&times;</button></div></div><div class="mt-2"><input type="text" class="entry-note-input block w-full rounded-md border-gray-200 shadow-sm p-1.5" placeholder="Notiz..." value="${
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
      "input",
      updateTotals
    );
    el.querySelector(".remove-entry-btn").addEventListener("click", () => {
      if (dom.dailyEntriesContainer.children.length > 1) {
        el.remove();
        updateTotals();
      } else {
        showNotification("Letzter Eintrag kann nicht gelöscht werden.", true);
      }
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
    if (!q) return;
    const existing = Array.from(entryEl.querySelectorAll(".tag-badge")).map(
      (b) => b.dataset.tagName
    );
    Object.keys(tagCategoryMap)
      .filter((t) => t.toLowerCase().includes(q) && !existing.includes(t))
      .slice(0, 5)
      .forEach((tag) => {
        const item = document.createElement("a");
        item.href = "#";
        item.className = "block p-2 hover:bg-gray-100";
        item.textContent = tag;
        item.onclick = (e) => {
          e.preventDefault();
          addTagToEntry(tag, entryEl);
          input.value = "";
          suggestions.innerHTML = "";
        };
        suggestions.appendChild(item);
      });
  }

  function addTagToEntry(tagName, entryEl) {
    entryEl
      .querySelector(".selected-tags-container")
      .appendChild(createTagBadge(tagName));
  }
  function createTagBadge(tagName) {
    const b = document.createElement("span");
    b.className = "tag-badge";
    b.textContent = tagName;
    b.dataset.tagName = tagName;
    b.style.backgroundColor =
      CATEGORY_CHART_COLORS[tagCategoryMap[tagName]] || "#6c757d";
    const r = document.createElement("span");
    r.className = "tag-badge-remove";
    r.innerHTML = "&times;";
    r.onclick = () => {
      b.remove();
      updateTotals();
    };
    b.appendChild(r);
    return b;
  }
  function addNewTag() {
    const tagName = dom.newTagInput.value.trim();
    if (tagName && !tagCategoryMap[tagName]) {
      tagCategoryMap[tagName] = dom.newTagCategorySelect.value;
      renderTagLibrary();
      saveDataToServer();
      showNotification(`Tag "${tagName}" hinzugefügt.`);
      dom.newTagInput.value = "";
    } else if (tagName) {
      showNotification(`Tag "${tagName}" existiert bereits.`, true);
    }
  }
  function renderTagLibrary() {
    if (!dom.tagLibrary) return;
    dom.tagLibrary.innerHTML = "";
    Object.keys(tagCategoryMap)
      .sort()
      .forEach((tag) => dom.tagLibrary.appendChild(createTagBadge(tag)));
  }
  function handleStatusChange() {
    const isDoc = dom.statusSelect.value === "dokumentiert";
    dom.mainContentPanel.style.opacity = isDoc ? "1" : "0.6";
    dom.mainContentPanel
      .querySelectorAll("input, button, select")
      .forEach((el) => (el.disabled = !isDoc));
    dom.saveDayBtn.disabled = false;
  }
  function updateTotals() {
    const total = Array.from(
      dom.dailyEntriesContainer.querySelectorAll(".entry-time-input")
    ).reduce((sum, el) => sum + hhmmToDecimal(el.value), 0);
    dom.totalHoursEl.textContent = decimalToHHMM(total);
  }
  function checkPendingTodos() {
    const todoJSON = localStorage.getItem("pendingTodo");
    if (todoJSON) {
      const todo = JSON.parse(todoJSON);
      const newEntry = {
        tagNames: todo.tags || [],
        time: 0.25,
        note: todo.text,
      };

      // Make sure all tags exist in the tagCategoryMap
      if (todo.tags) {
        let newTagAdded = false;
        todo.tags.forEach((tag) => {
          if (!tagCategoryMap[tag]) {
            tagCategoryMap[tag] = "Sonstiges"; // Default category
            newTagAdded = true;
          }
        });
        if (newTagAdded) {
          renderTagLibrary();
          saveDataToServer();
        }
      }

      renderDailyEntry(newEntry);
      updateTotals();
      showNotification(`"${todo.text}" zur Doku hinzugefügt.`);
      localStorage.removeItem("pendingTodo");
    }
  }

  function initCharts() {
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
        plugins: { legend: { display: false } },
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

  function handleDiagramViewChange() {
    const isWeek =
      document.querySelector('input[name="diagram-view"]:checked').value ===
      "week";
    dom.weekViewControls.classList.toggle("hidden", !isWeek);
    dom.dayViewControls.classList.toggle("hidden", isWeek);
    updateCharts();
  }

  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return [d.getUTCFullYear(), Math.ceil(((d - yStart) / 86400000 + 1) / 7)];
  }

  function setInitialDiagramDates() {
    const today = new Date();
    const [year, week] = getWeekNumber(today);
    dom.diagramWeekPicker.value = `${year}-W${String(week).padStart(2, "0")}`;
    dom.diagramDayPicker.value = today.toISOString().split("T")[0];
  }

  function getPeriodDataForCharts() {
    const data = {};
    const isWeek =
      document.querySelector('input[name="diagram-view"]:checked').value ===
      "week";
    if (isWeek) {
      if (!dom.diagramWeekPicker.value) return {};
      const [year, week] = dom.diagramWeekPicker.value.split("-W").map(Number);
      const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(d.setUTCDate(diff));
      for (let i = 0; i < 7; i++) {
        const current = new Date(start);
        current.setUTCDate(start.getUTCDate() + i);
        const dateStr = current.toISOString().split("T")[0];
        if (appData[dateStr]) data[dateStr] = appData[dateStr];
      }
    } else {
      if (dom.diagramDayPicker.value) {
        const dateStr = dom.diagramDayPicker.value;
        if (appData[dateStr]) data[dateStr] = appData[dateStr];
      }
    }
    return data;
  }

  function updateCharts() {
    if (!barChart || !radarChart) return;
    const periodData = getPeriodDataForCharts();
    const isWeek =
      document.querySelector('input[name="diagram-view"]:checked').value ===
      "week";
    updateBarChart(periodData, isWeek);
    updateRadarChart(periodData, isWeek);
  }

  function updateBarChart(periodData, isWeek) {
    const newType = isWeek ? "bar" : "pie";
    if (barChart.config.type !== newType) {
      barChart.destroy();
      barChart = new Chart(
        document.getElementById("bar-chart").getContext("2d"),
        {
          type: newType,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: newType === "pie" } },
          },
        }
      );
    }
    dom.barChartTitle.textContent = isWeek
      ? "Tätigkeiten pro Tag"
      : "Tagesverteilung";
    if (isWeek) {
      const allTags = [
        ...new Set(
          Object.values(periodData).flatMap(
            (d) => d?.entries?.flatMap((e) => e.tagNames) || []
          )
        ),
      ];
      barChart.data.labels = Object.keys(periodData).map((d) =>
        new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
          weekday: "short",
        })
      );
      barChart.options.scales = {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true },
      };
      barChart.data.datasets = allTags.map((tag) => ({
        label: tag,
        data: Object.keys(periodData).map(
          (date) =>
            periodData[date]?.entries?.reduce(
              (sum, entry) =>
                sum +
                (entry.tagNames.includes(tag)
                  ? entry.time / entry.tagNames.length
                  : 0),
              0
            ) || 0
        ),
        backgroundColor: CATEGORY_CHART_COLORS[tagCategoryMap[tag]],
      }));
    } else {
      const day = Object.values(periodData)[0];
      const tagTotals = {};
      day?.entries?.forEach((entry) => {
        const timePerTag =
          entry.tagNames.length > 0 ? entry.time / entry.tagNames.length : 0;
        entry.tagNames.forEach((tn) => {
          tagTotals[tn] = (tagTotals[tn] || 0) + timePerTag;
        });
      });
      barChart.data.labels = Object.keys(tagTotals);
      barChart.options.scales = {};
      barChart.data.datasets = [
        {
          data: Object.values(tagTotals),
          backgroundColor: Object.keys(tagTotals).map(
            (tag) => CATEGORY_CHART_COLORS[tagCategoryMap[tag]]
          ),
        },
      ];
    }
    barChart.update();
  }

  function updateRadarChart(periodData, isWeek) {
    dom.radarChartTitle.textContent = isWeek
      ? "Kategorien-Fokus (Woche)"
      : "Kategorien-Fokus (Tag)";
    const categoryTotals = RADAR_CATEGORIES.reduce(
      (acc, cat) => ({ ...acc, [cat]: 0 }),
      {}
    );
    Object.values(periodData).forEach((day) => {
      day?.entries?.forEach((entry) => {
        entry.tagNames.forEach((tn) => {
          const category = tagCategoryMap[tn];
          if (category in categoryTotals) {
            categoryTotals[category] += entry.time / entry.tagNames.length;
          }
        });
      });
    });
    radarChart.data.datasets = [
      {
        label: "Stunden",
        data: Object.values(categoryTotals),
        fill: true,
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgb(54, 162, 235)",
      },
    ];
    radarChart.update();
  }

  init();
});
