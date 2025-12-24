chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['kff_state'], res => {
        if (!res.kff_state) {
            const id = 'p_default';
            const state = {
                profiles: {
                    [id]: {
                        name: 'default', items: [
                            { k: 'email', v: '' },
                            { k: 'name', v: '' }
                        ]
                    }
                },
                activeProfileId: id,
                autoFill: false
            };
            chrome.storage.local.set({ kff_state: state });
        }
    });
});
