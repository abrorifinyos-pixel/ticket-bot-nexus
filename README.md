# 𝐍𝐞𝐱𝐮𝐬 𝐒𝐜𝐫𝐢𝐩𝐭 — Ticket Bot

A fully-featured Discord ticket bot built for the Nexus Script development server.

## Features

- ✅ Slash commands only (`/`)
- 🎫 Ticket system with categories
- 🔒 Close / Delete / Reopen tickets
- 🙋 Claim tickets
- ➕ Add / Remove users from tickets
- ⭐ Mandatory rating + comment after closure
- 📋 Logs (open, close, delete)
- 🌐 Multi-server support via `/control-panel`
- 🎙️ 24/7 voice channel presence
- 🔄 Live updates without restart

## Setup

### 1. Requirements

- Node.js 18+
- MongoDB (optional — falls back to JSON)

### 2. Installation

```bash
npm install
```

### 3. Configuration

Copy `.env.example` to `.env` and fill in:

```env
DISCORD_BOT_TOKEN=your_bot_token
CLIENT_ID=your_bot_application_id
MONGODB_URI=mongodb://...  # optional
```

### 4. Register Slash Commands

```bash
node src/deploy-commands.js
```

### 5. Start the Bot

```bash
node src/index.js
```

Or with auto-restart:

```bash
npm run dev
```

## Slash Commands

| Command | Description | Permission |
|---|---|---|
| `/control-panel` | Open bot control panel | Administrator |
| `/join-voice` | Join a voice channel 24/7 | Administrator |

## Control Panel Features

- 📂 Add / Edit / Delete ticket categories
- 📋 Set logs channel
- ⭐ Set ratings channel
- 📁 Set ticket category
- 👑 Set staff roles
- 🎫 Send ticket panel to any channel

## Main Guild Auto-Setup

- Guild ID: `1265834107783483404`
- Category ID: `1492635837718986942`
- Logs: `1492996007762596061`
- Ratings: `1492996586647584808`
- Staff Role: `1492994348239949996`

The bot auto-sends the ticket panel on first startup for the main guild.

## Ticket Flow

1. User selects a category → channel created
2. Ticket has 4 buttons: Close / Claim / Add User / Remove User
3. Close → rating required → then can delete
4. Logs sent to logs channel
5. Ratings sent to ratings channel

## Multi-Server

Each server gets its own settings. Use `/control-panel` in any server to configure independently.
