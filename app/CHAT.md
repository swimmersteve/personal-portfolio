# Chat with Steve

The desktop and Contact window launch an AIM-inspired AI chat. Its Python adapter
reuses the prompt, career summary, LinkedIn PDF, and Chat Completions approach from
the sibling `me` project. The original project is not modified.

Run `./scripts/start-chat.ps1` in one terminal and `npm run dev` in another.
The adapter listens on loopback port 5180; Vite proxies `/api/chat` from port 5173.
Pass `-SourceDirectory` to the script to use a different source folder.
It uses that project's `.venv` and loads its `.env` without printing credentials.
`CHAT_MODEL` can override the original `gpt-5.4-mini` setting.

The chatbot reads `docs/system_prompt.txt`, `docs/steve.txt`, and
`docs/linkedin.pdf` at startup. Restart the adapter after editing those documents.
Documents and keys stay outside the browser bundle. Context and messages are sent
to OpenAI to generate answers. Conversations stay in component memory and clear
when the chat window closes. The last 10 exchanges accompany each new message.

Pushover contact capture/unknown-question notifications and the unused Gemini
evaluator from the original app are not enabled in this adapter. The assistant
is instructed not to claim it can contact Steve or record visitor details.

This is a local integration. Publishing the static portfolio does not deploy this
Python service; production hosting needs a server route, secrets, and abuse/rate
controls. The existing Sites worker/build files are unchanged.

Checks: `npm run typecheck`, `npm test`, `npm run build`, and
`../../me/.venv/Scripts/python.exe -m unittest discover -s server` (from this
`app` directory; adjust the Python path if the source folder is elsewhere).
