// contentScript.js
console.log("✅ content script loaded on this tab", location.href);

(function () {
    // Listen fill requests
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'fill') {
            chrome.storage.local.get(['kff_state'], res => {
                const state = res.kff_state || {};
                const profile = state.profiles && state.profiles[msg.profileId];
                if (profile) {
                    console.log('Filling with items:', profile.items);
                    fillUsingItems(profile.items);
                    sendResponse({ ok: true });
                } else sendResponse({ ok: false, reason: 'no-profile' });
            });
            // return true to indicate async response
            return true;
        }
    });

    // optional: auto-fill option
    chrome.storage.local.get(['kff_state'], res => {
        const st = res.kff_state || {};
        if (st.autoFill && st.activeProfileId && st.profiles && st.profiles[st.activeProfileId]) {
            fillUsingItems(st.profiles[st.activeProfileId].items);
        }
    });

    // core fill function
    function fillUsingItems(items) {
        if (!Array.isArray(items) || items.length === 0) return;
        const nodes = Array.from(document.querySelectorAll('input, textarea, select'));
        items.forEach(item => {
            const key = (item.k || '').toLowerCase();
            const val = item.v || '';
            nodes.forEach(node => {
                if (matchesKeyword(node, key)) {
                    console.log('Matched node:', node, 'with key:', key, 'val:', val);
                    try {
                        if (node.tagName.toLowerCase() === 'select') {
                            node.value = val;
                            node.dispatchEvent(new Event('change', { bubbles: true }));
                        } else if (node.type === 'checkbox' || node.type === 'radio') {
                            // checkbox/radio: set checked if value matches or if val truthy
                            if (val === '' || val === null) {
                                node.checked = true;
                            } else {
                                if (node.value && node.value.toLowerCase() === val.toLowerCase()) node.checked = true;
                            }
                            node.dispatchEvent(new Event('change', { bubbles: true }));
                        } else {
                            node.focus();
                            node.value = val;
                            node.dispatchEvent(new Event('input', { bubbles: true }));
                            node.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    } catch (e) { console.warn('fill error', e); }
                }
            });
        });
    }

    function matchesKeyword(node, keyword) {
        const attrs = [];
        if (node.name) attrs.push(node.name);
        if (node.id) attrs.push(node.id);
        if (node.placeholder) attrs.push(node.placeholder);
        if (node.getAttribute('aria-label')) attrs.push(node.getAttribute('aria-label'));
        if (node.className) attrs.push(String(node.className));
        // label text:
        try {
            const id = node.id;
            if (id) {
                const lab = document.querySelector('label[for="' + id + '"]');
                if (lab) attrs.push(lab.innerText);
            }
            // also check parent label
            const pl = node.closest('label');
            if (pl) attrs.push(pl.innerText);
        } catch (e) { }
        // combine and check
        const combined = attrs.join(' ').toLowerCase();
        return combined.includes(keyword.toLowerCase());
    }

    // optional: observe DOM changes for SPAs and fill when new forms appear (respect auto-fill)
    const mo = new MutationObserver((mutations) => {
        // simple debounce
        if (window.__kff_mo_timeout) clearTimeout(window.__kff_mo_timeout);
        window.__kff_mo_timeout = setTimeout(() => {
            chrome.storage.local.get(['kff_state'], res => {
                const st = res.kff_state || {};
                if (st.autoFill && st.activeProfileId && st.profiles && st.profiles[st.activeProfileId]) {
                    fillUsingItems(st.profiles[st.activeProfileId].items);
                }
            });
        }, 400);
    });
    mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
