// Pomocná funkce pro logování
function logCacheOperation(operation, videoId, key, data) {
  console.log(`Cache ${operation}: Video ID: ${videoId}, Key: ${key}, Data:`, data);
}

// Funkce pro práci s cache
async function saveToCacheManager(videoId, key, data) {
  if (!videoId) {
    console.error('Pokus o uložení do cache bez platného videoId');
    return;
  }
  const cacheKey = `${videoId}_${key}`;
  let cacheData = {};
  cacheData[cacheKey] = {
    timestamp: Date.now(),
    data: data
  };
  await chrome.storage.local.set(cacheData);
  logCacheOperation('Save', videoId, key, data);
}

async function loadFromCacheManager(videoId, key) {
  if (!videoId) {
    console.error('Pokus o načtení z cache bez platného videoId');
    return null;
  }
  const cacheKey = `${videoId}_${key}`;
  const result = await chrome.storage.local.get(cacheKey);
  logCacheOperation('Load', videoId, key, result[cacheKey]);
  if (result[cacheKey]) {
    // Kontrola platnosti cache (např. 24 hodin)
    if (Date.now() - result[cacheKey].timestamp < 24 * 60 * 60 * 1000) {
      return result[cacheKey].data;
    }
  }
  return null;
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    const videoId = new URL(tab.url).searchParams.get('v');
    if (videoId) {
      updateExtensionIcon(tabId, videoId);
    } else {
      console.error('Nepodařilo se získat videoId z URL');
    }
  }
});

// Funkce pro aktualizaci ikony rozšíření
async function updateExtensionIcon(tabId, videoId) {
  if (!videoId) {
    console.error('Pokus o aktualizaci ikony bez platného videoId');
    return;
  }
  const cacheStatus = await checkCache(videoId);
  let iconPath;
  if (cacheStatus.hasCache) {
    iconPath = {
      16: "icons/icon_cache16.png",
      48: "icons/icon_cache48.png",
      128: "icons/icon_cache128.png"
    };
  } else if (videoId) {
    iconPath = {
      16: "icons/icon_available16.png",
      48: "icons/icon_available48.png",
      128: "icons/icon_available128.png"
    };
  } else {
    iconPath = {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png"
    };
  }
  chrome.action.setIcon({tabId: tabId, path: iconPath});
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "videoChanged") {
    console.log('Video změněno, nové ID:', request.videoId);
    if (request.videoId) {
      updateExtensionIcon(sender.tab.id, request.videoId);
      // Vyčistíme cache pro předchozí video
      clearCache(request.videoId);
    } else {
      console.error('Přijata zpráva o změně videa bez platného videoId');
    }
  } else if (request.action === "getTranscript") {
    if (request.videoId) {
      getSubtitles(request.videoId).then(sendResponse);
    } else {
      sendResponse({error: 'Chybí videoId pro získání přepisu'});
    }
    return true;
  } else if (request.action === "summarizeVideo") {
    if (request.videoId) {
      summarizeVideo(request.videoId, request.language, request.model, request.apiKey).then(sendResponse);
    } else {
      sendResponse({error: 'Chybí videoId pro sumarizaci videa'});
    }
    return true;
  } else if (request.action === "generateChapters") {
    if (request.videoId) {
      generateChapters(request.videoId, request.language, request.model, request.apiKey).then(sendResponse);
    } else {
      sendResponse({error: 'Chybí videoId pro generování kapitol'});
    }
    return true;
  } else if (request.action === "checkCache") {
    if (request.videoId) {
      checkCache(request.videoId).then(sendResponse);
    } else {
      sendResponse({error: 'Chybí videoId pro kontrolu cache'});
    }
    return true;
  } else if (request.action === "clearCache") {
    if (request.videoId) {
      clearCache(request.videoId).then(sendResponse);
    } else {
      sendResponse({error: 'Chybí videoId pro vymazání cache'});
    }
    return true;
  }
});

async function checkCache(videoId) {
  if (!videoId) {
    console.error('Pokus o kontrolu cache bez platného videoId');
    return {
      hasCache: false,
      hasTranscript: false,
      hasSummary: false,
      hasChapters: false
    };
  }
  console.log(`Kontrola cache pro video ID: ${videoId}`);
  const transcript = await loadFromCacheManager(videoId, 'transcript');
  const summary = await loadFromCacheManager(videoId, 'summary');
  const chapters = await loadFromCacheManager(videoId, 'chapters');
  const result = {
    hasCache: !!(transcript || summary || chapters),
    hasTranscript: !!transcript,
    hasSummary: !!summary,
    hasChapters: !!chapters
  };
  console.log(`Výsledek kontroly cache:`, result);
  return result;
}

async function clearCache(videoId) {
  if (!videoId) {
    console.error('Pokus o vymazání cache bez platného videoId');
    return { success: false, error: 'Chybí videoId pro vymazání cache' };
  }
  console.log(`Mazání cache pro video ID: ${videoId}`);
  const keysToRemove = [
    `${videoId}_transcript`,
    `${videoId}_summary`,
    `${videoId}_chapters`
  ];
  await chrome.storage.local.remove(keysToRemove);
  console.log(`Cache vymazána pro video ${videoId}`);
  return { success: true };
}

async function getSubtitles(videoId) {
  // Nejprve zkusíme načíst z cache
  const cachedTranscript = await loadFromCacheManager(videoId, 'transcript');
  if (cachedTranscript) {
    return { transcript: cachedTranscript };
  }

  // Pokud není v cache, stáhneme nové
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout při získávání titulků'));
    }, 30000); // 30 sekund timeout

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "getSubtitles"}, async function(response) {
        clearTimeout(timeoutId);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else if (response && response.transcript) {
          // Uložíme do cache pro příští použití
          await saveToCacheManager(videoId, 'transcript', response.transcript);
          resolve({transcript: response.transcript});
        } else {
          reject(new Error('Neočekávaná odpověď při získávání titulků'));
        }
      });
    });
  });
}

async function summarizeVideo(videoId, language, model, apiKey) {
  try {
    // Nejprve zkusíme načíst z cache
    const cachedSummary = await loadFromCacheManager(videoId, 'summary');
    if (cachedSummary) {
      return { summary: cachedSummary };
    }

    const {transcript} = await getSubtitles(videoId);
    const summary = await getSummary(transcript, language, model, apiKey);
    
    // Uložíme do cache pro příští použití
    await saveToCacheManager(videoId, 'summary', summary);
    
    return {summary: summary};
  } catch (error) {
    console.error('Chyba při sumarizaci:', error);
    return {summary: `Došlo k chybě při vytváření shrnutí: ${error.message}`};
  }
}

async function generateChapters(videoId, language, model, apiKey) {
  try {
    // Nejprve zkusíme načíst z cache
    const cachedChapters = await loadFromCacheManager(videoId, 'chapters');
    if (cachedChapters) {
      return { chapters: cachedChapters };
    }

    const {transcript} = await getSubtitles(videoId);
    const chapters = await getChapters(transcript, language, model, apiKey);
    
    // Uložíme do cache pro příští použití
    await saveToCacheManager(videoId, 'chapters', chapters);
    
    return {chapters: chapters};
  } catch (error) {
    console.error('Chyba při generování kapitol:', error);
    return {chapters: `Došlo k chybě při generování kapitol: ${error.message}`};
  }
}

async function getSummary(text, language, model, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {role: "system", content: `Jsi asistent, který vytváří stručné shrnutí a vypisuje nejzajímavější informace z poskytnutého textu. Odpovídej v jazyce: ${language}`},
        {role: "user", content: `Shrň následující text a vypiš nejzajímavější informace: ${text}`}
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

async function getChapters(text, language, model, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {role: "system", content: `Jsi asistent, který vytváří návrh kapitol s časovými odkazy na začátek každé kapitoly na základě poskytnutého textu s časovými značkami. Odpovídej v jazyce: ${language}`},
        {role: "user", content: `Vytvoř návrh těch nejdůležitějších kapitol s časovými odkazy na základě následujícího textu. Použij formát [HH:MM:SS] Název kapitoly: ${text}`}
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}