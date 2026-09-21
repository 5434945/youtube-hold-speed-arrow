# YouTube Hold Speed Arrow

A tiny Chrome / Edge extension for YouTube: tap the right arrow key to keep YouTube's normal seek shortcut, or hold it to temporarily switch playback speed.

## Features

- Hold a custom key to temporarily change YouTube playback speed.
- Default key is the right arrow key.
- Tap `Right Arrow` to keep YouTube's native seek-forward shortcut.
- Hold `Right Arrow` to switch to `2x` playback speed.
- Release the key to restore playback speed.
- Configure the key, speed, and restore behavior from the extension popup.
- Avoids search boxes, comment boxes, and other editable fields.

## Install Locally

1. Open `chrome://extensions` in Chrome, or the extensions page in Edge.
2. Turn on Developer mode.
3. Click Load unpacked.
4. Select this project folder.
5. Refresh YouTube and try the shortcut.

## Default Settings

- Hold key: `Right Arrow`
- Hold speed: `2x`
- Restore behavior: back to `1x`

## Project Structure

```text
.
|-- manifest.json
|-- content.js
|-- options.html
|-- options.js
|-- styles.css
`-- README.md
```

## Notes

This is a Manifest V3 extension. It only runs on `youtube.com` and `m.youtube.com`.
