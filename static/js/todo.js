document.addEventListener("DOMContentLoaded", async () => {
  let allData = { projects: [], todos: [], tagCategoryMap: {} };
  let currentTodoTags = [];
  let currentEditTodoTags = [];

  const dom = {
    projectList: document.getElementById("project-list"),
    newProjectName: document.getElementById("new-project-name"),
    addProjectBtn: document.getElementById("add-project-btn"),
    newTodoText: document.getElementById("new-todo-text"),
    newTodoProject: document.getElementById("new-todo-project"),
    newTodoPriority: document.getElementById("new-todo-priority"),
    newTodoDueDate: document.getElementById("new-todo-duedate"),
    newTodoTagsContainer: document.getElementById("new-todo-tags-container"),
    newTodoTagSearch: document.getElementById("new-todo-tag-search"),
    newTodoTagSuggestions: document.getElementById("new-todo-tag-suggestions"),
    addTodoBtn: document.getElementById("add-todo-btn"),
    prioLists: {
      3: document.querySelector("#prio-3 .todo-list"),
      2: document.querySelector("#prio-2 .todo-list"),
      1: document.querySelector("#prio-1 .todo-list"),
    },
    completedList: document.getElementById("completed-list"),
    completedCount: document.getElementById("completed-count"),
    projectFilter: document.getElementById("project-filter"),
    editModal: document.getElementById("edit-todo-modal"),
    editTodoId: document.getElementById("edit-todo-id"),
    editTodoText: document.getElementById("edit-todo-text"),
    editTodoProject: document.getElementById("edit-todo-project"),
    editTodoPriority: document.getElementById("edit-todo-priority"),
    editTodoDueDate: document.getElementById("edit-todo-duedate"),
    editTodoTagsContainer: document.getElementById("edit-todo-tags-container"),
    editTodoTagSearch: document.getElementById("edit-todo-tag-search"),
    editTodoTagSuggestions: document.getElementById(
      "edit-todo-tag-suggestions"
    ),
    saveEditBtn: document.getElementById("save-edit-btn"),
    cancelEditBtn: document.getElementById("cancel-edit-btn"),
    notificationEl: document.getElementById("notification"),
    completedSection: document.getElementById("completed-section"),
  };

  const CATEGORY_CHART_COLORS = {
    Technik: "rgba(239, 68, 68, 0.8)",
    Analyse: "rgba(59, 130, 246, 0.8)",
    Dokumentation: "rgba(245, 158, 11, 0.8)",
    Organisation: "rgba(16, 185, 129, 0.8)",
    Soziales: "rgba(139, 92, 246, 0.8)",
    Sonstiges: "rgba(107, 114, 128, 0.8)",
  };

  const PRIORITY_COLORS = {
    3: { light: "254, 226, 226", dark: "252, 165, 165" }, // Dringend (Red)
    2: { light: "254, 243, 199", dark: "251, 211, 141" }, // Wichtig (Orange)
    1: { light: "254, 252, 232", dark: "253, 224, 71" }, // Optional (Yellow)
  };

  const generateId = () => "_" + Math.random().toString(36).substr(2, 9);
  const getProjectById = (id) =>
    allData.projects.find((p) => p.id === id) || {
      name: "Kein Projekt",
      status: "active",
    };

  async function loadAllData() {
    const response = await fetch("/load");
    allData = await response.json();
    allData.todos = allData.todos || [];
    allData.projects = allData.projects || [];
  }

  async function saveData() {
    try {
      await fetch("/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allData),
      });
      showNotification("Gespeichert!", false);
    } catch (e) {
      showNotification("Speichern fehlgeschlagen.", true);
    }
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

  function render() {
    renderProjects();
    renderTodos();
  }

  function renderProjects() {
    dom.projectList.innerHTML = "";

    const projectOptions = allData.projects
      .map(
        (p) =>
          `<option value="${p.id}" ${
            p.status === "completed" ? "disabled" : ""
          }>${p.name}</option>`
      )
      .join("");

    dom.newTodoProject.innerHTML = `<option value="">Kein Projekt</option>${projectOptions}`;
    dom.editTodoProject.innerHTML = `<option value="">Kein Projekt</option>${projectOptions}`;
    dom.projectFilter.innerHTML = `<option value="all">Alle Projekte</option>${projectOptions}`;

    allData.projects.forEach((proj) => {
      const li = document.createElement("li");
      li.className = `flex justify-between items-center p-2 rounded ${
        proj.status === "completed" ? "bg-gray-200 text-gray-500" : "bg-gray-50"
      }`;
      li.innerHTML = `<span class="font-semibold cursor-pointer ${
        proj.status === "completed" ? "line-through" : ""
      }">${
        proj.name
      }</span><div class="flex gap-2"><button type="button" class="toggle-proj-btn text-sm">${
        proj.status === "completed" ? " reopening" : "✓"
      }</button><button type="button" class="delete-proj-btn text-red-500 font-bold">&times;</button></div>`;
      li.querySelector("span").addEventListener("click", (e) =>
        editProjectName(e.target, proj.id)
      );
      li.querySelector(".toggle-proj-btn").addEventListener("click", () =>
        toggleProjectStatus(proj.id)
      );
      li.querySelector(".delete-proj-btn").addEventListener("click", () =>
        deleteProject(proj.id)
      );
      dom.projectList.appendChild(li);
    });
  }

  function renderTodos() {
    Object.values(dom.prioLists).forEach((list) => (list.innerHTML = ""));
    dom.completedList.innerHTML = "";

    const selectedProjectId = dom.projectFilter.value;

    const activeTodos = allData.todos
      .filter((t) => !t.completed)
      .filter(
        (t) => selectedProjectId === "all" || t.projectId === selectedProjectId
      )
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        const dateA = a.dueDate ? new Date(a.dueDate) : null;
        const dateB = b.dueDate ? new Date(b.dueDate) : null;
        if (dateA && dateB) return dateA - dateB;
        if (dateA) return -1;
        if (dateB) return 1;
        return 0;
      });

    const completedTodos = allData.todos.filter((t) => t.completed);

    activeTodos.forEach((todo) => {
      const list = dom.prioLists[todo.priority];
      if (list) list.appendChild(createTodoElement(todo));
    });

    completedTodos.forEach((todo) =>
      dom.completedList.appendChild(createTodoElement(todo))
    );
    dom.completedCount.textContent = completedTodos.length;
  }

  function getTodoBackgroundStyle(todo) {
    if (todo.completed) {
      return { style: "background-color: rgba(243, 244, 246, 1);", class: "" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = todo.dueDate ? new Date(todo.dueDate + "T00:00:00") : null;
    const isOverdue = dueDate && dueDate < today;

    if (isOverdue) {
      return { style: "", class: "overdue-task" };
    }
    if (!todo.dueDate) {
      return { style: "", class: "no-deadline-task" };
    }

    const colors = PRIORITY_COLORS[todo.priority];
    if (!colors)
      return { style: "background-color: rgba(255, 255, 255, 1);", class: "" };

    const diffTime = dueDate - today;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const MAX_DAYS = 30;
    let progress = ((MAX_DAYS - daysRemaining) / MAX_DAYS) * 100;
    progress = Math.max(0, Math.min(100, progress));

    const neutralColor = "249, 250, 251"; // gray-50
    const gradient = `background: linear-gradient(to right, rgb(${colors.light}) 0%, rgb(${colors.dark}) ${progress}%, rgba(${neutralColor}, 1) ${progress}%, rgba(${neutralColor}, 1) 100%);`;

    return { style: gradient, class: "" };
  }

  function createTodoElement(todo) {
    const li = document.createElement("li");
    const project = getProjectById(todo.projectId);
    const isProjectDone = project.status === "completed";

    const { style, class: customClass } = getTodoBackgroundStyle(todo);

    li.className = `p-3 border rounded-md transition-all duration-300 text-gray-800 ${
      isProjectDone ? "opacity-60" : ""
    } ${customClass}`;
    li.style = style;

    const dueDate = todo.dueDate ? new Date(todo.dueDate + "T00:00:00") : null;
    const isOverdue = dueDate && !todo.completed && dueDate < new Date();
    const dueDateString = dueDate
      ? dueDate.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
        })
      : "";
    li.innerHTML = `<div class="flex items-start"><input type="checkbox" class="h-5 w-5 mt-1 rounded border-gray-300 text-indigo-600" ${
      todo.completed ? "checked" : ""
    }><div class="ml-3 flex-grow"><p class="${
      todo.completed ? "line-through" : ""
    }">${
      todo.text
    }</p><div class="flex flex-wrap items-center gap-x-3 text-xs text-gray-500 mt-1"><span class="font-semibold">${
      project.name
    }</span>${
      dueDate
        ? `<span class="${
            isOverdue ? "font-bold" : ""
          }">Frist: ${dueDateString}</span>`
        : ""
    }<div class="todo-tags-container flex flex-wrap gap-1"></div></div></div><div class="flex flex-col items-end gap-2">${
      !todo.completed
        ? `<button type="button" class="edit-todo-btn text-blue-600 text-xs">Bearbeiten</button><button type="button" class="add-to-doku-btn bg-green-500 text-white text-xs font-bold py-1 px-2 rounded-full">Doku +</button>`
        : ""
    }<button type="button" class="delete-todo-btn text-red-500 hover:text-red-600 text-xs">Löschen</button></div></div>`;
    const tagsContainer = li.querySelector(".todo-tags-container");
    (todo.tags || []).forEach((tag) => {
      const badge = createTagBadge(tag, false);
      tagsContainer.appendChild(badge);
    });
    li.querySelector('input[type="checkbox"]').addEventListener("change", () =>
      toggleTodoStatus(todo.id)
    );
    li.querySelector(".delete-todo-btn").addEventListener("click", () =>
      deleteTodo(todo.id)
    );
    const editBtn = li.querySelector(".edit-todo-btn");
    if (editBtn)
      editBtn.addEventListener("click", () => openEditModal(todo.id));
    const dokuBtn = li.querySelector(".add-to-doku-btn");
    if (dokuBtn) {
      dokuBtn.addEventListener("click", () => addTodoToDoku(todo));
    }
    return li;
  }

  function addProject() {
    const name = dom.newProjectName.value.trim();
    if (name && !allData.projects.some((p) => p.name === name)) {
      allData.projects.push({ id: generateId(), name, status: "active" });
      dom.newProjectName.value = "";
      saveData();
      render();
    }
  }
  function editProjectName(spanElement, id) {
    const currentName = spanElement.textContent;
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentName;
    input.className = "font-semibold form-input p-0 border-blue-500";
    spanElement.replaceWith(input);
    input.focus();
    input.addEventListener("blur", () => saveName());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveName();
      if (e.key === "Escape") cancelEdit();
    });
    function saveName() {
      const newName = input.value.trim();
      if (newName) {
        const proj = allData.projects.find((p) => p.id === id);
        if (proj) proj.name = newName;
      }
      saveData();
      render();
    }
    function cancelEdit() {
      render();
    }
  }
  function toggleProjectStatus(id) {
    const proj = allData.projects.find((p) => p.id === id);
    if (proj) {
      proj.status = proj.status === "active" ? "completed" : "active";
      saveData();
      render();
    }
  }
  function deleteProject(id) {
    if (
      confirm(
        "Sollen dieses Projekt und alle zugehörigen Aufgaben wirklich gelöscht werden?"
      )
    ) {
      allData.projects = allData.projects.filter((p) => p.id !== id);
      allData.todos = allData.todos.filter((t) => t.projectId !== id);
      saveData();
      render();
    }
  }

  function addTodo() {
    const text = dom.newTodoText.value.trim();
    if (!text) {
      showNotification("Aufgabentext darf nicht leer sein.", true);
      return;
    }
    allData.todos.push({
      id: generateId(),
      text,
      projectId: dom.newTodoProject.value,
      priority: dom.newTodoPriority.value,
      dueDate: dom.newTodoDueDate.value,
      tags: currentTodoTags,
      completed: false,
    });
    dom.newTodoText.value = "";
    dom.newTodoDueDate.value = "";
    dom.newTodoTagsContainer.innerHTML = "";
    currentTodoTags = [];
    saveData();
    render();
  }

  function toggleTodoStatus(id) {
    const todo = allData.todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      saveData();
      render();
    }
  }
  function deleteTodo(id) {
    allData.todos = allData.todos.filter((t) => t.id !== id);
    saveData();
    render();
  }
  function addTodoToDoku(todo) {
    localStorage.setItem(
      "pendingTodo",
      JSON.stringify({ text: todo.text, tags: todo.tags || [] })
    );
    window.location.href = "/";
  }

  function openEditModal(id) {
    const todo = allData.todos.find((t) => t.id === id);
    if (!todo) return;
    dom.editTodoId.value = id;
    dom.editTodoText.value = todo.text;
    dom.editTodoProject.value = todo.projectId;
    dom.editTodoPriority.value = todo.priority;
    dom.editTodoDueDate.value = todo.dueDate;
    currentEditTodoTags = [...(todo.tags || [])];
    renderEditTodoTags();
    dom.editModal.classList.remove("hidden");
  }

  function closeEditModal() {
    dom.editModal.classList.add("hidden");
  }

  function saveTodoChanges() {
    const id = dom.editTodoId.value;
    const todo = allData.todos.find((t) => t.id === id);
    if (!todo) return;
    todo.text = dom.editTodoText.value.trim();
    todo.projectId = dom.editTodoProject.value;
    todo.priority = dom.editTodoPriority.value;
    todo.dueDate = dom.editTodoDueDate.value;
    todo.tags = currentEditTodoTags;
    closeEditModal();
    saveData();
    render();
  }

  function setupTagSearch(input, suggestions, tagsArray, renderFn) {
    input.addEventListener("input", () => {
      suggestions.innerHTML = "";
      const query = input.value.toLowerCase();
      if (!query) return;
      Object.keys(allData.tagCategoryMap)
        .filter(
          (tag) => tag.toLowerCase().includes(query) && !tagsArray.includes(tag)
        )
        .slice(0, 5)
        .forEach((tag) => {
          const item = document.createElement("a");
          item.href = "#";
          item.className = "block p-2 hover:bg-gray-100 text-sm";
          item.textContent = tag;
          item.onclick = (e) => {
            e.preventDefault();
            tagsArray.push(tag);
            renderFn();
            input.value = "";
            suggestions.innerHTML = "";
          };
          suggestions.appendChild(item);
        });
    });
  }

  function renderTagContainer(container, tagsArray, renderFn) {
    container.innerHTML = "";
    tagsArray.forEach((tag) => {
      const badge = createTagBadge(tag, true);
      badge.querySelector(".tag-badge-remove").onclick = () => {
        const index = tagsArray.indexOf(tag);
        if (index > -1) {
          tagsArray.splice(index, 1);
        }
        renderFn();
      };
      container.appendChild(badge);
    });
  }

  const renderCurrentTodoTags = () =>
    renderTagContainer(
      dom.newTodoTagsContainer,
      currentTodoTags,
      renderCurrentTodoTags
    );
  const renderEditTodoTags = () =>
    renderTagContainer(
      dom.editTodoTagsContainer,
      currentEditTodoTags,
      renderEditTodoTags
    );

  function createTagBadge(tagName, isEditable) {
    const b = document.createElement("span");
    b.className = "tag-badge text-xs";
    b.textContent = tagName;
    b.style.backgroundColor = allData.tagCategoryMap[tagName]
      ? CATEGORY_CHART_COLORS[allData.tagCategoryMap[tagName]]
      : "#6c757d";
    if (isEditable) {
      const r = document.createElement("span");
      r.className = "tag-badge-remove";
      r.innerHTML = "&times;";
      b.appendChild(r);
    }
    return b;
  }

  async function run() {
    await loadAllData();
    setupTagSearch(
      dom.newTodoTagSearch,
      dom.newTodoTagSuggestions,
      currentTodoTags,
      renderCurrentTodoTags
    );
    setupTagSearch(
      dom.editTodoTagSearch,
      dom.editTodoTagSuggestions,
      currentEditTodoTags,
      renderEditTodoTags
    );
    dom.addProjectBtn.addEventListener("click", addProject);
    dom.addTodoBtn.addEventListener("click", addTodo);
    dom.saveEditBtn.addEventListener("click", saveTodoChanges);
    dom.cancelEditBtn.addEventListener("click", closeEditModal);
    dom.projectFilter.addEventListener("change", renderTodos);
    render();
  }
  run();
});
