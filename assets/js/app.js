document.addEventListener("DOMContentLoaded", () => {
  enforceAuthGuard();
  initSidebar();
  initTooltips();
  initCSVPreview();
  initTemplatePreview();
  initApiKeyToggle();
  initAuth();
  initContactsPage();
  initTemplatesPage();
  initLogsPage();
  initSettingsPage();
  initDashboardPage();
  initValidation();
  bindDemoActions();
  startBackendKeepAlive();
});

// Use empty string so API calls are relative to the current host
const API_BASE_URL = "";

/* ── Backend Keep-Alive Pinger ────────────────────────────────
   Pings the /health endpoint every 4 minutes so Render's free
   tier never puts the backend to sleep.  A small status pill
   in the bottom-left corner shows the live connection state.
   ─────────────────────────────────────────────────────────── */
const PING_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
let _pingTimer = null;

function startBackendKeepAlive() {
  // Create the status indicator pill
  createStatusIndicator();
  // First ping immediately
  pingBackend();
  // Then repeat every 4 minutes
  _pingTimer = setInterval(pingBackend, PING_INTERVAL_MS);
}

async function pingBackend() {
  const indicator = document.getElementById("backendStatusDot");
  const label = document.getElementById("backendStatusLabel");
  if (indicator) indicator.className = "status-indicator-dot pinging";
  if (label) label.textContent = "Pinging…";

  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (res.ok) {
      if (indicator) indicator.className = "status-indicator-dot online";
      if (label) label.textContent = "Backend Online";
    } else {
      throw new Error("not ok");
    }
  } catch {
    if (indicator) indicator.className = "status-indicator-dot offline";
    if (label) label.textContent = "Backend Offline";
  }
}

function createStatusIndicator() {
  // Don't add on login page
  const page = window.location.pathname.split("/").pop() || "index.html";
  if (page === "index.html" || page === "") return;

  const pill = document.createElement("div");
  pill.id = "backendStatusPill";
  pill.innerHTML = `
    <span class="status-indicator-dot pinging" id="backendStatusDot"></span>
    <span class="status-indicator-label" id="backendStatusLabel">Connecting…</span>
  `;
  document.body.appendChild(pill);
}

/* ── Auth Guard ─────────────────────────────────────────────── */
function enforceAuthGuard() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const isPublicPage = page === "index.html" || page === "";
  const token = localStorage.getItem("wa_token");
  if (!isPublicPage && !token) {
    window.location.href = "index.html";
  }
}

/* ── Sidebar ────────────────────────────────────────────────── */
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("mobileOverlay");
  const toggleBtn = document.getElementById("sidebarToggle");

  if (!sidebar || !overlay || !toggleBtn) return;

  const closeSidebar = () => {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
  };

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("show");
    overlay.classList.toggle("show");
  });

  overlay.addEventListener("click", closeSidebar);
  document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 992) closeSidebar();
    });
  });

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("wa_token");
      window.location.href = "index.html";
    });
  }
}

/* ── Tooltips ───────────────────────────────────────────────── */
function initTooltips() {
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
}

/* ── CSV Preview ────────────────────────────────────────────── */
function initCSVPreview() {
  const input = document.getElementById("csvFile");
  const list = document.getElementById("csvPreviewList");
  const nameEl = document.getElementById("csvFileName");
  if (!input || !list || !nameEl) return;

  input.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    nameEl.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || "");
      const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 6);
      list.innerHTML = lines.length
        ? lines
            .map((line, idx) => `<li class="list-group-item">${idx + 1}. ${line}</li>`)
            .join("")
        : '<li class="list-group-item text-muted">No preview available.</li>';
      showToast("CSV uploaded and preview generated.", "success");
    };
    reader.readAsText(file);
  });
}

/* ── Template Preview (Campaign Builder) ────────────────────── */
function initTemplatePreview() {
  const templateSelect = document.getElementById("templateSelect");
  const variableInputs = document.querySelectorAll("[data-var-key]");
  const preview = document.getElementById("messagePreview");
  if (!templateSelect || !preview) return;

  const templates = {
    welcome:
      "Hi {{name}}, welcome to {{company}}. Your onboarding call is scheduled on {{date}}.",
    offer:
      "Hi {{name}}, get {{discount}} off on your next purchase. Use code {{code}} today.",
    reminder:
      "Hello {{name}}, this is a reminder for your appointment on {{date}} at {{time}}."
  };

  const render = () => {
    let body = templates[templateSelect.value] || "Select a template to preview message.";
    variableInputs.forEach((input) => {
      const key = input.dataset.varKey;
      const value = input.value.trim() || `{${key}}`;
      body = body.replaceAll(`{{${key}}}`, value);
    });
    preview.textContent = body;
  };

  templateSelect.addEventListener("change", render);
  variableInputs.forEach((input) => input.addEventListener("input", render));
  render();
}

/* ── API Key Toggle Eye ─────────────────────────────────────── */
function initApiKeyToggle() {
  const keyInput = document.getElementById("apiKey");
  const toggle = document.getElementById("toggleApiKey");
  if (!keyInput || !toggle) return;
  toggle.addEventListener("click", () => {
    const isHidden = keyInput.type === "password";
    keyInput.type = isHidden ? "text" : "password";
    toggle.innerHTML = isHidden ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
  });
}

/* ── Form Validation ────────────────────────────────────────── */
function initValidation() {
  const forms = document.querySelectorAll(".needs-validation");
  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      } else if (!form.dataset.noToast) {
        e.preventDefault();
        const msg = form.dataset.successMessage || "Saved successfully.";
        showToast(msg, "success");
        const modalEl = form.closest(".modal");
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
          form.reset();
          form.classList.remove("was-validated");
        }
      }
      form.classList.add("was-validated");
    });
  });
}

/* ── Demo Toast Buttons ─────────────────────────────────────── */
function bindDemoActions() {
  document.querySelectorAll("[data-toast]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const message = btn.dataset.toast || "Action completed.";
      const type = btn.dataset.type || "primary";
      showToast(message, type);
    });
  });
}

/* ── Auth (Login / Register) ────────────────────────────────── */
function initAuth() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!registerForm.checkValidity()) {
        e.stopPropagation();
        registerForm.classList.add("was-validated");
        return;
      }

      const payload = {
        full_name: document.getElementById("registerName")?.value.trim(),
        email: document.getElementById("registerEmail")?.value.trim(),
        password: document.getElementById("registerPassword")?.value
      };

      try {
        await apiPost("/auth/register", payload);
        showToast("Registration successful. You can login now.", "success");
        const modalEl = document.getElementById("registerModal");
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          modal.hide();
        }
        registerForm.reset();
        registerForm.classList.remove("was-validated");
      } catch (err) {
        showToast(err.message || "Registration failed.", "danger");
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!loginForm.checkValidity()) {
        e.stopPropagation();
        loginForm.classList.add("was-validated");
        return;
      }
      const payload = {
        email: document.getElementById("loginEmail")?.value.trim(),
        password: document.getElementById("loginPassword")?.value
      };

      try {
        const data = await apiPost("/auth/login", payload);
        if (data.access_token) {
          localStorage.setItem("wa_token", data.access_token);
        }
        showToast("Login successful. Redirecting...", "success");
        window.setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 700);
      } catch (err) {
        showToast(err.message || "Login failed.", "danger");
      }
    });
  }
}

/* ── API Helpers ────────────────────────────────────────────── */
function handleAuthError(status) {
  if (status === 401 || status === 422) {
    localStorage.removeItem("wa_token");
    if (!window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") {
      window.location.href = "index.html";
    }
    return true;
  }
  return false;
}

async function apiPost(path, payload) {
  const token = localStorage.getItem("wa_token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  
  if (handleAuthError(response.status)) throw new Error("Session expired. Please log in again.");

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }
  return data;
}

async function apiGet(path) {
  const token = localStorage.getItem("wa_token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (handleAuthError(response.status)) throw new Error("Session expired. Please log in again.");

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }
  return data;
}

async function apiPut(path, payload) {
  const token = localStorage.getItem("wa_token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (handleAuthError(response.status)) throw new Error("Session expired. Please log in again.");

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }
  return data;
}

/* ── Contacts Page ──────────────────────────────────────────── */
function initContactsPage() {
  const tableBody = document.getElementById("contactsTableBody");
  const addContactForm = document.getElementById("addContactForm");
  if (!tableBody) return;

  const renderContacts = (contacts) => {
    if (!contacts.length) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No contacts found.</td></tr>`;
      return;
    }
    tableBody.innerHTML = contacts
      .map(
        (c) => `<tr>
          <td>${c.name}</td>
          <td>${c.country_code} ${c.phone_number}</td>
          <td>General</td>
          <td>${c.is_opt_in ? '<span class="badge badge-soft-success">Opted-in</span>' : '<span class="badge badge-soft-danger">Opted-out</span>'}</td>
          <td class="text-end"><button class="btn btn-sm btn-light" data-toast="Edit endpoint can be added next."><i class="fa-solid fa-pen"></i></button></td>
        </tr>`
      )
      .join("");
  };

  apiGet("/contacts")
    .then(renderContacts)
    .catch((err) => showToast(err.message || "Failed to load contacts.", "danger"));

  if (addContactForm) {
    addContactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!addContactForm.checkValidity()) {
        addContactForm.classList.add("was-validated");
        return;
      }
      try {
        await apiPost("/contacts", {
          name: document.getElementById("contactName")?.value.trim(),
          phone_number: document.getElementById("contactPhone")?.value.trim(),
          country_code: document.getElementById("contactCountryCode")?.value,
          is_opt_in: true
        });
        showToast("Contact created successfully.", "success");
        const modalEl = document.getElementById("addContactModal");
        const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
        if (modal) modal.hide();
        addContactForm.reset();
        addContactForm.classList.remove("was-validated");
        const fresh = await apiGet("/contacts");
        renderContacts(fresh);
      } catch (err) {
        showToast(err.message || "Failed to create contact.", "danger");
      }
    });
  }
}

/* ── Templates Page ─────────────────────────────────────────── */
function initTemplatesPage() {
  const grid = document.getElementById("templateGrid");
  const form = document.getElementById("newTemplateForm");
  if (!grid) return;

  const renderTemplates = (items) => {
    if (!items.length) {
      grid.innerHTML = `<div class="col-12"><div class="alert alert-light border">No templates yet. Create your first template.</div></div>`;
      return;
    }
    grid.innerHTML = items
      .map(
        (t) => `<div class="col-md-6 col-xl-4">
          <div class="template-card p-3 bg-white">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0">${t.name}</h6>
              <span class="badge badge-soft-success">Synced</span>
            </div>
            <p class="small text-muted mb-3">${t.category || "General"} • ${t.language_code}</p>
            <button class="btn btn-sm btn-outline-primary w-100" data-toast="Template selected.">Use Template</button>
          </div>
        </div>`
      )
      .join("");
  };

  apiGet("/templates")
    .then(renderTemplates)
    .catch((err) => showToast(err.message || "Failed to load templates.", "danger"));

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }
      try {
        await apiPost("/templates", {
          name: document.getElementById("templateNameInput")?.value.trim(),
          category: document.getElementById("templateCategoryInput")?.value,
          body: document.getElementById("templateBodyInput")?.value.trim(),
          language_code: "en_US"
        });
        showToast("Template created.", "success");
        const modalEl = document.getElementById("newTemplateModal");
        const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
        if (modal) modal.hide();
        form.reset();
        form.classList.remove("was-validated");
        const fresh = await apiGet("/templates");
        renderTemplates(fresh);
      } catch (err) {
        showToast(err.message || "Failed to create template.", "danger");
      }
    });
  }
}

/* ── Logs / Reports Page ────────────────────────────────────── */
function initLogsPage() {
  const tableBody = document.getElementById("logsTableBody");
  if (!tableBody) return;
  const statusFilter = document.getElementById("logsStatusFilter");
  const searchInput = document.getElementById("logsSearchInput");
  const applyBtn = document.getElementById("applyLogsFilter");

  const loadLogs = async () => {
    const status = statusFilter?.value || "";
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const rows = await apiGet(`/logs${query}`);
    const filtered = rows.filter((r) =>
      (searchInput?.value || "").trim()
        ? `${r.to_phone} ${r.whatsapp_message_id || ""}`.toLowerCase().includes(searchInput.value.trim().toLowerCase())
        : true
    );
    if (!filtered.length) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No logs found.</td></tr>`;
      return;
    }
    tableBody.innerHTML = filtered
      .map(
        (r) => `<tr>
          <td>${r.sent_at ? new Date(r.sent_at).toLocaleString() : "-"}</td>
          <td>${r.campaign_id ?? "-"}</td>
          <td>${r.to_phone}</td>
          <td><span class="badge ${r.status === "sent" ? "badge-soft-success" : r.status === "failed" ? "badge-soft-danger" : "badge-soft-warning"}">${r.status}</span></td>
          <td>${r.whatsapp_message_id || r.error_message || "-"}</td>
        </tr>`
      )
      .join("");
  };

  loadLogs().catch((err) => showToast(err.message || "Failed to load logs.", "danger"));
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      loadLogs().catch((err) => showToast(err.message || "Failed to load logs.", "danger"));
    });
  }
}

/* ── Settings Page (with WhatsApp API Key) ──────────────────── */
function initSettingsPage() {
  const form = document.getElementById("settingsForm");
  if (!form) return;

  const fullName = document.getElementById("settingsFullName");
  const email = document.getElementById("settingsEmail");
  const apiKey = document.getElementById("apiKey");
  const statusBadge = document.getElementById("apiKeyStatus");
  const testBtn = document.getElementById("testConnectionBtn");

  // Load profile + API key status from backend
  apiGet("/user/profile")
    .then((p) => {
      if (fullName) fullName.value = p.full_name || "";
      if (email) email.value = p.email || "";
      // Show whether API key is set
      if (statusBadge) {
        if (p.whatsapp_api_key_set) {
          statusBadge.className = "badge badge-soft-success";
          statusBadge.textContent = "Key Configured";
        } else {
          statusBadge.className = "badge badge-soft-warning";
          statusBadge.textContent = "Not Set";
        }
      }
      // Clear placeholder if key is set
      if (apiKey && p.whatsapp_api_key_set) {
        apiKey.placeholder = "••••••••••••••••  (key is saved — enter new to replace)";
        apiKey.value = "";
      }
    })
    .catch((err) => showToast(err.message || "Failed to load profile.", "danger"));

  // Save settings
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const payload = { full_name: fullName?.value.trim() };

    // Only send API key if user typed something new
    const keyVal = apiKey?.value.trim();
    if (keyVal) {
      payload.whatsapp_api_key = keyVal;
    }

    try {
      await apiPut("/user/profile", payload);
      showToast("Settings saved successfully.", "success");

      // Update status badge
      if (statusBadge && keyVal) {
        statusBadge.className = "badge badge-soft-success";
        statusBadge.textContent = "Key Configured";
        apiKey.placeholder = "••••••••••••••••  (key is saved — enter new to replace)";
        apiKey.value = "";
      }
    } catch (err) {
      showToast(err.message || "Failed to save settings.", "danger");
    }
  });

  // Test connection button
  if (testBtn) {
    testBtn.addEventListener("click", async () => {
      testBtn.disabled = true;
      testBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Testing…';
      try {
        const res = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
        if (res.ok) {
          showToast("Backend connection is healthy!", "success");
        } else {
          showToast("Backend responded with an error.", "warning");
        }
      } catch {
        showToast("Cannot reach backend. It may be sleeping.", "danger");
      }
      testBtn.disabled = false;
      testBtn.innerHTML = '<i class="fa-solid fa-satellite-dish me-2"></i>Test Connection';
    });
  }
}

/* ── Dashboard Page (live stats from backend) ───────────────── */
function initDashboardPage() {
  const contactsStat = document.getElementById("statTotalContacts");
  const campaignsStat = document.getElementById("statActiveCampaigns");
  const messagesStat = document.getElementById("statMessagesSent");
  const apiKeyBadge = document.getElementById("statApiKeyStatus");
  if (!contactsStat) return; // not on dashboard

  const loadDashboardStats = async () => {
    try {
      // Load contacts count
      const contacts = await apiGet("/contacts");
      contactsStat.textContent = contacts.length.toLocaleString();

      // Load campaigns count
      const campaigns = await apiGet("/campaigns");
      campaignsStat.textContent = campaigns.length.toLocaleString();

      // Load logs count
      const logs = await apiGet("/logs");
      messagesStat.textContent = logs.length.toLocaleString();

      // Load API key status
      const profile = await apiGet("/user/profile");
      if (apiKeyBadge) {
        apiKeyBadge.textContent = profile.whatsapp_api_key_set ? "Configured" : "Not Set";
        apiKeyBadge.className = profile.whatsapp_api_key_set
          ? "text-success fw-semibold"
          : "text-warning fw-semibold";
      }
    } catch (err) {
      // Silently fail — dashboard will show 0s
    }
  };

  loadDashboardStats();
}

/* ── Toast Notifications ────────────────────────────────────── */
function showToast(message, type = "primary") {
  const host = document.getElementById("toastHost");
  if (!host) return;
  const colorClass =
    type === "success"
      ? "text-bg-success"
      : type === "danger"
      ? "text-bg-danger"
      : type === "warning"
      ? "text-bg-warning"
      : "text-bg-primary";

  const toast = document.createElement("div");
  toast.className = `toast align-items-center border-0 ${colorClass}`;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  host.appendChild(toast);
  const instance = new bootstrap.Toast(toast, { delay: 2500 });
  instance.show();
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
}
