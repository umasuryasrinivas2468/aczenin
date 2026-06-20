/**
 * Aczen blog automation — Google Apps Script side.
 *
 * Setup (one-time):
 *   1. Create a Google Sheet with a tab called "Schedule". Add header row:
 *        A: title  B: brief  C: publishDate (YYYY-MM-DD)  D: imageUrl
 *        E: status  F: sanityId  G: publishedAt  H: error
 *      Fill columns A–D for each post. Leave E–H blank (script writes them).
 *   2. Extensions -> Apps Script. Paste this file. Save.
 *   3. Project Settings -> Script properties. Add property:
 *        SHARED_SECRET = (a long random string)
 *      This must match BLOG_SHEET_SECRET in your Vercel env.
 *   4. Deploy -> New deployment -> Web app.
 *        Execute as: Me
 *        Who has access: Anyone
 *      Copy the /exec URL — that goes in Vercel as BLOG_SHEET_WEBHOOK_URL.
 *   5. Re-deploy as a new version after every edit; the /exec URL stays the same
 *      only if you "Manage deployments" -> edit existing.
 *
 * Endpoints:
 *   GET  ?action=due&secret=...           -> { rows: [{row, title, brief, publishDate, imageUrl}] }
 *   POST { action: "mark", secret, row, status, sanityId?, publishedAt?, error? }
 */

var SHEET_NAME = "Schedule";
var COL = {
  title: 1,
  brief: 2,
  publishDate: 3,
  imageUrl: 4,
  status: 5,
  sanityId: 6,
  publishedAt: 7,
  error: 8,
};

function getSheet_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" not found');
  return sheet;
}

function checkSecret_(provided) {
  var expected = PropertiesService.getScriptProperties().getProperty("SHARED_SECRET");
  if (!expected) throw new Error("SHARED_SECRET script property not set");
  if (provided !== expected) throw new Error("unauthorized");
}

function jsonOut_(obj, status) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function todayYmd_() {
  var tz = Session.getScriptTimeZone() || "Asia/Kolkata";
  return Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
}

function parseYmd_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd");
  }
  return String(value || "").trim().slice(0, 10);
}

function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (params.action !== "due") return jsonOut_({ error: "unknown action" });
    checkSecret_(params.secret);

    var sheet = getSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonOut_({ rows: [] });

    var values = sheet.getRange(2, 1, lastRow - 1, COL.error).getValues();
    var today = todayYmd_();
    var due = [];
    for (var i = 0; i < values.length; i++) {
      var r = values[i];
      var rowNum = i + 2;
      var status = String(r[COL.status - 1] || "").toLowerCase();
      if (status === "published") continue;
      var title = String(r[COL.title - 1] || "").trim();
      if (!title) continue;
      var date = parseYmd_(r[COL.publishDate - 1]);
      if (!date) continue;
      if (date > today) continue;
      due.push({
        row: rowNum,
        title: title,
        brief: String(r[COL.brief - 1] || ""),
        publishDate: date,
        imageUrl: String(r[COL.imageUrl - 1] || ""),
      });
    }
    return jsonOut_({ rows: due });
  } catch (err) {
    return jsonOut_({ error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.action !== "mark") return jsonOut_({ error: "unknown action" });
    checkSecret_(body.secret);

    var row = Number(body.row);
    if (!row || row < 2) throw new Error("invalid row");
    var sheet = getSheet_();

    if (body.status === "published") {
      sheet.getRange(row, COL.status).setValue("published");
      sheet.getRange(row, COL.sanityId).setValue(body.sanityId || "");
      sheet.getRange(row, COL.publishedAt).setValue(body.publishedAt || new Date().toISOString());
      sheet.getRange(row, COL.error).setValue("");
    } else if (body.status === "error") {
      sheet.getRange(row, COL.status).setValue("error");
      sheet.getRange(row, COL.error).setValue(body.error || "unknown error");
    } else {
      throw new Error("invalid status");
    }
    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ error: String(err && err.message || err) });
  }
}
