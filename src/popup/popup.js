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
const renameProfileBtn = document.getElementById('renameProfileBtn');
const deleteProfileBtn = document.getElementById('deleteProfileBtn');
const autoFillToggle = document.getElementById('autoFillToggle');
const autoFillLabel = document.getElementById('autoFillLabel');
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

function createDefaultState() {
    const id = uid();
    return {
        profiles: {
            [id]: { name: 'default', items: [] }
        },
        activeProfileId: id,
        autoFill: false
    };
}

function normalizeState(rawState, options = {}) {
    const strict = !!options.strict;

    if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) {
        if (strict) throw new Error('Invalid root structure');
        return createDefaultState();
    }

    const rawProfiles = rawState.profiles;
    if (!rawProfiles || typeof rawProfiles !== 'object' || Array.isArray(rawProfiles)) {
        if (strict) throw new Error('Invalid profiles structure');
        return createDefaultState();
    }

    const profiles = {};
    Object.keys(rawProfiles).forEach(id => {
        const profile = rawProfiles[id];
        if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
            if (strict) throw new Error(`Invalid profile: ${id}`);
            return;
        }

        if (typeof profile.name !== 'string' || !profile.name.trim()) {
            if (strict) throw new Error(`Invalid profile name: ${id}`);
            return;
        }

        if (!Array.isArray(profile.items)) {
            if (strict) throw new Error(`Invalid items: ${profile.name}`);
            return;
        }

        const seenKeywords = new Set();
        const items = [];
        profile.items.forEach((item, index) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                if (strict) throw new Error(`Invalid item in ${profile.name} at ${index + 1}`);
                return;
            }

            if (typeof item.k !== 'string' || typeof item.v !== 'string') {
                if (strict) throw new Error(`Invalid keyword/value in ${profile.name} at ${index + 1}`);
                return;
            }

            const k = item.k.trim();
            if (!k) {
                if (strict) throw new Error(`Empty keyword in ${profile.name} at ${index + 1}`);
                return;
            }

            if (seenKeywords.has(k)) {
                if (strict) throw new Error(`Duplicate keyword "${k}" in ${profile.name}`);
                return;
            }

            seenKeywords.add(k);
            items.push({ k, v: item.v });
        });

        profiles[id] = {
            name: profile.name.trim(),
            items
        };
    });

    const profileIds = Object.keys(profiles);
    if (profileIds.length === 0) {
        if (strict) throw new Error('No valid profiles found');
        return createDefaultState();
    }

    const activeProfileId = typeof rawState.activeProfileId === 'string' && profiles[rawState.activeProfileId]
        ? rawState.activeProfileId
        : profileIds[0];

    return {
        profiles,
        activeProfileId,
        autoFill: rawState.autoFill === true
    };
}

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
        state = normalizeState(res.kff_state);
        chrome.storage.local.set({ kff_state: state });
        renderAll();
    });
}

function renderAll() {
    // profiles
    profileSelect.replaceChildren();
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
    updateAutoFillUI();
}

function updateAutoFillUI() {
    autoFillToggle.checked = !!state.autoFill;
    autoFillToggle.setAttribute('aria-checked', String(!!state.autoFill));
    if (autoFillLabel) {
        autoFillLabel.textContent = state.autoFill ? 'Auto-Fill: Bật' : 'Auto-Fill: Tắt';
    }
}

function renderKeywords() {
    const prof = state.profiles[state.activeProfileId];
    kwTableBody.replaceChildren();
    prof.items.forEach((it, idx) => {
        const tr = document.createElement('tr');

        const keyCell = document.createElement('td');
        const keyInput = document.createElement('input');
        keyInput.dataset.idx = String(idx);
        keyInput.className = 'kw-key';
        keyInput.value = it.k || '';
        keyCell.appendChild(keyInput);

        const valueCell = document.createElement('td');
        const valueInput = document.createElement('input');
        valueInput.dataset.idx = String(idx);
        valueInput.className = 'kw-val';
        valueInput.value = it.v || '';
        valueCell.appendChild(valueInput);

        const actionCell = document.createElement('td');
        actionCell.className = 'actions';

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn btn-xs btn-secondary save-row';
        saveButton.dataset.idx = String(idx);
        saveButton.textContent = 'Save';

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn btn-xs btn-danger del-row';
        deleteButton.dataset.idx = String(idx);
        deleteButton.textContent = 'Del';

        actionCell.append(saveButton, deleteButton);
        tr.append(keyCell, valueCell, actionCell);
        kwTableBody.appendChild(tr);
    });
}

kwTableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('save-row')) {
        const idx = e.target.dataset.idx;
        const k = kwTableBody.querySelector(`.kw-key[data-idx="${idx}"]`).value.trim();
        const v = kwTableBody.querySelector(`.kw-val[data-idx="${idx}"]`).value;
        state.profiles[state.activeProfileId].items[idx] = { k, v };
        saveState();
        renderKeywords();
    } else if (e.target.classList.contains('del-row')) {
        const idx = Number(e.target.dataset.idx);
        state.profiles[state.activeProfileId].items.splice(idx, 1);
        saveState();
        renderKeywords();
    }
});

addBtn.addEventListener('click', () => {
    const k = kwInput.value.trim();
    const v = valInput.value;
    const prof = state.profiles[state.activeProfileId];
    if (!k) { showStatus('Keyword rỗng'); return; }
    if (prof.items.some(it => it.k === k)) { showStatus('Keyword trùng'); return; }
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

if (renameProfileBtn) {
    renameProfileBtn.addEventListener('click', () => {
        const current = state.profiles[state.activeProfileId];
        if (!current) return;
        const newName = prompt('Tên mới:', current.name);
        if (!newName) return;
        current.name = newName;
        saveState();
        renderAll();
    });
}

deleteProfileBtn.addEventListener('click', () => {
    if (Object.keys(state.profiles).length <= 1) {
        showStatus('Không thể xóa profile cuối cùng');
        return;
    }
    if (!confirm('Xác nhận xóa profile này?')) return;
    delete state.profiles[state.activeProfileId];
    state.activeProfileId = Object.keys(state.profiles)[0];
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

autoFillToggle.addEventListener('change', () => {
    state.autoFill = autoFillToggle.checked;
    saveState();
    updateAutoFillUI();
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
            state = normalizeState(parsed, { strict: true });
            saveState();
            renderAll();
            showStatus('Import thành công');
        } catch (err) { showStatus('Import lỗi: ' + err.message); }
        importFile.value = '';
    };
    reader.readAsText(f);
});

const viewToggle = document.createElement('button');
viewToggle.type = 'button';
viewToggle.className = 'btn btn-ghost view-toggle';
viewToggle.textContent = 'Switch to Advanced View';
viewToggle.addEventListener('click', () => {
    document.querySelector('#kwTable').classList.toggle('hidden');
    viewToggle.textContent = document.querySelector('#kwTable').classList.contains('hidden') ? 'Switch to Advanced View' : 'Switch to Simple View';
});
const viewToggleSlot = document.getElementById('viewToggleSlot');
(viewToggleSlot || document.querySelector('.container')).appendChild(viewToggle);


document.getElementById('closeBtn').addEventListener('click', () => window.close());
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.close();
    if (e.key === 'Enter' && document.activeElement === addBtn) addBtn.click();
});

document.getElementById('previewBtn').addEventListener('click', () => {
    const modal = document.createElement('div');
    Object.assign(modal.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.5)'
    });

    const modalContent = document.createElement('div');
    Object.assign(modalContent.style, {
        background: 'white',
        padding: '20px'
    });
    modalContent.textContent = 'Preview: Điền email vào field email...';
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    modal.addEventListener('click', () => modal.remove());
});

chrome.storage.local.get(['onboarded'], res => {
    if (!res.onboarded) {
        alert('Welcome! 1. Chọn profile, 2. Add keyword, 3. Fill on tab. Pin extension để dễ dùng!');
        chrome.storage.local.set({ onboarded: true });
    }
});
document.addEventListener('DOMContentLoaded', loadState);
