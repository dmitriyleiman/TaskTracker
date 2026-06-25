import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import { db } from "./db/init.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

/* ---------------- MIDDLEWARE ---------------- */

app.use(express.static("../frontend"));
app.use(cors({
  origin: "http://localhost:3001",
  credentials: true
}));

app.use(express.json());

/* ---------------- AUTH MIDDLEWARE ---------------- */

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "No token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ---------------- JWT ---------------- */

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/* ---------------- AUTH ---------------- */

// REGISTER
app.post("/auth/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const exists = db.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).get(email);

  if (exists) {
    return res.status(409).json({ error: "User exists" });
  }

  const hashed = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (email, password)
    VALUES (?, ?)
  `).run(email, hashed);

  const user = { id: result.lastInsertRowid, email };

  const token = generateToken(user);

  res.json({ token, user });
});

// LOGIN
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare(
    "SELECT * FROM users WHERE email = ?"
  ).get(email);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = bcrypt.compareSync(password, user.password);

  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateToken(user);

  res.json({
    token,
    user: { id: user.id, email: user.email }
  });
});

// ME
app.get("/auth/me", authMiddleware, (req, res) => {
  const user = db.prepare(
    "SELECT id, email FROM users WHERE id = ?"
  ).get(req.user.id);

  res.json(user);
});

/* ---------------- BOARDS ---------------- */

// GET BOARDS
app.get("/boards", authMiddleware, (req, res) => {
  const boards = db.prepare(`
    SELECT * FROM boards WHERE user_id = ?
  `).all(req.user.id);

  res.json(boards);
});

// CREATE BOARD
app.post("/boards", authMiddleware, (req, res) => {
  const { name } = req.body;

  const result = db.prepare(`
    INSERT INTO boards (name, user_id)
    VALUES (?, ?)
  `).run(name, req.user.id);

  res.json({
    id: result.lastInsertRowid,
    name
  });
});

// FULL BOARD (columns + tasks)
app.get("/boards/:id/full", authMiddleware, (req, res) => {
  const boardId = req.params.id;

  const board = db.prepare(
    "SELECT * FROM boards WHERE id = ?"
  ).get(boardId);

  const columns = db.prepare(`
    SELECT * FROM columns
    WHERE board_id = ?
    ORDER BY position ASC
  `).all(boardId);

  const tasks = db.prepare(`
    SELECT * FROM tasks
    WHERE column_id IN (
      SELECT id FROM columns WHERE board_id = ?
    )
  `).all(boardId);

  res.json({ board, columns, tasks });
});

/* ---------------- COLUMNS ---------------- */

// CREATE COLUMN
app.post("/columns", authMiddleware, (req, res) => {
  const { title, board_id } = req.body;

  const result = db.prepare(`
    INSERT INTO columns (title, board_id, position)
    VALUES (?, ?, ?)
  `).run(title, board_id, 0);

  res.json({
    id: result.lastInsertRowid,
    title,
    board_id
  });
});

// GET COLUMNS
app.get("/boards/:id/columns", authMiddleware, (req, res) => {
  const columns = db.prepare(`
    SELECT * FROM columns
    WHERE board_id = ?
    ORDER BY position ASC
  `).all(req.params.id);

  res.json(columns);
});

// DELETE COLUMN
app.delete("/columns/:id", authMiddleware, (req, res) => {
  db.prepare("DELETE FROM columns WHERE id = ?")
    .run(req.params.id);

  res.json({ ok: true });
});

/* ---------------- TASKS ---------------- */

// CREATE TASK
app.post("/tasks", authMiddleware, (req, res) => {
  const { text, column_id } = req.body;

  const result = db.prepare(`
    INSERT INTO tasks (text, column_id, status)
    VALUES (?, ?, ?)
  `).run(text, column_id, "awaiting");

  res.json({
    id: result.lastInsertRowid,
    text,
    column_id
  });
});

// GET TASKS
app.get("/columns/:id/tasks", authMiddleware, (req, res) => {
  const tasks = db.prepare(`
    SELECT * FROM tasks
    WHERE column_id = ?
  `).all(req.params.id);

  res.json(tasks);
});

// UPDATE TASK
app.patch("/tasks/:id", authMiddleware, (req, res) => {
  const { text, column_id, status } = req.body;

  db.prepare(`
    UPDATE tasks
    SET
      text = COALESCE(?, text),
      column_id = COALESCE(?, column_id),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(text, column_id, status, req.params.id);

  res.json({ ok: true });
});

// DELETE TASK
app.delete("/tasks/:id", authMiddleware, (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id = ?")
    .run(req.params.id);

  res.json({ ok: true });
});

/* ---------------- START ---------------- */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
