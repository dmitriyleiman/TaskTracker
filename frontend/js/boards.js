const API = "http://localhost:3000";
const token = localStorage.getItem("token");

/* ---------------- AUTH GUARD ---------------- */

if (!token) {
  window.location.href = "auth.html";
}

/* ---------------- STATE ---------------- */

const state = {
  boards: []
};

/* ---------------- DOM ---------------- */

const listEl = document.getElementById("boards-list");

/* ---------------- INIT ---------------- */

init();

async function init() {
  await loadBoards();
}

/* ---------------- API ---------------- */

async function fetchBoards() {
  const res = await fetch(`${API}/boards`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    window.location.href = "auth.html";
    return [];
  }

  return res.json();
}

/* ---------------- LOAD ---------------- */

async function loadBoards() {
  state.boards = await fetchBoards();
  renderBoards();
}

/* ---------------- RENDER ---------------- */

function renderBoards() {
  if (!listEl) return;

  listEl.innerHTML = "";

  state.boards.forEach(renderBoardItem);
}

function renderBoardItem(board) {
  const el = document.createElement("div");
  el.className = "board-item";
  el.textContent = board.name;

  el.addEventListener("click", () => openBoard(board.id));

  listEl.appendChild(el);
}

/* ---------------- ACTIONS ---------------- */

function openBoard(boardId) {
  window.location.href = `tasks.html?boardId=${boardId}`;
}

function reloadBoards() {
  loadBoards();
}

async function createBoard() {
  const input = document.getElementById("boardNameInput");
  const name = input.value.trim();

  if (!name) return;

  const res = await fetch(`${API}/boards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  });

  if (!res.ok) {
    alert("Error creating board");
    return;
  }

  input.value = "";
  await loadBoards();
}