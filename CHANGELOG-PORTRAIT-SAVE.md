# Portrait persistence

Portrait uploads and removals now start saving immediately. Opening a saved character waits for pending cloud saves before reading it back, preventing quick navigation from replacing a new portrait with an older copy.

Test: upload a portrait, immediately return Home, then reopen Edit. Confirm the portrait appears in both places and remains after reloading. Remove it and repeat. Check JSON export includes the portrait.

Automated regression covers upload, pending-save reopen, normalization, Home rendering, and removal with stubbed cloud storage. Real account and iOS photo-picker checks remain manual.
