const http = require('http');
const bedrock = require('bedrock-protocol');

// 1. Render Keep-Alive Web Server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Chomu AI Bedrock Bot is Active 24/7!\n');
}).listen(PORT, () => {
    console.log(`[HTTP] Keep-alive server running on port ${PORT}`);
});

// 2. Server Configuration & In-built Key
const CONFIG = {
    host: 'tejassingh456230.aternos.me',
    port: parseInt(process.env.MC_PORT || '19132', 10),
    username: 'Chomu_AI',
    geminiKey: process.env.GEMINI_API_KEY || 'AQ.Ab8RN6IAyvmI74Z4ALpNE33KecTMiuKuPMx6cQ93A-W9EiPiwg'
};

let client = null;
let isConnecting = false;

// 3. Gemini API Chat Generator
async function getGeminiReply(player, message) {
    if (!CONFIG.geminiKey) {
        return "Bhai Gemini API Key set nahi hai!";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.geminiKey}`;
    const prompt = `You are playing Minecraft Bedrock Edition on an Aternos server. 
Your in-game name is ${CONFIG.username}. 
Act like a smart, chill, slightly witty Indian gamer who talks in short Hinglish.
Keep your response strictly under 15 words so it fits comfortably in Bedrock chat.
Player "${player}" said: "${message}"`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return reply ? reply.replace(/[\n\r]/g, ' ').trim() : "Arre bhai samajh nahi aaya!";
    } catch (err) {
        console.error('[Gemini Error]:', err.message);
        return "Lag ho gaya lagta hai!";
    }
}

// 4. Chat Sender Helper for Bedrock
function sendChat(msg) {
    if (!client) return;
    try {
        client.queue('text', {
            type: 'chat',
            needs_translation: false,
            source_name: client.username,
            xuid: '',
            platform_chat_id: '',
            filtered_message: '',
            message: msg
        });
    } catch (e) {
        console.error('[Chat Send Error]:', e.message);
    }
}

// 5. Connect Bot to Bedrock Server
function connectBot() {
    if (isConnecting) return;
    isConnecting = true;

    console.log(`[Bedrock] Connecting ${CONFIG.username} to ${CONFIG.host}:${CONFIG.port}...`);

    try {
        client = bedrock.createClient({
            host: CONFIG.host,
            port: CONFIG.port,
            username: CONFIG.username,
            offline: true,
            skipPing: true
        });

        client.on('join', () => {
            isConnecting = false;
            console.log(`[Success] ${CONFIG.username} server mein login ho chuka hai!`);
            setTimeout(() => {
                sendChat("Yo guys! Chomu AI is online!");
            }, 3000);
        });

        // Chat Listener
        client.on('text', async (packet) => {
            const sender = packet.source_name;
            const message = packet.message;

            if (!sender || sender === CONFIG.username || !message) return;

            console.log(`[Chat] ${sender}: ${message}`);

            const lowerMsg = message.toLowerCase();
            const isCalled = lowerMsg.includes('chomu') || 
                             lowerMsg.includes('bot') || 
                             lowerMsg.includes('ai') || 
                             lowerMsg.includes('bhai');

            if (isCalled) {
                const reply = await getGeminiReply(sender, message);
                sendChat(`@${sender} ${reply}`);
            }
        });

        client.on('close', () => {
            console.log('[Disconnected] Connection band ho gaya. 15s mein reconnect hoga...');
            cleanupAndReconnect();
        });

        client.on('error', (err) => {
            console.error('[Bedrock Error]:', err.message);
            cleanupAndReconnect();
        });

    } catch (err) {
        console.error('[Creation Error]:', err.message);
        cleanupAndReconnect();
    }
}

function cleanupAndReconnect() {
    isConnecting = false;
    client = null;
    setTimeout(connectBot, 15000);
}

connectBot();
