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
// YANGILIKLAR (data/news.json + data/news-images/)
// ============================================================
// Yangiliklar botdan qo'shiladi, saytdagi "Yangiliklar" bo'limi
// GET /api/news orqali o'qiydi. Rasmlar /api/news-images/<fayl> orqali beriladi.
// Ikkalasi ham DATA_DIR ichida (Docker: landing_data volume) — restartda yo'qolmaydi.

const NEWS_FILE = path.join(DATA_DIR, "news.json");
const NEWS_DIR = path.join(DATA_DIR, "news-images");
const NEWS_MAX_ITEMS = 20; // shundan oshsa eng eskisi (rasmi bilan) o'chadi
const NEWS_TITLE_MAX = 100;
const NEWS_DESC_MAX = 600;
const NEWS_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const IMAGE_EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

fs.mkdirSync(NEWS_DIR, { recursive: true });

// Foydalanuvchiga ko'rsatsa bo'ladigan xatolar
class NewsError extends Error {}

let news = [];
try {
  const raw = JSON.parse(fs.readFileSync(NEWS_FILE, "utf8"));
  if (Array.isArray(raw?.items)) news = raw.items;
} catch {
  // fayl hali yo'q yoki buzilgan — bo'sh ro'yxatdan boshlanadi
}

function saveNewsNow() {
  try {
    const tmp = `${NEWS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ items: news }));
    fs.renameSync(tmp, NEWS_FILE);
  } catch (error) {
    console.error("Yangiliklarni saqlashda xatolik:", error.message || error);
    throw error;
  }
}

function removeNewsImage(fileName) {
  if (!fileName) return;
  fs.promises
    .unlink(path.join(NEWS_DIR, path.basename(fileName)))
    .catch(() => {});
}

function addNews({ title, desc, image }) {
  const item = {
    id: crypto.randomBytes(6).toString("hex"),
    title,
    desc,
    image,
    date: dayKey(), // Toshkent vaqti bo'yicha YYYY-MM-DD
    createdAt: Date.now(),
  };
  news.unshift(item);
  while (news.length > NEWS_MAX_ITEMS) removeNewsImage(news.pop().image);
  saveNewsNow();
  return item;
}

function deleteNews(id) {
  const index = news.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const [item] = news.splice(index, 1);
  removeNewsImage(item.image);
  saveNewsNow();
  return item;
}

// Telegramdan kelgan rasm (siqilgan foto yoki rasm-fayl) haqida ma'lumot
function pickIncomingImage(msg) {
  if (Array.isArray(msg.photo) && msg.photo.length) {
    const biggest = msg.photo[msg.photo.length - 1];
    return {
      fileId: biggest.file_id,
      ext: "jpg",
      size: biggest.file_size || 0,
    };
  }
  const doc = msg.document;
  if (doc && IMAGE_EXT_BY_MIME[doc.mime_type]) {
    return {
      fileId: doc.file_id,
      ext: IMAGE_EXT_BY_MIME[doc.mime_type],
      size: doc.file_size || 0,
    };
  }
  return null;
}

async function downloadTelegramImage({ fileId, ext, size }) {
  if (size > NEWS_IMAGE_MAX_BYTES) {
    throw new NewsError("Rasm hajmi 5 MB dan oshmasligi kerak.");
  }

  const { ok, data } = await telegramRequest("getFile", { file_id: fileId });
  const filePath = data?.result?.file_path;
  if (!ok || !filePath) {
    throw new NewsError("Rasmni Telegramdan olib bo‘lmadi.");
  }

  // DIQQAT: bu URL ichida bot tokeni bor — hech qachon logga yozilmaydi.
  const response = await fetch(
    `${TELEGRAM_BASE}/file/bot${BOT_TOKEN}/${filePath}`,
    {
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!response.ok) {
    throw new NewsError("Rasmni Telegramdan yuklab bo‘lmadi.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > NEWS_IMAGE_MAX_BYTES) {
    throw new NewsError("Rasm hajmi 5 MB dan oshmasligi kerak.");
  }

  const fileName = `${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}.${ext}`;
  await fs.promises.writeFile(path.join(NEWS_DIR, fileName), buffer);
  return fileName;
}

// ============================================================
// TELEGRAM BOT MENYUSI (long polling)
// ============================================================

const STATS_BUTTON = "📊 Statistika";
const NEWS_ADD_BUTTON = "📰 Yangilik qo‘shish";
const NEWS_LIST_BUTTON = "🗂 Yangiliklar";
const NEWS_CANCEL_BUTTON = "❌ Bekor qilish";

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: STATS_BUTTON }],
    [{ text: NEWS_ADD_BUTTON }, { text: NEWS_LIST_BUTTON }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

const CANCEL_KEYBOARD = {
  keyboard: [[{ text: NEWS_CANCEL_BUTTON }]],
  resize_keyboard: true,
  is_persistent: true,
};

// Yangilik qo'shish jarayoni: chatId -> { step: "title" | "desc" | "photo", title, desc }
const newsDrafts = new Map();

const sendText = (chatId, text, extra = {}) =>
  telegramRequest("sendMessage", { chat_id: chatId, text, ...extra });

const newsDeleteMarkup = (id) => ({
  inline_keyboard: [[{ text: "🗑 O‘chirish", callback_data: `news:del:${id}` }]],
});

const newsConfirmMarkup = (id) => ({
  inline_keyboard: [
    [
      { text: "✅ Ha, o‘chirish", callback_data: `news:yes:${id}` },
      { text: "↩️ Yo‘q", callback_data: `news:no:${id}` },
    ],
  ],
});

function formatNewsMessage(item) {
  return [`📰 ${item.title}`, `🗓 ${item.date}`, "", item.desc].join("\n");
}

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

async function handleNewsDraftStep(msg, draft) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  if (draft.step === "title") {
    if (!text) {
      await sendText(chatId, "Iltimos, sarlavhani matn ko‘rinishida yuboring.");
      return;
    }
    if (text.length > NEWS_TITLE_MAX) {
      await sendText(
        chatId,
        `Sarlavha juda uzun (${text.length} belgi). ${NEWS_TITLE_MAX} belgidan oshmasligi kerak — qisqartirib qayta yuboring.`
      );
      return;
    }
    draft.title = text;
    draft.step = "desc";
    await sendText(
      chatId,
      `2/3 — Endi yangilik tavsifini (description) yuboring.\n\nEng ko‘pi bilan ${NEWS_DESC_MAX} belgi.`
    );
    return;
  }

  if (draft.step === "desc") {
    if (!text) {
      await sendText(chatId, "Iltimos, tavsifni matn ko‘rinishida yuboring.");
      return;
    }
    if (text.length > NEWS_DESC_MAX) {
      await sendText(
        chatId,
        `Tavsif juda uzun (${text.length} belgi). ${NEWS_DESC_MAX} belgidan oshmasligi kerak — qisqartirib qayta yuboring.`
      );
      return;
    }
    draft.desc = text;
    draft.step = "photo";
    await sendText(chatId, "3/3 — Endi yangilik rasmini yuboring 🖼");
    return;
  }

  // draft.step === "photo"
  const image = pickIncomingImage(msg);
  if (!image) {
    await sendText(
      chatId,
      "Iltimos, rasm yuboring (galereyadan rasm tanlang). Bekor qilish uchun pastdagi tugmani bosing."
    );
    return;
  }

  // Qoralamani darhol olib tashlaymiz: albom bo'lib bir nechta rasm kelsa, faqat birinchisi ishlaydi.
  newsDrafts.delete(chatId);

  try {
    const fileName = await downloadTelegramImage(image);
    const item = addNews({
      title: draft.title,
      desc: draft.desc,
      image: fileName,
    });

    await sendText(chatId, "✅ Yangilik saytga qo‘shildi!", {
      reply_markup: MAIN_KEYBOARD,
    });
    await sendText(chatId, formatNewsMessage(item), {
      reply_markup: newsDeleteMarkup(item.id),
    });
  } catch (error) {
    console.error("Yangilik qo'shishda xatolik:", error.message || error);
    newsDrafts.set(chatId, draft); // rasm bosqichida qolamiz — qayta yuborsa bo'ladi
    const reason =
      error instanceof NewsError
        ? error.message
        : "Rasmni saqlashda xatolik yuz berdi.";
    await sendText(
      chatId,
      `⚠️ ${reason}\n\nRasmni qayta yuboring yoki bekor qiling.`
    );
  }
}

async function sendNewsList(chatId) {
  if (!news.length) {
    await sendText(
      chatId,
      "Hozircha yangiliklar yo‘q. “📰 Yangilik qo‘shish” tugmasi orqali birinchisini qo‘shing.",
      { reply_markup: MAIN_KEYBOARD }
    );
    return;
  }

  const shown = news.slice(0, 10);
  await sendText(
    chatId,
    `🗂 Saytdagi yangiliklar: jami ${news.length} ta${
      news.length > shown.length ? ` (oxirgi ${shown.length} tasi pastda)` : ""
    }`,
    { reply_markup: MAIN_KEYBOARD }
  );
  for (const item of shown) {
    await sendText(chatId, formatNewsMessage(item), {
      reply_markup: newsDeleteMarkup(item.id),
    });
  }
}

async function handleNewsCallback(query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const [, action, id] = String(query.data).split(":");

  let toast = "";

  if (action === "del") {
    await telegramRequest("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: newsConfirmMarkup(id),
    });
    toast = "O‘chirishni tasdiqlang";
  } else if (action === "no") {
    await telegramRequest("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: newsDeleteMarkup(id),
    });
  } else if (action === "yes") {
    let removed = null;
    try {
      removed = deleteNews(id);
    } catch {
      toast = "Xatolik yuz berdi, qayta urinib ko‘ring";
    }
    if (removed) {
      await telegramRequest("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: `🗑 O‘chirildi: ${removed.title}`,
      });
      toast = "Saytdan o‘chirildi";
    } else if (!toast) {
      await telegramRequest("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: "Bu yangilik allaqachon o‘chirilgan.",
      });
    }
  }

  await telegramRequest("answerCallbackQuery", {
    callback_query_id: query.id,
    ...(toast ? { text: toast } : {}),
  });
}

async function handleUpdate(update) {
  if (update.message) {
    const msg = update.message;
    if (!isAdminChat(msg.chat?.id)) return;

    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();

    // Yangilik qo'shishni bekor qilish
    if (text === NEWS_CANCEL_BUTTON || text === "/cancel") {
      const hadDraft = newsDrafts.delete(chatId);
      await sendText(chatId, hadDraft ? "Bekor qilindi." : "Menyu 👇", {
        reply_markup: MAIN_KEYBOARD,
      });
      return;
    }

    const isMenuAction =
      text === "/start" ||
      text === "/menu" ||
      text === STATS_BUTTON ||
      text.startsWith("/stats") ||
      text === NEWS_ADD_BUTTON ||
      text === NEWS_LIST_BUTTON;

    if (isMenuAction) {
      // Menyu tugmasi bosilsa, tugallanmagan yangilik qoralamasi tashlanadi
      newsDrafts.delete(chatId);
    } else if (newsDrafts.has(chatId)) {
      await handleNewsDraftStep(msg, newsDrafts.get(chatId));
      return;
    }

    if (text === "/start" || text === "/menu") {
      await sendText(
        chatId,
        "Assalomu alaykum! Statistikani ko‘rish yoki yangilik qo‘shish uchun pastdagi tugmalardan foydalaning 👇",
        { reply_markup: MAIN_KEYBOARD }
      );
      return;
    }

    if (text === NEWS_ADD_BUTTON) {
      newsDrafts.set(chatId, { step: "title" });
      await sendText(
        chatId,
        `📰 Yangilik qo‘shish\n\n1/3 — Yangilik sarlavhasini (title) yuboring.\n\nEng ko‘pi bilan ${NEWS_TITLE_MAX} belgi.`,
        { reply_markup: CANCEL_KEYBOARD }
      );
      return;
    }

    if (text === NEWS_LIST_BUTTON) {
      await sendNewsList(chatId);
      return;
    }

    if (text === STATS_BUTTON || text.startsWith("/stats")) {
      await sendText(chatId, buildStatsMessage(), {
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

    if (typeof query.data === "string" && query.data.startsWith("news:")) {
      await handleNewsCallback(query);
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
// YANGILIKLAR (sayt uchun ochiq API)
// ============================================================

app.get("/api/news", (_req, res) => {
  res.set("Cache-Control", "no-cache");
  res.json({
    items: news.map(({ id, title, desc, image, date }) => ({
      id,
      title,
      desc,
      image,
      date,
    })),
  });
});

// Fayl nomlari tasodifiy va o'zgarmas, shuning uchun uzoq keshlash xavfsiz.
app.use(
  "/api/news-images",
  express.static(NEWS_DIR, {
    maxAge: "30d",
    immutable: true,
    index: false,
    dotfiles: "deny",
    setHeaders: (res) => res.set("X-Content-Type-Options", "nosniff"),
  })
);

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
