// ─── TOAST ───────────────────────────────────────────────────────────────────
function showToast(message, success = true) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${success ? 'success' : 'error'}`;
  toast.innerHTML = `<span>${success ? '✓' : '✗'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 320);
  }, 3000);
}

// ─── MOBILE SIDEBAR ──────────────────────────────────────────────────────────
(function initMobileSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
})();

// ─── TOGGLE LABEL UPDATE ─────────────────────────────────────────────────────
document.querySelectorAll('.toggle-input').forEach(input => {
  input.addEventListener('change', function() {
    const label = this.closest('.toggle-wrapper')?.querySelector('.toggle-label');
    if (!label) return;
    const isEnabled = this.checked;
    const text = label.textContent.trim();
    if (text === 'Enabled' || text === 'Disabled') {
      label.textContent = isEnabled ? 'Enabled' : 'Disabled';
    }
  });
});

// ─── SAVE AUTOMOD RULE ───────────────────────────────────────────────────────
document.querySelectorAll('.save-rule-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const rule = btn.dataset.rule;
    const guildId = btn.dataset.guild;
    const container = document.getElementById('rule-' + rule);
    const data = {};

    container.querySelectorAll('.rule-input').forEach(el => {
      const field = el.dataset.field;
      if (!field) return;
      if (el.tagName === 'SELECT' || el.type === 'text') {
        if (field === 'whitelist') {
          data[field] = el.value ? el.value.split(',').map(s => s.trim()).filter(Boolean) : [];
        } else {
          data[field] = el.value || null;
        }
      } else if (el.type === 'number') {
        data[field] = Number(el.value) || 0;
      } else {
        data[field] = el.value || null;
      }
    });

    container.querySelectorAll('.rule-toggle').forEach(el => {
      const field = el.dataset.field;
      if (field) data[field] = el.checked;
    });

    const pillContainer = document.getElementById('punish-pills-' + rule);
    if (pillContainer) {
      const pills = pillContainer.querySelectorAll('.punishment-pill');
      const punishments = [];
      pills.forEach(p => {
        const type = p.dataset.type;
        if (!type) return;
        const entry = { type };
        if (type === 'mute') entry.muteDuration = p.dataset.muteDuration || '10m';
        punishments.push(entry);
      });
      if (punishments.length > 0) data.punishments = punishments;
    }

    const origText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    try {
      const res = await fetch(`/dashboard/${guildId}/automod/${rule}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      showToast(json.success ? `${rule} saved!` : (json.error || 'Error saving'), json.success);
      if (json.success) {
        const dot = document.getElementById('dot-' + rule);
        if (dot) dot.classList.remove('visible');
        const badge = document.getElementById('badge-' + rule);
        const card = document.getElementById('rule-' + rule);
        if (badge && card) {
          const enabled = data.enabled !== undefined ? data.enabled : container.querySelector('[data-field="enabled"]')?.checked;
          badge.textContent = enabled ? 'Enabled' : 'Disabled';
          badge.className = `badge ${enabled ? 'badge-enabled' : 'badge-disabled'}`;
          if (enabled) card.classList.add('enabled');
          else card.classList.remove('enabled');
        }
      }
    } catch {
      showToast('Network error', false);
    } finally {
      btn.textContent = origText;
      btn.disabled = false;
    }
  });
});

// ─── UNSAVED DETECTION ───────────────────────────────────────────────────────
document.querySelectorAll('.rule-input, .rule-toggle').forEach(el => {
  el.addEventListener('change', function() {
    const rule = this.dataset.rule;
    if (!rule) return;
    const dot = document.getElementById('dot-' + rule);
    if (dot) dot.classList.add('visible');
  });
  el.addEventListener('input', function() {
    const rule = this.dataset.rule;
    if (!rule) return;
    const dot = document.getElementById('dot-' + rule);
    if (dot) dot.classList.add('visible');
  });
});

// ─── DELETE CASE ─────────────────────────────────────────────────────────────
document.querySelectorAll('.delete-case-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!confirm(`Delete case #${btn.dataset.case}?`)) return;
    try {
      const res = await fetch(`/dashboard/${btn.dataset.guild}/moderation/${btn.dataset.case}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Case deleted!', true);
        btn.closest('tr').remove();
      } else {
        showToast(json.error || 'Error', false);
      }
    } catch {
      showToast('Network error', false);
    }
  });
});

// ─── SAVE LOGGING ────────────────────────────────────────────────────────────
const saveLoggingBtn = document.getElementById('save-logging-btn');
if (saveLoggingBtn) {
  saveLoggingBtn.addEventListener('click', async () => {
    const guildId = saveLoggingBtn.dataset.guild;
    const categories = ['moderation', 'messages', 'members', 'channels', 'roles', 'voice', 'invites', 'server'];
    const data = {};
    categories.forEach(cat => {
      const el = document.getElementById('log-' + cat);
      if (el) data[cat] = el.value || null;
    });
    try {
      const origText = saveLoggingBtn.textContent;
      saveLoggingBtn.textContent = 'Saving...';
      saveLoggingBtn.disabled = true;
      const res = await fetch(`/dashboard/${guildId}/logging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      showToast(json.success ? 'Logging saved!' : (json.error || 'Error'), json.success);
      saveLoggingBtn.textContent = origText;
      saveLoggingBtn.disabled = false;
    } catch {
      showToast('Network error', false);
      saveLoggingBtn.disabled = false;
    }
  });
}

// ─── HOVER EFFECT ON NAV CARDS ────────────────────────────────────────────────
document.querySelectorAll('.card a[href]').forEach(a => {
  a.addEventListener('mouseenter', () => { a.style.borderColor = 'rgba(124,58,237,0.4)'; });
  a.addEventListener('mouseleave', () => { a.style.borderColor = ''; });
});
