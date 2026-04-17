import mammoth from "mammoth";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jobspecsDir = path.join(__dirname, "../artifacts/career-tracker/public/jobspecs");

const ROLE_FILES = {
  55: "rc-360-contract.docx",
  56: "rc-360-perm.docx",
  57: "senior-rc-360-contract.docx",
  58: "senior-rc-360-perm.docx",
  59: "principal-360-contract.docx",
  60: "principal-360-perm.docx",
  61: "sector-lead-360-contract.docx",
  62: "sector-lead-360-perm.docx",
  63: "team-leader-360-contract.docx",
  64: "team-leader-360-perm.docx",
  65: "divisional-manager-360-contract.docx",
  66: "divisional-manager-360-perm.docx",
  67: "associate-director-360-contract.docx",
  68: "associate-director-360-perm.docx",
  41: "rc-180-perm.docx",
  42: "rc-180-contract.docx",
  43: "senior-rc-180-perm.docx",
  44: "senior-rc-180-contract.docx",
  45: "principal-180-perm.docx",
  46: "principal-180-contract.docx",
  47: "sector-lead-180-perm.docx",
  48: "sector-lead-180-contract.docx",
  49: "team-leader-180-perm.docx",
  50: "team-leader-180-contract.docx",
  51: "divisional-manager-180-perm.docx",
  52: "divisional-manager-180-contract.docx",
  53: "associate-director-180-perm.docx",
  54: "associate-director-180-contract.docx",
  69: "account-coordinator.docx",
  70: "senior-account-coordinator.docx",
  71: "delivery-consultant.docx",
  72: "senior-delivery-consultant.docx",
  73: "account-partner.docx",
  74: "account-manager.docx",
  75: "senior-account-manager.docx",
  76: "account-partner-manager.docx",
  77: "delivery-manager.docx",
  78: "account-director.docx",
  79: "business-director.docx",
};

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let updated = 0;
let failed = 0;

for (const [roleId, filename] of Object.entries(ROLE_FILES)) {
  const filePath = path.join(jobspecsDir, filename);
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value.trim();
    if (!text) {
      console.warn(`  WARN: empty text extracted from ${filename}`);
      failed++;
      continue;
    }
    await client.query("UPDATE roles SET job_spec = $1 WHERE id = $2", [text, parseInt(roleId)]);
    console.log(`  ✓ ${roleId} (${filename}) — ${text.length} chars`);
    updated++;
  } catch (err) {
    console.error(`  ✗ ${roleId} (${filename}): ${err.message}`);
    failed++;
  }
}

await client.end();
console.log(`\nDone: ${updated} updated, ${failed} failed`);
