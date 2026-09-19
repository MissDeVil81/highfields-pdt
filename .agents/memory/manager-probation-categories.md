---
name: Manager probation categories
description: The dashboard’s member flags and summary totals must use one shared review-classification rule.
---

The manager dashboard must derive pending and published member flags and their summary totals from the same classification logic.

**Why:** Separate implementations of the date and publication rules can make a card total disagree with the filtered member list, especially around undated or future-dated reviews.

**How to apply:** When changing probation review timing or publication semantics, update the shared classifier and its boundary tests before changing either manager endpoint or the dashboard filters.