# BCS Question Bank - Topics Taxonomy (Ground Truth)

This document defines the fixed 10-subject taxonomy used across all BCS Question Bank datasets.

| Subject ID (`subject_id`) | English Name (`subject_en`) | Bangla Name (`subject_bn`) |
|---|---|---|
| `1` | Bangla Language & Literature | বাংলা ভাষা ও সাহিত্য |
| `2` | English Language & Literature | English Language & Literature |
| `3` | Bangladesh Affairs | বাংলাদেশ বিষয়াবলি |
| `4` | International Affairs | আন্তর্জাতিক বিষয়াবলি |
| `5` | Geography, Environment & Disaster Management | ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা |
| `6` | General Science | সাধারণ বিজ্ঞান |
| `7` | Computer & Information Technology | কম্পিউটার ও তথ্যপ্রযুক্তি |
| `8` | Mathematical Reasoning | গাণিতিক যুক্তি |
| `9` | Mental Ability | মানসিক দক্ষতা |
| `10` | Ethics, Values & Good Governance | নৈতিকতা, মূল্যবোধ ও সুশাসন |

---

## Usage Guidelines

- Every question in the JSON database must specify integer `subject_id`, `subject_en`, and `subject_bn`.
- The top-level `questions` array contains the actual question records for the exam.
- Uncategorized questions from scraped sources must be categorized into one of these 10 ground truth subjects.
