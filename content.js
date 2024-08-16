chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSubtitles") {
      window.postMessage({ type: "GET_SUBTITLES" }, "*");
      
      window.addEventListener("message", function listener(event) {
          if (event.data.type && event.data.type === "FROM_PAGE" && event.data.action === "subtitlesResult") {
              window.removeEventListener("message", listener);
              sendResponse(event.data.subtitles);
          }
      });
      
      return true;  // Indicates that the response is asynchronous
  }
});

function injectScript(file_path) {
  var script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', file_path);
  document.body.appendChild(script);
}

injectScript(chrome.runtime.getURL('injected.js'));

window.addEventListener('message', function(event) {
  if (event.source != window) return;
  if (event.data.type && event.data.type == 'FROM_PAGE') {
      chrome.runtime.sendMessage(event.data);
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getVideoId") {
      const videoId = getYouTubeVideoId();
      sendResponse({videoId: videoId});
  } else if (request.action === "getSubtitles") {
      window.postMessage({ type: "GET_SUBTITLES" }, "*");
      // Odpověď bude poslána asynchronně přes window.postMessage
      return true;
  }
});

function getYouTubeVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}