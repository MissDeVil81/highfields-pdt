---
name: Probation state initialization pattern
description: How to correctly initialize local state from TanStack Query data when sessionId may change due to Zustand persist hydration.
---

## Rule

Use `lastInitSession` **state** (not a ref) to track which sessionId's data has been loaded into local state.

```tsx
const [lastInitSession, setLastInitSession] = useState<string | null>(null);

useEffect(() => {
  if (!queryLoading && sessionId && sessionId !== lastInitSession) {
    // Build local state from fetched data
    setLocalState(buildFrom(data));
    setLastInitSession(sessionId);
  }
}, [data, queryLoading, sessionId, lastInitSession]);
```

**Why:** Zustand's persist middleware can cause two renders with different sessionIds (initial UUID vs stored UUID). A `useRef` gets set to `true` on the first (empty) data load and then prevents re-init when the real data arrives. Using `lastInitSession` state correctly re-initializes when the sessionId changes.

**How to apply:** Use this pattern in any page that initializes local form state from a sessionId-keyed TanStack Query.
