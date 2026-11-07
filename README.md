# EngCalc – Engineering Calculators (Android App)

**Design & Developed by Md. Ariful Islam**

৫১টি ইঞ্জিনিয়ারিং ক্যালকুলেটর আর একটি Unit Converter, সম্পূর্ণ অফলাইনে চলে। Pipe, Pump, Valve, Heat, Utility, Vessel, Process, Material, Machine, Maintenance, Energy, Steel, Lifting, Project। সব হিসাব `excel/EngCalc_Source.xlsx` ফাইলের ফর্মুলা থেকে তৈরি, তাই অ্যাপের রেজাল্ট Excel-এর সাথে হুবহু মেলে।

---

## ফোল্ডারে কী আছে

| ফোল্ডার / ফাইল | কাজ |
|---|---|
| `www/` | অ্যাপটা নিজেই (HTML, CSS, JavaScript) |
| `excel/EngCalc_Source.xlsx` | মূল Excel ফাইল। এটা বদলালে অ্যাপও বদলে যায় |
| `tools/` | Excel থেকে অ্যাপের ডেটা বানানোর স্ক্রিপ্ট (GitHub নিজেই চালায়) |
| `assets/` | অ্যাপের আইকন আর স্প্ল্যাশ স্ক্রিন |
| `.github/workflows/android.yml` | GitHub-এ APK বানানোর নির্দেশ |
| `.github/workflows/pages.yml` | অ্যাপের ওয়েব ভার্সন GitHub Pages-এ প্রকাশ |
| `package.json`, `capacitor.config.json` | Android অ্যাপের সেটিং (Capacitor 8) |

---

## ধাপ ১ – GitHub-এ রিপোজিটরি বানান

1. github.com-এ লগইন করে উপরে **+ → New repository** চাপুন।
2. নাম দিন, যেমন `engcalc`। **Public** রাখুন, তাহলে GitHub Actions ফ্রি চলবে।
3. **Create repository** চাপুন।

## ধাপ ২ – ফাইল আপলোড করুন

1. zip ফাইলটা কম্পিউটারে **extract (unzip)** করুন।
2. রিপোজিটরির পেজে **uploading an existing file** লিংকে (বা **Add file → Upload files**) চাপুন।
3. extract করা ফোল্ডারের **ভেতরের সবকিছু** (zip নিজে নয়) ব্রাউজারে টেনে ছাড়ুন। `.github` ফোল্ডারটাও যেন যায়।
   - Mac-এ `.github` ফোল্ডার লুকানো থাকে। Finder-এ **Cmd + Shift + .** চাপলে দেখা যাবে।
4. নিচে **Commit changes** চাপুন।

## ধাপ ৩ – APK ডাউনলোড করুন

1. রিপোজিটরির **Actions** ট্যাবে যান। "Build Android APK" নিজে থেকেই চালু হবে (৫–১০ মিনিট লাগে)।
2. সবুজ ✔ হলে রানটার উপর ক্লিক করুন। নিচে **Artifacts** থেকে **EngCalc-debug-apk** ডাউনলোড করুন। এটা একটা zip।
3. zip খুললে `EngCalc-debug.apk` পাবেন। ফোনে কপি করে খুলুন। প্রথমবার ফোন "Install unknown apps" অনুমতি চাইবে, দিন।

> লাল ✖ হলে রানটার ভেতরে ঢুকে কোন ধাপে আটকেছে দেখুন। সাধারণত `.github` ফোল্ডার আপলোড না হলে বা ফাইল কম গেলে এমন হয়।

## ধাপ ৪ – (ঐচ্ছিক) ফোনের ব্রাউজারে ওয়েব ভার্সন

1. **Settings → Pages** খুলে **Source**-এ **GitHub Actions** বেছে নিন।
2. **Actions** ট্যাবে "Deploy web version to GitHub Pages" রান শেষ হলে একটা লিংক পাবেন: `https://<আপনার-ইউজারনেম>.github.io/engcalc/`
3. ফোনে লিংকটা খুলে ব্রাউজার মেনু থেকে **Add to Home screen** দিলে অ্যাপের মতোই অফলাইনে চলবে।

## ধাপ ৫ – (ঐচ্ছিক) সরাসরি ডাউনলোড লিংক (Releases)

Artifacts ডাউনলোড করতে GitHub-এ লগইন লাগে। সবাইকে সরাসরি APK দিতে চাইলে:

1. **Releases → Create a new release** চাপুন।
2. **Choose a tag**-এ `v1.0.0` লিখে **Create new tag** চাপুন, তারপর **Publish release**।
3. কয়েক মিনিট পর ওই Release পেজে `EngCalc-debug.apk` যোগ হবে। এই লিংক যে কাউকে দেওয়া যায়।

---

## Excel বদলে অ্যাপ আপডেট করা

1. `excel/EngCalc_Source.xlsx` ডাউনলোড করে Excel-এ মান বা ফর্মুলা বদলান। **ফাইলের নাম একই রাখুন।**
2. GitHub-এ `excel` ফোল্ডারে গিয়ে **Add file → Upload files** দিয়ে নতুন ফাইলটা আপলোড করুন। একই নামের হওয়ায় পুরোনোটা বদলে যাবে।
3. GitHub নিজেই নতুন ফর্মুলা দিয়ে APK আর ওয়েব ভার্সন আবার বানাবে।

নিয়ম:
- হলুদ (unlocked) ঘরগুলো অ্যাপে ইনপুট হিসেবে আসে, বাকিগুলো রেজাল্ট।
- শিট আগের মতো protected রাখুন। আনলক করা ঘর চেনার উপায় এটাই।
- নতুন শিট যোগ করলে সেটা অ্যাপে **Other** ক্যাটাগরিতে আসবে। ক্যাটাগরি, নাম বা আইকন বদলাতে `tools/build_ui.py`-এর শুরুর `CATS` তালিকা এডিট করুন।
- অ্যাপ যেসব Excel ফাংশন বোঝে: IF, IFERROR, INDEX, MATCH, VLOOKUP, MIN, MAX, SUM, COUNT, COUNTIF, SUMIF, ROUND, ROUNDUP, CEILING, TEXT, LEFT, MID, LEN, SEARCH, AND, OR, NOT, ISNUMBER, ISERROR, SQRT, EXP, LN, LOG10, SIN/COS/TAN (ও উল্টো), PI, RADIANS, DEGREES, N, VALUE, TODAY, RATE, NORMSINV, GAMMALN, TEXTJOIN, INDIRECT (শুধু named range)। নতুন কোনো ফাংশন ব্যবহার করলে Actions-এর লগে error দেখাবে।

---

## Google Play Store-এ দেওয়ার জন্য (signed release)

Debug APK নিজে বা সহকর্মীদের ব্যবহারের জন্য যথেষ্ট। Play Store-এ দিতে **signed .aab** ফাইল লাগে।

**১. একবার একটা keystore বানান।** কম্পিউটারে Java থাকতে হবে। এই কমান্ড চালান:

```
keytool -genkey -v -keystore engcalc-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias engcalc
```

পাসওয়ার্ড দুটো লিখে রাখুন। **এই ফাইল আর পাসওয়ার্ড হারালে অ্যাপ আর কখনো আপডেট করা যাবে না।** নিরাপদ জায়গায় ব্যাকআপ রাখুন। কখনো GitHub-এ আপলোড করবেন না।

**২. keystore-কে text (base64)-এ রূপান্তর করুন।**
- Windows PowerShell:
  ```
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("engcalc-release.jks")) | Out-File keystore.txt
  ```
- Mac/Linux:
  ```
  base64 -i engcalc-release.jks > keystore.txt
  ```

**৩. GitHub-এ ৪টা secret যোগ করুন।** রিপোজিটরির **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `KEYSTORE_BASE64` | keystore.txt-এর পুরো লেখা |
| `KEYSTORE_PASSWORD` | keystore পাসওয়ার্ড |
| `KEY_ALIAS` | `engcalc` |
| `KEY_PASSWORD` | key পাসওয়ার্ড |

**৪. ফলাফল।** এরপর প্রতিটা বিল্ডে **EngCalc-release** artifact-এ `EngCalc-release.aab` (Play Store-এর জন্য) আর `EngCalc-release.apk` আসবে।

**৫. Play Console-এ প্রকাশ।** Google Play Console অ্যাকাউন্ট খুলতে এককালীন $25 লাগে। নতুন ব্যক্তিগত অ্যাকাউন্টে প্রথমে অন্তত ১২ জন টেস্টার নিয়ে টানা ১৪ দিন closed test চালাতে হয়। তারপর production-এ প্রকাশ করা যায়।

**অ্যাপের আইডি:** `capacitor.config.json`-এ আছে `com.mdarifulislam.engcalc`। Play Store-এ প্রথমবার আপলোডের আগে চাইলে বদলাতে পারেন। পরে আর বদলানো যায় না।

**ভার্সন:** `package.json`-এর `"version"` হলো অ্যাপের ভার্সনের নাম। versionCode প্রতিটা বিল্ডে নিজে থেকেই বাড়ে।

---

## দায়মুক্তি

এই ক্যালকুলেটরগুলো প্রাথমিক ডিজাইন, স্ক্রিনিং আর মেইনটেন্যান্স সিদ্ধান্তের জন্য। Pressure equipment, lifting gear আর relief system চূড়ান্ত করার আগে প্রযোজ্য কোডের (ASME, API, ISO) বর্তমান সংস্করণ আর একজন যোগ্য ইঞ্জিনিয়ারের সাথে মিলিয়ে নিন।
