const i18n = {
    cs: {
        extensionTitle: "YouTube Video Summarizer",
        llmApiLabel: "LLM API: ",
        modelLabel: "Model: ",
        apiStatusLabel: "API: ",
        languageLabel: "Jazyk: ",
        getTranscriptButton: "Stáhnout titulky",
        summarizeButton: "Sumarizovat video",
        generateChaptersButton: "Vygenerovat kapitoly",
        clearCacheButton: "Vymazat cache",
        transcriptTitle: "Přepis videa",
        summaryTitle: "Shrnutí",
        chaptersTitle: "Kapitoly",
        loadingTranscript: "Načítám přepis...",
        loadingSummary: "Generuji shrnutí...",
        loadingChapters: "Generuji kapitoly...",
        clearingCache: "Mažu cache...",
        transcriptLoaded: "Přepis načten",
        summaryGenerated: "Shrnutí vygenerováno",
        chaptersGenerated: "Kapitoly vygenerovány",
        cacheCleared: "Cache vymazána",
        errorLoadingTranscript: "Chyba při načítání přepisu",
        errorGeneratingSummary: "Chyba při generování shrnutí",
        errorGeneratingChapters: "Chyba při generování kapitol",
        errorClearingCache: "Chyba při mazání cache",
        errorGettingVideoId: "Chyba: Nepodařilo se získat ID videa"
    },
    en: {
        extensionTitle: "YouTube Video Summarizer",
        llmApiLabel: "LLM API: ",
        modelLabel: "Model: ",
        apiStatusLabel: "API: ",
        languageLabel: "Language: ",
        getTranscriptButton: "Download Transcript",
        summarizeButton: "Summarize Video",
        generateChaptersButton: "Generate Chapters",
        clearCacheButton: "Clear Cache",
        transcriptTitle: "Video Transcript",
        summaryTitle: "Summary",
        chaptersTitle: "Chapters",
        loadingTranscript: "Loading transcript...",
        loadingSummary: "Generating summary...",
        loadingChapters: "Generating chapters...",
        clearingCache: "Clearing cache...",
        transcriptLoaded: "Transcript loaded",
        summaryGenerated: "Summary generated",
        chaptersGenerated: "Chapters generated",
        cacheCleared: "Cache cleared",
        errorLoadingTranscript: "Error loading transcript",
        errorGeneratingSummary: "Error generating summary",
        errorGeneratingChapters: "Error generating chapters",
        errorClearingCache: "Error clearing cache",
        errorGettingVideoId: "Error: Failed to get video ID"
    },
    // Přidejte další jazyky podle potřeby
};

let currentLanguage = 'cs';

function setLanguage(lang) {
    currentLanguage = lang;
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = i18n[lang][key];
    });

    // Aktualizace textů v currentSettings
    document.getElementById('modelLabel').textContent = i18n[lang].modelLabel;
    document.getElementById('apiStatusLabel').textContent = i18n[lang].apiStatusLabel;
    document.getElementById('languageLabel').textContent = i18n[lang].languageLabel;
    document.getElementById('llmApiLabel').textContent = i18n[lang].llmApiLabel;
}

document.addEventListener('DOMContentLoaded', function() {
    const getTranscriptButton = document.getElementById('getTranscript');
    const summarizeButton = document.getElementById('summarize');
    const generateChaptersButton = document.getElementById('generateChapters');
    const clearCacheButton = document.getElementById('clearCache');
    const summaryTextArea = document.getElementById('summary');
    const chaptersTextArea = document.getElementById('chapters');
    const transcriptTextArea = document.getElementById('transcript');
    const statusDiv = document.getElementById('status');
    const spinner = document.getElementById('spinner');
    const currentModelSpan = document.getElementById('currentModel');
    const apiStatusSpan = document.getElementById('apiStatus');
    const currentLanguageSpan = document.getElementById('currentLanguage');

    let currentVideoId = null;

    function updateCurrentVideo() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "getVideoId"}, function(response) {
                console.log(`Odpověď na getVideoId:`, response);
                if (response && response.videoId) {
                    if (response.videoId !== currentVideoId) {
                        console.log(`Změna videa detekována v popup. Staré ID: ${currentVideoId}, Nové ID: ${response.videoId}`);
                        currentVideoId = response.videoId;
                        clearTextAreas();
                        updateButtonVisibility();
                        loadCachedData(currentVideoId);
                    }
                } else {
                    console.log('Nepodařilo se získat ID videa, zakázání tlačítek');
                    updateButtonVisibility(true);
                }
            });
        });
    }

    updateCurrentVideo();

    function loadSettings() {
        chrome.storage.sync.get(['language', 'summaryLanguage', 'llmApi', 'model', 'apiKey'], function(result) {
            currentModelSpan.textContent = result.model || 'Not set';
            apiStatusSpan.textContent = result.apiKey ? 'Set' : 'Not set';
            currentLanguageSpan.textContent = result.summaryLanguage || 'Not set';
            document.getElementById('currentLlmApi').textContent = result.llmApi || 'Not set';
            setLanguage(result.language || 'cs');
        });
    }

    loadSettings();

    function clearTextAreas() {
        transcriptTextArea.value = '';
        summaryTextArea.value = '';
        chaptersTextArea.value = '';
    }

    function showStatus(messageKey, showSpinner = false, isError = false) {
        statusDiv.textContent = i18n[currentLanguage][messageKey];
        statusDiv.style.color = isError ? 'red' : 'black';
        spinner.style.display = showSpinner ? 'inline-block' : 'none';
        console.log(isError ? 'Error:' : 'Status:', i18n[currentLanguage][messageKey]);
    }

    function setTextAreaContent(textArea, content) {
        textArea.value = content;
    }

    function updateButtonVisibility(disable = false) {
        const buttons = [getTranscriptButton, summarizeButton, generateChaptersButton, clearCacheButton];
        buttons.forEach(button => {
            button.disabled = disable;
        });

        if (disable) {
            clearCacheButton.style.display = 'none';
            getTranscriptButton.textContent = i18n[currentLanguage].getTranscriptButton;
            summarizeButton.textContent = i18n[currentLanguage].summarizeButton;
            generateChaptersButton.textContent = i18n[currentLanguage].generateChaptersButton;
        } else {
            chrome.runtime.sendMessage({action: "checkCache", videoId: currentVideoId}, function(response) {
                if (response && !response.error) {
                    clearCacheButton.style.display = response.hasCache ? 'block' : 'none';
                    getTranscriptButton.textContent = response.hasTranscript ? i18n[currentLanguage].getTranscriptButton + ' (Cached)' : i18n[currentLanguage].getTranscriptButton;
                    summarizeButton.textContent = response.hasSummary ? i18n[currentLanguage].summarizeButton + ' (Cached)' : i18n[currentLanguage].summarizeButton;
                    generateChaptersButton.textContent = response.hasChapters ? i18n[currentLanguage].generateChaptersButton + ' (Cached)' : i18n[currentLanguage].generateChaptersButton;
                } else {
                    console.error('Chyba při kontrole cache:', response ? response.error : 'Neznámá chyba');
                }
            });
        }
    }

    function getVideoId(callback) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "getVideoId"}, function(response) {
                if (response && response.videoId) {
                    console.log(`Získáno ID videa: ${response.videoId}`);
                    currentVideoId = response.videoId;
                    callback(response.videoId);
                    updateButtonVisibility();
                    loadCachedData(response.videoId);
                } else {
                    console.error('Nepodařilo se získat ID videa');
                    showStatus('errorGettingVideoId', false, true);
                    updateButtonVisibility(true);
                }
            });
        });
    }

    getTranscriptButton.addEventListener('click', function() {
        showStatus('loadingTranscript', true);
        getVideoId(function(videoId) {
            chrome.runtime.sendMessage({action: "getTranscript", videoId: videoId}, function(response) {
                if (response && response.transcript) {
                    setTextAreaContent(transcriptTextArea, response.transcript);
                    showStatus('transcriptLoaded');
                } else {
                    setTextAreaContent(transcriptTextArea, 'Nepodařilo se získat přepis.');
                    showStatus('errorLoadingTranscript', false, true);
                }
                updateButtonVisibility();
            });
        });
    });

    summarizeButton.addEventListener('click', function() {
        showStatus('loadingSummary', true);
        getVideoId(function(videoId) {
            chrome.storage.sync.get(['summaryLanguage', 'model', 'apiKey'], function(result) {
                chrome.runtime.sendMessage({
                    action: "summarizeVideo",
                    videoId: videoId,
                    language: result.summaryLanguage,
                    model: result.model,
                    apiKey: result.apiKey
                }, function(response) {
                    if (response && response.summary) {
                        setTextAreaContent(summaryTextArea, response.summary);
                        showStatus('summaryGenerated');
                    } else {
                        setTextAreaContent(summaryTextArea, 'Nepodařilo se získat shrnutí.');
                        showStatus('errorGeneratingSummary', false, true);
                    }
                    updateButtonVisibility();
                });
            });
        });
    });

    generateChaptersButton.addEventListener('click', function() {
        showStatus('loadingChapters', true);
        getVideoId(function(videoId) {
            chrome.storage.sync.get(['summaryLanguage', 'model', 'apiKey'], function(result) {
                chrome.runtime.sendMessage({
                    action: "generateChapters",
                    videoId: videoId,
                    language: result.summaryLanguage,
                    model: result.model,
                    apiKey: result.apiKey
                }, function(response) {
                    if (response && response.chapters) {
                        setTextAreaContent(chaptersTextArea, response.chapters);
                        showStatus('chaptersGenerated');
                    } else {
                        setTextAreaContent(chaptersTextArea, 'Nepodařilo se vygenerovat kapitoly.');
                        showStatus('errorGeneratingChapters', false, true);
                    }
                    updateButtonVisibility();
                });
            });
        });
    });

    clearCacheButton.addEventListener('click', function() {
        showStatus('clearingCache', true);
        getVideoId(function(videoId) {
            chrome.runtime.sendMessage({action: "clearCache", videoId: videoId}, function(response) {
                if (response && response.success) {
                    clearTextAreas();
                    showStatus('cacheCleared');
                } else {
                    showStatus('errorClearingCache', false, true);
                }
                updateButtonVisibility();
            });
        });
    });

    function loadCachedData(videoId) {
        console.log(`Načítání dat z cache pro video ID: ${videoId}`);
        chrome.runtime.sendMessage({action: "checkCache", videoId: videoId}, function(response) {
            console.log(`Odpověď na kontrolu cache:`, response);
            if (response && !response.error) {
                if (response.hasTranscript) {
                    chrome.runtime.sendMessage({action: "getTranscript", videoId: videoId}, function(response) {
                        console.log(`Načtené titulky z cache:`, response);
                        if (response && response.transcript) {
                            setTextAreaContent(transcriptTextArea, response.transcript);
                        }
                    });
                } else {
                    setTextAreaContent(transcriptTextArea, '');
                }
                if (response.hasSummary) {
                    chrome.runtime.sendMessage({action: "summarizeVideo", videoId: videoId}, function(response) {
                        console.log(`Načtené shrnutí z cache:`, response);
                        if (response && response.summary) {
                            setTextAreaContent(summaryTextArea, response.summary);
                        }
                    });
                } else {
                    setTextAreaContent(summaryTextArea, '');
                }
                if (response.hasChapters) {
                    chrome.runtime.sendMessage({action: "generateChapters", videoId: videoId}, function(response) {
                        console.log(`Načtené kapitoly z cache:`, response);
                        if (response && response.chapters) {
                            setTextAreaContent(chaptersTextArea, response.chapters);
                        }
                    });
                } else {
                    setTextAreaContent(chaptersTextArea, '');
                }
            } else {
                console.error('Chyba při kontrole cache:', response ? response.error : 'Neznámá chyba');
                clearTextAreas();
            }
        });
    }
});