import { api, setSession, clearSession, getToken } from "./api.js";
const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const authForm = document.querySelector("#auth-form");
const authError = document.querySelector("#auth-error");
const authSubmit = document.querySelector("#auth-submit");
const listEl = document.querySelector("#list");
const clock = document.querySelector("#clock");
const toggle = document.querySelector("#toggle");
const formError = document.querySelector("#form-error");
let mode = "login";
let kind = "foco";
let total = 25 * 60;
let left = total;
let timer = 0;
const showError = (el, message) => { el.hidden = !message; el.textContent = message || ""; };
const pad = (n) => String(n).padStart(2, "0");

function paint() { clock.textContent = `${pad(Math.floor(left / 60))}:${pad(left % 60)}`; }
function stop() { clearInterval(timer); timer = 0; toggle.textContent = "Empezar"; }
async function refresh() {
  const data = await api("/api/sessions");
  document.querySelector("#today").textContent = data.focusToday;
  listEl.innerHTML = "";
  data.sessions.forEach((session) => {
    const li = document.createElement("li");
    li.className = "item";
    const text = document.createElement("span");
    text.textContent = `${session.kind} \u00b7 ${session.minutes} min`;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "ghost";
    del.textContent = "Borrar";
    del.addEventListener("click", async () => { await api(`/api/sessions/${session.id}`, { method: "DELETE" }); await refresh(); });
    li.append(text, del);
    listEl.append(li);
  });
}
async function finish() {
  stop();
  try {
    await api("/api/sessions", { method: "POST", body: JSON.stringify({ kind, minutes: Math.round(total / 60) }) });
    await refresh();
  } catch (err) { showError(formError, err.message); }
  left = total;
  paint();
}
function setMode(next) {
  mode = next;
  document.querySelectorAll("#auth-view .tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
  authSubmit.textContent = mode === "login" ? "Entrar" : "Crear cuenta";
}
async function boot() {
  if (!getToken()) return;
  try {
    const { user } = await api("/api/auth/me");
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    document.querySelector("#user-name").textContent = user.username;
    paint();
    await refresh();
  } catch { clearSession(); }
}
document.querySelectorAll("#auth-view .tab").forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
document.querySelectorAll("#app-view .tab").forEach((tab) => tab.addEventListener("click", () => {
  stop();
  kind = tab.dataset.kind;
  total = Number(tab.dataset.minutes) * 60;
  left = total;
  document.querySelectorAll("#app-view .tab").forEach((item) => item.classList.toggle("active", item === tab));
  paint();
}));
toggle.addEventListener("click", () => {
  if (timer) { stop(); return; }
  toggle.textContent = "Pausa";
  timer = setInterval(() => { left -= 1; paint(); if (left <= 0) finish(); }, 1000);
});
document.querySelector("#reset").addEventListener("click", () => { stop(); left = total; paint(); });
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(authError, "");
  const fd = new FormData(authForm);
  try {
    const data = await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", { method: "POST", body: JSON.stringify({ username: fd.get("username"), password: fd.get("password") }) });
    setSession(data.token);
    authForm.reset();
    await boot();
  } catch (err) { showError(authError, err.message); }
});
document.querySelector("#logout").addEventListener("click", () => { stop(); clearSession(); appView.classList.add("hidden"); authView.classList.remove("hidden"); });
boot();
