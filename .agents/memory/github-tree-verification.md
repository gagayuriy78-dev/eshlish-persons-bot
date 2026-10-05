---
name: GitHub tree verification
description: Verify files uploaded with GitHub's recursive git tree API.
---

When verifying a recursive GitHub tree response, count entries where `type` is `blob` to confirm uploaded files. The response also includes directories as `tree` entries.

**Why:** Directory entries inflated an upload count and initially made a successful source commit look incomplete.

**How to apply:** When confirming a GitHub tree or commit, filter by both the expected path and `type === "blob"` before comparing file counts.
