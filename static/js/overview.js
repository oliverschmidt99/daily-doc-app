window.addEventListener("contextReady", (e) => {
  const currentContext = e.detail.context;
  if (document.getElementById("overview-accordion-container")) {
    initializeOverviewModule(currentContext);
  }
});

async function initializeOverviewModule(context) {
  let allData = {},
    appData = {},
    tagCategoryMap = {},
    categoryStyles = {};

  const dom = {
    viewRadios: document.querySelectorAll('input[name="overview-view"]'),
    monthPicker: document.getElementById("overview-month-picker"),
    weekPicker: document.getElementById("overview-week-picker"),
    yearPicker: document.getElementById("overview-year-picker"),
    monthControls: document.getElementById("month-view-controls"),
    weekControls: document.getElementById("week-view-controls"),
    yearControls: document.getElementById("year-view-controls"),
    accordionContainer: document.getElementById("overview-accordion-container"),
    summaryTarget: document.getElementById("summary-target-hours"),
    summaryActual: document.getElementById("summary-actual-hours"),
    summaryDiff: document.getElementById("summary-diff-hours"),
    prevWeekBtn: document.getElementById("prev-week-btn"),
    nextWeekBtn: document.getElementById("next-week-btn"),
    prevMonthBtn: document.getElementById("prev-month-btn"),
    nextMonthBtn: document.getElementById("next-month-btn"),
    prevYearBtn: document.getElementById("prev-year-btn"),
    nextYearBtn: document.getElementById("next-year-btn"),
    saveAllBtn: document.getElementById("save-all-btn"),
    notificationEl: document.getElementById("notification"),
    barChartEl: document.getElementById("bar-chart"),
    radarChartEl: document.getElementById("radar-chart"),
    barChartTitle: document.getElementById("bar-chart-title"),
    radarChartTitle: document.getElementById("radar-chart-title"),
  };

  let barChart, radarChart;
  const RADAR_CATEGORIES = [
    "Technik",
    "Analyse",
    "Dokumentation",
    "Organisation",
    "Soziales",
    "Sonstiges",
  ];

  const DAILY_WORK_HOURS = {
    1: 8.25,
    2: 8.25,
    3: 8.25,
    4: 8.25,
    5: 7.0,
    6: 0,
    0: 0,
  };
  const STATUS_MAP = {
    dokumentiert: { icon: "🟢", text: "Dokumentiert" },
    urlaub: { icon: "🌴", text: "Urlaub" },
    krank: { icon: "🤒", text: "Krank" },
    abwesend: { icon: "🚶", text: "Abwesend" },
    "nicht dokumentiert": { icon: "🔴", text: "Nicht Dokumentiert" },
  };

  const hhmmToDecimal = (timeString) => {
    if (typeof timeString !== "string" || !timeString.includes(":")) return 0;
    const [h, m] = timeString.split(":").map(Number);
    return isNaN(h) || isNaN(m) ? 0 : h + m / 60;
  };
  const decimalToHHMM = (decimalHours) => {
    if (isNaN(decimalHours)) return "00:00";
    const sign = decimalHours < 0 ? "-" : "";
    const absHours = Math.abs(decimalHours);
    const h = Math.floor(absHours);
    const m = Math.round((absHours - h) * 60);
    return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

  async function init() {
    await loadDataFromServer();
    initCharts();
    setupEventListeners();
    setInitialPickerValues();
    handleViewChange();
  }

  function setupEventListeners() {
    dom.viewRadios.forEach((radio) =>
      radio.addEventListener("change", handleViewChange)
    );
    dom.monthPicker.addEventListener("change", renderOverview);
    dom.weekPicker.addEventListener("change", renderOverview);
    dom.yearPicker.addEventListener("change", renderOverview);
    dom.prevWeekBtn.addEventListener("click", () => changeWeek(-1));
    dom.nextWeekBtn.addEventListener("click", () => changeWeek(1));
    dom.prevMonthBtn.addEventListener("click", () => changeMonth(-1));
    dom.nextMonthBtn.addEventListener("click", () => changeMonth(1));
    dom.prevYearBtn.addEventListener("click", () => changeYear(-1));
    dom.nextYearBtn.addEventListener("click", () => changeYear(1));
    dom.saveAllBtn.addEventListener("click", saveAllOpenDays);
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
      categoryStyles = allData.categoryStyles || {};
    } catch (e) {
      console.error("Fehler beim Laden der Daten:", e);
    }
  }

  async function saveData() {
    allData.appData = appData;
    allData.tagCategoryMap = tagCategoryMap;
    allData.categoryStyles = categoryStyles;
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

  function saveAllOpenDays() {
    const openDetails =
      dom.accordionContainer.querySelectorAll("details[open]");
    if (openDetails.length === 0) return;
    openDetails.forEach((detail) => {
      const dateString = detail.dataset.date;
      if (dateString) {
        const container = detail.querySelector(".edit-container");
        if (container && container.innerHTML) {
          saveDayFromDOM(dateString, container);
        }
      }
    });
    saveData().then(() => renderOverview());
  }

  function changeWeek(offset) {
    const [year, week] = dom.weekPicker.value.split("-W").map(Number);
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    date.setDate(date.getDate() + 7 * offset);
    const newYear = date.getFullYear();
    const newWeek = getWeekNumber(date, true);
    dom.weekPicker.value = `${newYear}-W${String(newWeek).padStart(2, "0")}`;
    renderOverview();
  }

  function changeMonth(offset) {
    const [year, month] = dom.monthPicker.value.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + offset);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, "0");
    dom.monthPicker.value = `${newYear}-${newMonth}`;
    renderOverview();
  }

  function changeYear(offset) {
    let year = parseInt(dom.yearPicker.value);
    if (!isNaN(year)) {
      dom.yearPicker.value = year + offset;
      renderOverview();
    }
  }

  function setInitialPickerValues() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    dom.monthPicker.value = `${year}-${month}`;
    const week = getWeekNumber(today, true);
    dom.weekPicker.value = `${year}-W${String(week).padStart(2, "0")}`;
    dom.yearPicker.value = year;
    document.getElementById("view-month").checked = true;
  }

  function getWeekNumber(d, getWeekOnly = false) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const year = date.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    if (getWeekOnly) return weekNo;
    return `${year}-W${weekNo}`;
  }

  function handleViewChange() {
    const selectedView = document.querySelector(
      'input[name="overview-view"]:checked'
    ).value;
    dom.monthControls.classList.toggle("hidden", selectedView !== "month");
    dom.weekControls.classList.toggle("hidden", selectedView !== "week");
    dom.yearControls.classList.toggle("hidden", selectedView !== "year");
    renderOverview();
  }

  function renderOverview() {
    const selectedView = document.querySelector(
      'input[name="overview-view"]:checked'
    ).value;
    dom.accordionContainer.innerHTML = "";
    const allDateEntries = getAllDateEntries(selectedView);
    if (allDateEntries.length === 0) {
      updateSummary(0, 0);
      return;
    }
    let totalTarget = 0,
      totalActual = 0;
    allDateEntries.forEach((entry) => {
      const { target, actual } = calculateDayHours(entry.dateString);
      totalTarget += target;
      totalActual += actual;
    });

    if (selectedView === "month" || selectedView === "year") {
      const groupKeyFn =
        selectedView === "month"
          ? (entry) => `KW ${getWeekNumber(entry.date, true)}`
          : (entry) =>
              new Date(entry.date).toLocaleString("de-DE", { month: "long" });
      const groupedEntries = groupBy(allDateEntries, groupKeyFn);

      Object.keys(groupedEntries).forEach((groupKey) => {
        const entriesInGroup = groupedEntries[groupKey];
        const { groupTarget, groupActual } =
          calculateGroupTotals(entriesInGroup);
        const groupAccordion = createGroupAccordion(
          groupKey,
          groupTarget,
          groupActual,
          entriesInGroup
        );
        dom.accordionContainer.appendChild(groupAccordion);
      });
    } else {
      allDateEntries.forEach((entry) => {
        const { target, actual, diff, dayData } = calculateDayHours(
          entry.dateString
        );
        const dayAccordion = createDayAccordion(
          entry.date,
          entry.dateString,
          dayData,
          actual,
          target,
          diff
        );
        dom.accordionContainer.appendChild(dayAccordion);
      });
    }
    updateSummary(totalTarget, totalActual);
    updateCharts();
  }

  function calculateGroupTotals(entriesInGroup) {
    let groupTarget = 0,
      groupActual = 0;
    entriesInGroup.forEach((entry) => {
      const { target, actual } = calculateDayHours(entry.dateString);
      groupTarget += target;
      groupActual += actual;
    });
    return { groupTarget, groupActual };
  }

  function getAllDateEntries(selectedView) {
    let dates = [];
    if (selectedView === "month" && dom.monthPicker.value) {
      const [year, month] = dom.monthPicker.value.split("-").map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        dates.push({
          date: new Date(year, month - 1, i),
          dateString: `${year}-${String(month).padStart(2, "0")}-${String(
            i
          ).padStart(2, "0")}`,
        });
      }
    } else if (selectedView === "week" && dom.weekPicker.value) {
      const [year, week] = dom.weekPicker.value.split("-W").map(Number);
      const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const dayOfWeek = d.getUTCDay();
      const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startDate = new Date(d.setUTCDate(diff));
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setUTCDate(startDate.getUTCDate() + i);
        dates.push({ date, dateString: date.toISOString().split("T")[0] });
      }
    } else if (selectedView === "year" && dom.yearPicker.value) {
      const year = parseInt(dom.yearPicker.value);
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          dates.push({
            date: new Date(year, m, d),
            dateString: `${year}-${String(m + 1).padStart(2, "0")}-${String(
              d
            ).padStart(2, "0")}`,
          });
        }
      }
    }
    return dates;
  }

  const groupBy = (array, keyGetter) => {
    const map = {};
    array.forEach((item) => {
      const key = keyGetter(item);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  };

  function calculateDayHours(dateString) {
    const date = new Date(dateString + "T00:00:00");
    const dayOfWeek = date.getDay();
    let dayData = appData[dateString] || {
      entries: [],
      status: "nicht dokumentiert",
      breakTime: { h: 0, m: 45 },
      startTime: null,
      endTime: null,
    };
    dayData.workHours = DAILY_WORK_HOURS[dayOfWeek] ?? 0;
    if (!appData[dateString]) appData[dateString] = dayData;
    let actual = 0;
    if (
      dayData.startTime &&
      dayData.endTime &&
      dayData.startTime.h !== null &&
      dayData.endTime.h !== null
    ) {
      const startMins =
        (dayData.startTime.h || 0) * 60 + (dayData.startTime.m || 0);
      const endMins = (dayData.endTime.h || 0) * 60 + (dayData.endTime.m || 0);
      const breakMins =
        (dayData.breakTime?.h || 0) * 60 + (dayData.breakTime?.m || 0);
      if (endMins > startMins) actual = (endMins - startMins - breakMins) / 60;
    } else if (dayData.entries && dayData.entries.length > 0) {
      actual = dayData.entries.reduce(
        (sum, entry) => sum + (entry.time || 0),
        0
      );
    }
    const target = dayData.workHours;
    const diff = actual - target;
    return { target, actual, diff, dayData };
  }

  function updateSummary(totalTarget, totalActual) {
    const totalDiff = totalActual - totalTarget;
    dom.summaryTarget.textContent = `${decimalToHHMM(totalTarget)} h`;
    dom.summaryActual.textContent = `${decimalToHHMM(totalActual)} h`;
    dom.summaryDiff.textContent = `${decimalToHHMM(totalDiff)} h`;
    dom.summaryDiff.parentElement.className = `p-4 rounded-lg ${
      totalDiff >= 0 ? "bg-green-100" : "bg-red-100"
    }`;
    dom.summaryDiff.className = `text-2xl font-bold ${
      totalDiff >= 0 ? "text-green-800" : "text-red-800"
    }`;
  }

  function createGroupAccordion(title, target, actual, entriesInGroup) {
    const item = document.createElement("details");
    item.className = "bg-gray-100 border rounded-lg overflow-hidden";
    const summary = document.createElement("summary");
    summary.className =
      "flex items-center p-3 cursor-pointer hover:bg-gray-200 font-bold";
    const diff = actual - target;
    summary.innerHTML = `<div class="w-1/4">${title}</div><div class="w-1/4 text-center"></div><div class="w-1/4 text-center">${decimalToHHMM(
      actual
    )} / ${decimalToHHMM(target)} h</div><div class="w-1/4 text-center ${
      diff >= 0 ? "text-green-600" : "text-red-600"
    }">${decimalToHHMM(diff)} h</div>`;
    const innerContainer = document.createElement("div");
    innerContainer.className = "pl-4 border-t";
    item.appendChild(summary);
    item.appendChild(innerContainer);

    item.addEventListener("toggle", () => {
      if (item.open && !innerContainer.innerHTML) {
        if (entriesInGroup.length === 0) {
          innerContainer.innerHTML = `<div class="p-3 text-gray-500 italic">Keine Einträge in diesem Zeitraum.</div>`;
          return;
        }
        entriesInGroup
          .sort((a, b) => a.date - b.date)
          .forEach((entry) => {
            const { target, actual, diff, dayData } = calculateDayHours(
              entry.dateString
            );
            innerContainer.appendChild(
              createDayAccordion(
                entry.date,
                entry.dateString,
                dayData,
                actual,
                target,
                diff
              )
            );
          });
      }
    });
    return item;
  }

  function createDayAccordion(
    date,
    dateString,
    dayData,
    actualHours,
    targetHours,
    diffHours
  ) {
    const item = document.createElement("details");
    item.className = "bg-white border-b";
    item.dataset.date = dateString;
    const summary = document.createElement("summary");
    summary.className = "flex items-center p-3 cursor-pointer hover:bg-gray-50";
    const statusInfo =
      STATUS_MAP[dayData.status] || STATUS_MAP["nicht dokumentiert"];
    summary.innerHTML = `<div class="w-1/4 font-semibold">${date.toLocaleDateString(
      "de-DE",
      { weekday: "short", day: "2-digit", month: "2-digit" }
    )}</div><div class="w-1/4 text-center text-2xl" title="${
      statusInfo.text
    }">${statusInfo.icon}</div><div class="w-1/4 text-center">${decimalToHHMM(
      actualHours
    )} / ${decimalToHHMM(
      targetHours
    )} h</div><div class="w-1/4 text-center font-bold ${
      diffHours >= 0 ? "text-green-600" : "text-red-600"
    }">${decimalToHHMM(diffHours)} h</div>`;
    const editContainer = document.createElement("div");
    editContainer.className = "p-4 bg-gray-50 border-t edit-container";
    item.appendChild(summary);
    item.appendChild(editContainer);
    item.addEventListener("toggle", () => {
      if (item.open && !editContainer.innerHTML) {
        populateEditContainer(editContainer, dateString, dayData);
      }
    });
    return item;
  }

  function populateEditContainer(container, dateString, dayData) {
    container.innerHTML = `
        <div class="space-y-4">
            <fieldset class="border border-gray-300 p-4 rounded-lg bg-white">
                <legend class="text-md font-semibold px-2 text-gray-700">Zeiten & Status</legend>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Tagesstatus</label>
                        <select class="status-select mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                            <option value="dokumentiert">Dokumentiert ✔</option>
                            <option value="urlaub">Urlaub 🌴</option>
                            <option value="krank">Krank 🤒</option>
                            <option value="abwesend">Abwesend 🚶</option>
                            <option value="nicht dokumentiert">Nicht Dokumentiert</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Arbeitsbeginn</label>
                        <input type="text" placeholder="hh:mm" class="start-time-input block w-full rounded-md border-gray-300 shadow-sm p-2 mt-1" value="${objectToHHMM(
                          dayData.startTime
                        )}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Arbeitsende</label>
                        <input type="text" placeholder="hh:mm" class="end-time-input block w-full rounded-md border-gray-300 shadow-sm p-2 mt-1" value="${objectToHHMM(
                          dayData.endTime
                        )}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Pause</label>
                        <input type="text" placeholder="hh:mm" class="break-time-input block w-full rounded-md border-gray-300 shadow-sm p-2 mt-1" value="${objectToHHMM(
                          dayData.breakTime
                        )}">
                    </div>
                </div>
            </fieldset>
            <fieldset class="border border-gray-300 p-4 rounded-lg bg-white">
                <legend class="text-md font-semibold px-2 text-gray-700">Einträge</legend>
                <div class="daily-entries-container space-y-3"></div>
                <div class="mt-4">
                    <button type="button" class="add-entry-btn bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm">+ Eintrag hinzufügen</button>
                </div>
            </fieldset>
        </div>
    `;

    container.querySelector(".status-select").value = dayData.status;
    const entriesContainer = container.querySelector(
      ".daily-entries-container"
    );
    (dayData.entries || []).forEach((entry) =>
      entriesContainer.appendChild(createEntryElement(entry))
    );

    container
      .querySelector(".add-entry-btn")
      .addEventListener("click", () =>
        entriesContainer.appendChild(
          createEntryElement({ tagNames: [], time: 0, note: "" })
        )
      );

    function createEntryElement(entry) {
      const el = document.createElement("div");
      el.className = "daily-entry-item p-3 rounded-lg bg-gray-50 border";
      el.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="flex-grow">
                    <div class="selected-tags-container flex flex-wrap gap-1 mb-2"></div>
                    <div class="relative">
                        <input type="text" class="tag-search-input w-full rounded-md border-gray-300 p-1.5" placeholder="+ Tag hinzufügen...">
                        <div class="autocomplete-suggestions absolute w-full bg-white border rounded-md z-10 hidden"></div>
                    </div>
                </div>
                <div class="flex items-center">
                    <input type="text" value="${decimalToHHMM(
                      entry.time || 0
                    )}" class="entry-time-input w-20 text-center rounded-md border-gray-300 p-1" placeholder="hh:mm">
                    <span class="text-gray-500 ml-1">h</span>
                    <button type="button" class="remove-entry-btn text-red-500 font-bold text-xl ml-2">&times;</button>
                </div>
            </div>
            <input type="text" class="entry-note-input block w-full rounded-md border-gray-200 p-1.5 mt-2" placeholder="Notiz..." value="${
              entry.note || ""
            }">
        `;

      el.querySelector(".entry-time-input").addEventListener("blur", (e) => {
        let value = e.target.value.trim();
        if (!value) return;
        let parts = value.split(":");
        let hours = parts[0] ? parts[0].padStart(2, "0") : "00";
        let minutes = parts[1] ? parts[1].padStart(2, "0") : "00";
        e.target.value = `${hours}:${minutes}`;
      });

      const tagsContainer = el.querySelector(".selected-tags-container");
      (entry.tagNames || []).forEach((tagName) =>
        tagsContainer.appendChild(createTagBadge(tagName))
      );
      el.querySelector(".remove-entry-btn").addEventListener("click", () =>
        el.remove()
      );

      const searchInput = el.querySelector(".tag-search-input");
      const suggestions = el.querySelector(".autocomplete-suggestions");
      searchInput.addEventListener("input", () =>
        handleTagAutocomplete(searchInput, suggestions, el)
      );

      return el;
    }

    function createTagBadge(tagName) {
      const b = document.createElement("span");
      const category = tagCategoryMap[tagName];
      const color = categoryStyles[category]?.color || "#6c757d";
      b.className = "tag-badge text-xs inline-flex items-center text-white";
      b.textContent = tagName;
      b.dataset.tagName = tagName;
      b.style.backgroundColor = color;
      const r = document.createElement("span");
      r.className = "tag-badge-remove ml-2 cursor-pointer font-bold";
      r.innerHTML = "&times;";
      r.onclick = () => b.remove();
      b.appendChild(r);
      return b;
    }

    function handleTagAutocomplete(input, suggestions, entryEl) {
      const q = input.value.toLowerCase();
      suggestions.innerHTML = "";
      suggestions.classList.add("hidden");
      if (!q) return;

      const existing = Array.from(entryEl.querySelectorAll(".tag-badge")).map(
        (b) => b.dataset.tagName
      );
      const filtered = Object.keys(tagCategoryMap || {})
        .filter((t) => t.toLowerCase().includes(q) && !existing.includes(t))
        .slice(0, 5);

      if (filtered.length > 0) {
        filtered.forEach((tag) => {
          const item = document.createElement("a");
          item.href = "#";
          item.className = "block p-2 hover:bg-gray-100";
          item.textContent = tag;
          item.onclick = (e) => {
            e.preventDefault();
            entryEl
              .querySelector(".selected-tags-container")
              .appendChild(createTagBadge(tag));
            input.value = "";
            suggestions.innerHTML = "";
            suggestions.classList.add("hidden");
          };
          suggestions.appendChild(item);
        });
        suggestions.classList.remove("hidden");
      }
    }
  }

  function initCharts() {
    if (!dom.barChartEl || !dom.radarChartEl) return;
    const barCtx = dom.barChartEl.getContext("2d");
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
    const radarCtx = dom.radarChartEl.getContext("2d");
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

  function updateCharts() {
    if (!barChart || !radarChart) return;
    const periodData = getAllDateEntries(
      document.querySelector('input[name="overview-view"]:checked').value
    ).reduce((acc, entry) => {
      if (appData[entry.dateString]) {
        acc[entry.dateString] = appData[entry.dateString];
      }
      return acc;
    }, {});
    updateBarChart(periodData);
    updateRadarChart(periodData);
  }

  function getTagColor(tagName) {
    const category = tagCategoryMap[tagName];
    return categoryStyles[category]?.color || "#6c757d";
  }

  function updateBarChart(periodData) {
    dom.barChartTitle.textContent = "Tätigkeiten";
    const allTags = [
      ...new Set(
        Object.values(periodData).flatMap(
          (d) => d?.entries?.flatMap((e) => e.tagNames) || []
        )
      ),
    ];
    const labels = Object.keys(periodData);
    barChart.data.labels = labels.map((d) =>
      new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
        month: "short",
        day: "numeric",
      })
    );
    barChart.data.datasets = allTags.map((tag) => ({
      label: tag,
      data: labels.map(
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
      backgroundColor: getTagColor(tag),
    }));
    barChart.update();
  }

  function updateRadarChart(periodData) {
    dom.radarChartTitle.textContent = "Kategorien-Fokus";
    const categoryTotals = RADAR_CATEGORIES.reduce(
      (acc, cat) => ({ ...acc, [cat]: 0 }),
      {}
    );
    const documentedDays = Object.values(periodData).filter(
      (d) => d && d.status === "dokumentiert"
    );
    documentedDays.forEach((day) => {
      day.entries?.forEach((entry) => {
        entry.tagNames.forEach((tn) => {
          const category = tagCategoryMap[tn];
          if (category in categoryTotals) {
            categoryTotals[category] +=
              entry.time / (entry.tagNames.length || 1);
          }
        });
      });
    });
    radarChart.data.datasets = [
      {
        label: "Stunden",
        data: RADAR_CATEGORIES.map((cat) => categoryTotals[cat]),
        fill: true,
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgb(54, 162, 235)",
        pointBackgroundColor: RADAR_CATEGORIES.map(
          (cat) => categoryStyles[cat]?.color || "#6c757d"
        ),
      },
    ];
    radarChart.update();
  }

  init();
}
