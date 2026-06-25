const API = "http://193.233.90.152:3000";

let mode = "login"; // login | register

function toggleMode() {
  mode = mode === "login" ? "register" : "login";

  document.getElementById("title").textContent =
    mode === "login" ? "Login" : "Register";

  document.querySelector(".auth-button").textContent =
    mode === "login" ? "Login" : "Register";

  document.querySelector(".auth-switch").textContent =
    mode === "login"
      ? "No account? Register"
      : "Already have an account? Login";
}

function show(data) {
  document.getElementById("output").textContent =
    JSON.stringify(data, null, 2);
}

/* ---------------- SUBMIT ---------------- */

async function submitAuth() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const url =
    mode === "login"
      ? "/auth/login"
      : "/auth/register";

  const res = await fetch(API + url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  show(data);

  if (data.token) {
    localStorage.setItem("token", data.token);
    window.location.href = "tasks.html";
  }
}
