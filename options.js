// Definujeme modely mimo systém i18n
const OpenAI_MODELS = {
    'gpt-4o-mini': 'GPT-4o-mini',
    'gpt-3.5-turbo': 'GPT-3.5-turbo'
  };

const i18n = {
    cs: {
        optionsTitle: "Nastavení YouTube Video Summarizer",
        languageLabel: "Jazyk rozšíření:",
        summaryLanguageLabel: "Jazyk sumarizace:",
        llmApiLabel: "LLM API:",
        modelLabel: "Model:",
        apiKeyLabel: "API Klíč:",
        saveButton: "Uložit nastavení",
        settingsSaved: "Nastavení bylo uloženo.",
        czech: "Čeština",
        english: "Angličtina",
        german: "Němčina",
        french: "Francouzština",
        openai: "OpenAI",
        model_gptomini: "GPT-4o-mini",
        model_gptturbo: "GPT-3.5-turbo"
    },
    en: {
        optionsTitle: "YouTube Video Summarizer Settings",
        languageLabel: "Extension Language:",
        summaryLanguageLabel: "Summary Language:",
        llmApiLabel: "LLM API:",
        modelLabel: "Model:",
        apiKeyLabel: "API Key:",
        saveButton: "Save Settings",
        settingsSaved: "Settings have been saved.",
        czech: "Czech",
        english: "English",
        german: "German",
        french: "French",
        openai: "OpenAI",
        model_gptomini: "GPT-4o-mini",
        model_gptturbo: "GPT-3.5-turbo"
    },
    // Přidejte další jazyky podle potřeby
};

function setLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = i18n[lang][key];
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const languageSelect = document.getElementById('language');
    const summaryLanguageSelect = document.getElementById('summaryLanguage');
    const llmApiSelect = document.getElementById('llm-api');
    const modelSelect = document.getElementById('model');
    const apiKeyInput = document.getElementById('api-key');
    const saveButton = document.getElementById('save');
    const statusDiv = document.getElementById('status');

    // Načtení uložených nastavení
    chrome.storage.sync.get(['language', 'summaryLanguage', 'llmApi', 'model', 'apiKey'], function(result) {
        languageSelect.value = result.language || 'cs';
        summaryLanguageSelect.value = result.summaryLanguage || 'cs';
        llmApiSelect.value = result.llmApi || 'openai';
        modelSelect.value = result.model || 'gpt-4o-mini';
        apiKeyInput.value = result.apiKey || '';
        setLanguage(result.language || 'cs');
    });

    // Změna jazyka rozšíření
    languageSelect.addEventListener('change', function() {
        setLanguage(languageSelect.value);
    });

    // Uložení nastavení
    saveButton.addEventListener('click', function() {
        const language = languageSelect.value;
        const summaryLanguage = summaryLanguageSelect.value;
        const llmApi = llmApiSelect.value;
        const model = modelSelect.value;
        const apiKey = apiKeyInput.value;

        chrome.storage.sync.set({
            language: language,
            summaryLanguage: summaryLanguage,
            llmApi: llmApi,
            model: model,
            apiKey: apiKey
        }, function() {
            statusDiv.textContent = i18n[language].settingsSaved;
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 3000);
        });
    });

    // Aktualizace dostupných modelů podle vybraného API
    llmApiSelect.addEventListener('change', function() {
        updateModelOptions(llmApiSelect.value);
    });

    function updateModelOptions(api) {
        modelSelect.innerHTML = '';
        let options;
        if (api === 'openai') {
            options = Object.entries(OpenAI_MODELS).map(([value, text]) => ({value, text}));
        } else {
            options = [];
        }
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            modelSelect.appendChild(optionElement);
        });
    }

    // Inicializace modelů podle aktuálně vybraného API
    updateModelOptions(llmApiSelect.value);
});