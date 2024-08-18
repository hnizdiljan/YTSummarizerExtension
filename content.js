// Funkce pro získání ID videa z URL
function getYouTubeVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Funkce pro odeslání zprávy o změně videa
function sendVideoChangeMessage() {
  const videoId = getYouTubeVideoId();
  if (videoId) {
    console.log(`Odesílání zprávy o změně videa. Nové video ID: ${videoId}`);
    chrome.runtime.sendMessage({action: "videoChanged", videoId: videoId});
  } else {
    console.log(`Nepodařilo se získat ID videa pro odeslání zprávy o změně`);
  }
}


// Sledování změn v historii (pro SPA navigaci)
let lastVideoId = getYouTubeVideoId();

function checkForVideoChange() {
  const currentVideoId = getYouTubeVideoId();
  console.log(`Kontrola změny videa: Aktuální ID: ${currentVideoId}, Poslední ID: ${lastVideoId}`);
  if (currentVideoId !== lastVideoId) {
    console.log(`Detekována změna videa z ${lastVideoId} na ${currentVideoId}`);
    lastVideoId = currentVideoId;
    sendVideoChangeMessage();
    clearLocalCache(); // Vyčistíme lokální cache při změně videa
  }
}

// Přidáme funkci pro vyčištění lokální cache
function clearLocalCache() {
  if (lastVideoId) {
    console.log(`Vymazávání lokální cache pro video ID: ${lastVideoId}`);
    chrome.runtime.sendMessage({action: "clearCache", videoId: lastVideoId}, (response) => {
      console.log(`Odpověď na vymazání cache:`, response);
    });
  } else {
    console.log(`Nelze vymazat cache, chybí platné video ID`);
  }
}

// Použijeme MutationObserver pro sledování změn v DOM
const observer = new MutationObserver(() => {
  checkForVideoChange();
});


observer.observe(document.body, { childList: true, subtree: true });

// Také budeme kontrolovat změny při načtení stránky a při změně URL
window.addEventListener('load', sendVideoChangeMessage);
window.addEventListener('yt-navigate-finish', checkForVideoChange); // YouTube specifická událost pro SPA navigaci

// Inicializace při načtení skriptu
sendVideoChangeMessage();

// Posluchač zpráv od popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`Přijata zpráva v content skriptu:`, request);
  if (request.action === "getVideoId") {
    const videoId = getYouTubeVideoId();
    console.log(`Odesílání ID videa: ${videoId}`);
    sendResponse({videoId: videoId});
  } else if (request.action === "getSubtitles") {
    console.log(`Požadavek na získání titulků`);
    window.postMessage({ type: "GET_SUBTITLES" }, "*");
    
    const messageListener = function(event) {
      if (event.source !== window) return;
      if (event.data.type && event.data.type === 'FROM_PAGE' && event.data.action === 'subtitlesResult') {
        window.removeEventListener('message', messageListener);
        console.log(`Přijaty titulky, odesílání odpovědi`);
        sendResponse({transcript: event.data.subtitles});
      }
    };
    
    window.addEventListener('message', messageListener);
    
    return true;
  }
});

// Posluchač zpráv od injected.js
window.addEventListener('message', function(event) {
  if (event.source != window) return;
  if (event.data.type && event.data.type == 'FROM_PAGE') {
    chrome.runtime.sendMessage(event.data);
  }
});

function injectScript(file_path) {
  var script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', file_path);
  document.body.appendChild(script);
}

injectScript(chrome.runtime.getURL('injected.js'));