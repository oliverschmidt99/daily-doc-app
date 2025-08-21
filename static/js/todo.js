document.addEventListener("DOMContentLoaded", () => {
  const newTodoInput = document.getElementById("new-todo-input");
  const addTodoBtn = document.getElementById("add-todo-btn");
  const todoList = document.getElementById("todo-list");

  let todos = [];

  function loadTodos() {
    const storedTodos = localStorage.getItem("todos");
    todos = storedTodos ? JSON.parse(storedTodos) : [];
  }

  function saveTodos() {
    localStorage.setItem("todos", JSON.stringify(todos));
  }

  function renderTodoList() {
    todoList.innerHTML = "";
    todos.forEach((todo, index) => {
      const li = document.createElement("li");
      li.className = `flex items-center justify-between p-3 rounded-lg border border-accent ${
        todo.completed
          ? "bg-secondary text-text-secondary line-through"
          : "bg-primary"
      }`;
      li.innerHTML = `
                <div class="flex items-center">
                    <input type="checkbox" data-index="${index}" class="h-5 w-5 rounded border-gray-300 text-cyan-glow focus:ring-cyan-glow bg-primary" ${
        todo.completed ? "checked" : ""
      }>
                    <label class="ml-3">${todo.text}</label>
                </div>
                <div>
                    ${
                      todo.completed
                        ? `<button data-text="${todo.text}" class="add-to-doku-btn bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded">Zur Doku +</button>`
                        : ""
                    }
                    <button data-index="${index}" class="remove-todo-btn text-red-500 hover:text-red-700 font-bold ml-2 text-lg">×</button>
                </div>
            `;
      todoList.appendChild(li);
    });

    addEventListeners();
  }

  function addTodoToDoku(text) {
    const todo = { text };
    localStorage.setItem("pendingTodo", JSON.stringify(todo));
    window.location.href = "/"; // Leitet zur Doku-Seite weiter
  }

  function addEventListeners() {
    document
      .querySelectorAll(".remove-todo-btn")
      .forEach((btn) =>
        btn.addEventListener("click", (e) => removeTodo(e.target.dataset.index))
      );
    document
      .querySelectorAll('input[type="checkbox"]')
      .forEach((box) =>
        box.addEventListener("change", (e) =>
          toggleTodo(e.target.dataset.index)
        )
      );
    document
      .querySelectorAll(".add-to-doku-btn")
      .forEach((btn) =>
        btn.addEventListener("click", (e) =>
          addTodoToDoku(e.target.dataset.text)
        )
      );
  }

  function addTodo() {
    const text = newTodoInput.value.trim();
    if (text) {
      todos.push({ text, completed: false });
      newTodoInput.value = "";
      saveTodos();
      renderTodoList();
    }
  }

  function removeTodo(index) {
    todos.splice(index, 1);
    saveTodos();
    renderTodoList();
  }

  function toggleTodo(index) {
    todos[index].completed = !todos[index].completed;
    saveTodos();
    renderTodoList();
  }

  addTodoBtn.addEventListener("click", addTodo);
  newTodoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTodo();
  });

  // Initial load
  loadTodos();
  renderTodoList();
});
