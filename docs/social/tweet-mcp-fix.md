# Tweet Announcement for MCP Fix

## Main Tweet

🚨 Hubble v1.3.1 Critical Fix for Claude Desktop users!

Found & fixed a split-brain bug where MCP bookmarks went to wrong database (/tmp instead of main).

If you use Hubble + Claude MCP, you MUST update:

```bash
claude mcp remove hubble
claude mcp add hubble -s user --node [path]
```

Details: https://github.com/48Nauts-Operator/hubble/releases/tag/v1.3.1

## Thread Option (if you want more detail)

### Tweet 1
🚨 Hubble v1.3.1 Critical Fix for Claude Desktop users!

Found & fixed a split-brain bug where MCP bookmarks went to wrong database (/tmp instead of main).

If you use Hubble + Claude MCP, update NOW ⬇️

### Tweet 2
The Problem:
• Two MCP servers running simultaneously
• Bookmarks via Claude → /tmp/hubble.db ❌
• Web interface → /data/hubble.db ✅
• Result: Bookmarks not showing up!

### Tweet 3
The Fix:
1️⃣ Remove old config: `claude mcp remove hubble`
2️⃣ Add fixed config: `claude mcp add hubble -s user --node [path]`
3️⃣ Restart Claude Desktop

Full migration guide: https://github.com/48Nauts-Operator/hubble/releases/tag/v1.3.1

### Tweet 4
What this fixes:
✅ All bookmarks in one database
✅ MCP bookmarks appear in web UI
✅ No more split-brain issues
✅ Consistent behavior everywhere

Thanks to everyone who reported this issue! 🙏

## Alternative Shorter Version

🔧 Fixed critical MCP bug in Hubble v1.3.1!

Bookmarks were saving to wrong database. Claude Desktop users must update config.

Fix takes 30 seconds:
https://github.com/48Nauts-Operator/hubble/releases/tag/v1.3.1

#MCP #ClaudeDesktop #DevTools