# YouTube Video Summarizer

YouTube Video Summarizer is a browser extension that allows users to easily obtain transcripts, summaries, and chapters from YouTube videos. This extension utilizes advanced AI technology to generate useful summaries of video content.

## Features

- **Transcript Download**: Automatically extracts captions from YouTube videos.
- **Video Summarization**: Generates concise summaries of video content using AI.
- **Chapter Generation**: Creates chapter proposals with timestamps for easy video navigation.
- **Data Caching**: Stores retrieved data locally for faster access and offline use.
- **Status Indicator**: Dynamically changes the extension icon to display data availability.
- **Multi-language Support**: Supports Czech, English, German, and French for the user interface and summary generation.
- **Customizable Summary Language**: Allows users to select the language for summary generation independently of the extension language.

## Installation

1. Download the extension source code.
2. Open the extensions page in your browser (e.g., `edge://extensions/` for Microsoft Edge).
3. Enable "Developer mode".
4. Click on "Load unpacked" and select the folder with the downloaded code.

## Setup

Before using the extension, you need to complete the following setup:

1. Click on the extension icon and select "Settings" (or visit the options.html page).
2. Choose the extension language and the language for summary generation.
3. Select the desired LLM API (currently only OpenAI is supported).
4. Choose the AI model (GPT-4o-mini or GPT-3.5-turbo).
5. Enter your OpenAI API key.
6. Click on "Save Settings".

## Usage

1. Visit a video on YouTube.
2. Click on the extension icon to open the popup window.
3. Use the buttons to download the transcript, summarize the video, or generate chapters.
4. Results will be displayed in the respective text fields in the popup window.
5. To clear the cache for the current video, use the "Clear Cache" button.

## Project Structure

- `manifest.json`: Extension configuration file.
- `background.js`: Service worker for managing extension state, API communication, and cache management.
- `content.js`: Script for interacting with the YouTube webpage and detecting video changes.
- `injected.js`: Script injected into the YouTube page for data and caption extraction.
- `popup.html`: HTML structure of the popup window.
- `popup.js`: Logic for interacting with the user interface in the popup window and managing localization.
- `options.html`: HTML structure of the settings page.
- `options.js`: Logic for saving and loading extension settings.

## Technical Details

### Caption Extraction

The extension uses two approaches to obtain captions:
1. Extraction from the `ytInitialPlayerResponse` object on the YouTube page.
2. If the first method fails, it uses an alternative API call to retrieve captions.

### AI Integration

OpenAI API is used for summarization and chapter generation. Users can choose between GPT-4o-mini and GPT-3.5-turbo models. API communication is implemented in `background.js`.

### Caching

Data is cached locally using the `chrome.storage.local` API for faster access and to reduce the number of API calls. Each video has its own cache for transcript, summary, and chapters.

### Video Change Detection

The extension actively monitors URL and DOM changes to detect transitions to new videos, ensuring the displayed data remains current.

### Localization

The extension supports multiple languages for the user interface. Localization strings are stored in the `i18n` object in the `popup.js` file.

### Security

The API key is securely stored using the `chrome.storage.sync` API and is never displayed in readable form in the user interface.

## Limitations

- The extension works only on YouTube pages.
- A valid OpenAI API key is required for summarization and chapter generation.
- The quality of summaries and chapters depends on the availability and quality of video captions.

## Future Improvements

- Integration with additional AI services for greater flexibility.
- Extending functionality to other video platforms.
- Implementation of more advanced methods for caption extraction and processing.

## Contributions

Contributions to the project are welcome. Please open an issue or pull request on the project's GitHub repository.

## License

This extension is released under the MIT license. See the `LICENSE` file for more details.
