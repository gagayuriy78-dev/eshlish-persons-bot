---
name: Render API deployment workflow
description: Reliable way to look up Render API schemas and verify service deployments.
---

Use Render's current OpenAPI specification for service creation and updates rather than relying on remembered request fields. The official spec is linked from the Render API docs at `/v1.0/openapi/render-public-api-1.json`; endpoint documentation can also be fetched with a `.md` suffix. After creating or updating a service, query the service and deploy endpoints and verify the public URL responds.

**Why:** The rendered API reference and general web search were intermittently blocked in this environment, while the documented Markdown and OpenAPI JSON were accessible.

**How to apply:** For Render tasks, consult the current schema, use the Render API key only in authorization headers, and verify both the deployment state and the live endpoint without printing credential values.
