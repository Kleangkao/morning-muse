

## Plan: Improve Thai Text Quality Across the Interface

The issue has two parts: (1) static UI labels that are too literal, and (2) AI-generated translations (headlines, summaries, narratives, quick scan) that read like machine translations. Both need fixing.

### Part 1: Fix Static UI Labels

**File: `src/hooks/useLanguage.ts`** — Update Thai translations:

| Current | New |
|---------|-----|
| `ฟีดอัลฟ่าสด` | `ฟีดข่าวล่าสุด` |
| `สัญญาณแรง` | `สัญญาณตลาด` |
| `สัญญาณอ่อน` | `ข่าวทั่วไป` |
| `เทรนด์ที่กำลังมา` | `เทรนด์ตลาด` |
| `ผลกระทบสูง` | `ข่าวสำคัญ` |
| `เทรนด์ร้อน` | `เทรนด์แรง` |
| `แข็งแกร่งที่สุด` | `โดดเด่นที่สุด` |
| `บันทึกบทความจากฟีดของคุณ` | `บุ๊กมาร์กข่าวจากฟีดของคุณ` |

**File: `src/lib/translations.ts`** — Update category/badge labels:

| Current | New |
|---------|-----|
| `สินค้าโภคภัณฑ์` | `โภคภัณฑ์` |
| `เหรียญ Stablecoin` | `Stablecoin` |
| `ความเคลื่อนไหวตลาด` | `ตลาดเคลื่อนไหว` |
| `อัลท์คอยน์` | `Altcoin` |
| `สินทรัพย์จริง` | `RWA` |
| `ควบรวมกิจการ` | `M&A` |
| `กำลังขึ้น` (badge) | `มาแรง` |

**File: `src/components/QuickScan.tsx`** — Update section titles:

| Current | New |
|---------|-----|
| `สรุปเร็ววันนี้` | `ภาพรวมวันนี้` |
| `สิ่งที่เปลี่ยนแปลงวันนี้ — อ่านจบใน 30 วินาที` | `สรุปสั้นๆ สิ่งที่เกิดขึ้นวันนี้` |

**File: `src/components/NarrativeCard.tsx`** — Update subtitle:

| Current | New |
|---------|-----|
| `รูปแบบและธีมจากหลายข่าว` | `ธีมที่กำลังถูกพูดถึงในตลาด` |

**File: `src/components/ArticleDetailModal.tsx`** — Update labels:

| Current | New |
|---------|-----|
| `จุดสำคัญ` | `ประเด็นสำคัญ` |
| `เปิดบทความต้นฉบับ` | `อ่านต้นฉบับ` |

### Part 2: Improve AI Translation Prompts

**File: `supabase/functions/enrich-articles/index.ts`**

Update `translateBatch` system prompt to enforce natural Thai financial writing style:

```
You are a Thai financial journalist at Bloomberg Thai / Setthasat. 
Rewrite English headlines and summaries into natural, professional Thai.

Rules:
- Do NOT translate literally word-by-word.
- Rewrite headlines to sound punchy and natural in Thai.
- Keep proper nouns, tickers, and numbers as-is (BTC, SEC, Fed, $1.8T).
- Summaries: 1-2 short sentences explaining the significance.
- Use vocabulary common in Thai financial media.
- Short sentences, easy to scan.
```

Update `handleQuickScan` prompt similarly — add Thai financial writing style instruction.

Update `handleDetail` prompt for Thai mode — add instruction to write like a Thai financial analyst brief, not a translation.

Update narrative generation prompt to produce natural Thai titles and explanations.

### Part 3: Cache Bust

**File: `src/hooks/useNews.ts`** — Bump `ENRICHMENT_CACHE_KEY` to `v6` to force re-enrichment with improved prompts.

Also clear quick-scan cache by updating prefix or version in `QuickScan.tsx`.

### Summary of Files to Edit

1. `src/hooks/useLanguage.ts` — static UI labels
2. `src/lib/translations.ts` — category/badge labels
3. `src/components/QuickScan.tsx` — section titles + cache key
4. `src/components/NarrativeCard.tsx` — subtitle
5. `src/components/ArticleDetailModal.tsx` — modal labels
6. `supabase/functions/enrich-articles/index.ts` — all AI prompts
7. `src/hooks/useNews.ts` — cache version bump

