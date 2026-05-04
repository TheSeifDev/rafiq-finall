/**
 * Rafiq Health Data Export Service
 * ─────────────────────────────────
 * Generates a multi-sheet, professionally formatted XLSX workbook
 * from real Supabase data, then shares via the native share sheet.
 *
 * Uses the modern expo-file-system API (File + Paths) — NOT legacy.
 *
 * Sheets:
 *   1. Summary       – patient info, stats, export metadata
 *   2. Vitals        – full vitals history
 *   3. Charts Data   – chart-ready pivot (if vitals exist)
 *   4. Medications   – active/inactive med list
 *   5. Notifications – app notification log
 */

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { Buffer } from "buffer";
import { format } from "date-fns";

import { patientService } from "./patient.service";
import { vitalsService, type VitalsRecord } from "./vitals.service";
import { medicationService, type Medication } from "./medication.service";
import {
  notificationService,
  type AppNotification,
} from "./notification.service";

// ── Helpers ──────────────────────────────────────────────────

const TAG = "[ExportService]";

/** Format an ISO timestamp into a readable date/time */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return format(new Date(iso), "yyyy-MM-dd HH:mm");
  } catch {
    return iso;
  }
}

/** Set column widths (wch = width in characters) */
function setColWidths(ws: XLSX.WorkSheet, widths: number[]): void {
  ws["!cols"] = widths.map((w) => ({ wch: w }));
}

// ── Export result type ──────────────────────────────────────

export type ExportResult =
  | { success: true; filePath: string }
  | { success: false; error: string };

// ── Main export function ────────────────────────────────────

export async function exportHealthData(
  userId: string,
  isAr: boolean,
): Promise<ExportResult> {
  try {
    console.log(TAG, "Starting export for user:", userId);

    // ── 1. Fetch all data in parallel ──
    const patientId = await patientService.getPatientId(userId);
    console.log(TAG, "Patient ID:", patientId ?? "none");

    const [profile, vitals, meds, notifs] = await Promise.all([
      patientService.getProfile(userId),
      patientId
        ? vitalsService.getVitalsHistory(patientId)
        : ([] as VitalsRecord[]),
      patientId
        ? medicationService.getMedications(patientId)
        : ([] as Medication[]),
      notificationService.getNotifications(userId),
    ]);

    console.log(
      TAG,
      `Fetched → profile: ${profile ? "yes" : "no"}, vitals: ${vitals.length}, meds: ${meds.length}, notifs: ${notifs.length}`,
    );

    const wb = XLSX.utils.book_new();
    const now = new Date();
    const exportDate = format(now, "yyyy-MM-dd");
    const exportTimestamp = format(now, "yyyy-MM-dd HH:mm:ss");

    // ── 2. SUMMARY sheet ──
    const activeMeds = meds.filter((m) => m.is_active);
    const summaryData: (string | number)[][] = [
      ["", ""],
      [isAr ? "📋 تقرير رفيق الصحي" : "📋 Rafiq Health Report", ""],
      ["", ""],
      [isAr ? "تاريخ التصدير" : "Export Date", exportTimestamp],
      ["", ""],
      [isAr ? "── معلومات المريض ──" : "── Patient Info ──", ""],
      [isAr ? "الاسم" : "Name", profile?.full_name ?? "—"],
      [isAr ? "الهاتف" : "Phone", profile?.phone ?? "—"],
      [isAr ? "العمر" : "Age", profile?.age ?? "—"],
      [isAr ? "الجنس" : "Gender", profile?.gender ?? "—"],
      [isAr ? "فصيلة الدم" : "Blood Type", profile?.blood_type ?? "—"],
      [isAr ? "تاريخ الميلاد" : "Birth Date", profile?.birth_date ?? "—"],
      ["", ""],
      [isAr ? "── إحصائيات ──" : "── Statistics ──", ""],
      [
        isAr ? "إجمالي قراءات العلامات الحيوية" : "Total Vitals Records",
        vitals.length,
      ],
      [isAr ? "الأدوية الفعّالة" : "Active Medications", activeMeds.length],
      [isAr ? "إجمالي الأدوية" : "Total Medications", meds.length],
      [isAr ? "الإشعارات" : "Notifications", notifs.length],
      [
        isAr ? "الإشعارات غير المقروءة" : "Unread Notifications",
        notifs.filter((n) => !n.is_read).length,
      ],
    ];

    // Add vitals stats if data exists
    if (vitals.length > 0) {
      const hrs = vitals
        .map((v) => v.heart_rate)
        .filter((v): v is number => v != null);
      const spo2s = vitals
        .map((v) => v.oxygen_saturation)
        .filter((v): v is number => v != null);
      const sysBPs = vitals
        .map((v) => v.blood_pressure_systolic)
        .filter((v): v is number => v != null);

      summaryData.push(
        ["", ""],
        [isAr ? "── ملخص العلامات الحيوية ──" : "── Vitals Summary ──", ""],
      );

      if (hrs.length > 0) {
        const avgHR = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
        summaryData.push(
          [isAr ? "متوسط معدل القلب" : "Avg Heart Rate", `${avgHR} bpm`],
          [
            isAr ? "أدنى معدل قلب" : "Min Heart Rate",
            `${Math.min(...hrs)} bpm`,
          ],
          [
            isAr ? "أعلى معدل قلب" : "Max Heart Rate",
            `${Math.max(...hrs)} bpm`,
          ],
        );
      }
      if (spo2s.length > 0) {
        const avgO2 = Math.round(
          spo2s.reduce((a, b) => a + b, 0) / spo2s.length,
        );
        summaryData.push(
          [isAr ? "متوسط الأكسجين" : "Avg SpO2", `${avgO2}%`],
          [isAr ? "أدنى أكسجين" : "Min SpO2", `${Math.min(...spo2s)}%`],
        );
      }
      if (sysBPs.length > 0) {
        const avgBP = Math.round(
          sysBPs.reduce((a, b) => a + b, 0) / sysBPs.length,
        );
        summaryData.push([
          isAr ? "متوسط ضغط الدم الانقباضي" : "Avg Systolic BP",
          `${avgBP} mmHg`,
        ]);
      }
    }

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    setColWidths(summaryWs, [35, 30]);
    summaryWs["!merges"] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, summaryWs, isAr ? "ملخص" : "Summary");

    // ── 3. VITALS sheet ──
    const vitalsHeaders = [
      isAr ? "التاريخ" : "Date",
      isAr ? "معدل القلب (bpm)" : "Heart Rate (bpm)",
      isAr ? "ضغط انقباضي (mmHg)" : "Systolic BP (mmHg)",
      isAr ? "ضغط انبساطي (mmHg)" : "Diastolic BP (mmHg)",
      isAr ? "الأكسجين (%)" : "SpO2 (%)",
      isAr ? "الحرارة (°C)" : "Temperature (°C)",
      isAr ? "المصدر" : "Source",
    ];

    const vitalsRows = vitals.map((v) => [
      fmtDate(v.recorded_at),
      v.heart_rate ?? "",
      v.blood_pressure_systolic ?? "",
      v.blood_pressure_diastolic ?? "",
      v.oxygen_saturation ?? "",
      v.temperature ?? "",
      v.source ?? "manual",
    ]);

    const vitalsWs = XLSX.utils.aoa_to_sheet([vitalsHeaders, ...vitalsRows]);
    setColWidths(vitalsWs, [20, 18, 22, 22, 14, 18, 14]);
    XLSX.utils.book_append_sheet(
      wb,
      vitalsWs,
      isAr ? "العلامات الحيوية" : "Vitals",
    );

    // ── 4. CHARTS DATA sheet (chart-ready pivot) ──
    if (vitals.length > 0) {
      const sorted = [...vitals].sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
      );

      const chartHeaders = [
        isAr ? "التاريخ" : "Date",
        isAr ? "معدل القلب" : "Heart Rate",
        isAr ? "الأكسجين" : "SpO2",
        isAr ? "ضغط انقباضي" : "Systolic",
        isAr ? "ضغط انبساطي" : "Diastolic",
      ];

      const chartRows = sorted.map((v) => [
        fmtDate(v.recorded_at),
        v.heart_rate ?? "",
        v.oxygen_saturation ?? "",
        v.blood_pressure_systolic ?? "",
        v.blood_pressure_diastolic ?? "",
      ]);

      const instructionRow = [
        isAr
          ? '💡 حدد هذا الجدول واختر "إدراج → مخطط" لإنشاء رسم بياني تلقائياً'
          : "💡 Select this table → Insert → Chart to auto-generate visualizations",
      ];

      const chartWs = XLSX.utils.aoa_to_sheet([
        instructionRow,
        [""],
        chartHeaders,
        ...chartRows,
      ]);
      setColWidths(chartWs, [20, 14, 10, 14, 14]);
      chartWs["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
      XLSX.utils.book_append_sheet(
        wb,
        chartWs,
        isAr ? "بيانات الرسوم" : "Charts Data",
      );
    }

    // ── 5. MEDICATIONS sheet ──
    const medHeaders = [
      isAr ? "الاسم" : "Name",
      isAr ? "الجرعة" : "Dosage",
      isAr ? "التكرار" : "Frequency",
      isAr ? "الحالة" : "Status",
      isAr ? "تاريخ البدء" : "Start Date",
      isAr ? "تاريخ الانتهاء" : "End Date",
      isAr ? "التعليمات" : "Instructions",
      isAr ? "الفئة" : "Category",
      isAr ? "الطبيب" : "Doctor",
    ];

    const medRows = meds.map((m) => [
      m.name,
      m.dosage,
      m.frequency,
      m.is_active ? (isAr ? "فعّال" : "Active") : isAr ? "متوقف" : "Inactive",
      m.start_date ?? "",
      m.end_date ?? "",
      m.instructions ?? "",
      m.category ?? "",
      m.doctor_name ?? "",
    ]);

    const medWs = XLSX.utils.aoa_to_sheet([medHeaders, ...medRows]);
    setColWidths(medWs, [20, 14, 14, 10, 14, 14, 24, 14, 16]);
    XLSX.utils.book_append_sheet(wb, medWs, isAr ? "الأدوية" : "Medications");

    // ── 6. NOTIFICATIONS sheet ──
    const notifHeaders = [
      isAr ? "العنوان" : "Title",
      isAr ? "المحتوى" : "Body",
      isAr ? "النوع" : "Type",
      isAr ? "الحالة" : "Status",
      isAr ? "التاريخ" : "Date",
    ];

    const notifRows = notifs.map((n) => [
      n.title,
      n.body,
      n.type ?? "",
      n.is_read ? (isAr ? "مقروء" : "Read") : isAr ? "غير مقروء" : "Unread",
      fmtDate(n.created_at),
    ]);

    const notifWs = XLSX.utils.aoa_to_sheet([notifHeaders, ...notifRows]);
    setColWidths(notifWs, [24, 36, 14, 12, 20]);
    XLSX.utils.book_append_sheet(
      wb,
      notifWs,
      isAr ? "الإشعارات" : "Notifications",
    );

    // ── 7. Write workbook → bytes → file → share ──
    console.log(TAG, "Building XLSX workbook...");

    // XLSX → base64 string → Buffer → Uint8Array
    const wbBase64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const bytes = new Uint8Array(Buffer.from(wbBase64, "base64"));
    console.log(TAG, `Workbook size: ${bytes.length} bytes`);

    // Write to cache using modern File API
    const fileName = `rafiq_health_export_${exportDate}.xlsx`;
    const file = new File(Paths.cache, fileName);
    file.write(bytes);
    console.log(TAG, "File written to:", file.uri);

    // Share
    const canShare = await Sharing.isAvailableAsync();
    console.log(TAG, "Sharing available:", canShare);

    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: isAr ? "مشاركة تقرير رفيق" : "Share Rafiq Report",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    }

    return { success: true, filePath: file.uri };
  } catch (err: any) {
    console.error(TAG, "Export FAILED:", err);
    return { success: false, error: err?.message ?? "Unknown export error" };
  }
}
