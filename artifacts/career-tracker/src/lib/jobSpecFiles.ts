const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const file = (name: string) => `${base}/jobspecs/${name}`;

export const JOB_SPEC_FILES: Record<number, string> = {
  // 360 Career Path
  55: file("rc-360-contract.docx"),
  56: file("rc-360-perm.docx"),
  57: file("senior-rc-360-contract.docx"),
  58: file("senior-rc-360-perm.docx"),
  59: file("principal-360-contract.docx"),
  60: file("principal-360-perm.docx"),
  61: file("sector-lead-360-contract.docx"),
  62: file("sector-lead-360-perm.docx"),
  63: file("team-leader-360-contract.docx"),
  64: file("team-leader-360-perm.docx"),
  65: file("divisional-manager-360-contract.docx"),
  66: file("divisional-manager-360-perm.docx"),
  67: file("associate-director-360-contract.docx"),
  68: file("associate-director-360-perm.docx"),

  // 180 Delivery Career Path
  41: file("rc-180-perm.docx"),
  42: file("rc-180-contract.docx"),
  43: file("senior-rc-180-perm.docx"),
  44: file("senior-rc-180-contract.docx"),
  45: file("principal-180-perm.docx"),
  46: file("principal-180-contract.docx"),
  47: file("sector-lead-180-perm.docx"),
  48: file("sector-lead-180-contract.docx"),
  49: file("team-leader-180-perm.docx"),
  50: file("team-leader-180-contract.docx"),
  51: file("divisional-manager-180-perm.docx"),
  52: file("divisional-manager-180-contract.docx"),
  53: file("associate-director-180-perm.docx"),
  54: file("associate-director-180-contract.docx"),

  // Account Management Career Path
  69: file("account-coordinator.docx"),
  70: file("senior-account-coordinator.docx"),
  71: file("delivery-consultant.docx"),
  72: file("senior-delivery-consultant.docx"),
  73: file("account-partner.docx"),
  74: file("account-manager.docx"),
  75: file("senior-account-manager.docx"),
  76: file("account-partner-manager.docx"),
  77: file("delivery-manager.docx"),
  78: file("account-director.docx"),
  79: file("business-director.docx"),
};
