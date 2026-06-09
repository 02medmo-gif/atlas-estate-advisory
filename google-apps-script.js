const SHEET_ID = "1DoQMINip1IKCb09yNZUNcJd3i6bPJHWnxOlyf4JWgi4";
const SHEET_NAME = "Leads";

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

  sheet.appendRow([
    payload.createdAt ? new Date(payload.createdAt) : new Date(),
    payload.name || "",
    payload.email || "",
    payload.phone || "",
    payload.residence || "",
    payload.target || "",
    payload.budget || "",
    payload.goal || "",
    payload.message || "",
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
