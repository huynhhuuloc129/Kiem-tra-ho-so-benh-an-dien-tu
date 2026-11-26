# Scan – VNPT-HIS patient record scanner

Scan is a Chrome extension (Manifest V3) for VNPT-HIS at
`https://bvdksoctrang.vncare.vn/vnpthis/main/manager.jsp`.

It adds a **QUÉT** button to the HIS patient list. When you start a scan, it:

1. goes through the patients in the list,
2. opens each visit's tabs (Xét nghiệm, Thuốc, PTTT),
3. can also check the patient's card on the BHYT portal,
4. shows every error, warning and collected row in one results panel.

## Files

| File | Runs in | What it does |
|---|---|---|
| `manifest.json` | – | Extension "Scan". Content scripts for HIS and the BHYT portal. |
| `main.js` | HIS page (MAIN world), `document_start` | Captures HIS responses: services/DVKT, lab tests and results, drugs (đơn thuốc), times, patient and card details. Maps local drug codes to BHYT codes. |
| `icd_capture.js` | HIS page (MAIN world), `document_start` | Captures the diagnosis payload (NT.005.HSBA) when HIS loads it. During QUÉT, when HIS did not send it for a case that has a drug needing a diagnosis, it sends NT.005.HSBA itself with HIS's latest token, and keeps the reply only if its case number matches. |
| `content.js` | HIS page, `document_idle` | The rules, the QUÉT button, the scan loop and the results panel. |
| `bhyt_portal.js` | BHYT portal page, `document_idle` | Runs card lookups on the portal ("Thông tuyến KCB") and sends back what the portal shows. |
| `portal_main.js` | BHYT portal page (MAIN world), `document_start` | Keeps the portal's timers running while its tab is in the background, so lookups do not stall. |
| `service_worker.js` | Background | Passes BHYT lookups between the HIS tab and the portal tab. Keeps both tabs from being discarded by Chrome while a scan runs. |

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose this `Scan` folder.
3. Open, or refresh, the HIS `manager.jsp` page.

After you change any file, click the reload icon on the Scan card in `chrome://extensions`. Then refresh the HIS page and the BHYT portal page.

> The older "Kiểm tra hồ sơ bệnh án điện tử" extension can be installed at the same time. Scan uses its own names and finds a free spot for its button in the right-hand column.

## Using the panel

Click **QUÉT** in the right-hand button column to open the **QUÉT BỆNH NHÂN** panel. Keep the HIS tab open while a scan runs.

| Option | Meaning |
|---|---|
| **Quét bệnh nhân → Tất cả** | Scan every patient shown in the HIS list. |
| **Quét bệnh nhân → 1 người** | Scan only the selected (or ticked) patients. |
| **Theo BHYT** + **Tìm & quét** | Enter a BHYT card number, or its last 10 characters. Scan searches by card to get the name, birth year and address, then searches again by name + birth year. It scans only the visits with the same address: house number, street, khóm/ấp/tổ and phường/xã must not disagree, but a part missing on one side (khóm left out, old names from before the 2025 merger, P./TP. abbreviations) does not count against a match. Visits it skipped because the address differs are listed in a collapsed block. Address test cases: `node Scan/tests/address.test.js`. |
| **Kiểm tra** | What to check: **Xét nghiệm**, **Thuốc**, **PTTT**, **BHYT**. Each one opens its tab, or the portal, for every patient. Only the rules of the ticked items are reported. |
| **Hiện → Chỉ hiện lỗi** | On: hide clean rows in the tables. Every scanned patient stays listed either way. |

**Buttons**

| Button | What it does |
|---|---|
| **Bắt đầu quét** | Start from the first patient. |
| **Tạm dừng** | Pause the scan. |
| **Tiếp tục** | Carry on from the paused case and keep the results so far. |
| **Đóng** | Close the panel. |

**Automatic pauses.** Scan pauses on its own, and says why, in two cases:

- the HIS list disappears, which usually happens because the HIS tab was slowed down in the background;
- HIS fails to open several cases in a row.

**Status and saved options.**

- When a scan finishes, the button shows how many cases have errors, for example `QUÉT 3`.
- The status line shows the number of cases with errors and the total number of errors.
- Options are saved in `localStorage`.

**BHYT check.** The **BHYT** option needs the portal page
`https://gdbhyt.baohiemxahoi.gov.vn/ThongTuyenLSKCB/Index` to be open and logged in, in another tab of the **same browser profile**.

**Two scans at once.** Don't run two scans in two HIS tabs of the same browser. They share one HIS session and open the wrong cases. Use separate Chrome profiles instead.

**Old rows are skipped.** Rows and errors dated more than **93 days** ago are not reported (`SCAN_SKIP_OLDER_DAYS`).

## Results

Each scanned case shows:

- its number and label,
- a badge: `n lỗi`, `Không lỗi` or `Không có dữ liệu`,
- a **Chọn ca** button that opens that case in HIS.

Messages look like `dd/mm/yyyy hh:mm:ss [Module]: message`. Errors are red and warnings are yellow. Hover a line to see the details.

Expandable tables (`<details>`) list everything that was collected. A table opens on its own when it has a bad row. Hover a red row to see why it is bad.

| Table | Columns |
|---|---|
| **Xét nghiệm / DVKT (n)** | Ngày giờ, Mã, Tên, SL |
| **Thuốc (n)** | Ngày giờ, Mã, Tên, SL, Đường dùng, Liều dùng. Bad drugs are red. |
| **PTTT (n)** | Bắt đầu, Kết thúc, Mã, Tên, SL |
| **BHYT – đối chiếu cổng** | Mục, HIS, Cổng BHYT, Đối chiếu |

## What is checked

Missing or unreadable data is never reported as a violation. Only confirmed problems are.

### Xét nghiệm

| Label | Type | Rule |
|---|---|---|
| `[Bộ mỡ]` | error | **Lipid test repeated too soon** (TT 39/2024/TT-BYT: 90 ± 3 days). Counts Mỡ máu (panel), Cholesterol toàn phần, HDL-C and Triglycerid. LDL-C is not counted. It is an error when the same group was already done less than **87 days** earlier, either in another visit of the same patient in the scanned list or on another day of the same visit. |
| `[HbA1C]` | error | HbA1c repeated too soon. Same window and logic as Bộ mỡ. The two groups are compared separately. |
| `[CT]` | error | Contrast check, per day: the quantity of contrast imaging services must match the quantity of contrast medicine. |
| `[Albumin]` | warning | Every blood albumin test (code 23.0007.1494 / XN045), one line per order day, with its result when it was loaded. |

### Thuốc

| Label | Type | Rule |
|---|---|---|
| `[Thuốc]` | error | **Dose / frequency**, read from the LIỀU DÙNG field, tablets only. BHYT 40.666, 40.677, 40.678, 40.679, 40.68, 40.671, 40.662 and 40.491 must be at most once a day. Vilanta is exempt. BHYT 40.87 (Fexofenadine) must be at most 180 mg a day: tablets per day × mg per tablet, with mg taken from hàm lượng or the drug name ("Fefasdin 180"). |
| `[Thuốc]` | error | **Age**: BHYT 40.231, 40.232, 40.228 and 40.229 for a patient under 18 on the order date. If HIS only has a birth year, Scan uses the current year minus the birth year. |
| `[Thuốc]` | error | **Order time** before admission or after discharge. |
| `[Thuốc]` | error | **OXY** ends after discharge, or overlaps a ventilator (thở máy) period. |
| `[Thuốc]` | error | **Chụp X-quang without Xenetix 300** ordered the same day. If any date is missing, Scan only checks that the visit has Xenetix 300. |
| `[Thiếu chẩn đoán]` | error | **A drug without a matching diagnosis** (main or secondary ICD from NT.005.HSBA). 40.666, 40.677, 40.678, 40.679 and 40.68 need a stomach diagnosis: reflux, gastric/duodenal/oesophageal ulcer, perforation, GI bleeding. Cinnarizin (40.80) and Betahistin (40.899) need "Rối loạn tiền đình" or "Chóng mặt". One error per drug per day. |
| `[Chẩn đoán]` | warning | The diagnosis could not be read, so the check above was not done for that drug. Hover for the reason. |

### ALBUNORM (needs both Xét nghiệm and Thuốc ticked)

| Label | Type | Rule |
|---|---|---|
| `[Albumin]` | error | ALBUNORM ordered on the **same day** as an Albumin [Máu] result **> 25 g/L**, with no sốc nhiễm trùng (R57.2) diagnosis. The ALBUNORM row is also red in the Thuốc table. If the diagnosis could not be read, this is an `[Albunorm]` warning instead. |
| `[Albunorm]` | warning | Any other ALBUNORM order. The line shows that day's albumin result (≤ 25 g/L), or says there was none. |

### PTTT

| Label | Type | Rule |
|---|---|---|
| `[PTTT]` | error | Ghi điện cơ (electromyography) shorter than 30 minutes. |
| `[PTTT]` | error | Thận nhân tạo thường quy (PT0043) shorter than 4 hours, or missing its start or end time. |
| `[PTTT]` | error | Hút đờm (suction) outside the thở máy (ventilation) time. |
| `[PTTT]` | error | Thở máy quantity different from its duration converted to days/hours. |

### BHYT (portal comparison)

The HIS card is compared field by field with the portal:

- mã thẻ (card number),
- họ tên (name),
- ngày sinh (date of birth),
- giới tính (gender),
- nơi ĐK KCB ban đầu (MA_KCBBD, registered facility),
- KV/K,
- thời hạn thẻ (card validity).

Mismatches are `[BHYT]` errors. It also reports:

- a visit date outside the card's validity on HIS;
- a stay that spans a card change, so HIS needs both card numbers;
- a possibly missing old card;
- a portal lookup that failed.

### Other

| Label | Meaning |
|---|---|
| `[Hệ thống]` | A case could not be opened or checked, or its data could not be loaded. |

The DVKT rule checks (outside the treatment period, contraindicated ICD, …) are not reported by QUÉT.

## Changing rules

All rules are in `content.js`:

| What | Where |
|---|---|
| Drug rules | `renderDrugPanel`, `auditDoseFrequency`, `auditAgeAtOrder`, `drugDiagnosisRules`, `auditXrayWithoutXenetix` |
| Albumin / ALBUNORM | `scanAlbuminFindings` |
| Repeated tests | `SCAN_REPEAT_TEST_RULES`, `SCAN_REPEAT_MIN_GAP_DAYS` |
| PTTT | `scanPtttFindings` |
| BHYT | `scanBhytCheck` |
| What a scan collects | `scanCollectFindings` |
| How results are drawn | `scanRenderResults` |

Drug codes from the hospital catalogue (DSTHUOCVT) are mapped in `main.js`.

To debug a scan, open DevTools on the HIS tab. The scanner logs lines prefixed with `[Scan]`.
