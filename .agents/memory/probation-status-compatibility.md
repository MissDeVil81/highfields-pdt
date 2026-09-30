---
name: Probation status compatibility
description: Read both persisted probation status values consistently without migrating data.
---

Treat `in_probation` and legacy `in_progress` as equivalent when checking whether an employee is currently on probation. New Admin entries use `in_probation`; editing an existing legacy employee should not silently normalize that value.

**Why:** Existing records use both values, while the Admin form writes `in_probation`. Recognition must not depend on a data migration or change existing records merely to make the manager dashboard work.

**How to apply:** Use the shared status predicate for read paths across apps and the API, including filters, counts, review flags, and labels. Keep unrelated `in_progress` values for action/assessment/financial progress distinct from probation status.