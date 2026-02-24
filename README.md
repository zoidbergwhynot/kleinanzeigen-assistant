# Kleinanzeigen Assistant

Human-in-the-Loop automation for Kleinanzeigen (German classifieds). Finds messages and items, extracts context, and notifies a main agent for drafting replies.

## Setup

### 1. Install Dependencies

```bash
cd projects/kleinanzeigen-assistant
npm install
```

### 2. Configure Credentials

Copy the example environment file and add your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
KLEINANZEIGEN_EMAIL=your-email@example.com
KLEINANZEIGEN_PASSWORD=your-password
HEADLESS=true
PROFILE=main
```

### 3. Browser Profiles

Profiles store session cookies and browser fingerprint data. Three profiles are available:

| Profile | Purpose |
|---------|---------|
| `main` | General use (default) |
| `human-sim` | Behavioral simulation testing |
| `fresh` | Clean slate for testing |

Set via `PROFILE=main` in `.env` or `PROFILE=human-sim npm run poll`.

## Usage

### CLI Commands

```bash
# Check for unread messages
npm run poll
# or: node src/index.js poll

# Search for an item
npm run search "MacBook M1"
# or: node src/index.js search "MacBook M1"

# Run all saved searches
npm run searches
# or: node src/index.js searches
```

### Saved Searches

Edit `config/searches.json` to manage saved searches:

```json
[
  {
    "query": "MacBook M1",
    "active": true,
    "minPrice": 500,
    "maxPrice": 800
  }
]
```

## Architecture

```
kleinanzeigen-assistant/
├── config/
│   ├── config.js        # Configuration & credential loading
│   └── searches.json    # Saved search queries
├── src/
│   ├── browser/
│   │   └── manager.js   # Browser lifecycle (init, login, close)
│   ├── parsers/
│   │   ├── messages.js  # Conversation parsing
│   │   └── ads.js       # Listing parsing
│   ├── utils/
│   │   └── language.js  # German/English detection
│   ├── notifier.js      # Agent notification (via openclaw cron)
│   └── index.js         # CLI entry point
├── profiles/            # Browser profiles (gitignored)
├── .env.example         # Credential template
└── package.json
```

## Notification System

When items or messages are found, the assistant notifies the main agent via:

```bash
/usr/bin/openclaw cron wake --text "<context>" --mode now
```

The context includes:
- **Seller mode**: Conversation history, item details, detected language
- **Buyer mode**: Item listing, price, seller name, description

## Security Notes

- **Credentials**: Never commit `.env` to version control
- **Profiles**: Browser profiles contain session cookies - they are gitignored
- **Password in code**: The original script had hardcoded credentials - this version uses environment variables

## Anti-Detection Notes

This project uses `puppeteer-extra-plugin-stealth` for basic anti-detection. For high-security operations (login, managing ads), consider:

1. **Attached Tab Method**: Use the OpenClaw Browser Relay extension to control an existing authenticated tab
2. **Human Simulation**: Randomize delays, use `headless: false`
3. **Back Off**: If you hit 403 or timeouts, STOP. Don't retry or you'll burn IP reputation.

See `SCRAPING_LEARNINGS.md` in the workspace root for detailed anti-detection strategies.

## Migration Notes

This project was refactored from `scripts/kleinanzeigen-manager.js`. Original files are preserved in `scripts/` for reference.
