import api from "./api";

/**
 * Downloads the official Phase 9 Underwriting Assessment Report (PDF).
 * Streams PDF bytes from GET /applications/{applicationId}/underwriting-report,
 * creates a temporary browser blob link, triggers client-side download,
 * and safely revokes the object URL.
 *
 * Non-mutating: this operation never alters database state, application status, or predictions.
 */
export async function downloadUnderwritingReport(applicationId: number | string): Promise<void> {
  const response = await api.get(`/applications/${applicationId}/underwriting-report`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `underwriting_report_${applicationId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
}
