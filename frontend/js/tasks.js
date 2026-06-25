const API = "http://193.233.90.152:3000";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "auth.html";
}

/* ---------------- STATE ---------------- */

const state = {
  board: null,
  columns: [],
  tasks: []
};

/* ---------------- DOM ---------------- */

const boardEl = document.querySelector(".board");

/* ---------------- ROUTE ---------------- */

const boardId = new URLSearchParams(window.location.search).get("boardId");

if (!boardId) {
  window.location.href = "boards.html";
}

/* ---------------- INIT ---------------- */

init();

async function init() {
  await loadBoard();
  await loadBoardsSidebar();
}

/* ---------------- API ---------------- */

async function fetchBoardFull() {
  const res = await fetch(`${API}/boards/${boardId}/full`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    window.location.href = "auth.html";
    return;
  }

  return res.json();
}

async function updateTask(taskId, columnId) {
  await fetch(`${API}/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ column_id: columnId })
  });
}

async function deleteTask(taskId) {
  await fetch(`${API}/tasks/${taskId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

async function fetchBoards() {
  const res = await fetch(`${API}/boards`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.json();
}

/* ---------------- LOAD ---------------- */

async function loadBoard() {
  const data = await fetchBoardFull();

  state.board = data.board;
  state.columns = data.columns;
  state.tasks = data.tasks;

  renderBoard();
}

/* ---------------- RENDER ---------------- */

function renderBoard() {
  boardEl.innerHTML = "";

  state.columns.forEach(renderColumn);
}

function renderColumn(column) {
  const columnEl = document.createElement("div");
  columnEl.className = "column";
  columnEl.dataset.id = column.id;

  setupDrop(columnEl, column.id);

  /* title */
  const titleEl = document.createElement("div");
  titleEl.className = "column__title";
  titleEl.textContent = column.title;

  columnEl.appendChild(titleEl);

  /* tasks */
  

  /* CREATE TASK UI */
  const input = document.createElement("input");
  input.className = "task-input";
  input.placeholder = "New task...";

  const btn = document.createElement("button");
  btn.className = "task-add-btn";
  btn.textContent = "+";

  const addTask = async () => {
    const text = input.value.trim();
    if (!text) return;

    await createTask(text, column.id);

    input.value = "";
    await loadBoard();
  };

  btn.onclick = addTask;

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") addTask();
  });

  const creator = document.createElement("div");
  creator.className = "task-creator";

  creator.appendChild(input);
  creator.appendChild(btn);

  columnEl.appendChild(creator);

  const tasks = state.tasks.filter(t => t.column_id === column.id);
  tasks.forEach(task => columnEl.appendChild(renderTask(task)));

  boardEl.appendChild(columnEl);
}

function renderTask(task) {
  const taskEl = document.createElement("div");
  taskEl.className = "task";
  taskEl.draggable = true;

  const text = document.createElement("span");
  text.textContent = task.text;

  const delBtn = document.createElement("button");
  delBtn.textContent = "×";
  delBtn.className = "task-delete";

  delBtn.onclick = async (e) => {
    e.stopPropagation();

    if (!confirm("Удалить задачу?")) return;

    await deleteTask(task.id);
    await loadBoard();
  };

  taskEl.appendChild(text);
  taskEl.appendChild(delBtn);

  taskEl.addEventListener("dragstart", e => {
    taskEl.classList.add("dragging");
    e.dataTransfer.setData("taskId", task.id);
  });

  taskEl.addEventListener("dragend", () => {
    taskEl.classList.remove("dragging");
  });

  return taskEl;
}

/* ---------------- DND ---------------- */

function setupDrop(columnEl, columnId) {
  columnEl.addEventListener("dragover", e => {
    e.preventDefault();
    columnEl.classList.add("drag-over");
  });

  columnEl.addEventListener("dragleave", () => {
    columnEl.classList.remove("drag-over");
  });

  columnEl.addEventListener("drop", async e => {
    e.preventDefault();
    columnEl.classList.remove("drag-over");

    const taskId = e.dataTransfer.getData("taskId");

    await updateTask(taskId, columnId);
    await loadBoard();
  });
}

/* ---------------- SIDEBAR ---------------- */

async function loadBoardsSidebar() {
  const boards = await fetchBoards();

  const list = document.getElementById("boards-list");
  if (!list) return;

  list.innerHTML = "";

  boards.forEach(board => {
    const el = document.createElement("div");
    el.className = "board-item";
    el.textContent = board.name;

    el.onclick = () => {
      window.location.href = `tasks.html?boardId=${board.id}`;
    };

    list.appendChild(el);
  });
}

/* ---------------- NAV ---------------- */

function goHome() {
  window.location.href = "boards.html";
}

async function createTask(text, columnId) {
  const res = await fetch(`${API}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      text,
      column_id: columnId
    })
  });

  return res.json();
}
