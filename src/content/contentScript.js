(function () {
    // Listen fill requests
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'fill') {
            chrome.storage.local.get(['kff_state'], res => {
                const state = res.kff_state || {};
                const profile = state.profiles && state.profiles[msg.profileId];
                if (profile) {
                    const filledCount = fillUsingItems(profile.items);
                    sendResponse({ ok: true, filledCount });
                } else sendResponse({ ok: false, reason: 'no-profile' });
            });
            // return true to indicate async response
            return true;
        }
    });

    // optional: auto-fill option
    fillActiveProfileIfEnabled();

    // core fill function
    function fillUsingItems(items) {
        const nodes = Array.from(document.querySelectorAll('input, textarea, select, [role="radio"], [role="checkbox"]'));
        const safeItems = Array.isArray(items) ? items : [];
        let filledCount = 0;
        safeItems.forEach(item => {
            const key = normalizeText(item.k || '');
            const val = item.v == null ? '' : String(item.v);
            nodes.forEach(node => {
                if (matchesKeyword(node, key) && canFillNode(node)) {
                    try {
                        if (fillNode(node, key, val)) {
                            filledCount += 1;
                            chrome.storage.local.get(['debugMode'], res => {
                                const debug = res.debugMode || false;
                                if (debug) console.debug('Matched node:', node, 'with key:', key, 'val: [hidden]');
                            });
                        }
                    } catch (e) { console.warn('fill error', e); }
                }
            });
        });
        filledCount += fillUnselectedRadioGroups(nodes);
        filledCount += fillUnselectedCheckboxGroups(nodes);
        return filledCount;
    }

    function fillNode(node, key, val) {
        if (node.tagName.toLowerCase() === 'select') {
            return fillSelect(node, val);
        }

        if (isChoiceNode(node)) {
            return fillChoice(node, key, val);
        }

        if (node.type === 'date') {
            const date = new Date(val);
            if (Number.isNaN(date.getTime())) return false;

            node.valueAsDate = date;
            dispatchInputAndChange(node);
            return true;
        }

        node.focus();
        node.value = val;
        dispatchInputAndChange(node);
        return true;
    }

    function fillSelect(node, val) {
        const target = normalizeText(val);
        if (!target) return false;

        const option = Array.from(node.options).find(item => {
            return normalizeText(item.value) === target || normalizeText(item.textContent) === target;
        });
        if (!option) return false;

        node.value = option.value;
        dispatchInputAndChange(node);
        return true;
    }

    function fillChoice(node, key, val) {
        const target = normalizeText(val);
        if (!target) return false;

        const isBooleanCheckbox = isCheckboxNode(node)
            && ['1', 'true', 'yes', 'on', 'checked', 'có', 'co'].includes(target)
            && matchesKeyword(node, key, { includeGroupContext: false });

        if (!isBooleanCheckbox && !getChoiceValueTexts(node).some(text => normalizeText(text) === target)) {
            return false;
        }

        node.click();
        return true;
    }

    function dispatchInputAndChange(node) {
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function fillUnselectedRadioGroups(nodes) {
        const radios = nodes.filter(isRadioNode);
        const handled = new Set();
        let filledCount = 0;

        radios.forEach(node => {
            if (handled.has(node)) return;

            const group = radios.filter(candidate => isSameRadioGroup(candidate, node));
            group.forEach(candidate => handled.add(candidate));
            if (group.some(isNodeChecked)) return;

            const firstAvailable = group.find(isNodeAvailable);
            if (firstAvailable) {
                firstAvailable.click();
                filledCount += 1;
            }
        });

        return filledCount;
    }

    function isSameRadioGroup(candidate, node) {
        const nodeGroup = node.closest('[role="radiogroup"]');
        if (nodeGroup) return candidate.closest('[role="radiogroup"]') === nodeGroup;

        if (candidate.form !== node.form) return false;
        if (!node.name) return candidate === node;
        return candidate.name === node.name;
    }

    function fillUnselectedCheckboxGroups(nodes) {
        const checkboxes = nodes.filter(isCheckboxNode);
        const handled = new Set();
        let filledCount = 0;

        checkboxes.forEach(node => {
            if (handled.has(node)) return;

            const group = checkboxes.filter(candidate => isSameCheckboxGroup(candidate, node));
            group.forEach(candidate => handled.add(candidate));
            if (group.length < 2 || group.some(isNodeChecked)) return;

            const firstAvailable = group.find(isNodeAvailable);
            if (firstAvailable) {
                firstAvailable.click();
                filledCount += 1;
            }
        });

        return filledCount;
    }

    function isSameCheckboxGroup(candidate, node) {
        const nodeGroup = getCheckboxGroupRoot(node);
        const candidateGroup = getCheckboxGroupRoot(candidate);
        if (nodeGroup || candidateGroup) return candidateGroup === nodeGroup;

        if (candidate.form !== node.form) return false;
        if (!node.name) return candidate === node;
        return candidate.name === node.name;
    }

    function getCheckboxGroupRoot(node) {
        const explicitGroup = node.closest('[role="group"], fieldset');
        if (explicitGroup) return explicitGroup;

        let root = node.parentElement;
        while (root && root !== document.body && root !== document.documentElement && root.tagName !== 'FORM') {
            const checkboxes = Array.from(root.querySelectorAll('input[type="checkbox"], [role="checkbox"]'));
            if (checkboxes.length > 1) return root;
            root = root.parentElement;
        }

        return null;
    }

    function canFillNode(node) {
        if (!isNodeAvailable(node)) return false;

        if (isChoiceNode(node)) {
            return !isNodeChecked(node);
        }

        return !node.value || node.value.trim() === '';
    }

    function isNodeAvailable(node) {
        return !node.disabled && !node.readOnly && node.getAttribute('aria-disabled') !== 'true';
    }

    function isNodeChecked(node) {
        return node.checked === true || node.getAttribute('aria-checked') === 'true';
    }

    function getChoiceType(node) {
        return node.getAttribute('role') || node.type || '';
    }

    function isRadioNode(node) {
        return getChoiceType(node) === 'radio';
    }

    function isCheckboxNode(node) {
        return getChoiceType(node) === 'checkbox';
    }

    function isChoiceNode(node) {
        return isRadioNode(node) || isCheckboxNode(node);
    }

    function escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function escapeCssIdentifier(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') {
            return window.CSS.escape(value);
        }

        return value.replace(/["\\]/g, '\\$&');
    }

    function normalizeText(value) {
        return String(value)
            .normalize('NFKC')
            .toLowerCase()
            .replace(/[‐‑‒–—―]/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function containsKeyword(text, keyword) {
        const normalizedText = normalizeText(text);
        const normalizedKeyword = normalizeText(keyword);
        if (!normalizedKeyword) return false;

        return new RegExp(
            '(^|[^\\p{L}\\p{N}_])' + escapeRegExp(normalizedKeyword) + '(?=$|[^\\p{L}\\p{N}_])',
            'iu'
        ).test(normalizedText);
    }

    function getLabelTexts(node) {
        const texts = [];
        const id = node.id;
        if (id) {
            const lab = document.querySelector('label[for="' + escapeCssIdentifier(id) + '"]');
            if (lab) texts.push(lab.innerText);
        }

        const parentLabel = node.closest('label');
        if (parentLabel) texts.push(parentLabel.innerText);
        return texts;
    }

    function isSameChoiceGroup(candidate, node) {
        if (getChoiceType(candidate) !== getChoiceType(node)) return false;
        const nodeGroup = node.closest('[role="radiogroup"]');
        if (nodeGroup) return candidate.closest('[role="radiogroup"]') === nodeGroup;
        if (isCheckboxNode(node)) return isSameCheckboxGroup(candidate, node);
        if (node.name) return candidate.name === node.name;
        return candidate === node;
    }

    function getChoiceGroupTexts(node) {
        const texts = [];
        const fieldset = node.closest('fieldset');
        const legend = fieldset && fieldset.querySelector(':scope > legend');
        if (legend) texts.push(legend.innerText);

        let root = node.parentElement;
        while (root && root !== document.body && root !== document.documentElement) {
            const sameGroup = Array.from(root.querySelectorAll(
                'input[type="checkbox"], input[type="radio"], [role="checkbox"], [role="radio"]'
            ))
                .filter(candidate => isSameChoiceGroup(candidate, node));
            if (sameGroup.length > 1) break;
            root = root.parentElement;
        }

        if (!root || root === document.body || root === document.documentElement) return texts;
        texts.push(root.innerText);

        let parent = root.parentElement;
        let depth = 0;
        while (parent && parent !== document.body && parent !== document.documentElement && parent.tagName !== 'FORM' && depth < 2) {
            const hasOtherFields = Array.from(parent.querySelectorAll('input, textarea, select'))
                .some(candidate => !isSameChoiceGroup(candidate, node));
            if (hasOtherFields) break;

            texts.push(parent.innerText);
            parent = parent.parentElement;
            depth += 1;
        }

        return texts;
    }

    function getChoiceValueTexts(node) {
        const texts = [
            node.value,
            node.getAttribute('aria-label'),
            node.getAttribute('data-label'),
            node.getAttribute('data-value'),
            node.getAttribute('data-answer-value'),
            node.innerText
        ];
        texts.push(...getLabelTexts(node));
        return texts.filter(Boolean);
    }

    function matchesKeyword(node, keyword, options = {}) {
        if (!keyword) return false;
        const attrs = [];
        if (node.name) attrs.push(node.name);
        if (node.id) attrs.push(node.id);
        if (node.placeholder) attrs.push(node.placeholder);
        if (node.getAttribute('aria-label')) attrs.push(node.getAttribute('aria-label'));
        if (node.className) attrs.push(String(node.className));
        // label text:
        try {
            attrs.push(...getLabelTexts(node));
            if (isChoiceNode(node) && options.includeGroupContext !== false) {
                attrs.push(...getChoiceGroupTexts(node));
            }
        } catch (e) { }
        // combine and check
        return containsKeyword(attrs.join(' '), keyword);
    }

    function fillActiveProfileIfEnabled() {
        chrome.storage.local.get(['kff_state'], res => {
            const st = res.kff_state || {};
            if (st.autoFill && st.activeProfileId && st.profiles && st.profiles[st.activeProfileId]) {
                fillUsingItems(st.profiles[st.activeProfileId].items);
            }
        });
    }

    // optional: observe DOM changes for SPAs and fill when new forms appear (respect auto-fill)
    const mo = new MutationObserver(() => {
        if (window.__kff_mo_timeout) clearTimeout(window.__kff_mo_timeout);
        window.__kff_mo_timeout = setTimeout(fillActiveProfileIfEnabled, 500);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
})();
