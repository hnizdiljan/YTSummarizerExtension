window.addEventListener('message', function(event) {
    if (event.data.type && event.data.type == 'GET_SUBTITLES') {
        getSubtitles().then(subtitles => {
            window.postMessage({ type: 'FROM_PAGE', action: 'subtitlesResult', subtitles: subtitles }, '*');
        });
    }
});

async function getSubtitles() {
    try {
        // Pokusíme se získat titulky z ytInitialPlayerResponse
        if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse.captions) {
            return getSubtitlesFromInitialResponse(ytInitialPlayerResponse);
        }

        // Pokud ytInitialPlayerResponse není k dispozici, zkusíme alternativní metodu
        const videoId = getYouTubeVideoId();
        if (!videoId) {
            throw new Error('Nelze získat ID videa');
        }

        // Získáme titulky pomocí YouTube API
        const subtitles = await getSubtitlesFromAPI(videoId);
        return subtitles;
    } catch (error) {
        console.error('Chyba při získávání titulků:', error);
        return `Došlo k chybě při získávání titulků: ${error.message}`;
    }
}

function getSubtitlesFromInitialResponse(response) {
    const captionTracks = response.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
        return 'Pro toto video nejsou k dispozici žádné titulky';
    }

    // Preferujeme automaticky generované titulky (ASR), jinak použijeme první dostupné
    const autoCaption = captionTracks.find(track => track.kind === 'asr');
    const selectedCaption = autoCaption || captionTracks[0];

    // Upravíme URL pro získání celých titulků
    let subsUrl = selectedCaption.baseUrl;
    subsUrl += '&fmt=json3'; // Požadujeme JSON formát

    return fetch(subsUrl)
        .then(response => response.json())
        .then(jsonSubtitles => parseJsonSubtitles(jsonSubtitles));
}

async function getSubtitlesFromAPI(videoId) {
    const apiUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(apiUrl);
    const html = await response.text();
    
    // Hledáme data v HTML odpovědi
    const match = html.match(/"captions":\s*({[^}]+})/);
    if (!match) {
        throw new Error('Nelze najít data titulků v HTML odpovědi');
    }

    const captionData = JSON.parse(match[1]);
    const captionTracks = captionData.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
        return 'Pro toto video nejsou k dispozici žádné titulky';
    }

    // Preferujeme automaticky generované titulky (ASR), jinak použijeme první dostupné
    const autoCaption = captionTracks.find(track => track.kind === 'asr');
    const selectedCaption = autoCaption || captionTracks[0];

    // Získáme titulky ve formátu JSON
    const subsUrl = `${selectedCaption.baseUrl}&fmt=json3`;
    const subsResponse = await fetch(subsUrl);
    const jsonSubtitles = await subsResponse.json();

    return parseJsonSubtitles(jsonSubtitles);
}

function getYouTubeVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
}

function parseJsonSubtitles(jsonSubtitles) {
    let subtitles = '';
    for (let event of jsonSubtitles.events) {
        if (event.segs) {
            const startTime = formatTime(event.tStartMs);
            let line = `${startTime} `;
            for (let seg of event.segs) {
                line += decodeHtmlEntities(seg.utf8);
            }
            if (line.trim() !== startTime) {  // Přidáváme pouze neprázdné řádky
                subtitles += line.trim() + '\n';
            }
        }
    }
    return subtitles.trim();
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `[${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
}

function decodeHtmlEntities(text) {
    const entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#x27;': "'",
        '&#x2F;': '/',
        '&#x60;': '`',
        '&#x3D;': '='
    };
    return text.replace(/&(?:amp|lt|gt|quot|#39|#x27|#x2F|#x60|#x3D);/g, match => entities[match]);
}