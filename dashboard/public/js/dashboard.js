function showToast(message, success = true) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-lg text-white font-semibold z-50 shadow-lg ${success ? 'success' : 'error'} show`;
  setTimeout(() => { toast.className = 'hidden'; }, 3000);
}

// Save automod rule
document.querySelectorAll('.save-rule-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const rule = btn.dataset.rule;
    const guildId = btn.dataset.guild;
    const container = document.getElementById(`rule-${rule}`);
    const data = {};

    container.querySelectorAll('[data-field]').forEach(el => {
      const field = el.dataset.field;
      if (el.type === 'checkbox') data[field] = el.checked;
      else if (el.type === 'number') data[field] = Number(el.value);
      else data[field] = el.value || null;
    });

    try {
      const res = await fetch(`/dashboard/${guildId}/automod/${rule}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      showToast(json.success ? `${rule} saved!` : (json.error || 'Error saving'), json.success);
    } catch (err) {
      showToast('Network error', false);
    }
  });
});

// Toggle switch label update
document.querySelectorAll('.toggle-switch').forEach(sw => {
  sw.addEventListener('change', function () {
    const label = this.nextElementSibling;
    if (label) label.textContent = this.checked ? 'Enabled' : 'Disabled';
  });
});

// Delete case
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

// Save logging
const saveLoggingBtn = document.getElementById('save-logging-btn');
if (saveLoggingBtn) {
  saveLoggingBtn.addEventListener('click', async () => {
    const guildId = saveLoggingBtn.dataset.guild;
    const categories = ['moderation', 'messages', 'members', 'channels', 'roles', 'voice', 'invites', 'server'];
    const data = {};
    categories.forEach(cat => {
      const el = document.getElementById(`log-${cat}`);
      if (el) data[cat] = el.value || null;
    });
    try {
      const res = await fetch(`/dashboard/${guildId}/logging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      showToast(json.success ? 'Logging saved!' : (json.error || 'Error'), json.success);
    } catch {
      showToast('Network error', false);
    }
  });
}
