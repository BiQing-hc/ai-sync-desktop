Set ws = CreateObject("WScript.Shell")
ws.Run "cmd /c ""set HTTPS_PROXY=&& set HTTP_PROXY=&& cd /d d:\codex\ai-sync-desktop && npx electron .""", 0, False
