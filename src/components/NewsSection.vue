<template>
  <!--
    Yangiliklar bo'limi. Ma'lumot botdan qo'shiladi va GET /api/news orqali olinadi.
    Yangilik bo'lmasa bo'lim umuman ko'rinmaydi.
    DIQQAT: bu yerda `.reveal` ishlatilmagan — App.vue dagi IntersectionObserver faqat
    sahifa ochilishida mavjud bo'lgan elementlarni kuzatadi, yangiliklar esa keyinroq yuklanadi.
  -->
  <section
    v-if="items.length"
    id="news"
    class="news-in relative bg-white pb-20 transition-colors duration-300 dark:bg-ink max-[640px]:pb-14"
  >
    <div class="mx-auto max-w-[1280px] px-8 max-[640px]:px-5">
      <!-- HEADER -->
      <div class="mb-14 text-center max-[640px]:mb-10">
        <h2
          class="mx-auto max-w-160 text-[clamp(28px,3.6vw,42px)] font-bold text-[#0F1E33] dark:text-white"
        >
          {{ tx.title }}
        </h2>
        <p
          class="mx-auto mt-4 max-w-140 text-[17px] leading-[1.6] text-gray-400 dark:text-white/60"
        >
          {{ tx.subtitle }}
        </p>
      </div>

      <!-- SLIDER -->
      <div class="relative">
        <button
          v-if="canPrev"
          type="button"
          :aria-label="tx.prev"
          class="absolute left-0 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-[#0F1E33] shadow-lg ring-1 ring-black/5 transition hover:bg-red hover:text-white dark:bg-ink dark:text-white dark:ring-white/15 dark:hover:bg-red max-[820px]:hidden"
          @click="scrollByCard(-1)"
        >
          <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5">
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <button
          v-if="canNext"
          type="button"
          :aria-label="tx.next"
          class="absolute right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-[#0F1E33] shadow-lg ring-1 ring-black/5 transition hover:bg-red hover:text-white dark:bg-ink dark:text-white dark:ring-white/15 dark:hover:bg-red max-[820px]:hidden"
          @click="scrollByCard(1)"
        >
          <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5">
            <path
              d="M9 5l7 7-7 7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <div
          ref="track"
          class="news-track flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2"
          @scroll.passive="updateArrows"
        >
          <article
            v-for="item in items"
            :key="item.id"
            role="button"
            tabindex="0"
            class="news-card group flex cursor-pointer snap-start flex-col overflow-hidden rounded-[22px] bg-[#F5F6F8] transition-transform duration-200 hover:-translate-y-1 dark:bg-white/5"
            @click="selected = item"
            @keydown.enter="selected = item"
          >
            <!-- COVER -->
            <div
              class="relative h-56 shrink-0 overflow-hidden bg-gray-200 dark:bg-white/10 max-[640px]:h-48"
            >
              <img
                :src="imageUrl(item.image)"
                :alt="item.title"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div
                class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-transparent"
              ></div>

              <span
                class="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur-sm"
              >
                {{ formatDate(item.date) }}
              </span>
            </div>

            <!-- BODY -->
            <div class="flex flex-1 flex-col px-5 py-5">
              <h3
                class="line-clamp-2 text-[18px] font-bold leading-[1.3] text-[#0F1E33] dark:text-white"
              >
                {{ item.title }}
              </h3>
              <p
                class="mt-2.5 line-clamp-3 text-[14.5px] leading-[1.6] text-gray-500 dark:text-white/60"
              >
                {{ item.desc }}
              </p>

              <span
                class="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13.5px] font-bold text-red"
              >
                {{ tx.more }}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- DETAIL MODAL -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-250"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="selected"
          class="fixed inset-0 z-[300] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <div
            role="dialog"
            aria-modal="true"
            :aria-label="selected.title"
            class="news-pop relative flex max-h-[90vh] w-full max-w-[980px] overflow-hidden rounded-[26px] bg-white shadow-2xl dark:bg-ink max-[820px]:max-w-125 max-[820px]:flex-col max-[820px]:overflow-y-auto"
          >
            <!-- RASM: orqasida o'zining xiralashtirilgan nusxasi, shuning uchun kulrang yo'laklar chiqmaydi -->
            <div
              class="relative flex shrink-0 basis-[58%] items-center justify-center overflow-hidden bg-[#0F1E33] max-[820px]:basis-auto"
            >
              <img
                :src="imageUrl(selected.image)"
                alt=""
                aria-hidden="true"
                class="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl"
              />
              <img
                :src="imageUrl(selected.image)"
                :alt="selected.title"
                class="relative z-10 block max-h-[90vh] w-full object-contain max-[820px]:max-h-[42vh]"
              />
            </div>

            <!-- YOPISH -->
            <button
              type="button"
              :aria-label="tx.close"
              class="absolute right-4 top-4 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-black/45 p-0 text-white backdrop-blur-sm transition hover:bg-black/65"
              @click="closeModal"
            >
              <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6L18 18M18 6L6 18"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                />
              </svg>
            </button>

            <!-- MATN: faqat shu qism scroll bo'ladi (telefonda butun oyna) -->
            <div
              class="news-scroll flex min-w-0 flex-1 flex-col overflow-y-auto px-8 py-8 max-[820px]:overflow-visible max-[480px]:px-5 max-[480px]:py-6"
            >
              <span
                class="inline-block self-start rounded-full bg-blush px-3.5 py-1 text-[12.5px] font-bold text-red dark:bg-white/10 dark:text-white/80"
              >
                {{ formatDate(selected.date) }}
              </span>
              <h3
                class="mt-4 text-[26px] font-extrabold leading-[1.2] text-[#0F1E33] dark:text-white max-[480px]:text-[21px]"
              >
                {{ selected.title }}
              </h3>
              <p
                class="mt-4 whitespace-pre-line text-[16px] leading-[1.75] text-gray-600 dark:text-white/70"
              >
                {{ selected.desc }}
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
  lang: {
    type: String,
    default: "uz",
  },
});

// VITE_LEAD_API_URL = ".../api/lead" -> API bazasi ".../api" (App.vue dagi /visit bilan bir xil usul)
const API_BASE = (import.meta.env.VITE_LEAD_API_URL || "/api/lead").replace(
  /\/lead$/,
  ""
);

const texts = {
  uz: {
    title: "Yangiliklar",
    subtitle: "Mendeleyev hayotidagi sönggi voqealar va e’lonlar",
    more: "Batafsil",
    close: "Yopiş",
    prev: "Oldingi",
    next: "Keyingi",
  },
  ru: {
    title: "Новости",
    subtitle: "Последние события и объявления Mendeleyev",
    more: "Подробнее",
    close: "Закрыть",
    prev: "Назад",
    next: "Вперёд",
  },
  en: {
    title: "News",
    subtitle: "Latest events and announcements from Mendeleyev",
    more: "Read more",
    close: "Close",
    prev: "Previous",
    next: "Next",
  },
};

const months = {
  uz: [
    "yanvar",
    "fevral",
    "mart",
    "aprel",
    "may",
    "iyun",
    "iyul",
    "avgust",
    "sentabr",
    "oktyabr",
    "noyabr",
    "dekabr",
  ],
  ru: [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

const tx = computed(() => texts[props.lang] || texts.uz);

const items = ref([]);
const selected = ref(null);
const track = ref(null);
const canPrev = ref(false);
const canNext = ref(false);

function imageUrl(file) {
  return `${API_BASE}/news-images/${encodeURIComponent(file)}`;
}

// date: "YYYY-MM-DD" (server Toshkent vaqti bo'yicha yozadi)
function formatDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
  if (!m) return "";
  const year = m[1];
  const day = Number(m[3]);
  const name = (months[props.lang] || months.uz)[Number(m[2]) - 1];
  if (!name) return "";

  if (props.lang === "en") return `${name} ${day}, ${year}`;
  if (props.lang === "ru") return `${day} ${name} ${year}`;
  return `${day}-${name}, ${year}`;
}

function updateArrows() {
  const el = track.value;
  if (!el) {
    canPrev.value = false;
    canNext.value = false;
    return;
  }
  canPrev.value = el.scrollLeft > 4;
  canNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
}

function scrollByCard(direction) {
  const el = track.value;
  const card = el?.firstElementChild;
  if (!el || !card) return;
  el.scrollBy({
    left: direction * (card.getBoundingClientRect().width + 24),
    behavior: "smooth",
  });
}

function closeModal() {
  selected.value = null;
}

function onKeyDown(event) {
  if (event.key === "Escape" && selected.value) closeModal();
}

watch(selected, (value) => {
  document.body.style.overflow = value ? "hidden" : "";
});

async function loadNews() {
  try {
    const response = await fetch(`${API_BASE}/news`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    items.value = Array.isArray(data?.items)
      ? data.items.filter((item) => item && item.id && item.title && item.image)
      : [];
    await nextTick();
    updateArrows();
  } catch {
    // server javob bermasa bo'lim shunchaki ko'rinmaydi — sayt ishlashiga xalaqit bermaydi
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", updateArrows);
  loadNews();
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("resize", updateArrows);
  if (selected.value) document.body.style.overflow = "";
});
</script>

<style scoped>
/* Bo'lim yuklangach silliq paydo bo'ladi */
.news-in {
  animation: news-in 0.7s ease-out both;
}

@keyframes news-in {
  from {
    opacity: 0;
    transform: translateY(26px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* Desktopda 3 ta, planshetda 2 ta, telefonda 1 ta (keyingisi biroz ko'rinib turadi) */
.news-card {
  flex: 0 0 calc((100% - 48px) / 3);
}

@media (max-width: 980px) {
  .news-card {
    flex-basis: calc((100% - 24px) / 2);
  }
}

@media (max-width: 640px) {
  .news-card {
    flex-basis: 84%;
  }
}

/* Yangilik kam bo'lsa kartalar markazda turadi; ko'p bo'lsa auto margin 0 ga tushadi */
.news-card:first-child {
  margin-left: auto;
}
.news-card:last-child {
  margin-right: auto;
}

/* Batafsil oynasi paydo bo'lishi va ingichka scroll */
.news-pop {
  animation: news-pop 0.25s ease-out both;
}

@keyframes news-pop {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.news-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.25) transparent;
}

.news-track {
  scrollbar-width: none;
}
.news-track::-webkit-scrollbar {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .news-in,
  .news-pop {
    animation: none;
  }
  .news-track {
    scroll-behavior: auto;
  }
}
</style>
