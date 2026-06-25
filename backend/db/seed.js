import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const db = new Database(process.env.DB_PATH || "database.sqlite");

db.exec("PRAGMA foreign_keys = ON");

/* ---------------- CLEAN OLD DATA ---------------- */

db.exec(`
  DELETE FROM tasks;
  DELETE FROM columns;
  DELETE FROM boards;
  DELETE FROM users;
`);

/* ---------------- CREATE USER ---------------- */

const passwordHash = bcrypt.hashSync("123456", 10);

const userId = db.prepare(`
  INSERT INTO users (email, password)
  VALUES (?, ?)
`).run("test@test.com", passwordHash).lastInsertRowid;

/* ---------------- CREATE BOARD ---------------- */

const boardId = db.prepare(`
  INSERT INTO boards (name, user_id)
  VALUES (?, ?)
`).run("Demo Board", userId).lastInsertRowid;

/* ---------------- CREATE COLUMNS ---------------- */

const columnIds = {
  todo: db.prepare(`
    INSERT INTO columns (title, board_id, position)
    VALUES (?, ?, ?)
  `).run("Очередь", boardId, 1).lastInsertRowid,

  doing: db.prepare(`
    INSERT INTO columns (title, board_id, position)
    VALUES (?, ?, ?)
  `).run("В работе", boardId, 2).lastInsertRowid,

  done: db.prepare(`
    INSERT INTO columns (title, board_id, position)
    VALUES (?, ?, ?)
  `).run("Готово", boardId, 3).lastInsertRowid
};

/* ---------------- CREATE TASKS ---------------- */

const insertTask = db.prepare(`
  INSERT INTO tasks (text, status, column_id)
  VALUES (?, ?, ?)
`);

insertTask.run("Настроить проект", "done", columnIds.todo);
insertTask.run("Сделать layout", "in_work", columnIds.todo);

insertTask.run("Реализовать resizer", "in_work", columnIds.doing);
insertTask.run("Подключить API", "awaiting", columnIds.doing);

insertTask.run("Задеплоить проект", "awaiting", columnIds.done);

/* ---------------- DONE ---------------- */

console.log("Seed completed successfully");
console.log({
  userId,
  boardId,
  columnIds
});

db.close();