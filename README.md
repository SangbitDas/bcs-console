# BCS Console (বিসিএস কনসোল)

<p align="center">
  <img src="apps/web/assets/images/logo-glow.png" alt="BCS Console Logo" width="96" height="96" />
</p>

<p align="center">
  <strong>The modern, syllabus-aware preparation platform for Bangladesh Civil Service (BCS) Preliminary candidates.</strong>
</p>

<p align="center">
  <a href="https://bcs-console.vercel.app"><img src="https://img.shields.io/badge/Web_App-Live_on_Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Web App" /></a>
  <a href="https://github.com/SangbitDas/bcs-console/releases/download/v1.1.0/bcs-console-v1.1.0.apk"><img src="https://img.shields.io/badge/Android_APK-v1.1.0_Release-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Download Android APK" /></a>
  <img src="https://img.shields.io/badge/Question_Bank-5%2C350_Questions-EA0000?style=for-the-badge" alt="5,350 Questions" />
  <img src="https://img.shields.io/badge/Coverage-10th--50th_BCS-0A0A0A?style=for-the-badge" alt="10th to 50th BCS" />
</p>

<p align="center">
  <a href="https://bcs-console.vercel.app"><strong>🌐 Launch Web Platform</strong></a> • 
  <a href="https://github.com/SangbitDas/bcs-console/releases/download/v1.1.0/bcs-console-v1.1.0.apk"><strong>📱 Download Android App (APK)</strong></a> • 
  <a href="#-product-features"><strong>✨ Features</strong></a> • 
  <a href="#-data-security--privacy"><strong>🔒 Security & Privacy</strong></a> • 
  <a href="#-legal--fair-use"><strong>⚖️ Legal Terms</strong></a>
</p>

---

## 🎯 What is BCS Console?

**BCS Console** turns 41 years of past Bangladesh Civil Service preliminary question papers (**10th to 50th BCS**) into an active, customizable examination engine. 

Instead of flipping through static PDFs or memorizing uncurated answer keys, candidates can configure personalized practice sessions, take timed mock tests under authentic BPSC conditions, track lifetime mistake counts, and visualize subject-by-subject strengths and weaknesses.

---

## ✨ Product Features

### 1. Flexible Practice Hub
Practice on your own terms. Select individual exams (from 10th to 50th BCS), isolate any of the 10 fixed syllabus subjects, or build custom question sets with custom BCS ranges.

- **Instant Answer Feedback & Reveal**: View correct answers and comprehensive explanations on demand.
- **Diagram & Image Support**: 766 visual questions accompanied by clear diagrammatic explanations.
- **Session Resumption**: Continue unfinished practice sessions right where you left off.

<p align="center">
  <img src="docs/assets/practice.png" alt="BCS Console Practice Hub" width="90%" />
</p>

### 2. Timed Mock Examination Simulator
Replicate authentic exam day pressure with standardized BCS Preliminary model tests.

- **Official BPSC Scoring**: Real examination simulation with **+1.00** for correct answers and **−0.25** negative marking for incorrect answers.
- **Exam Formats**: Choose from 200-question Full Syllabus Tests (120 min), Standard 120-question tests, or 60-question Speed Sprints.
- **Interactive Question Palette**: Live countdown timer, answered/unanswered state tracker, and mark-for-review flags.
- **Accidental Navigation Guard**: Multi-layered quit modal and browser back-button interception protect active test sessions from unintended submission.

<p align="center">
  <img src="docs/assets/exam.png" alt="BCS Console Mock Exam Launcher" width="90%" />
</p>

### 3. Interactive Solver with KaTeX Math Rendering
Experience clean typography paired with scientific formula rendering.

- **Formula Precision**: Mathematical fractions, exponents, square roots, and chemical equations render crisply via KaTeX.
- **Prose Protection**: Mathematical expressions are strictly isolated from normal English and Bengali sentences so technical terms and word slashes (e.g., `a/an`, `TCP/IP`, `and/or`) never break layout.

<p align="center">
  <img src="docs/assets/question_runner.png" alt="Interactive Question Runner" width="90%" />
</p>

### 4. Mistake Bank (`ভুলসমূহ`)
Target your weaknesses directly. Every wrong answer submitted during practice or mock exams is cataloged in the Mistake Bank with an incremental lifetime mistake counter. Review answers, filter by subject, and drill your most frequently missed questions until mastered.

### 5. Cloud-Synced Performance Analytics
Access your preparation metrics anytime:
- **10-Subject Performance Dashboard**: Real-time accuracy metrics and question totals across the entire BPSC syllabus.
- **Exam Attempt History**: In-depth review of every submitted mock or custom exam, including duration, subject breakdown, and per-question scorecards.
- **Automated Retention**: Cloud database retains the 50 most recent attempts per exam category.

---

## 📊 Dataset & Syllabus Coverage

Every question in BCS Console is classified under the official 10-subject preliminary syllabus without arbitrary categorization:

| # | Subject (বিষয়) | Syllabus Scope | Verified Questions |
|:---:|:---|:---|:---:|
| 1 | বাংলা ভাষা ও সাহিত্য | Bangla Language & Literature | 1,008 |
| 2 | English Language & Literature | English Grammar, Vocabulary & Literature | 977 |
| 3 | বাংলাদেশ বিষয়াবলি | Bangladesh History, Constitution & Affairs | 831 |
| 4 | আন্তর্জাতিক বিষয়াবলি | Global Affairs, Treaties & Organizations | 747 |
| 5 | গাণিতিক যুক্তি | Mathematical Reasoning & Calculations | 564 |
| 6 | সাধারণ বিজ্ঞান | General Science & Daily Phenomena | 517 |
| 7 | মানসিক দক্ষতা | Mental Ability & Logical Reasoning | 214 |
| 8 | ভূগোল, পরিবেশ ও দুর্যোগ | Geography, Environment & Disaster Management | 201 |
| 9 | কম্পিউটার ও তথ্যপ্রযুক্তি | Computer & Information Technology | 165 |
| 10 | নৈতিকতা, মূল্যবোধ ও সুশাসন | Ethics, Values & Good Governance | 126 |
| **Total** | **41 BCS Papers (10th–50th)** | **Full Preliminary Curriculum** | **5,350** |

> **Dataset Integrity Guarantee:** Exactly 8 defective questions in historical papers with missing or unresolvable answer options are maintained blank as documented facts rather than fabricated guesses. 48 typographical and formatting errors in English literature and language have been rigorously repaired and verified.

---

## 📱 Cross-Platform Availability

BCS Console provides a unified, responsive experience across all screen sizes:

- **Web Application**: Accessible on any browser with instant loading, responsive mobile/desktop layouts, and zero installation needed:  
  👉 **[https://bcs-console.vercel.app](https://bcs-console.vercel.app)**
- **Android App**: Dedicated native APK built with edge-to-edge system styling, gesture pill support, and deep linking:  
  👉 **[Download Android APK (v1.1.0)](https://github.com/SangbitDas/bcs-console/releases/download/v1.1.0/bcs-console-v1.1.0.apk)**

---

## 🔒 Data Security & Privacy Practices

BCS Console adheres to modern industry data security standards:

- **Zero Password Storage**: Authentication is powered exclusively by Google OAuth with PKCE (Proof Key for Code Exchange). We never collect, process, or store passwords.
- **Row-Level Security (RLS)**: The question bank is public read-only. All personal user records (bookmarks, mistake tracking, exam attempts, and session progress) are isolated at the database level by PostgreSQL Row Level Security policies (`auth.uid()`).
- **Privacy-Preserving Guest Mode**: Practice sessions and bookmarks work completely offline and locally without an account. When a candidate signs in, their local progress is securely and non-destructively merged into their cloud account.
- **Strict Network Communication**: All API communication with backend services is encrypted end-to-end via TLS 1.3.

---

## ⚖️ Legal Disclaimer & Fair Use Notice

- **Independent Platform**: BCS Console is an independent, candidate-focused open-source project. It is **not affiliated with, associated with, authorized by, endorsed by, or in any way officially connected** with the Bangladesh Public Service Commission (BPSC) or any government agency.
- **Educational Fair Use**: All question texts, options, diagrams, and historical solutions are compiled and archived strictly for non-commercial educational, analytical, and research purposes under the principles of fair dealing.
- **Software License**: The application source code is licensed under the [MIT License](LICENSE).
- **Takedown & Inquiries**: If you are a copyright holder and believe any reference or content should be revised or removed, please open an issue in this repository.

---

<p align="center">
  <sub>Crafted for BCS candidates with focus, precision, and respect for authentic examination standards.</sub>
</p>
