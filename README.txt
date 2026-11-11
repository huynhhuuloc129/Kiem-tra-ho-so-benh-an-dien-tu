SCAN - Chrome extension for VNPT-HIS (patient record scanner)
=============================================================

Scan adds a "QUÉT" (Scan) button to the VNPT-HIS patient list page
(https://bvdksoctrang.vncare.vn/vnpthis/main/manager.jsp). It walks through
the patients in the list, opens each visit's tabs automatically, and shows
every error it finds in one results panel.

The extension lives in the Scan/ folder:
  manifest.json   - Manifest V3, extension "Scan"
  main.js         - runs in the page (MAIN world) at document_start; captures
                    the HIS responses for services, lab tests, drugs and times
  icd_capture.js  - runs in the page; captures the diagnosis payload
                    (NT.005.HSBA) without sending extra requests
  content.js      - the rules, the QUÉT button and the results panel


INSTALL
-------
1. Open chrome://extensions and turn on "Developer mode".
2. Click "Load unpacked" and select the Scan/ folder.
3. Open (or refresh) the HIS manager.jsp page.
After changing any file, click the reload icon on the extension card and
refresh the HIS page.


USING THE SCAN PANEL
--------------------
Click "QUÉT" in the right-hand button column to open the "QUÉT BỆNH NHÂN"
panel. Keep the HIS tab open while a scan runs.

  Quét bệnh nhân (scope)
    Tất cả    - scan every patient currently shown in the HIS list (#grdLS).
    1 người   - scan only the selected (or ticked) patient(s).

  Theo BHYT (search by insurance card)
    Enter a BHYT card number (or its last 10 characters) and click
    "Tìm & quét". The scanner:
      1. searches by BHYT code to get name, birth year and address,
      2. searches again by name + birth year,
      3. keeps only visits with the same address, then scans them.

  Kiểm tra (what to check) - each tab is opened automatically per patient
    Xét nghiệm - lab tests / DVKT tab, all lab orders
    Thuốc      - drug tab, all prescriptions
    PTTT       - procedures tab

  Hiện (display)
    Chỉ hiện lỗi - on: show only cases/rows with errors;
                   off: show every lab and PTTT row, with or without errors.

Buttons: "Bắt đầu quét" (start), "Dừng" (stop), "Đóng" (close).
Options are remembered in localStorage. After a scan the button shows the
number of cases with errors (e.g. "QUÉT 3"); the status line shows the number
of cases with errors and the total number of errors.

Only the cases on the current page of the HIS list are compared. To check a
patient's history, search by BHYT/patient code so the list shows all their
visits, then scan with "Tất cả" (or use "Theo BHYT").


WHAT IS CHECKED
---------------
Only the rules of the enabled "Kiểm tra" options are reported. Each error is
shown as "date time [Module]: message"; hover over it for details.

With "Xét nghiệm":
  [Bộ mỡ]    Repeated lipid test. Any of: Mỡ máu (panel), Cholesterol toàn
             phần, HDL-C, Triglycerid (LDL-C is not counted). Error when the
             same test was already done within the last 87 days (about
             3 months), either in another visit of the same patient in the
             list or on another day of the same visit. The message names the
             earlier visit and date.
  [HbA1C]    Repeated HbA1c test, same window and logic as Bộ mỡ.
  [Albumin]  Blood albumin (XN045 / "Albumin [Máu]", not microalbumin)
             result above 25 g/L.
  [CT]       Contrast check: per day, the quantity of contrast imaging
             services must match the quantity of contrast medicine.
             Compared only when both sides and all order dates are known.

  The same patient is matched across visits by patient code, else BHYT code,
  else name + date of birth. The test date is the order date; when HIS gives
  none, the admission date is used and the error says so.

With "Thuốc":
  [Thuốc]    Drug-row violations: dose-frequency rules, under-18
             restrictions, order time outside the admission-discharge
             period, oxygen after discharge or overlapping the ventilator,
             and "Chụp X-quang" without Xenetix 300 ordered the same day
             (whole visit if dates are missing).
  [Thiếu chẩn đoán]  Missing diagnosis for a drug:
             - 40.666, 40.677, 40.678, 40.679, 40.68 need a gastric
               diagnosis (reflux, gastric/duodenal/oesophageal ulcer,
               perforation, GI bleeding...).
             - Cinnarizin (40.80) and Betahistin (40.899) need "Rối loạn
               tiền đình" or "Chóng mặt".
             One error per drug name and order day.

With "PTTT":
  [PTTT]     Service time rules:
             - Electromyography (ghi điện cơ) shorter than 30 minutes.
             - Hemodialysis (PT0043, thận nhân tạo thường quy) shorter than
               4 hours or without start/end time.
             - Suction (hút đờm) outside the ventilation time.
             - Ventilation quantity different from the duration converted
               to days/hours.

Other:
  [Hệ thống] A case could not be opened or checked, or lab results could
             not be loaded (the albumin check did not run for them).

DVKT rules (outside the treatment period, contraindicated ICD, ...) are not
reported by Scan.


RESULTS PANEL
-------------
Each scanned case shows its number, case code and patient name, the tabs
that were read (or skipped / not returned by HIS), and its error list.
Collapsible tables list every "Xét nghiệm / DVKT" row and every "PTTT" row
(start, end, code, name, quantity) with bad rows highlighted.
