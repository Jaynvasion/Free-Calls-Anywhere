# 🖤 Free Calls Anywhere (Beta)

**One-click, minimal, private audio calls** you can share worldwide.  
Pick a **Meeting ID** + your **name**, click **Join**, and talk.  
Runs locally and tunnels to the internet via **Cloudflare Tunnel**.

> **Status:** Beta — small, occasional disconnects can happen (see Reliability & Tips). We’re improving stability as we go.

---

## ✨ Features
- Simple UI: **Meeting ID**, **Name**, **Join / End**, **Participants**, **Timer**
- **No “host” flow** — just join by Meeting ID
- **Socket.IO** signaling (reliable behind Cloudflare; WS with polling fallback)
- WebRTC **audio-only** (encrypted in transit via DTLS-SRTP)
- Optional **TURN** support for strict NATs / locked networks (via `.env` → `/config.json`)
- One-click launch scripts for **Windows** and **macOS/Linux**

---

## 🚀 One-Click Start

### Windows (recommended)
1. Install **Node.js 18+** and **cloudflared** (the script can auto-install cloudflared via `winget`).
2. Double-click **`start_windows_oneclick.bat`**
   - It runs `npm install`, starts the server, and launches a Cloudflare quick tunnel.
3. Copy the **HTTPS** URL from the Tunnel window (looks like `https://*.trycloudflare.com`).
4. Share it with your friend. You can also prefill the room:
   ```
   https://YOUR-CF-LINK.trycloudflare.com/?room=dark-777
   ```

### macOS / Linux
```bash
# Prerequisites: Node.js 18+, cloudflared
chmod +x start_mac_linux.sh
./start_mac_linux.sh
```
The script runs `npm install`, starts the server (background), then starts the tunnel and prints the **HTTPS** URL.

> Keep both processes running (**Server** and **Tunnel**). Closing them stops the service.

---

## 🗣️ How to Use
1. Open the Cloudflare link in **Chrome/Edge/Firefox**.
2. **Allow microphone** when prompted.
3. Both sides enter the **same Meeting ID** and a **name**.
4. Click **Join**.  
   You’ll see your names under **Participants**, and the **timer** will start.

   Make sure you open the LOCALHOST FIRST BUT JUDT OPEN IT AND LEAVE IT THERE. OPEN THE CLOUDFLARE LINK TO TALK TO FRIENDS BUT LOCALHOST IS BASICALLY THE CONNECTION ONE AND THE OTHER IS WHAT YOU SEND TO FRIENDS..... THANK YOU!

**Pro tip:** To prefill the room for someone, add `?room=YOUR_ID` to the end of the link.

---

## 🔧 Configuration (TURN, etc.)

Some hotel/campus/corporate networks block direct P2P. If the call connects but you **can’t hear** each other (or it stalls on “Connecting…”), add a **TURN** server.

1. Copy `.env.example` → `.env`
2. Fill `ICE_SERVERS_JSON` with your TURN (keep STUN + add TURN):
   ```dotenv
   ICE_SERVERS_JSON=[
     {"urls":["stun:stun.l.google.com:19302"]},
     {"urls":"turn:YOUR_TURN_HOST:3478","username":"USER","credential":"PASS"}
   ]
   ```
3. Restart the server (`npm start` or re-run the one-click script).  
   The client fetches `/config.json` automatically — no rebuild needed.

---

## 🧪 Reliability & Tips (Beta)

- **Quick tunnels are ephemeral.** If you restart cloudflared, you’ll get a **new URL** — share the latest one.
- **Keep the app tab active.** Some browsers throttle background tabs and may impact real-time audio.
- **Stable network = better call.** Wi-Fi drops or VPNs can cause reconnects. Wired or strong Wi-Fi helps.
- **Use TURN on strict networks.** If either side is on hotel/campus/enterprise internet, TURN often fixes one-way/no-audio issues.
- **Small rooms only.** This is a P2P mesh for a few people. For big rooms you’d use an SFU (future roadmap).

---

## 🧰 Manual Start (dev)

```bash
npm install
npm start                # serves http://localhost:3000
# In another terminal:
cloudflared tunnel --url http://localhost:3000
```

---

## 🆘 Troubleshooting

**No page at your Cloudflare link?**  
- Wait 10–20 seconds after the URL appears.  
- Make sure **both** windows are open: “Server” and “Tunnel”.  I SAID THIS ALL CAPS ABOVE ^^^
- If you restarted the tunnel, share the **new URL**.

**“Cannot find module 'express'” or similar?**  
- Always use the one-click script; it runs `npm install` for you.  
- Or run manually: `npm install && npm start`.

**Mic prompt didn’t appear / no mic audio?**  
- Check site permissions in your browser; ensure **Microphone = Allow**.  
- Try reloading the page and clicking **Join** again.

**Call drops / kicks sometimes (Beta)?**  
- This can happen on flaky networks or when the OS sleeps the NIC.  
- Try a stronger connection or add **TURN** (see Configuration).  
- Keep the browser tab active, avoid low-power mode during calls.

---

## 📁 Project Structure

```
Free-Calls-Anywhere/
├─ server.js                 # Express + Socket.IO signaling; /config.json exposes ICE from .env
├─ package.json
├─ .env.example              # Copy to .env for TURN settings (do NOT commit .env)
├─ start_windows_oneclick.bat
├─ start_mac_linux.sh
└─ public/
   ├─ index.html             # Minimal UI (Meeting ID, Name, Join/End, Timer, Participants, Log)
   ├─ style.css
   └─ app.js                 # WebRTC client (auto-offer, glare-avoid, TURN-ready)
```

---

ALL YOU NEED TO CLICK ON WINDOWS IS THE .bat FILE the rest is automated... AND LINUX OR MAC IS THE .sh FILE BUT CHECK THE REQUIREMENTS I WROTE EARLIER ABOUT MAC AND LINUX it is 1-2 steps more than windows. easy work... 

## 🔒 Security & Privacy

- Media is **encrypted in transit** (DTLS-SRTP).  
- The server only relays **signaling metadata** (offers/answers/ICE) — it never carries your audio.  
- Using a TURN relay keeps media encrypted end-to-end at the transport layer.

---

## 🤝 Contributing / Roadmap

Planned improvements:
- Mute / Push-to-Talk
- Per-room passcodes
- Named Cloudflare tunnels (stable URLs)
- Optional SFU backend for larger rooms

PRs and issues welcome.

---

## 📝 License

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

Copyright (c) 2025 Jehad

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
