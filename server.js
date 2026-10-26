import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

dotenv.config({ path: ".env.backend" });

const app = express();
const PORT = process.env.PORT || 3001;

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const TELEGRAM_BASE =
  process.env.TELEGRAM_API_BASE || "https://api.telegram.org";
const TELEGRAM_API =
  BOT_TOKEN && BOT_TOKEN !== "PUT_NEW_BOT_TOKEN_HERE"
    ? `${TELEGRAM_BASE}/bot${BOT_TOKEN}`
    : null;

app.use(cors());
app.use(express.json());

function isBotConfigured() {
  return Boolean(TELEGRAM_API) && Boolean(ADMIN_CHAT_ID);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function telegramRequest(method, payload, timeoutMs = 15000) {
  try {
    const response = await fetch(`${TELEGRAM_API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await response.json().catch(() => null);
    return { ok: response.ok && data?.ok, data };
  } catch (error) {
    console.error(
      `Telegram "${method}" so'rovida xatolik:`,
      error.message || error
    );
    return { ok: false, data: null };
  }
}

// Telegram bo'shliqsiz raqamni (+99890-123-45-67) yaxlit telefon sifatida taniydi
// (bosilganda qo'ng'iroq/nusxa olish). Bo'shliq bo'lsa raqam bo'linib qoladi.
function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, "");
  const full = digits.length === 9 ? `998${digits}` : digits;

  if (/^998\d{9}$/.test(full)) {
    return `+998${full.slice(3, 5)}-${full.slice(5, 8)}-${full.slice(
      8,
      10
    )}-${full.slice(10, 12)}`;
  }
  return full ? `+${full}` : String(raw).trim();
}

// ============================================================
// ARIZA XABARI VA HOLATI (Kutilmoqda / Bog'lanildi)
// ============================================================

const STATUS_LABEL = "📌 Holat: ";
const STATUS_PENDING = "⏳ Kutilmoqda";

const LEAD_PENDING_MARKUP = {
  inline_keyboard: [[{ text: "✅ Bog‘lanildi", callback_data: "lead:done" }]],
};

const LEAD_DONE_MARKUP = {
  inline_keyboard: [
    [{ text: "↩️ Kutilmoqdaga qaytarish", callback_data: "lead:undo" }],
  ],
};

function buildLeadMessage(lead) {
  return [
    "🔔 YANGI ARIZA",
    "",
    `👤 Ism: ${lead.name}`,
    `📞 Telefon: ${lead.phone}`,
    "",
    `${STATUS_LABEL}${STATUS_PENDING}`,
  ].join("\n");
}

// Xabarning asosiy qismini saqlab, faqat "Holat" qatorini almashtiradi.
function withStatus(originalText, statusText) {
  const idx = originalText.indexOf(STATUS_LABEL);
  const base = idx === -1 ? originalText : originalText.slice(0, idx).trimEnd();
  return `${base}\n\n${STATUS_LABEL}${statusText}`;
}

// ============================================================
// STATISTIKA (fayl asosida saqlanadi: data/stats.json)
// ============================================================
// days[YYYY-MM-DD] = { visits, leads, vids: [yashirilgan tashrifchi ID lar] }
//  - visits : sayt ochilgan sessiyalar soni (bir brauzer oynasida 1 marta)
//  - vids   : noyob tashrifchilar (brauzerda saqlangan anonim ID bo'yicha)
//  - leads  : Telegramga muvaffaqiyatli yetib borgan arizalar
// contacts[telegramXabarId] = { day, done }
//  - done=false: kutilmoqda, done=true: bog'lanildi
//  (ism/telefon saqlanmaydi, faqat holat)

const DATA_DIR = process.env.DATA_DIR || "./data";
const STATS_FILE = path.join(DATA_DIR, "stats.json");
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000; // Asia/Tashkent (UTC+5)

fs.mkdirSync(DATA_DIR, { recursive: true });

let stats = { days: {}, contacts: {} };
try {
  const raw = JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  if (raw && typeof raw.days === "object") {
    stats = { contacts: {}, ...raw };
  }
} catch {
  // fayl hali yo'q yoki buzilgan — yangidan boshlanadi
}

const todaySets = { key: null, set: new Set() };

function dayKey(ts = Date.now()) {
  return new Date(ts + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

function tashkentStamp(ts = Date.now()) {
  // "2026-10-26 14:32"
  return new Date(ts + TZ_OFFSET_MS)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

function getDay(key) {
  return (stats.days[key] ??= { visits: 0, leads: 0, vids: [] });
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveStatsNow();
  }, 2000);
}

function saveStatsNow() {
  try {
    const tmp = `${STATS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(stats));
    fs.renameSync(tmp, STATS_FILE);
  } catch (error) {
    console.error("Statistikani saqlashda xatolik:", error.message || error);
  }
}

function recordVisit(vid) {
  const key = dayKey();
  const day = getDay(key);
  day.visits += 1;

  if (todaySets.key !== key) {
    todaySets.key = key;
    todaySets.set = new Set(day.vids);
  }

  const hashed = crypto
    .createHash("sha256")
    .update(vid)
    .digest("hex")
    .slice(0, 12);
  if (!todaySets.set.has(hashed)) {
    todaySets.set.add(hashed);
    day.vids.push(hashed);
  }
  scheduleSave();
}

function recordLead(messageId) {
  const key = dayKey();
  getDay(key).leads += 1;
  if (messageId) stats.contacts[messageId] = { day: key, done: false };
  scheduleSave();
}

function setContacted(messageId, done) {
  const entry = (stats.contacts[messageId] ??= {
    day: dayKey(),
    done: false,
  });
  entry.done = done;
  scheduleSave();
}

function summarize(keys) {
  let visits = 0;
  let leads = 0;
  const uniques = new Set();
  const keySet = new Set(keys);

  for (const key of keys) {
    const day = stats.days[key];
    if (!day) continue;
    visits += day.visits;
    leads += day.leads;
    for (const vid of day.vids) uniques.add(vid);
  }

  let contacted = 0;
  let pending = 0;
  for (const entry of Object.values(stats.contacts)) {
    if (!keySet.has(entry.day)) continue;
    if (entry.done) contacted += 1;
    else pending += 1;
  }

  return { visits, leads, uniques: uniques.size, contacted, pending };
}

function formatBlock(title, s) {
  const conversion =
    s.uniques > 0 ? `${((s.leads / s.uniques) * 100).toFixed(1)}%` : "—";
  return [
    title,
    `   👤 Saytga kirganlar: ${s.uniques}`,
    `   📨 Botga ariza qoldirganlar: ${s.leads}`,
    `   📈 Konversiya: ${conversion}`,
  ].join("\n");
}

function buildStatsMessage() {
  const today = dayKey();
  const yesterday = dayKey(Date.now() - 24 * 60 * 60 * 1000);
  const monthPrefix = today.slice(0, 7);
  const allKeys = Object.keys(stats.days);

  const time = new Date(Date.now() + TZ_OFFSET_MS).toISOString().slice(11, 19);

  return [
    "📊 MENDELEYEV.UZ STATISTIKASI",
    "",
    formatBlock(`📅 Bugun (${today})`, summarize([today])),
    "",
    formatBlock(`🕘 Kecha (${yesterday})`, summarize([yesterday])),
    "",
    formatBlock(
      `🗓 Shu oy (${monthPrefix})`,
      summarize(allKeys.filter((k) => k.startsWith(monthPrefix)))
    ),
    "",
    formatBlock("🏁 Umumiy", summarize(allKeys)),
    "",
    `🔄 Yangilandi: ${time}`,
  ].join("\n");
}

// ============================================================
// TELEGRAM BOT MENYUSI (long polling)
// ============================================================

const STATS_BUTTON = "📊 Statistika";

const MAIN_KEYBOARD = {
  keyboard: [[{ text: STATS_BUTTON }]],
  resize_keyboard: true,
  is_persistent: true,
};

const REFRESH_MARKUP = {
  inline_keyboard: [[{ text: "🔄 Yangilash", callback_data: "stats:refresh" }]],
};

const isAdminChat = (chatId) => String(chatId) === String(ADMIN_CHAT_ID);

async function handleLeadStatus(query, done) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  setContacted(messageId, done);

  const who = query.from?.first_name ? `, ${query.from.first_name}` : "";
  const status = done
    ? `✅ Bog‘lanildi (${tashkentStamp()}${who})`
    : STATUS_PENDING;

  await telegramRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: withStatus(query.message.text || "", status),
    reply_markup: done ? LEAD_DONE_MARKUP : LEAD_PENDING_MARKUP,
  });

  await telegramRequest("answerCallbackQuery", {
    callback_query_id: query.id,
    text: done ? "Bog‘lanildi deb belgilandi ✅" : "Kutilmoqdaga qaytarildi",
  });
}

async function handleUpdate(update) {
  if (update.message) {
    const msg = update.message;
    if (!isAdminChat(msg.chat?.id)) return;

    const text = (msg.text || "").trim();

    if (text === "/start" || text === "/menu") {
      await telegramRequest("sendMessage", {
        chat_id: msg.chat.id,
        text: "Assalomu alaykum! Statistikani ko‘rish uchun pastdagi tugmani bosing 👇",
        reply_markup: MAIN_KEYBOARD,
      });
      return;
    }

    if (text === STATS_BUTTON || text.startsWith("/stats")) {
      await telegramRequest("sendMessage", {
        chat_id: msg.chat.id,
        text: buildStatsMessage(),
        reply_markup: REFRESH_MARKUP,
      });
    }
    return;
  }

  if (update.callback_query) {
    const query = update.callback_query;
    const chatId = query.message?.chat?.id;

    if (!isAdminChat(chatId)) {
      await telegramRequest("answerCallbackQuery", {
        callback_query_id: query.id,
      });
      return;
    }

    if (query.data === "lead:done" || query.data === "lead:undo") {
      await handleLeadStatus(query, query.data === "lead:done");
      return;
    }

    if (query.data === "stats:refresh") {
      // Telegram matn o'zgarmasa xato qaytaradi — shuning uchun xabarda vaqt bor.
      await telegramRequest("editMessageText", {
        chat_id: chatId,
        message_id: query.message.message_id,
        text: buildStatsMessage(),
        reply_markup: REFRESH_MARKUP,
      });
    }
    await telegramRequest("answerCallbackQuery", {
      callback_query_id: query.id,
      text: "Yangilandi ✅",
    });
  }
}

async function pollUpdates() {
  let offset = 0;
  console.log("🤖 Bot menyusi ishga tushdi (long polling)");

  while (true) {
    const { ok, data } = await telegramRequest(
      "getUpdates",
      { offset, timeout: 30, allowed_updates: ["message", "callback_query"] },
      45000
    );

    if (!ok) {
      if (data?.error_code === 409) {
        console.error(
          "❌ getUpdates 409: bu bot tokenidan boshqa joyda ham foydalanilyapti (webhook yoki boshqa polling)."
        );
      }
      await sleep(5000);
      continue;
    }

    for (const update of data.result || []) {
      offset = update.update_id + 1;
      handleUpdate(update).catch((error) =>
        console.error("Update xatosi:", error)
      );
    }
  }
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mendeleyev-leads",
    botConfigured: isBotConfigured(),
  });
});

// ============================================================
// SAYTGA KIRISHNI HISOBLASH
// ============================================================

const VISITOR_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
const CRAWLER_RE = /bot|crawl|spider|slurp|headless|lighthouse|curl|wget/i;

app.post("/api/visit", (req, res) => {
  const vid = req.body?.vid;
  const userAgent = req.get("user-agent") || "";

  if (
    typeof vid === "string" &&
    VISITOR_ID_RE.test(vid) &&
    !CRAWLER_RE.test(userAgent)
  ) {
    recordVisit(vid);
  }
  res.json({ ok: true });
});

// ============================================================
// YANGI ARIZA QABUL QILISH
// ============================================================

app.post("/api/lead", async (req, res) => {
  try {
    const { name, phone } = req.body || {};

    if (!name?.trim() || !phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Barcha maydonlarni to‘ldiring.",
      });
    }

    if (!isBotConfigured()) {
      console.error("Telegram credentials are not configured in .env.backend");
      return res.status(500).json({
        success: false,
        message: "Telegram serveri sozlanmagan.",
      });
    }

    const { ok, data } = await telegramRequest("sendMessage", {
      chat_id: ADMIN_CHAT_ID,
      text: buildLeadMessage({
        name: name.trim(),
        phone: normalizePhone(phone),
      }),
      reply_markup: LEAD_PENDING_MARKUP,
    });

    if (!ok) {
      console.error("Telegram API error:", data);
      return res.status(502).json({
        success: false,
        message: "Telegramga yuborishda xatolik yuz berdi.",
      });
    }

    recordLead(data?.result?.message_id);

    return res.json({
      success: true,
      message: "Ariza muvaffaqiyatli yuborildi.",
    });
  } catch (error) {
    console.error("Lead server error:", error);
    return res.status(500).json({
      success: false,
      message: "Serverda xatolik yuz berdi.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Lead backend: http://localhost:${PORT}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    saveStatsNow();
    process.exit(0);
  });
}

if (isBotConfigured()) {
  pollUpdates();
} else {
  console.warn(
    "⚠️  BOT_TOKEN yoki ADMIN_CHAT_ID sozlanmagan — arizalar yuborilmaydi, bot menyusi o‘chiq."
  );
}
