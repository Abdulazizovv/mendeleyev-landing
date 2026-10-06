import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.backend' })

const app = express()
const PORT = process.env.PORT || 3001

const BOT_TOKEN = process.env.BOT_TOKEN
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID
const TELEGRAM_API =
  BOT_TOKEN && BOT_TOKEN !== 'PUT_NEW_BOT_TOKEN_HERE'
    ? `https://api.telegram.org/bot${BOT_TOKEN}`
    : null

app.use(cors())
app.use(express.json())

function isBotConfigured() {
  return Boolean(TELEGRAM_API) && Boolean(ADMIN_CHAT_ID)
}

async function telegramRequest(method, payload) {
  try {
    const response = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => null)
    return { ok: response.ok && data?.ok, data }
  } catch (error) {
    console.error(`Telegram "${method}" so'rovida xatolik:`, error)
    return { ok: false, data: null }
  }
}

// Telegram bo'shliqsiz raqamni (+99890-123-45-67) yaxlit telefon sifatida taniydi
// (bosilganda qo'ng'iroq/nusxa olish). Bo'shliq bo'lsa raqam bo'linib qoladi.
function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '')
  const full = digits.length === 9 ? `998${digits}` : digits

  if (/^998\d{9}$/.test(full)) {
    return `+998${full.slice(3, 5)}-${full.slice(5, 8)}-${full.slice(8, 10)}-${full.slice(10, 12)}`
  }
  return full ? `+${full}` : String(raw).trim()
}

function buildLeadMessage(lead) {
  return [
    '🔔 YANGI ARIZA',
    '',
    `👤 Ism: ${lead.name}`,
    `📞 Telefon: ${lead.phone}`,
  ].join('\n')
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'mendeleyev-leads',
    botConfigured: isBotConfigured(),
  })
})

// ============================================================
// YANGI ARIZA QABUL QILISH
// ============================================================

app.post('/api/lead', async (req, res) => {
  try {
    const { name, phone } = req.body || {}

    if (!name?.trim() || !phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Barcha maydonlarni to‘ldiring.',
      })
    }

    if (!isBotConfigured()) {
      console.error('Telegram credentials are not configured in .env.backend')
      return res.status(500).json({
        success: false,
        message: 'Telegram serveri sozlanmagan.',
      })
    }

    const { ok, data } = await telegramRequest('sendMessage', {
      chat_id: ADMIN_CHAT_ID,
      text: buildLeadMessage({ name: name.trim(), phone: normalizePhone(phone) }),
    })

    if (!ok) {
      console.error('Telegram API error:', data)
      return res.status(502).json({
        success: false,
        message: 'Telegramga yuborishda xatolik yuz berdi.',
      })
    }

    return res.json({
      success: true,
      message: 'Ariza muvaffaqiyatli yuborildi.',
    })
  } catch (error) {
    console.error('Lead server error:', error)
    return res.status(500).json({
      success: false,
      message: 'Serverda xatolik yuz berdi.',
    })
  }
})

app.listen(PORT, () => {
  console.log(`✅ Lead backend: http://localhost:${PORT}`)
})

if (!isBotConfigured()) {
  console.warn('⚠️  BOT_TOKEN yoki ADMIN_CHAT_ID sozlanmagan — arizalar yuborilmaydi.')
}
