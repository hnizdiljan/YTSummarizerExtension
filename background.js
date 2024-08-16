// Funkce pro ukládání dat do cache
async function saveToCacheManager(videoId, key, data) {
  const cacheKey = `${videoId}_${key}`;
  let cacheData = {};
  cacheData[cacheKey] = {
    timestamp: Date.now(),
    data: data
  };
  await chrome.storage.local.set(cacheData);
}

// Funkce pro načítání dat z cache
async function loadFromCacheManager(videoId, key) {
  const cacheKey = `${videoId}_${key}`;
  const result = await chrome.storage.local.get(cacheKey);
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
      updateExtensionIcon(tabId, videoId);
  }
});

async function updateExtensionIcon(tabId, videoId) {
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
  if (request.action === "getTranscript") {
      getSubtitles(request.videoId).then(sendResponse);
      return true;
  } else if (request.action === "summarizeVideo") {
      summarizeVideo(request.videoId).then(sendResponse);
      return true;
  } else if (request.action === "generateChapters") {
      generateChapters(request.videoId).then(sendResponse);
      return true;
  } else if (request.action === "checkCache") {
      checkCache(request.videoId).then(sendResponse);
      return true;
  } else if (request.action === "clearCache") {
      clearCache(request.videoId).then(sendResponse);
      return true;
  }
});

async function checkCache(videoId) {
  const transcript = await loadFromCacheManager(videoId, 'transcript');
  const summary = await loadFromCacheManager(videoId, 'summary');
  const chapters = await loadFromCacheManager(videoId, 'chapters');
  return {
      hasCache: !!(transcript || summary || chapters),
      hasTranscript: !!transcript,
      hasSummary: !!summary,
      hasChapters: !!chapters
  };
}

async function clearCache(videoId) {
  await chrome.storage.local.remove([
      `${videoId}_transcript`,
      `${videoId}_summary`,
      `${videoId}_chapters`
  ]);
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
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "getSubtitles"}, async function(response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          // Uložíme do cache pro příští použití
          await saveToCacheManager(videoId, 'transcript', response);
          resolve({transcript: response});
        }
      });
    });
  });
}

async function summarizeVideo(videoId) {
  try {
    // Nejprve zkusíme načíst z cache
    const cachedSummary = await loadFromCacheManager(videoId, 'summary');
    if (cachedSummary) {
      return { summary: cachedSummary };
    }

    const apiKey = await getApiKey();
    const {transcript} = await getSubtitles(videoId);
    const summary = await getSummary(transcript, apiKey);
    
    // Uložíme do cache pro příští použití
    await saveToCacheManager(videoId, 'summary', summary);
    
    return {summary: summary};
  } catch (error) {
    console.error('Chyba při sumarizaci:', error);
    return {summary: `Došlo k chybě při vytváření shrnutí: ${error.message}`};
  }
}

async function generateChapters(videoId) {
  try {
    // Nejprve zkusíme načíst z cache
    const cachedChapters = await loadFromCacheManager(videoId, 'chapters');
    if (cachedChapters) {
      return { chapters: cachedChapters };
    }

    const apiKey = await getApiKey();
    const {transcript} = await getSubtitles(videoId);
    const chapters = await getChapters(transcript, apiKey);
    
    // Uložíme do cache pro příští použití
    await saveToCacheManager(videoId, 'chapters', chapters);
    
    return {chapters: chapters};
  } catch (error) {
    console.error('Chyba při generování kapitol:', error);
    return {chapters: `Došlo k chybě při generování kapitol: ${error.message}`};
  }
}

function getApiKey() {
  return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['apiKey'], (result) => {
          if (result.apiKey) {
              resolve(result.apiKey);
          } else {
              reject('API klíč není nastaven');
          }
      });
  });
}

async function getSummary(text, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
              {role: "system", content: "Jsi asistent, který vytváří stručné shrnutí a vypisuje nejzajímavější informace z poskytnutého textu."},
              {role: "user", content: `Shrň následující text a vypiš nejzajímavější informace: ${text}`}
          ]
      })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

async function getChapters(text, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
              {role: "system", content: "Jsi asistent, který vytváří návrh kapitol s časovými odkazy na začátek každé kapitoly na základě poskytnutého textu s časovými značkami."},
              {role: "user", content: `Vytvoř návrh kapitol s časovými odkazy na základě následujícího textu. Použij formát [HH:MM:SS] Název kapitoly: ${text}`}
          ]
      })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}