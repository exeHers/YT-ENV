# YT ENV React Native Architecture Notes

## Security and auth boundary

- Implemented a compliant web auth module that captures auth code redirect, not raw Google session cookies.
- Auth state is stored in encrypted MMKV storage through `AuthPlugin`.
- Mobile user-agent is applied in WebView to avoid unsupported browser issues.

## Plugin pattern

- `PluginRegistry` supports independent lifecycle for:
  - Auth (`AuthPlugin`)
  - EQ (`EqualizerPlugin`)
- Main UI can stay decoupled from feature modules.

## Deep settings

- Categorized settings model with:
  - Audio
  - Visuals
  - Performance
  - Experimental
- `ExtremeSettingsScreen` renders a dark neon-friendly dashboard.

## Library performance

- `LibraryScreen` uses `FlashList` for large collections and smooth scrolling.
