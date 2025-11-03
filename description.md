Agent 8 – Voice‑to‑Code Assistant

Overview
- Agent 8 helps you turn spoken instructions into starter code directly inside VS Code.
- Publisher: RJF-72
- Current focus: TypeScript snippet generation and insertion into the active editor.

Key Features
- Start and stop voice recognition from the Command Palette.
- Understands simple intents and generates code:
  - Function: name, parameters, and a guessed return type with TODO body.
  - Class: class with optional constructor and TODO placeholders.
  - Loop: basic for-loop scaffold.
  - Generic: inserts your spoken text as a comment or TODO for follow‑up editing.
- Inserts generated code at the current cursor position.

Commands
- Agent 8: Start Voice Recognition (command id: agent-8.startVoice)
- Agent 8: Stop Voice Recognition (command id: agent-8.stopVoice)
- Hello World (command id: agent-8.helloWorld) – sample command from the template.

How It Works
- The extension registers commands in src/extension.ts and delegates to VoiceCommandService.
- VoiceCommandService (src/services/VoiceCommandService.ts) handles:
  - Starting/stopping recognition.
  - Parsing basic speech intent from transcripts.
  - Generating TypeScript code strings.
  - Inserting the result into the active editor.
- SpeechRecognizer (src/services/SpeechRecognizer.ts) is a stub. Replace it with a real provider (e.g., Whisper, Azure Cognitive Services, Vosk) to enable actual microphone capture.

Example Phrases
- "Create a function calculateTotal that takes prices array of number and returns number."
- "Make a class HttpClient with a constructor that takes baseUrl string and a method get that returns Promise."
- "Add a for loop from i equals 0 to n exclusive."
- "Insert a TODO to refactor the authentication flow."

Setup & Usage
- Open a TypeScript file in VS Code.
- Run Agent 8: Start Voice Recognition and speak your instruction.
- The generated code is inserted at your cursor.
- Stop the session anytime with Agent 8: Stop Voice Recognition.

Configuration
- None yet. Future versions may add provider selection, language preferences, and sensitivity controls.

Requirements
- VS Code ^1.105.0 (per engines in package.json).
- For real speech recognition you’ll need to integrate a provider and any required credentials.

Limitations
- SpeechRecognizer is currently a stub; no real microphone capture out of the box.
- Intent parsing is simple and may not understand complex instructions.
- Output is TypeScript‑oriented. Multi‑language support is planned.

Roadmap
- Pluggable speech providers (Whisper, Azure, Vosk, etc.).
- Multi‑language code generation (Python, JavaScript, Java, C#, etc.).
- Rich UI (status bar, panel, and history of recognized commands).
- Better parameter and type inference; templates for common patterns.
- Configuration options and opt‑in telemetry (if added in the future).

Contributing
- PRs are welcome. Please keep changes focused and include brief descriptions.
- Run lint and compile before opening a PR: npm run lint && npm run compile.

Icon
- The extension icon is icon.png at the project root.

License
- License to be determined by the publisher. If you add a license file, update package.json accordingly.