/*
 * Login / sign-up in the browser (the "front end" half).
 *
 * The front end only does two jobs:
 *   1. Show the forms and send what the user typed to the server (/api/signup, /api/login).
 *   2. Show the right buttons depending on whether the user is logged in.
 *
 * It does NOT decide who is allowed in. Only the server can do that, because anything in the
 * browser can be changed by the user. We check things here only to give friendly, instant hints.
 *
 * The session cookie is set by the server and is "httpOnly", so this file can never read it.
 * We find out who is logged in by asking the server: GET /api/me.
 */
(function () {
  "use strict";

  const el = id => document.getElementById(id);
  const btn = el("authBtn"), dlg = el("authDlg"), form = el("authForm");
  if (!btn || !dlg || !dlg.showModal) return; // very old browser: leave the site as it is

  let user = null;      // null = logged out, otherwise { name, email }
  let mode = "login";   // "login" or "signup"

  /* ---------- Talking to the server ---------- */
  async function api(path, body) {
    const res = await fetch("/api" + path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin" // send our cookie
    });
    // The login server always answers with JSON. A static host (Netlify, GitHub Pages) answers
    // /api/... with an HTML "not found" page, so we know there is no login server there.
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    return { ok: res.ok, status: res.status, data: isJson ? await res.json() : null };
  }

  /* ---------- Small UI helpers ---------- */
  let toastTimer;
  function toast(msg) {
    const t = el("toast");
    t.textContent = msg;          // textContent, never innerHTML: user text can't inject HTML (XSS)
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
  }

  function showError(msg) {
    const e = el("authErr");
    e.textContent = msg;
    e.hidden = !msg;
  }

  // Update the header button for the current state.
  function render() {
    const lbl = el("authLbl");
    if (user) {
      const first = user.name.split(" ")[0];
      lbl.textContent = "Hi, " + first;
      btn.classList.add("in");
      btn.dataset.initial = first.charAt(0).toUpperCase(); // shown as an avatar circle on phones
      btn.setAttribute("aria-label", "Account: " + user.name);
    } else {
      lbl.textContent = "Log in";
      btn.classList.remove("in");
      btn.removeAttribute("aria-label");
    }
  }

  function setMode(next) {
    mode = next;
    const signup = mode === "signup";
    el("tabLogin").setAttribute("aria-selected", String(!signup));
    el("tabSignup").setAttribute("aria-selected", String(signup));
    el("authTitle").textContent = signup ? "Create your account" : "Welcome back";
    el("authSub").textContent = signup ? "Sign up to get started with Wonkar Table Tennis Academy." : "Log in to your academy account.";
    el("authSubmit").textContent = signup ? "Create account" : "Log in";
    el("nameRow").hidden = !signup;
    el("pwHint").hidden = !signup;
    // autocomplete hint lets password managers offer the right thing
    el("pw").setAttribute("autocomplete", signup ? "new-password" : "current-password");
    showError("");
  }

  function openDialog() {
    el("authForms").hidden = !!user;
    el("authAccount").hidden = !user;
    if (user) {
      el("accName").textContent = user.name;
      el("accEmail").textContent = user.email;
    } else {
      form.reset();
      el("pw").type = "password";
      setMode(mode);
    }
    dlg.showModal();
    const first = user ? el("logoutBtn") : form.querySelector(mode === "signup" ? "[name=name]" : "[name=email]");
    if (first) first.focus();
  }

  /* ---------- Events ---------- */
  btn.addEventListener("click", openDialog);
  el("authX").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); }); // click on the dark backdrop
  el("tabLogin").addEventListener("click", () => setMode("login"));
  el("tabSignup").addEventListener("click", () => setMode("signup"));
  el("showPw").addEventListener("change", e => { el("pw").type = e.target.checked ? "text" : "password"; });

  form.addEventListener("submit", async e => {
    e.preventDefault(); // stop the browser from reloading the page
    showError("");
    const f = new FormData(form);
    const name = String(f.get("name") || "").trim();
    const email = String(f.get("email") || "").trim();
    const password = String(f.get("password") || "");

    // Friendly checks first (the server checks again, because it can't trust us).
    if (mode === "signup" && name.length < 2) return showError("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError("Please enter a valid email address.");
    if (!password) return showError("Please enter your password.");
    if (mode === "signup" && password.length < 8) return showError("Password must be at least 8 characters.");

    const submit = el("authSubmit");
    const label = submit.textContent;
    submit.disabled = true;
    submit.textContent = mode === "signup" ? "Creating..." : "Logging in...";
    try {
      const r = await api(mode === "signup" ? "/signup" : "/login",
        mode === "signup" ? { name, email, password } : { email, password });
      if (!r.ok) {
        showError((r.data && r.data.error) || "Something went wrong. Please try again.");
        return;
      }
      user = r.data.user;
      render();
      dlg.close();
      toast(mode === "signup" ? "Welcome, " + user.name + "! Your account is ready." : "Welcome back, " + user.name + "!");
    } catch (err) {
      showError("Could not reach the server. Check your connection and try again.");
    } finally {
      submit.disabled = false;
      submit.textContent = label;
    }
  });

  el("logoutBtn").addEventListener("click", async () => {
    try { await api("/logout", {}); } catch (e) { /* even if the call fails, show logged out */ }
    user = null;
    render();
    dlg.close();
    toast("You have been logged out.");
  });

  /* ---------- Start-up: is there a login server, and is someone logged in? ---------- */
  (async function init() {
    try {
      const r = await api("/me");
      if (!r.ok || r.data === null) return; // no login server here (static hosting): keep the button hidden
      user = r.data.user;               // an object when logged in, null when logged out
      render();
      btn.hidden = false;
      document.documentElement.classList.add("has-auth"); // lets the CSS make room in the header
    } catch (e) { /* server not reachable: keep the site working without login */ }
  })();
})();
