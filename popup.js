// Copyright 2025 Luu Chi Khanh. All rights reserved.
// Phát triển bởi Luu Chi Khanh - Email: luuchikhanh082004@gmail.com
//Github: Kpoi148

// popup.js
const profileSelect = document.getElementById('profileSelect');
const kwTableBody = document.querySelector('#kwTable tbody');
const kwInput = document.getElementById('kwInput');
const valInput = document.getElementById('valInput');
const addBtn = document.getElementById('addBtn');
const fillBtn = document.getElementById('fillBtn');
const newProfileBtn = document.getElementById('newProfileBtn');
const deleteProfileBtn = document.getElementById('deleteProfileBtn');
const autoFillToggle = document.getElementById('autoFillToggle');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const status = document.getElementById('status');

let state = {
    profiles: {},       // id -> {name, items:[{k,v}]}
    activeProfileId: null,
    autoFill: false
};

function uid() { return 'p_' + Math.random().toString(36).slice(2, 9); }

function showStatus(msg, timeout = 2500) {
    status.style.opacity = 0;
    status.textContent = msg;
    status.style.opacity = 1; // Fade in
    setTimeout(() => { status.style.opacity = 0; status.textContent = ''; }, timeout);
}

function saveState() {
    chrome.storage.local.set({ kff_state: state }, () => showStatus('Saved'));
}

function loadState() {
    chrome.storage.local.get(['kff_state'], res => {
        if (res.kff_state) {
            state = res.kff_state;
        } else {
            // init default profile
            const id = uid();
            state.profiles[id] = { name: 'default', items: [] };
            state.activeProfileId = id;
            chrome.storage.local.set({ kff_state: state });
        }
        renderAll();
    });
}

function renderAll() {
    // profiles
    profileSelect.innerHTML = '';
    for (const id in state.profiles) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = state.profiles[id].name;
        profileSelect.appendChild(opt);
    }
    if (!state.activeProfileId) {
        state.activeProfileId = Object.keys(state.profiles)[0];
    }
    profileSelect.value = state.activeProfileId;
    renderKeywords();
    autoFillToggle.textContent = `Toggle Auto-Fill (${state.autoFill ? 'On' : 'Off'})`;
    autoFillToggle.classList.toggle('on', state.autoFill); // Thêm class cho màu
}

function renderKeywords() {
    const prof = state.profiles[state.activeProfileId];
    kwTableBody.innerHTML = '';
    prof.items.forEach((it, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input data-idx="${idx}" class="kw-key" value="${escapeHtml(it.k)}"></td>
                    <td><input data-idx="${idx}" class="kw-val" value="${escapeHtml(it.v)}"></td>
                    <td class="actions">
                      <button class="save-row" data-idx="${idx}">Save</button>
                      <button class="del-row" data-idx="${idx}">Del</button>
                    </td>`;
        kwTableBody.appendChild(tr);
    });

    // attach events
    kwTableBody.querySelectorAll('.save-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.dataset.idx;
            const k = kwTableBody.querySelector(`.kw-key[data-idx="${idx}"]`).value.trim();
            const v = kwTableBody.querySelector(`.kw-val[data-idx="${idx}"]`).value;
            state.profiles[state.activeProfileId].items[idx] = { k, v };
            saveState();
            renderKeywords();
        });
    });
    kwTableBody.querySelectorAll('.del-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = Number(e.target.dataset.idx);
            state.profiles[state.activeProfileId].items.splice(idx, 1);
            saveState();
            renderKeywords();
        });
    });
}

addBtn.addEventListener('click', () => {
    const k = kwInput.value.trim();
    const v = valInput.value;
    if (!k) { showStatus('Keyword rỗng'); return; }
    state.profiles[state.activeProfileId].items.push({ k, v });
    kwInput.value = ''; valInput.value = '';
    saveState();
    renderKeywords();
});

profileSelect.addEventListener('change', (e) => {
    state.activeProfileId = e.target.value;
    saveState();
    renderKeywords();
});

newProfileBtn.addEventListener('click', () => {
    const name = prompt('Tên profile mới:', 'profile');
    if (!name) return;
    const id = uid();
    state.profiles[id] = { name, items: [] };
    state.activeProfileId = id;
    saveState();
    renderAll();
});

deleteProfileBtn.addEventListener('click', () => {
    if (!confirm('Xác nhận xóa profile này?')) return;
    delete state.profiles[state.activeProfileId];
    state.activeProfileId = Object.keys(state.profiles)[0] || null;
    saveState();
    renderAll();
});

fillBtn.addEventListener('click', () => {
    // send message to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, { action: 'fill', profileId: state.activeProfileId }, (resp) => {
            if (chrome.runtime.lastError) {
                console.error('Send message error:', chrome.runtime.lastError.message);
                showStatus('Không thể gửi message. Kiểm tra xem tab có load content script không.');
            } else {
                showStatus('Đã gửi lệnh điền.');
            }
        });
    });
});

autoFillToggle.addEventListener('click', () => {
    state.autoFill = !state.autoFill;
    saveState();
    autoFillToggle.textContent = `Toggle Auto-Fill (${state.autoFill ? 'On' : 'Off'})`;
    autoFillToggle.classList.toggle('on', state.autoFill);
});

exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kff_export.json'; a.click();
    URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(reader.result);
            // basic validation
            if (parsed && parsed.profiles) {
                state = parsed;
                saveState();
                renderAll();
                showStatus('Import thành công');
            } else showStatus('File không hợp lệ');
        } catch (err) { showStatus('Import lỗi'); }
    };
    reader.readAsText(f);
});

// helper: escape for input value injection
function escapeHtml(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

document.addEventListener('DOMContentLoaded', loadState);