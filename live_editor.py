#!/usr/bin/env python3
"""
Twirl Live Editor — 3-Agent pipeline
Agent 1 (Editor)   → writes the change
Agent 2 (Verifier) → checks it's actually true, not hallucinated
Agent 3 (Corrector)→ fixes issues if verifier finds problems
"""
import tkinter as tk
from tkinter import scrolledtext
import threading, subprocess, sys, re, shutil
from pathlib import Path
from datetime import datetime

try:
    import anthropic
except ImportError:
    print("Run: pip install anthropic"); sys.exit(1)

ROOT           = Path(__file__).parent
SIMULATOR_PATH = ROOT / "simulator.py"
HISTORY_DIR    = ROOT / ".twirl_history"
HISTORY_DIR.mkdir(exist_ok=True)

BG     = "#0A0A14"
CARD   = "#111120"
CARD2  = "#1A1A2E"
PINK   = "#F472B6"
ROSE   = "#FB7185"
GREEN  = "#10B981"
AMBER  = "#F59E0B"
PURPLE = "#818CF8"
MUTED  = "#9CA3AF"
WHITE  = "#FFFFFF"
TEXT   = "#E0E0F0"
BORDER = "#2A2A40"
ERROR  = "#F87171"

SUGGESTIONS = [
    "Make the hero card gradient darker",
    "Add a 'New' badge to fresh listings",
    "Make the tab bar taller with bigger icons",
    "Add a pulsing dot to the messages tab",
    "Give the login screen an animated gradient",
    "Make item cards have a subtle hover shadow",
    "Add a verified checkmark to owner names",
    "Make the profile stats use bigger numbers",
    "Add a 'Trending' fire badge to popular items",
    "Make the contract screen feel more premium",
]

# ── Agent 1: Editor ─────────────────────────────────────────────────────────────
EDITOR_SYSTEM = """You are an expert Python/tkinter engineer maintaining "Twirl" — a mobile app simulator rendering an iPhone 15 UI on tkinter Canvas.

When given an instruction, respond with EXACTLY this format and nothing else:

<summary>One sentence describing exactly what you changed in the code</summary>
<code>
[complete modified simulator.py — valid runnable Python]
</code>

Rules:
• Make only the minimal change to fulfill the request
• All screens must still render without errors
• No markdown or text outside the XML tags
• File must start with imports and end with TwirlApp().mainloop()
• Use existing helpers: self.rr(), self.shadow(), self._gradient(), self.T(), self.FSB(), self.pill_btn(), self.after()"""

# ── Agent 2: Verifier ───────────────────────────────────────────────────────────
VERIFIER_SYSTEM = """You are a strict code verification agent. You receive:
1. The original user instruction
2. A summary claiming what was changed
3. The resulting Python code

Your job: verify the claim is TRUE and the code is CORRECT.

Check:
• Did the code actually implement what the summary claims?
• Is the Python syntactically valid?
• Does TwirlApp class still exist with all core methods?
• Are there any obvious bugs that would crash the simulator?
• Is the summary honest and accurate — not exaggerated or hallucinated?

Respond with EXACTLY this format:

<verified>true|false</verified>
<confidence>0-100</confidence>
<report>One honest sentence about the change quality</report>
<issues>Specific problems found, or "none" if all good</issues>"""

# ── Agent 3: Corrector ──────────────────────────────────────────────────────────
CORRECTOR_SYSTEM = """You are a Python/tkinter expert fixing a broken or inaccurate code change.

You receive the original instruction, the failed attempt, and the verifier's issues report.
Your job: produce a correct implementation that actually does what was asked.

Respond with EXACTLY this format:

<summary>One sentence describing what you fixed and how</summary>
<code>
[complete corrected simulator.py — valid runnable Python]
</code>

Be conservative. If unsure how to implement something, make a simpler but correct version."""


class LiveEditor(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("✨ Twirl Live Editor")
        self.configure(bg=BG)
        self.geometry("580x860")
        self.resizable(True, True)
        self.minsize(440, 520)

        self.client      = anthropic.Anthropic()
        self.sim_proc    = None
        self.busy        = False
        self.history     = []
        self.cmd_history = []
        self.cmd_idx     = -1
        self.undo_stack  = []
        self._ph_active  = True
        self._stop_anim  = False

        self._build_ui()
        self._welcome()
        self._launch_sim()

    # ── UI ──────────────────────────────────────────────────────────────────────
    def _build_ui(self):
        # Header
        bar = tk.Frame(self, bg=PINK, height=56)
        bar.pack(fill="x"); bar.pack_propagate(False)
        tk.Label(bar, text="twirl", font=("Helvetica",18,"bold","italic"),
                 bg=PINK, fg=WHITE).pack(side="left", padx=14, pady=14)
        tk.Label(bar, text="Live Editor", font=("Helvetica",13),
                 bg=PINK, fg="#FFCCE8").pack(side="left", pady=14)
        self.status_dot = tk.Label(bar, text="●", font=("Helvetica",14), bg=PINK, fg=GREEN)
        self.status_dot.pack(side="right", padx=6, pady=16)
        self.status_lbl = tk.Label(bar, text="Ready", font=("Helvetica",11), bg=PINK, fg=WHITE)
        self.status_lbl.pack(side="right", pady=16)

        # Agent pipeline indicator
        self.pipeline_frame = tk.Frame(self, bg=CARD2, height=36)
        self.pipeline_frame.pack(fill="x"); self.pipeline_frame.pack_propagate(False)
        self._build_pipeline_idle()

        # Chat
        self.chat = scrolledtext.ScrolledText(
            self, bg=CARD, fg=TEXT, font=("Helvetica",12), bd=0,
            padx=16, pady=12, state="disabled", wrap="word",
            selectbackground=PINK, selectforeground=WHITE,
        )
        self.chat.pack(fill="both", expand=True)

        self.chat.tag_config("system",   foreground=MUTED,   font=("Helvetica",11,"italic"))
        self.chat.tag_config("you_lbl",  foreground=PINK,    font=("Helvetica",11,"bold"))
        self.chat.tag_config("you_txt",  foreground=WHITE,   font=("Helvetica",12), lmargin1=40, lmargin2=40)
        self.chat.tag_config("ai_lbl",   foreground=GREEN,   font=("Helvetica",11,"bold"))
        self.chat.tag_config("ai_txt",   foreground=TEXT,    font=("Helvetica",12), lmargin1=40, lmargin2=40)
        self.chat.tag_config("ver_lbl",  foreground=PURPLE,  font=("Helvetica",11,"bold"))
        self.chat.tag_config("ver_txt",  foreground=TEXT,    font=("Helvetica",11), lmargin1=40, lmargin2=40)
        self.chat.tag_config("fix_lbl",  foreground=AMBER,   font=("Helvetica",11,"bold"))
        self.chat.tag_config("fix_txt",  foreground=TEXT,    font=("Helvetica",11), lmargin1=40, lmargin2=40)
        self.chat.tag_config("err_lbl",  foreground=ERROR,   font=("Helvetica",11,"bold"))
        self.chat.tag_config("err_txt",  foreground=ERROR,   font=("Helvetica",11), lmargin1=40, lmargin2=40)
        self.chat.tag_config("anim",     foreground=PURPLE,  font=("Helvetica",12,"italic"), lmargin1=40, lmargin2=40)

        # Suggestion chips
        chip_outer = tk.Frame(self, bg=CARD2, pady=6)
        chip_outer.pack(fill="x")
        tk.Label(chip_outer, text="  Quick:", font=("Helvetica",10),
                 bg=CARD2, fg=MUTED).pack(side="left", padx=(8,0))
        chip_c = tk.Canvas(chip_outer, bg=CARD2, height=30, highlightthickness=0)
        chip_c.pack(side="left", fill="x", expand=True)
        chip_inner = tk.Frame(chip_c, bg=CARD2)
        chip_c.create_window((0,0), window=chip_inner, anchor="nw")
        chip_inner.bind("<Configure>", lambda e: chip_c.configure(scrollregion=chip_c.bbox("all")))
        for s in SUGGESTIONS:
            tk.Button(chip_inner, text=s, font=("Helvetica",9), bg=CARD, fg=MUTED,
                      bd=0, padx=8, pady=3, cursor="hand2",
                      activebackground=PINK, activeforeground=WHITE,
                      command=lambda x=s: self._inject(x)).pack(side="left", padx=3, pady=2)

        # Input area
        inp = tk.Frame(self, bg=CARD2, pady=10, padx=10)
        inp.pack(fill="x")

        self.entry = tk.Text(inp, height=3, bg=CARD, fg=WHITE, font=("Helvetica",12),
                             bd=0, padx=12, pady=10, insertbackground=WHITE, wrap="word")
        self.entry.pack(fill="x", pady=(0,8))
        self.entry.bind("<Return>",   self._on_enter)
        self.entry.bind("<Up>",       self._history_up)
        self.entry.bind("<Down>",     self._history_down)
        self.entry.bind("<FocusIn>",  self._clear_ph)
        self.entry.bind("<FocusOut>", self._restore_ph)

        self._ph = "Describe any change… (Enter to send, Shift+Enter for newline)"
        self.entry.insert("1.0", self._ph)
        self.entry.config(fg=MUTED)

        btn_row = tk.Frame(inp, bg=CARD2)
        btn_row.pack(fill="x")
        self.undo_btn = tk.Button(btn_row, text="↺  Undo", font=("Helvetica",10),
                                   bg=CARD, fg=MUTED, bd=0, padx=10, pady=5,
                                   cursor="hand2", command=self._undo, state="disabled")
        self.undo_btn.pack(side="left", padx=(0,4))
        tk.Button(btn_row, text="⟳  Restart", font=("Helvetica",10),
                  bg=CARD, fg=MUTED, bd=0, padx=10, pady=5,
                  cursor="hand2", command=self._launch_sim).pack(side="left", padx=(0,4))
        tk.Button(btn_row, text="🗑  Clear", font=("Helvetica",10),
                  bg=CARD, fg=MUTED, bd=0, padx=10, pady=5,
                  cursor="hand2", command=self._clear_chat).pack(side="left")
        self.send_btn = tk.Button(btn_row, text="Send  ↑", font=("Helvetica",12,"bold"),
                                   bg=PINK, fg=WHITE, bd=0, padx=20, pady=5,
                                   cursor="hand2", activebackground=ROSE,
                                   command=self._send)
        self.send_btn.pack(side="right")
        tk.Label(inp, text="⏎ send  ·  ⇧⏎ newline  ·  ↑↓ history",
                 font=("Helvetica",9), bg=CARD2, fg=BORDER).pack(anchor="e", pady=(3,0))

    def _build_pipeline_idle(self):
        for w in self.pipeline_frame.winfo_children():
            w.destroy()
        stages = [("1  Editor", MUTED), ("→", BORDER), ("2  Verifier", MUTED), ("→", BORDER), ("3  Corrector", MUTED)]
        for txt, col in stages:
            tk.Label(self.pipeline_frame, text=txt, font=("Helvetica",9),
                     bg=CARD2, fg=col).pack(side="left", padx=6, pady=8)

    def _set_pipeline(self, active):
        for w in self.pipeline_frame.winfo_children():
            w.destroy()
        colors = {
            "editor":    [PINK,  BORDER, MUTED,   BORDER, MUTED],
            "verifier":  [GREEN, BORDER, PURPLE,  BORDER, MUTED],
            "corrector": [GREEN, BORDER, AMBER,   BORDER, AMBER],
            "done":      [GREEN, BORDER, GREEN,   BORDER, GREEN],
        }
        labels = ["1  Editor", "→", "2  Verifier", "→", "3  Corrector"]
        cols   = colors.get(active, [MUTED]*5)
        for txt, col in zip(labels, cols):
            tk.Label(self.pipeline_frame, text=txt, font=("Helvetica",9,"bold" if col != MUTED and col != BORDER else ""),
                     bg=CARD2, fg=col).pack(side="left", padx=6, pady=8)

    # ── CHAT HELPERS ────────────────────────────────────────────────────────────
    def _log(self, kind, label, text):
        self.chat.configure(state="normal")
        self.chat.insert("end", "\n")
        if label:
            self.chat.insert("end", f"{label}\n", f"{kind}_lbl")
        tag = "system" if kind == "system" else f"{kind}_txt"
        self.chat.insert("end", f"{text}\n", tag)
        self.chat.configure(state="disabled")
        self.chat.see("end")

    def _set_anim_anchor(self):
        self.chat.configure(state="normal")
        self.chat.insert("end", "\n", "anim")
        self.chat.mark_set("anim_start", "end-1c")
        self.chat.configure(state="disabled")

    def _update_anim(self, text):
        self.chat.configure(state="normal")
        try:
            self.chat.delete("anim_start", "end")
            self.chat.insert("end", text, "anim")
        except: pass
        self.chat.configure(state="disabled")
        self.chat.see("end")

    def _clear_anim(self):
        self.chat.configure(state="normal")
        try: self.chat.delete("anim_start", "end")
        except: pass
        self.chat.configure(state="disabled")

    def _welcome(self):
        self._log("system", None,
            "3-agent pipeline active.\n\n"
            "  Agent 1  Editor    — writes your change\n"
            "  Agent 2  Verifier  — checks it's real, not hallucinated\n"
            "  Agent 3  Corrector — fixes it if the verifier finds problems\n\n"
            "Type anything. The simulator hot-reloads every time.")

    # ── PLACEHOLDER ─────────────────────────────────────────────────────────────
    def _clear_ph(self, e):
        if self._ph_active:
            self.entry.delete("1.0","end"); self.entry.config(fg=WHITE)
            self._ph_active = False

    def _restore_ph(self, e):
        if not self.entry.get("1.0","end").strip():
            self.entry.insert("1.0", self._ph); self.entry.config(fg=MUTED)
            self._ph_active = True

    # ── INPUT ───────────────────────────────────────────────────────────────────
    def _on_enter(self, e):
        if e.state & 0x1: return None
        self._send(); return "break"

    def _inject(self, text):
        self._clear_ph(None); self.entry.delete("1.0","end")
        self.entry.insert("1.0", text); self._send()

    def _history_up(self, e):
        if not self.cmd_history: return
        self.cmd_idx = min(self.cmd_idx+1, len(self.cmd_history)-1)
        self._clear_ph(None); self.entry.delete("1.0","end")
        self.entry.insert("1.0", self.cmd_history[-(self.cmd_idx+1)]); return "break"

    def _history_down(self, e):
        if self.cmd_idx <= 0:
            self.cmd_idx = -1; self.entry.delete("1.0","end"); self._restore_ph(None); return "break"
        self.cmd_idx -= 1; self.entry.delete("1.0","end")
        self.entry.insert("1.0", self.cmd_history[-(self.cmd_idx+1)]); return "break"

    def _send(self):
        if self.busy or self._ph_active: return
        text = self.entry.get("1.0","end").strip()
        if not text: return
        self.entry.delete("1.0","end"); self._restore_ph(None)
        self.cmd_history.append(text); self.cmd_idx = -1
        self._log("you", "You", text)
        self._set_anim_anchor()
        self._set_busy(True)
        threading.Thread(target=self._pipeline, args=(text,), daemon=True).start()

    # ══ 3-AGENT PIPELINE ════════════════════════════════════════════════════════
    def _pipeline(self, instruction):
        try:
            original_code = SIMULATOR_PATH.read_text(encoding="utf-8")
            ctx = self._build_ctx()

            # ── Agent 1: Editor ────────────────────────────────────────────────
            self.after(0, lambda: self._set_pipeline("editor"))
            self.after(0, lambda: self._update_anim("  ✏️  Agent 1 — Editor writing your change..."))

            editor_resp = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=16000,
                system=EDITOR_SYSTEM,
                messages=[{"role":"user","content":
                    f"{ctx}Current simulator.py:\n\n{original_code}\n\n---\n\nInstruction: {instruction}"}]
            )
            new_code, summary = self._parse_code_response(editor_resp.content[0].text)

            # ── Agent 2: Verifier ──────────────────────────────────────────────
            self.after(0, lambda: self._set_pipeline("verifier"))
            self.after(0, lambda s=summary: self._update_anim(f"  🔍  Agent 2 — Verifier checking: \"{s}\""))

            verifier_resp = self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                system=VERIFIER_SYSTEM,
                messages=[{"role":"user","content":
                    f"Instruction: {instruction}\n\n"
                    f"Claimed summary: {summary}\n\n"
                    f"Resulting code (first 6000 chars):\n{new_code[:6000]}"}]
            )
            verified, confidence, report, issues = self._parse_verification(verifier_resp.content[0].text)

            # Log verifier result
            conf_bar = self._confidence_bar(confidence)
            ver_msg  = f"{conf_bar}  {confidence}% confidence\n{report}"
            if issues and issues.lower() != "none":
                ver_msg += f"\nIssues: {issues}"
            self.after(0, lambda m=ver_msg: self._log("ver", "🔍 Verifier", m))

            # ── Agent 3: Corrector (only if needed) ───────────────────────────
            if not verified or confidence < 72:
                self.after(0, lambda: self._set_pipeline("corrector"))
                self.after(0, lambda i=issues: self._update_anim(
                    f"  🔧  Agent 3 — Corrector fixing: {i}"))

                corrector_resp = self.client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=16000,
                    system=CORRECTOR_SYSTEM,
                    messages=[{"role":"user","content":
                        f"Original instruction: {instruction}\n\n"
                        f"Failed summary: {summary}\n"
                        f"Verifier issues: {issues}\n\n"
                        f"Original code:\n{original_code}\n\n"
                        f"Broken attempt:\n{new_code}"}]
                )
                new_code, summary = self._parse_code_response(corrector_resp.content[0].text)
                self.after(0, lambda s=summary: self._log("fix", "🔧 Corrector", f"Fixed: {s}"))

            # ── Apply ──────────────────────────────────────────────────────────
            self.after(0, lambda: self._set_pipeline("done"))
            self._backup(original_code)
            SIMULATOR_PATH.write_text(new_code, encoding="utf-8")
            self.history.append({"instruction": instruction, "summary": summary})
            self.after(0, lambda s=summary, c=confidence, v=verified: self._on_success(s, c, v))

        except Exception as e:
            self.after(0, lambda err=str(e): self._on_error(err))

    # ── PARSE HELPERS ────────────────────────────────────────────────────────────
    def _parse_code_response(self, raw):
        raw = raw.strip()
        summary_m = re.search(r'<summary>(.*?)</summary>', raw, re.DOTALL)
        code_m    = re.search(r'<code>\s*(.*?)\s*</code>', raw, re.DOTALL)

        if code_m:
            code = code_m.group(1).strip()
        elif "import tkinter" in raw:
            code = raw
        else:
            raise ValueError(f"No valid code in response. Preview:\n{raw[:400]}")

        # Strip accidental markdown fences
        code = re.sub(r'^```python\s*', '', code)
        code = re.sub(r'^```\s*',       '', code)
        code = re.sub(r'\s*```$',       '', code)

        if "TwirlApp" not in code or "import tkinter" not in code:
            raise ValueError("Response missing TwirlApp class or tkinter import.")

        summary = summary_m.group(1).strip() if summary_m else "Change applied."
        return code, summary

    def _parse_verification(self, raw):
        verified_m   = re.search(r'<verified>(.*?)</verified>',     raw, re.DOTALL | re.IGNORECASE)
        confidence_m = re.search(r'<confidence>(.*?)</confidence>', raw, re.DOTALL | re.IGNORECASE)
        report_m     = re.search(r'<report>(.*?)</report>',         raw, re.DOTALL | re.IGNORECASE)
        issues_m     = re.search(r'<issues>(.*?)</issues>',         raw, re.DOTALL | re.IGNORECASE)

        verified   = (verified_m.group(1).strip().lower() == "true") if verified_m else True
        confidence = int(re.sub(r'[^\d]','', confidence_m.group(1))) if confidence_m else 80
        confidence = max(0, min(100, confidence))
        report     = report_m.group(1).strip()  if report_m  else "Verification complete."
        issues     = issues_m.group(1).strip()  if issues_m  else "none"
        return verified, confidence, report, issues

    def _confidence_bar(self, pct):
        filled = round(pct / 10)
        bar    = "█" * filled + "░" * (10 - filled)
        return f"[{bar}]"

    def _build_ctx(self):
        if not self.history: return ""
        recent = self.history[-3:]
        lines  = "Recent changes applied:\n"
        for h in recent:
            lines += f"  • {h['summary']}\n"
        return lines + "\n"

    # ── SUCCESS / ERROR ──────────────────────────────────────────────────────────
    def _on_success(self, summary, confidence, verified):
        self._clear_anim()
        icon = "✓" if verified and confidence >= 72 else "✓ (corrected)"
        self._log("ai", f"✓ Applied", f"{summary}\n(verified {confidence}% confident)")
        self._set_busy(False)
        self.undo_btn.configure(state="normal")
        self._launch_sim()

    def _on_error(self, err):
        self._clear_anim()
        self._log("err", "✗ Error", err)
        self._set_pipeline("editor")
        self._set_busy(False)

    # ── BUSY ────────────────────────────────────────────────────────────────────
    def _set_busy(self, busy):
        self.busy = busy
        if busy:
            self.send_btn.configure(state="disabled", bg=MUTED, text="Working…")
            self.status_dot.configure(fg=ROSE)
            self.status_lbl.configure(text="Working")
        else:
            self.send_btn.configure(state="normal", bg=PINK, text="Send  ↑")
            self.status_dot.configure(fg=GREEN)
            self.status_lbl.configure(text="Ready")

    # ── SIMULATOR ───────────────────────────────────────────────────────────────
    def _launch_sim(self):
        if self.sim_proc:
            try: self.sim_proc.terminate()
            except: pass
            self.sim_proc = None
        self.after(250, lambda: setattr(self, 'sim_proc',
            subprocess.Popen([sys.executable, str(SIMULATOR_PATH)], cwd=str(ROOT))))

    # ── BACKUP / UNDO ────────────────────────────────────────────────────────────
    def _backup(self, code):
        ts   = datetime.now().strftime("%H%M%S_%f")
        dest = HISTORY_DIR / f"simulator_{ts}.py"
        dest.write_text(code, encoding="utf-8")
        self.undo_stack.append(dest)
        for old in sorted(HISTORY_DIR.glob("simulator_*.py"))[:-20]:
            try: old.unlink()
            except: pass

    def _undo(self):
        if not self.undo_stack:
            self._log("system", None, "Nothing to undo."); return
        prev = self.undo_stack.pop()
        if prev.exists():
            SIMULATOR_PATH.write_text(prev.read_text(encoding="utf-8"), encoding="utf-8")
            if self.history: self.history.pop()
            self._log("system", None, "↺ Reverted to previous version.")
            self._launch_sim()
        if not self.undo_stack:
            self.undo_btn.configure(state="disabled")

    # ── CLEAR ───────────────────────────────────────────────────────────────────
    def _clear_chat(self):
        self.chat.configure(state="normal")
        self.chat.delete("1.0","end")
        self.chat.configure(state="disabled")
        self.history.clear()
        self._welcome()

    def on_close(self):
        if self.sim_proc:
            try: self.sim_proc.terminate()
            except: pass
        self.destroy()


if __name__ == "__main__":
    app = LiveEditor()
    app.protocol("WM_DELETE_WINDOW", app.on_close)
    app.mainloop()
