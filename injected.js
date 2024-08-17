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
        window.postMessage({ type: 'FROM_PAGE', action: 'subtitlesResult', subtitles: subtitles }, '*');
    } catch (error) {
        console.error('Chyba při získávání titulků:', error);
        window.postMessage({ type: 'FROM_PAGE', action: 'subtitlesResult', error: error.message }, '*');
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
    try {
        const response = await fetch(apiUrl);
        const html = await response.text();
        
        // Hledáme data v HTML odpovědi
        const match = html.match(/"captions":\s*({[^}]+})/);
        if (!match) {
            throw new Error('Nelze najít data titulků v HTML odpovědi');
        }

        let captionData;
        try {
            captionData = JSON.parse(match[1]);
        } catch (jsonError) {
            console.error('Chyba při parsování JSON dat titulků:', jsonError);
            // Pokusíme se opravit běžné problémy v JSON
            const fixedJson = match[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
            captionData = JSON.parse(fixedJson);
        }

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
    } catch (error) {
        console.error('Chyba při získávání titulků:', error);
        return `Došlo k chybě při získávání titulků: ${error.message}`;
    }
}

function getYouTubeVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
}

function parseJsonSubtitles(jsonSubtitles) {
    let subtitles = '';
    if (!jsonSubtitles || !jsonSubtitles.events) {
        console.error('Neočekávaná struktura JSON titulků');
        return 'Chyba: Neplatná struktura titulků';
    }
    for (let event of jsonSubtitles.events) {
        if (event.segs) {
            const startTime = formatTime(event.tStartMs);
            let line = `${startTime} `;
            for (let seg of event.segs) {
                if (seg.utf8) {
                    line += decodeHtmlEntities(seg.utf8);
                }
            }
            if (line.trim() !== startTime) {  // Přidáváme pouze neprázdné řádky
                subtitles += line.trim() + '\n';
            }
        }
    }
    return subtitles.trim() || 'Nepodařilo se extrahovat titulky z JSON dat';
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