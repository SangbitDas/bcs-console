# BCS English Subject Analysis & Error Audit Report

> **Dataset Scope:** 10th to 50th BCS Preliminary Question Bank (41 Exams)  
> **Target Subject:** English (`subject_id: 2`, 977 Total Questions)  
> **Authority Source:** `dataset/bcs_preliminary_question_bank.json`  
> **Purpose:** Comprehensive exam-by-exam identification of formatting errors, missing underlines/highlights, missing/malformed blank indicators, duplicate options, and source discrepancies.

---

## 📊 Summary of Findings

| Metric | Count |
|---|---|
| **Total BCS Exams Analyzed** | 41 Exams (10th–50th BCS) |
| **Total English Questions** | 977 questions |
| **Exams with Identified Flaws/Discrepancies** | 24 exams |
| **Missing Underline / Target Highlighting** | 31 questions |
| **Fill-in-the-Blank Missing or Malformed Gaps** | 16 questions |
| **Duplicate / Corrupted Options** | 5 questions |
| **Defective Answers (Blank in Source)** | 0 questions |

---

## 🔍 Key Error Categories Explained

### 1. Missing Underline / Target Highlighting (`MISSING_UNDERLINE_FORMATTING`)
- Questions ask *"What part of speech is the underlined word?"* or *"The underlined clause is..."*, but the question string was stripped of markup during extraction.
- **Example:** **48th BCS (Q34)**: `She works hard. What part of speech is the underlined word?` → The target word was **`hard`**.
- **Extraction Artifact:** In 46th BCS (Q43, Q44, Q47, Q50), the scraper left trailing underscores attached to words (e.g. `following_`, `Writing a diary_`, `went back_`) instead of applying proper formatting.

### 2. Fill-in-the-Blank Glitches & Missing/Malformed Gaps (`BLANK_GLITCHES`)
- **A. Dash Glued to Words (No Space):**
  - **10th BCS (Q19):** `‘He–to see us if he had been able to.’` → The dash was typed directly between `He` and `to` without spaces (`He _____ to see us...`).
  - **13th BCS (Q83):** `English grammar is not- to understand.` → Dash glued to `not-` (`is not _____ to understand`).
  - **26th BCS (Q72):** `The lights have been blown-by the strong wind.` → Dash glued to `blown-by` (`blown _____ by`).
  - **25th BCS (Q84):** `The parents became extremely––––when their son...` → Dashes glued to `extremely` and `when` (`extremely _____ when`).
- **B. Missing or Raw Dash Placeholder:**
  - Instructions say *"Fill in the blank with appropriate preposition/word"*, but the sentence uses raw non-standard en-dashes (`––––`, `–`, `—`) or lacks a clear underscore line (`______`).
  - **26th BCS (Q44):** `I am looking forward ––– you.` → Should be `I am looking forward _____ you.`
  - **26th BCS (Q47):** `He is devoid –––– commonsense.` → Should be `He is devoid _____ commonsense.`
  - **26th BCS (Q57):** `––––– your shoes before entering...` → Should be `_____ your shoes before entering...`
  - **34th BCS (Q35):** `If I - a king!` → Single minus sign `-` used instead of `_____`.
  - **43rd BCS (Q160):** `‘She went to New Market ––’` → Trailing en-dash `––`.

### 3. Duplicate / Overwritten Options (`DUPLICATE_OPTIONS`)
- Extraction or typo errors caused two options (e.g. Option A and Option C/D) to have identical strings.
- **44th BCS (Q69):** Option A and D both say `authoratative`.
- **44th BCS (Q72):** Option A and C both say `Let not the door close.`.
- **45th BCS (Q4):** Option C and D both say `1 million year`.

---

## 📅 Exam-by-Exam Analysis (10th BCS – 50th BCS)


### 🎓 10th BCS (10th BCS)
- **Slug:** `10th_bcs` | **English Questions:** 16 | **Issues Found:** 2

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q19** | `Malformed Blank (Dash Glued to Words)` | "Choose the correct alternative to complete the sentence? ‘He–to see us if he had been able to.’"<br>*Options:* (A) would come (B) would have come (C) may have come (D) may come | **B** | Blank gap dash is glued directly between words ("He–to") without spaces. Replace "He–to" with "He _____ to". |
| **Q23** | `Duplicate Options` | "Choose the correct sentence."<br>*Options:* (A) The man that said that was a fool (B) The man who said that was a fool (C) The man that said that was a fool (D) The man which said that was a fool | **B** | Two or more options have identical text: "the man that said that was a fool". Replace duplicate option with authentic alternative from original question paper. |


### 🎓 11th BCS (11st BCS)
- **Slug:** `11st_bcs` | **English Questions:** 16 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 12th BCS (12nd BCS)
- **Slug:** `12nd_bcs` | **English Questions:** 16 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 13th BCS (13rd BCS)
- **Slug:** `13rd_bcs` | **English Questions:** 20 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q83** | `Non-standard Dash Used as Blank` | "Do not worry, English grammar is not- to understand. Which of the following best fits in the blank space?"<br>*Options:* (A) so difficult (B) very difficult (C) too difficult (D) difficult enough | **C** | Question uses raw hyphen/en-dash as the blank indicator instead of clean underscore line "______". Standardize the gap into a clear "_____" placeholder. |


### 🎓 14th BCS (14th BCS)
- **Slug:** `14th_bcs` | **English Questions:** 20 | **Issues Found:** 5

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q6** | `Missing Underline / Target Highlighting` | "You should show good manners. in the company of young Iadies. –Which is the appropriate phrase for the underline expression above?"<br>*Options:* (A) behave gently (B) practise manners (C) behave yourself (D) do not talk rudely | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target expression: **"show good manners"** (Meaning: behave gently). Underline or highlight this in question text. |
| **Q7** | `Missing Underline / Target Highlighting` | "The invention of computer has turned over a new leaf in the history of modern technology. –––– Which of the following is nearest in meaning to the italicized idiom above?"<br>*Options:* (A) created a new history (B) began a new civiliztion (C) opened a new chapter (D) created a sensation | **C** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target idiom: **"turned over a new leaf"** (Meaning: opened a new chapter). Underline or highlight this in question text. |
| **Q9** | `Missing Underline / Target Highlighting` | "Not many people can commit such a heinous crime in cold blood. -What does the italicized idiom above mean?"<br>*Options:* (A) in cool brain and calculated thought (B) so patiently and thoughtfully (C) so impatintly and thoughtlessly (D) stirred by sudden emotion | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target idiom: **"in cold blood"** (Meaning: in cool brain and calculated thought). Underline or highlight this in question text. |
| **Q10** | `Missing Underline / Target Highlighting` | "The condition of most slum dwellers is so miserable that it cannot be described in words. -Which is the best phrase for the underlined expression above?"<br>*Options:* (A) beggars description (B) cuts to the quick (C) boils down to this (D) keeps open house | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target expression: **"cannot be described in words"** (Equivalent: beggars description). Underline or highlight this in question text. |
| **Q94** | `Malformed Blank (Dash Glued to Words)` | "Now-a-days many villages are lit____ electricity. -Which is the correct preposition in the above blank?"<br>*Options:* (A) With (B) by (C) from (D) on | **B** | Blank gap dash is glued directly between words ("Now-a") without spaces. Replace "Now-a" with "Now _____ a". |


### 🎓 15th BCS (15th BCS)
- **Slug:** `15th_bcs` | **English Questions:** 20 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 16th BCS (16th BCS)
- **Slug:** `16th_bcs` | **English Questions:** 20 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 17th BCS (17th BCS)
- **Slug:** `17th_bcs` | **English Questions:** 21 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 18th BCS (18th BCS)
- **Slug:** `18th_bcs` | **English Questions:** 23 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 19th BCS (19th BCS)
- **Slug:** `19th_bcs` | **English Questions:** 0 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 20th BCS (20th BCS)
- **Slug:** `20th_bcs` | **English Questions:** 20 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 21th BCS (21st BCS)
- **Slug:** `21st_bcs` | **English Questions:** 20 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 22th BCS (22nd BCS)
- **Slug:** `22nd_bcs` | **English Questions:** 20 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 23th BCS (23rd BCS)
- **Slug:** `23rd_bcs` | **English Questions:** 20 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 24th BCS (24th BCS)
- **Slug:** `24th_bcs` | **English Questions:** 20 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 25th BCS (25th BCS)
- **Slug:** `25th_bcs` | **English Questions:** 20 | **Issues Found:** 2

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q80** | `Missing Underline / Target Highlighting` | "The day of my sister’s marriage is drawing near’ The underlined word is a/an"<br>*Options:* (A) adjective (B) verb (C) preposition (D) adverb | **D** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"near"** (Part of speech: Adverb modifying drawing). Underline or highlight this in question text. |
| **Q84** | `Malformed Blank (Dash Glued to Words)` | "The parents became extremely––––when their son had not returned by eleven o’clock."<br>*Options:* (A) angry (B) annoyed (C) disturbed (D) anxious | **D** | Blank gap dash is glued directly between words ("extremely––––when") without spaces. Replace "extremely––––when" with "extremely _____ when". |


### 🎓 26th BCS (26th BCS)
- **Slug:** `26th_bcs` | **English Questions:** 40 | **Issues Found:** 5

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q44** | `Non-standard Dash Used as Blank` | "Fill in the blank with right option. I am looking forward ––– you."<br>*Options:* (A) to seeing (B) seeing (C) to see (D) to have seen | **A** | Question uses raw hyphen/en-dash as the blank indicator instead of clean underscore line "______". Standardize the gap into a clear "_____" placeholder. |
| **Q47** | `Non-standard Dash Used as Blank` | "Fill in the blank with correct preposition. He is devoid –––– commonsense."<br>*Options:* (A) of (B) from (C) introduction (D) at | **A** | Question uses raw hyphen/en-dash as the blank indicator instead of clean underscore line "______". Standardize the gap into a clear "_____" placeholder. |
| **Q57** | `Non-standard Dash Used as Blank` | "Fill in the blank with the correct phrase: ––––– your shoes before entering the mosque."<br>*Options:* (A) put out (B) put off (C) put away (D) put on | **B** | Question uses raw hyphen/en-dash as the blank indicator instead of clean underscore line "______". Standardize the gap into a clear "_____" placeholder. |
| **Q58** | `Non-standard Dash Used as Blank` | "Fill in the blank with the correct phrase: He –––– arrested if he had tried to leave the country."<br>*Options:* (A) would (B) could be (C) would have been (D) must be | **C** | Question uses raw hyphen/en-dash as the blank indicator instead of clean underscore line "______". Standardize the gap into a clear "_____" placeholder. |
| **Q72** | `Malformed Blank (Dash Glued to Words)` | "The lights have been blown-by the strong wind."<br>*Options:* (A) Out (B) Away (C) Up (D) Off | **A** | Blank gap dash is glued directly between words ("blown-by") without spaces. Replace "blown-by" with "blown _____ by". |


### 🎓 27th BCS (27th BCS)
- **Slug:** `27th_bcs` | **English Questions:** 20 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 28th BCS (28th BCS)
- **Slug:** `28th_bcs` | **English Questions:** 24 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q32** | `Missing Underline / Target Highlighting` | "We were waiting for the bus. The underlined part is-"<br>*Options:* (A) a noun phrase (B) an infinitive phrase (C) a prepositional phrase (D) a verb phrase | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target phrase: **"waiting for the bus"** / **"for the bus"** (Noun phrase / Prepositional phrase). Underline or highlight this in question text. |


### 🎓 29th BCS (29th BCS)
- **Slug:** `29th_bcs` | **English Questions:** 20 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 30th BCS (30th BCS)
- **Slug:** `30th_bcs` | **English Questions:** 20 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q39** | `Non-standard Dash Used as Blank` | "Of the four alternatives given under each sentence, find the one that best fits into the blank space:- The horror movie scared them out of their—"<br>*Options:* (A) wits (B) seats (C) lives (D) funds | **A** | Question uses raw hyphen/en-dash as the blank indicator instead of clean underscore line "______". Standardize the gap into a clear "_____" placeholder. |


### 🎓 31th BCS (31st BCS)
- **Slug:** `31st_bcs` | **English Questions:** 20 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 32th BCS (32nd BCS)
- **Slug:** `32nd_bcs` | **English Questions:** 20 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q29** | `Missing Underline / Target Highlighting` | "Choose the word/phrase that best retains the meaning of the underlined word/phrase in the given sentences : Despite being a brilliant scientist, he does not seem to get his ideas across."<br>*Options:* (A) make his ideas understood (B) get his ideas down pat (C) summarise his ideas (D) put together his ideas | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target phrase: **"get his ideas across"** (Meaning: make his ideas understood). Underline or highlight this in question text. |


### 🎓 33th BCS (33rd BCS)
- **Slug:** `33rd_bcs` | **English Questions:** 20 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q28** | `Malformed Blank (Dash Glued to Words)` | "‘Subject-Verb Agreement’ refers to –"<br>*Options:* (A) person only (B) number, person and gender (C) number and person (D) number only | **C** | Blank gap dash is glued directly between words ("Subject-Verb") without spaces. Replace "Subject-Verb" with "Subject _____ Verb". |


### 🎓 34th BCS (34th BCS)
- **Slug:** `34th_bcs` | **English Questions:** 5 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q35** | `Non-standard Dash Used as Blank` | "Fill in the blank of the following sentence with the right form of verb. If I - a king!"<br>*Options:* (A) am (B) was (C) were (D) shall be | **C** | Question uses raw hyphen/en-dash as the blank indicator instead of clean underscore line "______". Standardize the gap into a clear "_____" placeholder. |


### 🎓 35th BCS (35th BCS)
- **Slug:** `35th_bcs` | **English Questions:** 35 | **Issues Found:** 10

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q45** | `Missing Underline / Target Highlighting` | "‘He was a rather disagreeable_ man.’ Here the underlined word is a/an-"<br>*Options:* (A) Noun (B) Adjective (C) Adverb (D) Preposition | **B** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"disagreeable"** (Part of speech: Adjective). Underline or highlight this in question text. |
| **Q46** | `Malformed Blank (Dash Glued to Words)` | "This could have worked if I ____ been more far-sighted."<br>*Options:* (A) had (B) have (C) might (D) would | **A** | Blank gap dash is glued directly between words ("far-sighted") without spaces. Replace "far-sighted" with "far _____ sighted". |
| **Q54** | `Missing Underline / Target Highlighting` | "“It is time to review the protocol_ on testing nuclear weapons”. Here the underlined word means-"<br>*Options:* (A) Record of rules (B) Summary of rules (C) Procedures (D) Problems | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"protocol"** (Meaning: Record of rules). Underline or highlight this in question text. |
| **Q56** | `Missing Underline / Target Highlighting` | "Let us beging by looking at the minutes_ of the meeting. Here the underlined word means−"<br>*Options:* (A) time record (B) time frame (C) written record (D) written analysis | **C** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"minutes"** (Meaning: written record of a meeting). Underline or highlight this in question text. |
| **Q57** | `Missing Underline / Target Highlighting` | "The noise level in Dhaka city has increased exponentially_. Here the underlined word means−"<br>*Options:* (A) amazingly (B) shockingly (C) steadily (D) rapidly | **D** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"exponentially"** (Meaning: rapidly). Underline or highlight this in question text. |
| **Q62** | `Missing Underline / Target Highlighting` | "Societies living in the periphery_ are always ignored. Here the underlined word means−"<br>*Options:* (A) offshore areas (B) marginal areas (C) remote places (D) backward regions | **B** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"periphery"** (Meaning: marginal areas). Underline or highlight this in question text. |
| **Q67** | `Missing Underline / Target Highlighting` | "I am in the process of collecting material_ for my story. The underlined word is a/an−"<br>*Options:* (A) Verb (B) Adjective (C) Adverb (D) Noun | **D** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"material"** (Part of speech: Noun). Underline or highlight this in question text. |
| **Q68** | `Missing Underline / Target Highlighting` | "Depression is often hereditary._ The underlined word is a/an−"<br>*Options:* (A) Adverb (B) Adjective (C) Noun (D) Verb | **B** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"hereditary"** (Part of speech: Adjective). Underline or highlight this in question text. |
| **Q69** | `Malformed Blank (Dash Glued to Words)` | "Find the odd-man-out –"<br>*Options:* (A) George Eliot (B) Thomas Hardy (C) Joseph Conrad (D) James Joyce | **A** | Blank gap dash is glued directly between words ("odd-man") without spaces. Replace "odd-man" with "odd _____ man". |
| **Q70** | `Malformed Blank (Dash Glued to Words)` | "Find the odd-man-out-"<br>*Options:* (A) The Bluest Eye (B) Sula (C) As I Lay Dying (D) A Mercy | **C** | Blank gap dash is glued directly between words ("odd-man") without spaces. Replace "odd-man" with "odd _____ man". |


### 🎓 36th BCS (36th BCS)
- **Slug:** `36th_bcs` | **English Questions:** 35 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 37th BCS (37th BCS)
- **Slug:** `37th_bcs` | **English Questions:** 35 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q51** | `Missing Underline / Target Highlighting` | "He worked with all sincerity. The underlined phrase is–"<br>*Options:* (A) A noun phrase (B) An adjective phrase (C) An infinitive phrase (D) An adverbial phrase | **D** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target phrase: **"with all sincerity"** (Type: Adverbial phrase). Underline or highlight this in question text. |


### 🎓 38th BCS (38th BCS)
- **Slug:** `38th_bcs` | **English Questions:** 34 | **Issues Found:** 2

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q43** | `Missing Underline / Target Highlighting` | "A retired_ officer lives nest door.Here,The underlined word is used as a/an:"<br>*Options:* (A) Gerund (B) adverb (C) Preposition (D) participle | **D** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"retired"** (Part of speech/form: Participle). Underline or highlight this in question text. |
| **Q59** | `Missing Underline / Target Highlighting` | "Reading_ is an excellent habit.Here,The underlined word is a−"<br>*Options:* (A) Verbal noun (B) Participle (C) Verb (D) Gerund | **D** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"Reading"** (Part of speech/form: Gerund). Underline or highlight this in question text. |


### 🎓 39th BCS (39th BCS)
- **Slug:** `39th_bcs` | **English Questions:** 21 | **Issues Found:** 0

> ✅ **No formatting or structural errors detected in English section.**


### 🎓 40th BCS (40th BCS)
- **Slug:** `40th_bcs` | **English Questions:** 35 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q52** | `Missing Underline / Target Highlighting` | "‘He ran with great speed_.’ The underlined part of the sentence is a–"<br>*Options:* (A) noun phrase (B) adverb phrase (C) adjective phrase (D) participle phrase | **B** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target phrase: **"with great speed"** (Type: Adverb phrase). Underline or highlight this in question text. |


### 🎓 41th BCS (41st BCS)
- **Slug:** `41st_bcs` | **English Questions:** 35 | **Issues Found:** 2

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q153** | `Missing Underline / Target Highlighting` | "To win a prize is my ambition.’ The underlined part of the sentence is a/an-"<br>*Options:* (A) adjective phrase (B) noun phrase (C) adverb phrase (D) conjunctional phrase | **B** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target phrase: **"To win a prize"** (Type: Noun phrase acting as subject). Underline or highlight this in question text. |
| **Q160** | `Missing Underline / Target Highlighting` | "‘I shall help you provided you obey me.’ Here the underlined word is a/an-"<br>*Options:* (A) adverb (B) adjective (C) conjunction (D) verb | **C** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"provided"** (Part of speech: Conjunction). Underline or highlight this in question text. |


### 🎓 42th BCS (42nd BCS)
- **Slug:** `42nd_bcs` | **English Questions:** 20 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q63** | `Duplicate Options` | "Identify the correctly spelled one:"<br>*Options:* (A) Caesarean (B) caesarean (C) ciserian (D) scissorian | **A** | Two or more options have identical text: "caesarean". Replace duplicate option with authentic alternative from original question paper. |


### 🎓 43th BCS (43rd BCS)
- **Slug:** `43rd_bcs` | **English Questions:** 35 | **Issues Found:** 2

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q146** | `Missing Underline / Target Highlighting` | "‘A herd of cattle is passing’ The underlined word is a/an-"<br>*Options:* (A) adverb (B) adjective (C) collective noun (D) abstract noun | **C** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"herd"** (Part of speech: Collective noun). Underline or highlight this in question text. |
| **Q160** | `Non-standard Dash Used as Blank` | "Fill in the blank : ‘She went to New Market ––’"<br>*Options:* (A) on foot (B) on feet (C) by foot (D) by walking | **A** | Question uses raw hyphen/en-dash as the blank indicator instead of clean underscore line "______". Standardize the gap into a clear "_____" placeholder. |


### 🎓 44th BCS (44th BCS)
- **Slug:** `44th_bcs` | **English Questions:** 35 | **Issues Found:** 3

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q69** | `Duplicate Options` | "Which of the following words is spelt correctly?"<br>*Options:* (A) authoratative (B) autheritative (C) authoritative (D) authoratative | **C** | Two or more options have identical text: "authoratative". Replace duplicate option with authentic alternative from original question paper. |
| **Q72** | `Duplicate Options` | "Identify the correct passive form: ‘Do not close the door.’"<br>*Options:* (A) Let not the door close. (B) Let not the door be closed. (C) Let not the door close. (D) Let not door closed. | **B** | Two or more options have identical text: "let not the door close.". Replace duplicate option with authentic alternative from original question paper. |
| **Q75** | `Missing Underline / Target Highlighting` | "Sitting happily, the chicken laid eggs. The underlined part is a/an-"<br>*Options:* (A) noun clause (B) subordinate clause (C) independent clause (D) coordinate clause | **B** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target phrase: **"Sitting happily"** (Type: Subordinate clause / Participial clause). Underline or highlight this in question text. |


### 🎓 45th BCS (45th BCS)
- **Slug:** `45th_bcs` | **English Questions:** 35 | **Issues Found:** 2

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q4** | `Duplicate Options` | "Millennium is a period of–––"<br>*Options:* (A) 100 year (B) 1000 year (C) 1 million year (D) 1 million year | **B** | Two or more options have identical text: "1 million year". Replace duplicate option with authentic alternative from original question paper. |
| **Q15** | `Missing Underline / Target Highlighting` | "What may be considered courteous in one culture may be -arrogant in another. Here the underlined word “arrogant” means–––"<br>*Options:* (A) rude (B) gracious (C) coarse (D) pretentious | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"arrogant"** (Meaning: rude). Underline or highlight this in question text. |


### 🎓 46th BCS (46th BCS)
- **Slug:** `46th_bcs` | **English Questions:** 35 | **Issues Found:** 4

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q43** | `Missing Underline / Target Highlighting` | "He died following_ the incident The underlined word is a/an–"<br>*Options:* (A) adjective (B) adverb (C) noun (D) preposition | **D** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"following"** (Part of speech: Preposition). Underline or highlight this in question text. |
| **Q44** | `Missing Underline / Target Highlighting` | "Writing a diary_ is a very good practice to develop the writing skill. The underlined word is a/an--"<br>*Options:* (A) noun phrase (B) verbal phrase (C) adjective phrase (D) adverbial phrase | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target phrase: **"Writing a diary"** (Type: Noun phrase). Underline or highlight this in question text. |
| **Q47** | `Missing Underline / Target Highlighting` | "Choose the best alternative for the underlined. He went back_ on his promise of voting for me"<br>*Options:* (A) withdrew (B) forgot (C) reinforced (D) support | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target phrase: **"went back"** (Meaning: withdrew from promise). Underline or highlight this in question text. |
| **Q50** | `Missing Underline / Target Highlighting` | "His dream that he will be a B.C.S cadre_ finally came true. The underlined part is ---"<br>*Options:* (A) a noun clause (B) an adjective clause (C) an independent clause (D) a co-ordinate clause | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target clause: **"that he will be a B.C.S cadre"** (Type: Noun clause). Underline or highlight this in question text. |


### 🎓 47th BCS (47th BCS)
- **Slug:** `47th_bcs` | **English Questions:** 35 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q48** | `Missing Underline / Target Highlighting` | "Tell me frankly why you did this. The underlined part is a/an-"<br>*Options:* (A) adjective clause (B) noun clause (C) adverbial clause (D) adverbial phrase | **B** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target clause: **"why you did this"** (Type: Noun clause acting as object of Tell). Underline or highlight this in question text. |


### 🎓 48th BCS (48th BCS)
- **Slug:** `48th_bcs` | **English Questions:** 20 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q34** | `Missing Underline / Target Highlighting` | "She works hard. What part of speech is the underlined word?"<br>*Options:* (A) Adjective (B) Adverb (C) Verb (D) Noun | **B** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target word: **"hard"** (Part of speech: Adverb modifying works). Underline or highlight this in question text. |


### 🎓 49th BCS (49th BCS)
- **Slug:** `49th_bcs` | **English Questions:** 20 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q60** | `Missing Underline / Target Highlighting` | "‘We know that the earth is a planet’ The underlined part is a/an-"<br>*Options:* (A) noun clause (B) adverbial clause (C) adjective clause (D) principal clause | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target clause: **"that the earth is a planet"** (Type: Noun clause acting as object of know). Underline or highlight this in question text. |


### 🎓 50th BCS (50th BCS)
- **Slug:** `50th_bcs` | **English Questions:** 31 | **Issues Found:** 1

| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |
|:--:|:---|:---|:--:|:---|
| **Q132** | `Missing Underline / Target Highlighting` | "The book that she recommended turned out to be very helpful. Here the underlined clause is a -"<br>*Options:* (A) relative clause (B) noun clause (C) adverbial clause (D) independent clause | **A** | Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup. Target clause: **"that she recommended"** (Type: Relative / Adjective clause modifying book). Underline or highlight this in question text. |


---

## 🛠️ Recommended Action Plan for App & UI Layer

1. **Standardize Fill-in-the-Blank Placeholders:**
   - Automatically replace glued dashes like `He–to`, `not- to`, `blown-by` with `$1 _____ $2` in question text parser.
   - Transform raw dashes (`––––`, `–––`, `---`) used as blanks into standard `_____` lines.
2. **Underline / Target Word Highlighting:**
   - Map and format target words using `<u>word</u>` or `**word**` for all 31 underlined questions.
3. **Trailing Underscore Cleaner (46th BCS):**
   - Auto-clean words ending with trailing underscore (`following_` → `<u>following</u>`).
4. **Option Deduplication:**
   - Verify and patch duplicate options against PSC authentic past papers.
