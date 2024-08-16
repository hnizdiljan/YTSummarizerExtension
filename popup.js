document.addEventListener('DOMContentLoaded', function() {
    const apiKeyInput = document.getElementById('apiKey');
    const saveApiKeyButton = document.getElementById('saveApiKey');
    const getTranscriptButton = document.getElementById('getTranscript');
    const summarizeButton = document.getElementById('summarize');
    const generateChaptersButton = document.getElementById('generateChapters');
    const clearCacheButton = document.getElementById('clearCache');
    const summaryTextArea = document.getElementById('summary');
    const chaptersTextArea = document.getElementById('chapters');
    const transcriptTextArea = document.getElementById('transcript');
    const statusDiv = document.getElementById('status');
    const spinner = document.getElementById('spinner');

    let currentVideoId = null;

    // Funkce pro načtení a zobrazení API klíče
    function loadApiKey() {
        chrome.storage.sync.get(['openai_api_key'], function(result) {
            if (result.openai_api_key) {
                apiKeyInput.value = '*'.repeat(result.openai_api_key.length);
                apiKeyInput.setAttribute('type', 'password');
            }
        });
    }

    // Volání funkce při načtení popup
    loadApiKey();

    function showStatus(message, showSpinner = false) {
        statusDiv.textContent = message;
        spinner.style.display = showSpinner ? 'inline-block' : 'none';
    }

    function setTextAreaContent(textArea, content) {
        // Zachováme nové řádky a odsazení
        textArea.value = content;
    }

    function updateButtonVisibility() {
        chrome.runtime.sendMessage({action: "checkCache", videoId: currentVideoId}, function(response) {
            clearCacheButton.style.display = response.hasCache ? 'block' : 'none';
            getTranscriptButton.textContent = response.hasTranscript ? 'Znovu stáhnout titulky' : 'Stáhnout titulky';
            summarizeButton.textContent = response.hasSummary ? 'Znovu sumarizovat' : 'Sumarizovat video';
            generateChaptersButton.textContent = response.hasChapters ? 'Znovu vygenerovat kapitoly' : 'Vygenerovat kapitoly';
        });
    }

    function getVideoId(callback) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "getVideoId"}, function(response) {
                currentVideoId = response.videoId;
                callback(response.videoId);
                updateButtonVisibility();
            });
        });
    }

    apiKeyInput.addEventListener('focus', function() {
        if (apiKeyInput.getAttribute('type') === 'password') {
            apiKeyInput.value = '';
            apiKeyInput.setAttribute('type', 'text');
        }
    });

    apiKeyInput.addEventListener('blur', function() {
        if (apiKeyInput.value === '') {
            loadApiKey();
        }
    });

    saveApiKeyButton.addEventListener('click', function() {
        const apiKey = apiKeyInput.value;
        chrome.storage.sync.set({openai_api_key: apiKey}, function() {
            showStatus('API klíč byl uložen');
            loadApiKey();
        });
    });

    getTranscriptButton.addEventListener('click', function() {
        showStatus('Načítám přepis...', true);
        getVideoId(function(videoId) {
            chrome.runtime.sendMessage({action: "getTranscript", videoId: videoId}, function(response) {
                if (response && response.transcript) {
                    setTextAreaContent(transcriptTextArea, response.transcript);
                    showStatus('Přepis načten');
                } else {
                    setTextAreaContent(transcriptTextArea, 'Nepodařilo se získat přepis.');
                    showStatus('Chyba při načítání přepisu');
                }
                updateButtonVisibility();
            });
        });
    });

    summarizeButton.addEventListener('click', function() {
        showStatus('Generuji shrnutí...', true);
        getVideoId(function(videoId) {
            chrome.runtime.sendMessage({action: "summarizeVideo", videoId: videoId}, function(response) {
                if (response && response.summary) {
                    setTextAreaContent(summaryTextArea, response.summary);
                    showStatus('Shrnutí vygenerováno');
                } else {
                    setTextAreaContent(summaryTextArea, 'Nepodařilo se získat shrnutí.');
                    showStatus('Chyba při generování shrnutí');
                }
                updateButtonVisibility();
            });
        });
    });

    generateChaptersButton.addEventListener('click', function() {
        showStatus('Generuji kapitoly...', true);
        getVideoId(function(videoId) {
            chrome.runtime.sendMessage({action: "generateChapters", videoId: videoId}, function(response) {
                if (response && response.chapters) {
                    setTextAreaContent(chaptersTextArea, response.chapters);
                    showStatus('Kapitoly vygenerovány');
                } else {
                    setTextAreaContent(chaptersTextArea, 'Nepodařilo se vygenerovat kapitoly.');
                    showStatus('Chyba při generování kapitol');
                }
                updateButtonVisibility();
            });
        });
    });

    clearCacheButton.addEventListener('click', function() {
        showStatus('Mažu cache...', true);
        getVideoId(function(videoId) {
            chrome.runtime.sendMessage({action: "clearCache", videoId: videoId}, function(response) {
                if (response.success) {
                    setTextAreaContent(transcriptTextArea, '');
                    setTextAreaContent(summaryTextArea, '');
                    setTextAreaContent(chaptersTextArea, '');
                    showStatus('Cache vymazána');
                } else {
                    showStatus('Chyba při mazání cache');
                }
                updateButtonVisibility();
            });
        });
    });

    function getVideoId(callback) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "getVideoId"}, function(response) {
                currentVideoId = response.videoId;
                callback(response.videoId);
                updateButtonVisibility();
                loadCachedData(response.videoId);
            });
        });
    }

    function loadCachedData(videoId) {
        chrome.runtime.sendMessage({action: "checkCache", videoId: videoId}, function(response) {
            if (response.hasTranscript) {
                chrome.runtime.sendMessage({action: "getTranscript", videoId: videoId}, function(response) {
                    if (response && response.transcript) {
                        setTextAreaContent(transcriptTextArea, response.transcript);
                    }
                });
            }
            if (response.hasSummary) {
                chrome.runtime.sendMessage({action: "summarizeVideo", videoId: videoId}, function(response) {
                    if (response && response.summary) {
                        setTextAreaContent(summaryTextArea, response.summary);
                    }
                });
            }
            if (response.hasChapters) {
                chrome.runtime.sendMessage({action: "generateChapters", videoId: videoId}, function(response) {
                    if (response && response.chapters) {
                        setTextAreaContent(chaptersTextArea, response.chapters);
                    }
                });
            }
        });
    }
});