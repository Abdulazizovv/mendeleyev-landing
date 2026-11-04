<template>
  <section
    id="top"
    class="relative min-h-[512px] py-10 overflow-hidden bg-white transition-colors duration-300 dark:bg-[#080a13] max-[980px]:min-h-0"
  >
    <div
      class="pointer-events-none absolute inset-0 z-0 hidden dark:block"
      style="
        background: radial-gradient(
            600px 430px at 73% 50%,
            rgba(239, 30, 45, 0.09),
            transparent 68%
          ),
          radial-gradient(
            420px 300px at 45% 100%,
            rgba(239, 30, 45, 0.06),
            transparent 70%
          );
      "
    ></div>

    <div
      class="pointer-events-none absolute inset-0 z-0 dark:hidden"
      style="
        background: radial-gradient(
            580px 420px at 76% 48%,
            rgba(239, 30, 45, 0.08),
            transparent 68%
          ),
          radial-gradient(
            400px 280px at 95% 95%,
            rgba(239, 30, 45, 0.06),
            transparent 70%
          );
      "
    ></div>

    <div
      class="relative z-20 mx-auto flex min-h-[512px] max-w-[1280px] items-center px-8 max-[980px]:min-h-0 max-[980px]:flex-col max-[980px]:px-6 max-[640px]:px-5"
    >
      <div class="relative z-20">
        <div
          class="mb-7 inline-flex items-center transition-all duration-700 ease delay-[50ms] motion-reduce:transition-none"
          :class="
            heroLoaded
              ? 'translate-y-0 opacity-100'
              : 'translate-y-[22px] opacity-0'
          "
        >
          <div
            class="inline-flex max-w-full items-center gap-2.5 rounded-lg border border-gray-200/80 bg-white/90 px-4 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
          >
            <span class="h-5 w-[3px] shrink-0 rounded-full bg-red-500"></span>

            <span
              class="text-[15px] font-medium leading-[1.4] tracking-[-0.2px] text-gray-500 dark:text-white/60 max-[480px]:text-[13px]"
            >
              <span class="font-semibold text-red-500">
                “{{ t.hero.badgeStrong || t.hero.ctaSecondary }}”
              </span>
              {{ t.hero.eyebrow }}
            </span>
          </div>
        </div>

        <h1
          class="max-w-[650px] text-[clamp(36px,4.3vw,55px)] font-bold leading-[1.08] tracking-[-1.6px] text-ink dark:text-white transition-all duration-700 ease delay-[150ms] motion-reduce:transition-none"
          :class="
            heroLoaded
              ? 'translate-y-0 opacity-100'
              : 'translate-y-[22px] opacity-0'
          "
        >
          <span class="text-red-500">{{ titleFirst }}</span>
          {{ titleRest }}
        </h1>

        <p
          class="mt-6 max-w-[520px] text-[16px] font-normal leading-[1.75] tracking-[-0.1px] text-gray-500 dark:text-white/60 transition-all duration-700 ease delay-[250ms] motion-reduce:transition-none"
          :class="
            heroLoaded
              ? 'translate-y-0 opacity-100'
              : 'translate-y-5.5 opacity-0'
          "
        >
          {{ t.hero.desc }}
        </p>

        <div
          class="mt-9 flex flex-wrap gap-[14px] transition-all duration-700 ease delay-[350ms] motion-reduce:transition-none"
          :class="
            heroLoaded
              ? 'translate-y-0 opacity-100'
              : 'translate-y-[22px] opacity-0'
          "
        >
          <a
            href="#contact"
            @click.prevent="$emit('openContact')"
            class="inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-600 px-25 py-6 text-[16px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(230,50,98,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:from-red-600 hover:via-red-500 hover:to-red-500 max-[640px]:w-full max-[640px]:px-6 max-[640px]:py-4.5"
          >
            <span>{{ t.hero.ctaPrimary }}</span>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-5 w-5 shrink-0"
            >
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>

        <div
          class="mt-14 flex flex-wrap gap-x-[38px] gap-y-6 transition-all duration-700 ease delay-[450ms] motion-reduce:transition-none"
          :class="
            heroLoaded
              ? 'translate-y-0 opacity-100'
              : 'translate-y-[22px] opacity-0'
          "
        >
          <div v-for="s in t.hero.stats" :key="s.label" class="flex flex-col">
            <strong
              class="font-head text-[30px] font-semibold text-ink dark:text-white"
            >
              {{ s.value }}
            </strong>

            <span class="text-sm text-gray-500 dark:text-white/60">
              {{ s.label }}
            </span>
          </div>
        </div>
      </div>

      <div
        class="absolute right-[1.5%] top-0 z-10 h-full w-[56%] transition-all duration-[900ms] ease-out max-[980px]:relative max-[980px]:right-0 max-[980px]:mt-[-10px] max-[980px]:h-[470px] max-[980px]:w-full max-[640px]:h-[390px]"
        :class="
          heroLoaded
            ? 'translate-x-0 scale-100 opacity-100'
            : 'translate-x-5 scale-[0.97] opacity-0'
        "
      >
        <div
          class="absolute right-[4%] top-[1%] h-[96%] w-[420px] max-[1180px]:right-[2%] max-[1180px]:w-[400px] max-[980px]:right-1/2 max-[980px]:top-[3%] max-[980px]:h-[94%] max-[980px]:w-[380px] max-[980px]:translate-x-1/2 max-[640px]:w-[310px]"
        >
          <div
            class="pointer-events-none absolute left-1/2 top-[50%] z-[1] h-[465px] w-[465px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-400/45 bg-[radial-gradient(circle_at_50%_42%,rgba(239,68,68,0.28)_0%,rgba(239,68,68,0.14)_40%,rgba(239,68,68,0.06)_62%,transparent_77%)] shadow-[0_0_35px_rgba(239,68,68,0.22),0_0_75px_rgba(239,68,68,0.18),0_0_135px_rgba(220,38,38,0.12)] dark:border-red-500/25 dark:bg-[radial-gradient(circle_at_50%_42%,rgba(239,68,68,0.24)_0%,rgba(220,38,38,0.11)_45%,rgba(127,29,29,0.04)_68%,transparent_77%)] dark:shadow-[0_0_65px_rgba(239,68,68,0.18),0_0_120px_rgba(220,38,38,0.09)] max-[980px]:h-[430px] max-[980px]:w-[430px] max-[640px]:h-[355px] max-[640px]:w-[355px]"
          ></div>

          <div
            class="absolute inset-0 z-[5] overflow-hidden border border-red-400/55 bg-gradient-to-b from-[#ff7373] via-[#ef4444] to-[#b91c1c] shadow-[0_35px_80px_-12px_rgba(127,29,29,0.46),0_20px_45px_-18px_rgba(220,38,38,0.58),0_0_50px_rgba(239,68,68,0.24),0_0_100px_rgba(239,68,68,0.11),inset_0_2px_1px_rgba(255,255,255,0.42)] dark:border-red-500/30 dark:from-[#ef4444] dark:via-[#b91c1c] dark:to-[#450a0a] dark:shadow-[0_25px_70px_rgba(0,0,0,0.50),0_0_48px_rgba(239,68,68,0.14),inset_0_1px_0_rgba(255,255,255,0.10)]"
            style="border-radius: 999px 999px 100px 100px"
          >
            <div
              class="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_12%,rgba(255,255,255,0.38)_0%,rgba(255,255,255,0.14)_30%,transparent_56%),radial-gradient(circle_at_50%_68%,rgba(127,29,29,0.24)_0%,transparent_60%),linear-gradient(180deg,rgba(255,255,255,0.12)_0%,transparent_42%,rgba(69,10,10,0.25)_100%)] dark:bg-[radial-gradient(ellipse_at_50%_14%,rgba(255,120,120,0.22)_0%,rgba(239,68,68,0.08)_34%,transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_42%,rgba(0,0,0,0.32)_100%)]"
            ></div>

            <div
              class="pointer-events-none absolute left-[9%] right-[9%] top-[4%] z-[1] h-[42%] rounded-[50%] bg-gradient-to-b from-white/20 via-white/[0.06] to-transparent blur-[10px] dark:from-white/[0.045] dark:via-transparent"
            ></div>

            <div
              class="pointer-events-none absolute inset-[1px] z-[2] border border-white/35 shadow-[inset_0_0_18px_rgba(255,255,255,0.08)] dark:border-white/[0.07] dark:shadow-none"
              style="border-radius: 998px 998px 99px 99px"
            ></div>

            <img
              src="/images/ustoz.webp"
              alt="Ustoz"
              fetchpriority="high"
              loading="eager"
              decoding="async"
              width="600"
              height="800"
              class="absolute bottom-0 left-1/2 z-[3] h-[100%] w-auto max-w-none -translate-x-1/2 object-contain object-bottom drop-shadow-[0_25px_42px_rgba(69,10,10,0.42)] dark:drop-shadow-[0_22px_38px_rgba(0,0,0,0.48)]"
            />

            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[15%] bg-gradient-to-t from-[#7f1d1d]/65 via-[#b91c1c]/22 to-transparent dark:from-[#180505]/75 dark:via-[#450a0a]/20 dark:to-transparent"
            ></div>
          </div>

          <!-- EXPERIENCE CARD -->

          <div
            class="absolute -left-[72px] top-[10px] z-30 flex items-center gap-3 rounded-[14px] border border-slate-200/90 bg-white/95 px-3.5 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur-md dark:border-white/10 dark:bg-[#10121d]/95 dark:shadow-[0_8px_24px_rgba(0,0,0,0.30)] max-[640px]:-left-2 max-[640px]:top-[5px] max-[640px]:gap-2 max-[640px]:rounded-[11px] max-[640px]:px-2.5 max-[640px]:py-2"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 max-[640px]:h-7 max-[640px]:w-7 max-[640px]:rounded-[8px]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-[22px] w-[22px] max-[640px]:h-[16px] max-[640px]:w-[16px]"
              >
                <path d="M12 3 3 8l9 5 9-5-9-5Z" />
                <path d="M7 10.3v5.2c2.9 2.2 7.1 2.2 10 0v-5.2" />
                <path d="M21 8v6" />
              </svg>
            </div>

            <div class="leading-[1.3]">
              <div
                class="text-[14px] font-bold tracking-[-0.2px] text-slate-900 dark:text-white max-[640px]:text-[11px]"
              >
                20+ yillik
              </div>

              <div
                class="mt-1 text-[11px] font-medium text-slate-500 dark:text-white/55 max-[640px]:mt-0.5 max-[640px]:text-[9px]"
              >
                Ta'limdagi tajriba
              </div>
            </div>
          </div>

          <!-- QUALITY EDUCATION CARD -->

          <div
            class="absolute -right-[72px] bottom-[18px] z-30 flex items-center gap-3 rounded-[14px] border border-slate-200/90 bg-white/95 px-3.5 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur-md dark:border-white/10 dark:bg-[#10121d]/95 dark:shadow-[0_8px_24px_rgba(0,0,0,0.30)] max-[640px]:-right-2 max-[640px]:bottom-[10px] max-[640px]:gap-2 max-[640px]:rounded-[11px] max-[640px]:px-2.5 max-[640px]:py-2"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 max-[640px]:h-7 max-[640px]:w-7 max-[640px]:rounded-[8px]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-[22px] w-[22px] max-[640px]:h-[16px] max-[640px]:w-[16px]"
              >
                <path
                  d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9L12 3.5Z"
                />
              </svg>
            </div>

            <div class="leading-[1.3]">
              <div
                class="text-[14px] font-bold tracking-[-0.2px] text-slate-900 dark:text-white max-[640px]:text-[11px]"
              >
                Sifatli ta'lim
              </div>

              <div
                class="mt-1 text-[11px] font-medium text-slate-500 dark:text-white/55 max-[640px]:mt-0.5 max-[640px]:text-[9px]"
              >
                Yorqin kelajak
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  t: Object,
  heroLoaded: Boolean,
});

defineEmits(["openContact"]);

const titleWords = computed(() => props.t.hero.title.split(" "));

const titleFirst = computed(() => titleWords.value[0]);

const titleRest = computed(() => titleWords.value.slice(1).join(" "));
</script>
