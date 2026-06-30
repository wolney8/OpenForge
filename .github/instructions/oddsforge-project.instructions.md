Project name: OddsForge

Primary objective:
Build a local-first odds matching, matched betting calculation and opportunity analysis app.

Phase 1 priority:
Calculation engine + sample-data Odds Matcher UI.

Do not start with:
- live bookmaker scraping
- auto bet placement
- hosted deployment
- full profit tracker replacement

Architecture:
- Frontend: React/TypeScript
- Backend: FastAPI/Python unless overridden
- Database: SQLite after MVP, sample JSON first
- Tests: pytest for backend/calculations, Playwright for UI
- MCP: tools for agent support, not runtime dependency

Financial safety:
- No calculation without tests
- No advice without scenario display
- No autonomous bet placement
- No hidden assumptions
- No silent rounding
- No scraping logged-in bookmaker pages until explicitly approved