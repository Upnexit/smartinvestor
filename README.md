# Smart Click BD Landing

Build a pixel-perfect, mobile-first Bengali landing page for a Bangladeshi online-earning platform called "Smart Click BD" (Bengali: স্মার্ট ক্লিক বিডি). The page promotes earning money by liking and commenting on social media tasks. Use React + TypeScript + Tailwind CSS + lucide-react icons + embla-carousel-react. The visual language is warm, colorful, and "cream / honey / mint / rose" pastel with bold gold-and-emerald accents — friendly, trustworthy, premium-Bangladeshi fintech vibe. NOT generic SaaS purple-gradient style.

==================== GLOBAL DESIGN SYSTEM ====================
- Fonts: Headings → "Baloo Da 2" (Bengali display, weight 800, letter-spacing -0.01em). Body → "Hind Siliguri". Load both from Google Fonts.
- Background: soft cream/honey gradient using radial blobs of amber, emerald, and rose at low opacity over an off-white base (#fdfbf5 / oklch(0.99 0.012 85)).
- Primary brand color: warm gold (oklch(0.72 0.17 70) ≈ #d4a04a).
- Accent: emerald green (oklch(0.7 0.18 155)).
- Rose/pink for "comment" rewards and CTAs.
- Two reusable button styles:
  • btn-gold → gradient amber→orange, dark brown text, soft inner highlight + warm shadow.
  • btn-green → gradient emerald, white text.
- Cards: white background, 1px slate-200 border, rounded-2xl/3xl, subtle "shadow-soft" (multi-layer warm shadow), hover lifts (-translate-y-1) to a stronger "shadow-pop".
- Gradient text utility "text-gradient" → amber-orange-rose linear gradient for headline words like "লাইক ও কমেন্ট" and "ইনকাম".
- Currency formatting: "৳" prefix + en-BD locale numerals (Bengali speakers prefer western digits with Bengali UI text — keep digits in English, labels in Bengali).
- Mobile-first. All sections must look balanced on 360px–414px phones AND scale up to 1280px desktop. Use 2-column grids on mobile where the original has 4.

==================== PAGE STRUCTURE (in order) ====================
1. Sticky Nav
2. Hero
3. Stats
4. How It Works
5. Features
6. Earnings / Packages
7. Products (e-commerce teaser)
8. Testimonials (auto-play carousel)
9. CTA banner
10. Footer

==================== 1. STICKY NAV ====================
- White/85 blurred sticky header, 1px amber-100 bottom border.
- Left: square gold-framed logo placeholder (40×40, rounded-xl, white bg, amber-200 ring) + brand text "Smart Click BD" in bn-display, 18–20px.
- Center (desktop only): 4 anchor links — "কিভাবে কাজ করে", "ফিচার", "আয়", "রিভিউ" — slate text, hover amber-600.
- Right: two buttons
  • "লগইন" → emerald-500 bg, white text, rounded-xl, soft emerald shadow.
  • "শুরু করুন" → btn-gold, rounded-xl.
  Both compress to xs text on mobile, sm on desktop.

==================== 2. HERO ====================
- Centered text, max-w-4xl. Generous vertical padding (pt-16/pb-16 mobile, pt-20/pb-24 desktop).
- Decorative pastel blobs: amber top-left, emerald top-right, rose bottom-center, all blurred (blur-2xl) at 40–50% opacity, pointer-events-none.
- Eyebrow pill: emerald-50 bg, emerald-200 border, pulsing emerald dot + text "বাংলাদেশের #১ অনলাইন ইনকাম প্ল্যাটফর্ম".
- Bonus pill below: amber→yellow→orange gradient bg, amber-300 border, Gift icon (rose), text "নতুন একাউন্টে ৳৩০০ সাইনআপ বোনাস (লকড)" — the "৳৩০০" highlighted in rose-700.
- H1 (bn-display, very large — 2.5rem mobile, up to 4.5rem desktop, line-height 1.05):
  "লাইক ও কমেন্ট করে টাকা ইনকাম করুন"
  where "লাইক ও কমেন্ট" and "ইনকাম" use the text-gradient.
- Sub-paragraph (slate-600, max-w-2xl, base/lg):
  "ঘরে বসে মোবাইল দিয়ে সহজেই আয় করুন। প্রতিদিন কয়েক মিনিট কাজ করেই পেয়ে যান রিয়েল ক্যাশ — bKash, Nagad ও Rocket-এ ইনস্ট্যান্ট পেমেন্ট।"
  Color "bKash" pink-600, "Nagad" orange-600, "Rocket" purple-600.
- Two CTAs (stack on mobile, row on sm+):
  • Primary: btn-gold "ফ্রি একাউন্ট খুলুন" + right ArrowRight icon.
  • Secondary: white bg, slate-200 border (hover amber-400), "কিভাবে কাজ করে".
- Trust strip (small slate text, wrap): three CheckCircle2 (emerald) chips:
  "ফ্রি রেজিস্ট্রেশন" · "ইনভেস্টমেন্ট নেই" · "১০০% নিরাপদ".
- Two large rate cards (grid-cols-2, max-w-2xl):
  • Sky card: ThumbsUp icon in sky-500 rounded square, label "প্রতি Like", value "৳ ০.৫০" in bn-display sky-700, 2xl/3xl.
  • Rose card: MessageCircle icon, "প্রতি Comment", "৳ ১.২০" rose-700.
  Both have white bg, colored border, shadow-soft, hover lift.

==================== 3. STATS ====================
4 stat tiles (2-col mobile, 4-col desktop), each:
- White rounded-2xl card, slate border, shadow-soft, hover lift.
- Centered colored pastel square (h-12 w-12) containing a smaller solid colored icon square (h-9 w-9, white icon).
- Big bn-display value, small slate-600 label below.
Items:
1. Users icon, "৫০,০০০+", "সক্রিয় ইউজার" — amber.
2. Banknote icon, "৳ ২ কোটি+", "পেমেন্ট সম্পন্ন" — emerald.
3. Clock icon, "২৪/৭", "লাইভ সাপোর্ট" — sky.
4. TrendingUp icon, "৯৯%", "সফল উইথড্র" — rose.

==================== 4. HOW IT WORKS (id="how") ====================
- Mint background (very soft emerald-tinted off-white).
- Section heading helper "Heading" component: tiny uppercase eyebrow chip (colored bg) + large bn-display title centered.
  Use eyebrow "প্রসেস" (emerald) + title "মাত্র ৩ ধাপে শুরু করুন".
- 3-step grid with a horizontal gradient connector line (amber→emerald→rose) behind the icons on desktop.
- Each step: white rounded-3xl card, large pastel ring square with colored icon, "ধাপ N" pill, bn-display title, slate description.
Steps:
1. UserPlus, "একাউন্ট তৈরি করুন", "মাত্র ১ মিনিটে ফ্রি রেজিস্ট্রেশন করুন এবং ড্যাশবোর্ডে প্রবেশ করুন।" — amber.
2. MousePointerClick, "টাস্ক সম্পন্ন করুন", "প্রতিদিন নতুন লাইক ও কমেন্ট টাস্ক করুন আপনার পছন্দ মতো।" — emerald.
3. Wallet, "ইনস্ট্যান্ট পেমেন্ট নিন", "bKash, Nagad বা Rocket-এ মুহূর্তেই টাকা তুলে নিন।" — rose.

==================== 5. FEATURES (id="features") ====================
- White bg.
- Heading: eyebrow "ফিচার" (amber), title "কেন Smart Click BD সেরা?".
- 6 colored feature cards (1-col → 2-col → 3-col):
1. ShieldCheck — "১০০% নিরাপদ" — "আপনার তথ্য এবং পেমেন্ট সম্পূর্ণ সুরক্ষিত।" — emerald.
2. Smartphone — "মোবাইল ফ্রেন্ডলি" — "যেকোনো ডিভাইস থেকে সহজেই কাজ করুন।" — sky.
3. Zap — "ইনস্ট্যান্ট পেমেন্ট" — "অনুরোধের সাথে সাথে টাকা পান।" — amber.
4. Clock — "২৪/৭ টাস্ক" — "দিন-রাত যেকোনো সময় কাজ করতে পারবেন।" — orange.
5. Gift — "রেফার বোনাস" — "বন্ধুকে রেফার করে অতিরিক্ত আয় করুন।" — rose.
6. Trophy — "কম মিনিমাম উইথড্র" — "মাত্র ১০০ টাকা থেকেই উইথড্র করতে পারবেন।" — violet.
Each card: pastel bg of its color, matching border, solid colored icon chip, hover lift + icon scale.

==================== 6. EARNINGS / PACKAGES (id="earning") ====================
- Honey background (soft amber-tinted off-white).
- Heading: eyebrow "প্যাকেজ" (amber), title "আমাদের প্যাকেজ সমূহ".
- Sub-line: "আপনার বাজেট অনুযায়ী সেরা প্যাকেজ বেছে নিন — ৫২০৳ থেকে ২৯,৯৯৯৳ পর্যন্ত। দৈনিক ২০৳ থেকে ১,২০০৳ পর্যন্ত আয়।"
- 4 package cards (2-col mobile, 4-col lg) with these tier presets (each has a unique gradient header, icon, optional badge):
  • "Crazy" — pink→rose→orange gradient, Rocket icon.
  • "Fortunate" — lime→emerald→teal, Star icon.
  • "Silver" — slate gradient, Award icon.
  • "Gold" — amber→yellow, Trophy icon.
  • "Diamond" — cyan→sky→blue, Gem icon.
  • "Super" — fuchsia→purple→indigo, Zap icon.
  • "Super Dream" — violet→purple→pink, Sparkles icon.
  • "VIP Live" — red→rose→pink, TrendingUp icon, "LIVE" badge.
  • "VIP" — amber→orange→red, Crown icon, "POPULAR" badge.
  • "VIP Coin" — yellow→amber, Crown icon, "BEST VALUE" badge.
  Show only 4 sample cards on the homepage (e.g. VIP, Gold, Diamond, Crazy) with sample data: name, price (৳), "৪৫ দিন মেয়াদ", daily-earning chip ("দৈনিক ৳XXX") with TrendingUp, two check-bullets ("দৈনিক Nটি টাস্ক", "মোট আয় ৳XXXX"), and a gradient-matching "বিস্তারিত দেখুন" CTA.
- Below the grid: btn-gold "সকল প্যাকেজ দেখুন →" + caption "১০টি প্রিমিয়াম প্যাকেজ — Like · Comment · Share".

==================== 7. PRODUCTS (id="products") ====================
- Mint background.
- Heading: eyebrow "আমাদের পণ্য সমূহ" (emerald), title "বিশ্বস্ত প্রিমিয়াম পণ্যের কালেকশন".
- Sub: "ইয়ারবাডস, হেডফোন, স্মার্টওয়াচসহ অরিজিনাল ব্র্যান্ডেড ইলেকট্রনিক্স — সাশ্রয়ী মূল্যে, সারা বাংলাদেশে দ্রুত ডেলিভারি।"
- 3 trust chips below: "১০০% অরিজিনাল" (Shield, emerald), "ফাস্ট ডেলিভারি" (Truck, sky), "ক্যাশ অন ডেলিভারি" (Package, rose).
- Grid 2-col mobile, 4-col lg. 8 product cards. Each card:
  • Square product image (Unsplash) with hover-zoom.
  • Top-left gradient tag pill (e.g. "BEST SELLER", "PREMIUM", "NEW", "SAVE 17%", "HOT", "TRENDING", "EXCLUSIVE", "DEAL") — each a different gradient.
  • Top-right dark "Coming Soon" ribbon (slate-900 bg, amber-300 text, Clock icon).
  • Bottom overlay strip on image: "শীঘ্রই আসছে".
  • Below image: 2-line product name, rose-600 bn-display price + struck-through slate old price, 5 amber stars + "(4.9)", green "ইন স্টক".
  • Full-width "অর্ডার করুন" button: amber→orange→rose gradient, ShoppingCart icon. On click → toast "এই পণ্যটি শীঘ্রই অর্ডারের জন্য উন্মুক্ত হবে — Coming Soon!".
  Sample products: Apple AirPods Pro 2, Sony WH-1000XM5, Galaxy Buds2 Pro, JBL Tune 760NC, Mi Band 8, Anker Liberty 4, Apple Watch SE, Realme Buds Air 5 Pro — with realistic Bangladeshi prices (৳4,990–৳38,900).
- Footer caption: "* পণ্য অর্ডারের জন্য সাপোর্টে যোগাযোগ করুন। সকল পণ্য ৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি সহ।"

==================== 8. TESTIMONIALS (id="review") ====================
- White bg.
- Heading: eyebrow "রিভিউ" (rose), title "আমাদের ইউজারদের রিভিউ".
- Embla carousel, loop, autoplay 3.5s, 2 slides on mobile / 3 on desktop.
- 6 review cards (white rounded-3xl, slate border, shadow-soft):
  • 5 amber stars on top.
  • Bengali quote text.
  • Bottom: colored circular avatar (first letter of name, rotating colors amber/emerald/rose/sky/violet/orange) + name + city in slate.
  Names+cities+texts (use exactly):
  1. রাকিব হাসান — ঢাকা — "প্রতিদিন ৩-৪ ঘন্টা কাজ করে মাসে ১৫,০০০ টাকা আয় করছি। সত্যিই অসাধারণ প্ল্যাটফর্ম।"
  2. সুমাইয়া আক্তার — চট্টগ্রাম — "স্টুডেন্ট হিসেবে পড়াশোনার পাশাপাশি ভালো আয় করতে পারছি। পেমেন্ট সবসময় টাইমলি।"
  3. মো. ইমরান — সিলেট — "bKash-এ ইনস্ট্যান্ট পেমেন্ট পাই। সাপোর্ট টিম খুবই হেল্পফুল। হাইলি রিকমেন্ডেড।"
  4. ফারহানা ইয়াসমিন — রাজশাহী — "ঘরে বসে নিরাপদে আয় করার সবচেয়ে ভালো উপায়। উইথড্র কখনো ফেল হয়নি।"
  5. শাহরিয়ার কবির — খুলনা — "নতুনদের জন্য পারফেক্ট প্ল্যাটফর্ম। কয়েক মিনিটেই টাস্ক শেষ করা যায়।"
  6. তানজিনা রহমান — বরিশাল — "রেফার বোনাস থেকেই অনেক ভালো আয় হচ্ছে। দারুণ সিস্টেম।"

==================== 9. CTA BANNER ====================
- Large rounded-[2rem] card, max-w-5xl, centered, padding 10–16.
- Background: bold linear-gradient 135deg from warm orange → red → magenta-pink (approx oklch warm rose-fuchsia mix).
- Decorative amber + yellow blurred circles in corners (blur-3xl).
- White content centered:
  • Pill "🎁 আজই যোগ দিন — সাইনআপ বোনাস ৳৩০০" on translucent white bg.
  • H2 (bn-display, 3xl/5xl): "আজই শুরু করুন আপনার আয়" — "আপনার আয়" colored amber-200.
  • Sub: "ফ্রি রেজিস্ট্রেশন। কোনো ইনভেস্টমেন্ট নেই। প্রথম টাস্ক থেকেই আয় শুরু।"
  • Two buttons (stack mobile, row sm+):
    – White bg + rose-700 text "ফ্রি একাউন্ট খুলুন".
    – Translucent white border button "লগইন করুন".

==================== 10. FOOTER ====================
- White bg, 1px slate-200 top border.
- Left: small framed logo + "Smart Click BD" bn-display.
- Right: copyright line "© 2025 Smart Click BD — সকল অধিকার সংরক্ষিত।" plus muted links: "শর্তাবলী", "প্রাইভেসি", "যোগাযোগ".
- Stack vertically on mobile, row on sm+.

==================== TECHNICAL REQUIREMENTS ====================
- Use Tailwind v4 with custom utilities for bg-app, bg-mint, bg-honey, bg-cream, bg-rose-soft, bg-sky-soft, shadow-soft, shadow-pop, text-gradient, text-gradient-green, btn-gold, btn-green, bn-display.
- All icons from lucide-react: Sparkles, ThumbsUp, MessageCircle, Wallet, ShieldCheck, UserPlus, MousePointerClick, CheckCircle2, Smartphone, Clock, Users, TrendingUp, Zap, Gift, Trophy, ArrowRight, Star, Banknote, Crown, Gem, Award, Rocket, Check, Package, Truck, ShoppingCart.
- Carousel: embla-carousel-react + embla-carousel-autoplay.
- Toast: sonner.
- All Bengali text must be rendered exactly as quoted above — do NOT translate or paraphrase.
- Build one single page file. Compose with small section components: Nav, Hero, Stats, HowItWorks, Features, Earnings, Products, Testimonials, CTA, Footer, plus a shared Heading helper that renders the eyebrow pill + bn-display title.
- The page must be production-grade: semantic HTML, alt text on images, accessible focus rings, single H1 (the hero), proper meta tags (title "Smart Click BD — লাইক কমেন্ট করে টাকা ইনকাম", description "ঘরে বসে লাইক ও কমেন্ট করে আয় করার বিশ্বস্ত বাংলাদেশী প্ল্যাটফর্ম।").
- No purple-gradient generic SaaS look. The signature feel is "warm Bangladeshi gold + emerald + rose on cream", with playful pastel blobs and friendly bn-display headings.

Deliver the complete working page in one go.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/53c6a07a-40d3-4d21-9105-97bc1ff86fa8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
