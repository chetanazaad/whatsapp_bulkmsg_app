document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initTooltips();
  initCSVPreview();
  initTemplatePreview();
  initApiKeyToggle();
  initAuth();
  initValidation();
  bindDemoActions();
});

const API_BASE_URL = "https://whatsapp-bulkmsg-app-back.onrender.com";

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
}

function initTooltips() {
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
}

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

function bindDemoActions() {
  document.querySelectorAll("[data-toast]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const message = btn.dataset.toast || "Action completed.";
      const type = btn.dataset.type || "primary";
      showToast(message, type);
    });
  });
}

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

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }
  return data;
}

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
