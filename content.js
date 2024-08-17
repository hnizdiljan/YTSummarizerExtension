// Funkce pro získání ID videa z URL
function getYouTubeVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Funkce pro odeslání zprávy o změně videa
function sendVideoChangeMessage() {
  const videoId = getYouTubeVideoId();
  if (videoId) {
      chrome.runtime.sendMessage({action: "videoChanged", videoId: videoId});
  }
}

// Sledování změn v historii (pro SPA navigaci)
let lastVideoId = getYouTubeVideoId();
function checkForVideoChange() {
  const currentVideoId = getYouTubeVideoId();
  if (currentVideoId !== lastVideoId) {
      lastVideoId = currentVideoId;
      sendVideoChangeMessage();
  }
}

// Použijeme MutationObserver pro sledování změn v DOM
const observer = new MutationObserver(checkForVideoChange);
observer.observe(document.body, { childList: true, subtree: true });

// Také budeme kontrolovat změny při načtení stránky a při změně hash
window.addEventListener('load', sendVideoChangeMessage);
window.addEventListener('hashchange', checkForVideoChange);

// Inicializace při načtení skriptu
sendVideoChangeMessage();

// Posluchač zpráv od popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVideoId") {
    sendResponse({videoId: getYouTubeVideoId()});
  } else if (request.action === "getSubtitles") {
    window.postMessage({ type: "GET_SUBTITLES" }, "*");
    
    // Nastavíme listener pro odpověď od injected skriptu
    const messageListener = function(event) {
      if (event.source !== window) return;
      if (event.data.type && event.data.type === 'FROM_PAGE' && event.data.action === 'subtitlesResult') {
        window.removeEventListener('message', messageListener);
        sendResponse({transcript: event.data.subtitles});
      }
    };
    
    window.addEventListener('message', messageListener);
    
    // Vracíme true, abychom indikovali, že budeme používat sendResponse asynchronně
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