import tkinter as tk
from tkinter import ttk, colorchooser
import json, os, math, random

# ─── THEME ────────────────────────────────────────────────────────────────────
DEFAULT_THEME = {
    "primary":   "#F472B6",
    "rose":      "#FB7185",
    "blush":     "#FDE8EF",
    "cream":     "#FFF9F5",
    "text":      "#1C1024",
    "muted":     "#9CA3AF",
    "white":     "#FFFFFF",
    "border":    "#FCE7F3",
    "success":   "#10B981",
    "radius":    18,
    "font_size": 13,
    "card_gap":  12,
    "dark_mode": False,
}
THEME_FILE = os.path.join(os.path.dirname(__file__), ".twirl_theme.json")

def load_theme():
    if os.path.exists(THEME_FILE):
        try:
            t = dict(DEFAULT_THEME); t.update(json.load(open(THEME_FILE))); return t
        except: pass
    return dict(DEFAULT_THEME)

def save_theme(t):
    json.dump(t, open(THEME_FILE, "w"), indent=2)

# ─── DIMENSIONS ───────────────────────────────────────────────────────────────
W, H       = 393, 852
TABBAR_H   = 83
SETTINGS_W = 300
NOTCH_H    = 59

# ─── DATA ─────────────────────────────────────────────────────────────────────
STORIES = [
    {"name":"Emma",   "school":"UGA",      "emoji":"👗","color":"#FDE8EF","new":True},
    {"name":"Lily",   "school":"Bama",     "emoji":"✨","color":"#EDE9FE","new":True},
    {"name":"Ava",    "school":"LSU",      "emoji":"🌸","color":"#FDF4FF","new":False},
    {"name":"Sophie", "school":"Ole Miss", "emoji":"💗","color":"#FFF1F2","new":True},
    {"name":"Chloe",  "school":"Vandy",    "emoji":"🖤","color":"#F8FAFC","new":False},
    {"name":"Grace",  "school":"Auburn",   "emoji":"🤍","color":"#FFFBEB","new":True},
]

ITEMS = [
    {"title":"Pink Sequin Mini Dress", "price":28, "size":"S",  "occasion":"Formals",    "owner":"Emma T.",   "school":"UGA",       "deposit":50, "emoji":"👗","color":"#FDE8EF","desc":"ASTR the Label, worn once. Runs TTS. Great condition, no pulls.","saves":23,"looking":4,"rating":4.9,"reviews":[{"user":"Bella S.","stars":5,"text":"Absolutely stunning, fit perfectly! Will rent again 💕"},{"user":"Hanna W.","stars":5,"text":"Emma was so sweet, shipped so fast!"}]},
    {"title":"White Linen Co-ord Set",  "price":18, "size":"M",  "occasion":"Day Event",  "owner":"Lily R.",   "school":"Alabama",   "deposit":30, "emoji":"👚","color":"#F0FDF4","desc":"Perfect for bid day or philanthropy. Super flattering.","saves":15,"looking":2,"rating":4.8,"reviews":[{"user":"Mia J.","stars":5,"text":"So cute! Very easy to work with."}]},
    {"title":"Red Satin Slip Dress",    "price":22, "size":"XS", "occasion":"Date Night", "owner":"Ava M.",    "school":"Ole Miss",  "deposit":45, "emoji":"🩷","color":"#FFF1F2","desc":"Zara satin slip, barely worn. Best for going out.","saves":31,"looking":6,"rating":5.0,"reviews":[{"user":"Sophie K.","stars":5,"text":"Omg this dress is EVERYTHING 🔥"}]},
    {"title":"Floral Midi Dress",       "price":20, "size":"S",  "occasion":"Darty",      "owner":"Sophie K.", "school":"LSU",       "deposit":35, "emoji":"🌸","color":"#FDF4FF","desc":"Show-stopper at any darty. Light and breezy.","saves":18,"looking":3,"rating":4.7,"reviews":[]},
    {"title":"Black Bodycon Dress",     "price":25, "size":"M",  "occasion":"Going Out",  "owner":"Chloe B.",  "school":"Vandy",     "deposit":40, "emoji":"🖤","color":"#F8FAFC","desc":"Revolve, never worn. Fits like a glove.","saves":41,"looking":7,"rating":4.9,"reviews":[{"user":"Emma T.","stars":5,"text":"Perfect night out dress. Chloe is the best lender!"}]},
    {"title":"Gold Sequin Blazer",      "price":30, "size":"S",  "occasion":"Formals",    "owner":"Mia J.",    "school":"Florida",   "deposit":60, "emoji":"✨","color":"#FEFCE8","desc":"Statement piece. Pair with black mini.","saves":12,"looking":1,"rating":4.8,"reviews":[]},
    {"title":"Blue Sundress",           "price":15, "size":"L",  "occasion":"Game Day",   "owner":"Hanna W.",  "school":"Tennessee", "deposit":25, "emoji":"💙","color":"#EFF6FF","desc":"Cute Tennessee game day look. Comfy all day.","saves":9,"looking":0,"rating":4.6,"reviews":[]},
    {"title":"Cream Lace Midi",         "price":24, "size":"XS", "occasion":"Recruitment","owner":"Grace P.",  "school":"Auburn",    "deposit":50, "emoji":"🤍","color":"#FFFBEB","desc":"Perfect recruitment week dress. Elegant.","saves":27,"looking":5,"rating":5.0,"reviews":[{"user":"Lily R.","stars":5,"text":"Grace was amazing! Dress was immaculate."}]},
]

OCCASIONS = ["All","Date Night","Formals","Bid Day","Game Day","Darty","Going Out","Recruitment"]

MESSAGES = [
    {"user":"Emma T.",   "re":"Pink Sequin Mini Dress","last":"Does it run true to size?",   "time":"2h","unread":2,"online":True},
    {"user":"Lily R.",   "re":"White Linen Co-ord Set","last":"I'll take it for Saturday!",  "time":"5h","unread":0,"online":False},
    {"user":"Sophie K.", "re":"Floral Midi Dress",     "last":"Can I pick it up Thursday?", "time":"1d","unread":1,"online":True},
    {"user":"Chloe B.",  "re":"Black Bodycon Dress",   "last":"Thanks so much! Loved it 💗","time":"2d","unread":0,"online":False},
]

RENTALS = {
    "renting": [
        {"item":"Pink Sequin Mini Dress","from":"Emma T.","start":"Apr 25","end":"Apr 27","total":112,"status":"approved","emoji":"👗"},
        {"item":"Gold Sequin Blazer",    "from":"Mia J.", "start":"Apr 22","end":"Apr 23","total":90, "status":"pending", "emoji":"✨"},
    ],
    "lending": [
        {"item":"White Linen Co-ord Set","to":"Bella S.","start":"Apr 26","end":"Apr 28","total":66,"status":"pending","emoji":"👚"},
    ],
}

ACTIVITY = [
    {"text":"Lily S. rented your White Linen Co-ord","emoji":"💰","time":"2h"},
    {"text":"Emma T. sent you a message","emoji":"💬","time":"3h"},
    {"text":"Pink Sequin Dress got 3 new saves","emoji":"💕","time":"1d"},
    {"text":"Chloe B. left you a 5★ review","emoji":"⭐","time":"2d"},
]

CONTRACT_TERMS = [
    ("1. Security Deposit","A security deposit will be held on your card. It will be automatically released within 48 hours of the item being confirmed returned in its original condition."),
    ("2. Non-Return","If the item is not returned by the agreed date, the security deposit will be forfeited and transferred to the lender. Continued non-return may result in account suspension."),
    ("3. Damage Policy","If the item is returned damaged beyond normal wear, the lender may file a damage claim within 48 hours of return. Twirl will review photo evidence and make a final determination on deposit release."),
    ("4. Condition Documentation","Both parties agree that listing photos represent item condition at time of rental. The renter is responsible for returning the item in the same condition."),
    ("5. Late Return","Items returned more than 24 hours late will incur an additional charge per day, deducted from the deposit."),
    ("6. Dispute Resolution","Twirl's decision on all deposit disputes is final. By agreeing, both parties accept Twirl as binding arbitrator."),
]

# ═══════════════════════════════════════════════════════════════════════════════
class TwirlApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Twirl")
        self.configure(bg="#0A0A14")
        self.resizable(False, False)

        self.theme         = load_theme()
        self.settings_open = False
        self.screen_stack  = []
        self.active_tab    = "browse"
        self.logged_in     = False
        self.selected_item = None
        self.rental_tab    = "renting"
        self.selected_occ  = "All"
        self.chat_open     = None
        self.contract_item = None
        self.agreed        = False
        self.form_values   = {}
        self.scroll_y      = 0
        self.saved_items   = set()
        self._toast_id     = None
        self._confetti_pts = []

        self._build_ui()
        self._render("login")

    # ── BUILD ──────────────────────────────────────────────────────────────────
    def _build_ui(self):
        for w in self.winfo_children():
            w.destroy()
        total_w = W + 48 + (SETTINGS_W if self.settings_open else 0)
        self.geometry(f"{total_w}x{H+56}")
        self.outer = tk.Frame(self, bg="#0A0A14")
        self.outer.pack(fill="both", expand=True)
        phone_col = tk.Frame(self.outer, bg="#0A0A14")
        phone_col.pack(side="left", padx=24, pady=28)
        self._make_phone(phone_col)
        self.gear_btn = tk.Button(
            self.outer, text="⚙", font=("Helvetica", 16),
            bg=self.T("primary"), fg="white", bd=0, padx=10, pady=6,
            cursor="hand2", relief="flat", command=self._toggle_settings)
        self.gear_btn.place(x=W+34, y=32)
        if self.settings_open:
            sc = tk.Frame(self.outer, bg="#111120", width=SETTINGS_W)
            sc.pack(side="left", fill="y")
            sc.pack_propagate(False)
            self._make_settings(sc)

    def _make_phone(self, parent):
        cw, ch = W+24, H+24
        self.shell = tk.Canvas(parent, width=cw, height=ch, bg="#0A0A14", highlightthickness=0)
        self.shell.pack()
        self._shell_rect(self.shell, 0, 0, cw, ch, r=52, fill="#1A1A2E", outline="#252540", width=2)
        self._shell_rect(self.shell, 4, 4, cw-4, ch-4, r=49, fill="#0F0F22", outline="#1E1E38", width=1)
        dix = cw//2 - 58
        self.shell.create_oval(dix, 20, dix+116, 50, fill="#000000", outline="#000000")
        for by in [88, 140, 185]:
            self.shell.create_rectangle(-2, by, 5, by+34, fill="#141428", outline="#0A0A14")
        self.shell.create_rectangle(cw-5, 118, cw+2, 188, fill="#141428", outline="#0A0A14")
        hx = cw//2
        self.shell.create_rectangle(hx-52, ch-9, hx+52, ch-5, fill="#444466", outline="")
        self.c = tk.Canvas(self.shell, width=W, height=H, bg=self.T("cream"), highlightthickness=0)
        self.shell.create_window(12, 12, anchor="nw", window=self.c)
        self.c.bind("<MouseWheel>", self._on_scroll)
        self.c.bind("<Button-4>",   lambda e: self._on_scroll_up())
        self.c.bind("<Button-5>",   lambda e: self._on_scroll_down())

    def _shell_rect(self, c, x1, y1, x2, y2, r=12, **kw):
        r = min(r, (x2-x1)//2, (y2-y1)//2)
        pts = [x1+r,y1, x2-r,y1, x2,y1, x2,y1+r, x2,y2-r, x2,y2, x2-r,y2, x1+r,y2, x1,y2, x1,y2-r, x1,y1+r, x1,y1]
        return c.create_polygon(pts, smooth=True, **kw)

    # ── SETTINGS ──────────────────────────────────────────────────────────────
    def _make_settings(self, parent):
        t = self.theme
        hdr = tk.Frame(parent, bg=t["primary"], height=52)
        hdr.pack(fill="x"); hdr.pack_propagate(False)
        tk.Label(hdr, text="🎨  Customize", font=("Helvetica", 13, "bold"),
                 bg=t["primary"], fg="white").pack(side="left", padx=14, pady=14)
        tk.Button(hdr, text="✕", font=("Helvetica", 13, "bold"),
                  bg=t["primary"], fg="white", bd=0, cursor="hand2",
                  command=self._toggle_settings).pack(side="right", padx=12)
        canv = tk.Canvas(parent, bg="#111120", highlightthickness=0)
        sb   = ttk.Scrollbar(parent, orient="vertical", command=canv.yview)
        canv.configure(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y"); canv.pack(side="left", fill="both", expand=True)
        inner = tk.Frame(canv, bg="#111120")
        win   = canv.create_window((0,0), window=inner, anchor="nw")
        inner.bind("<Configure>", lambda e: canv.configure(scrollregion=canv.bbox("all")))
        canv.bind("<Configure>",  lambda e: canv.itemconfig(win, width=e.width))
        canv.bind("<MouseWheel>", lambda e: canv.yview_scroll(-1*(e.delta//120), "units"))

        def sec(txt):
            tk.Frame(inner, bg="#111120", height=8).pack()
            f = tk.Frame(inner, bg="#111120"); f.pack(fill="x", padx=12)
            tk.Label(f, text=txt, font=("Helvetica", 10, "bold"),
                     bg="#111120", fg=t["primary"]).pack(anchor="w")
            tk.Frame(inner, bg=t["primary"], height=1).pack(fill="x", padx=12, pady=(2,6))

        def color_row(lbl, key):
            row = tk.Frame(inner, bg="#111120"); row.pack(fill="x", padx=12, pady=2)
            tk.Label(row, text=lbl, font=("Helvetica", 10), bg="#111120",
                     fg="#BBBBCC", width=16, anchor="w").pack(side="left")
            sw = tk.Label(row, bg=self.theme[key], width=3, cursor="hand2")
            sw.pack(side="left", padx=4)
            vl = tk.Label(row, text=self.theme[key], font=("Courier", 9),
                          bg="#111120", fg="#888899"); vl.pack(side="left")
            def pick(k=key, s=sw, v=vl):
                col = colorchooser.askcolor(color=self.theme[k])[1]
                if col:
                    self.theme[k] = col; s.config(bg=col); v.config(text=col)
                    save_theme(self.theme); self._rerender()
            sw.bind("<Button-1>", lambda e, fn=pick: fn())

        def slider_row(lbl, key, lo, hi):
            row = tk.Frame(inner, bg="#111120"); row.pack(fill="x", padx=12, pady=2)
            tk.Label(row, text=lbl, font=("Helvetica", 10), bg="#111120",
                     fg="#BBBBCC", width=16, anchor="w").pack(side="left")
            vl = tk.Label(row, text=str(self.theme[key]), font=("Helvetica", 10, "bold"),
                          bg="#111120", fg=t["primary"], width=3); vl.pack(side="right")
            var = tk.DoubleVar(value=self.theme[key])
            def slide(_, k=key, v=var, l=vl):
                val = int(v.get()); self.theme[k] = val; l.config(text=str(val))
                save_theme(self.theme); self._rerender()
            ttk.Scale(row, from_=lo, to=hi, variable=var, orient="horizontal",
                      command=slide, length=120).pack(side="left", padx=4)

        def toggle_row(lbl, key):
            row = tk.Frame(inner, bg="#111120"); row.pack(fill="x", padx=12, pady=2)
            tk.Label(row, text=lbl, font=("Helvetica", 10), bg="#111120",
                     fg="#BBBBCC", width=16, anchor="w").pack(side="left")
            var = tk.BooleanVar(value=self.theme[key])
            def tog(k=key, v=var):
                self.theme[k] = v.get()
                if k == "dark_mode":
                    if self.theme[k]:
                        self.theme.update({"cream":"#1C1024","white":"#2D1F3A","border":"#3D2F4A","text":"#F5E6FF","muted":"#9984A8"})
                    else:
                        for dk in ["cream","white","border","text","muted"]:
                            self.theme[dk] = DEFAULT_THEME[dk]
                save_theme(self.theme); self._rerender()
            tk.Checkbutton(row, variable=var, bg="#111120", fg=t["primary"],
                           selectcolor="#111120", activebackground="#111120",
                           cursor="hand2", command=tog).pack(side="left")

        sec("🎨  Colors")
        for lbl, key in [("Primary","primary"),("Accent","rose"),("Blush","blush"),
                          ("Background","cream"),("Card","white"),("Border","border"),
                          ("Text","text"),("Muted","muted")]:
            color_row(lbl, key)
        sec("✏️  Typography"); slider_row("Font Size", "font_size", 10, 18)
        sec("⬡  Shape")
        slider_row("Border Radius", "radius", 4, 32)
        slider_row("Card Gap", "card_gap", 4, 24)
        sec("🌙  Mode"); toggle_row("Dark Mode", "dark_mode")

        sec("💅  Presets")
        presets = [
            ("Pink (default)", {}),
            ("Lavender",  {"primary":"#A78BFA","rose":"#C4B5FD","blush":"#EDE9FE","cream":"#FAF7FF","border":"#DDD6FE"}),
            ("Mint",      {"primary":"#34D399","rose":"#6EE7B7","blush":"#D1FAE5","cream":"#F0FDF4","border":"#A7F3D0"}),
            ("Rose Gold", {"primary":"#C8956C","rose":"#E0A87C","blush":"#FDF0E8","cream":"#FFFBF7","border":"#F5D5BE"}),
            ("Midnight",  {"primary":"#818CF8","rose":"#A5B4FC","blush":"#1E1B4B","cream":"#0F0E2E","border":"#312E81","text":"#E0E7FF","white":"#1E1B4B","muted":"#6366F1","dark_mode":True}),
        ]
        for name, vals in presets:
            def apply(v=vals):
                self.theme = dict(DEFAULT_THEME); self.theme.update(v)
                save_theme(self.theme)
                self._toggle_settings(); self.settings_open = True
                self._build_ui(); self._rerender()
            tk.Button(inner, text=name, font=("Helvetica", 10), bg="#1A1A2E", fg="#CCCCDD",
                      bd=0, padx=10, pady=5, cursor="hand2", relief="flat",
                      command=apply).pack(fill="x", padx=12, pady=1)

        tk.Frame(inner, bg="#111120", height=6).pack()
        def reset():
            self.theme = dict(DEFAULT_THEME); save_theme(self.theme)
            self._toggle_settings(); self.settings_open = True
            self._build_ui(); self._rerender()
        tk.Button(inner, text="↺  Reset to Default", font=("Helvetica", 10),
                  bg="#1F1F35", fg="#AAAACC", bd=0, padx=10, pady=7,
                  cursor="hand2", command=reset).pack(fill="x", padx=12, pady=4)
        tk.Frame(inner, bg="#111120", height=16).pack()

    def _toggle_settings(self):
        self.settings_open = not self.settings_open
        self._build_ui(); self._rerender()

    # ── HELPERS ────────────────────────────────────────────────────────────────
    def T(self, k):    return self.theme.get(k, DEFAULT_THEME.get(k, "#000"))
    def FS(self, d=0): return ("SF Pro Display" if os.name=="posix" else "Helvetica", self.theme["font_size"]+d)
    def FSB(self,d=0): return ("SF Pro Display" if os.name=="posix" else "Helvetica", self.theme["font_size"]+d, "bold")
    def R(self, d=0):  return max(4, self.theme["radius"]+d)

    def clear(self):
        self.c.delete("all")
        self.c.config(bg=self.T("cream"))

    def rr(self, x1, y1, x2, y2, r=None, **kw):
        if r is None: r = self.R()
        r = min(r, max(1,(x2-x1)//2), max(1,(y2-y1)//2))
        pts = [x1+r,y1, x2-r,y1, x2,y1, x2,y1+r, x2,y2-r, x2,y2, x2-r,y2, x1+r,y2, x1,y2, x1,y2-r, x1,y1+r, x1,y1]
        return self.c.create_polygon(pts, smooth=True, **kw)

    def shadow(self, x1, y1, x2, y2, r=None):
        if r is None: r = self.R()
        self.rr(x1+3, y1+5, x2+3, y2+5, r=r, fill="#E8C8D8", outline="")
        self.rr(x1+1, y1+2, x2+1, y2+2, r=r, fill="#F0D8E8", outline="")

    def _gradient(self, x1, y1, x2, y2, c1, c2, steps=40, tags=""):
        def h2r(h):
            h = h.lstrip('#')
            return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        r1,g1,b1 = h2r(c1); r2,g2,b2 = h2r(c2)
        ht = y2 - y1
        for i in range(steps):
            t  = i / steps
            r  = int(r1+(r2-r1)*t); g = int(g1+(g2-g1)*t); b = int(b1+(b2-b1)*t)
            ya = y1 + ht*i//steps;  yb = y1 + ht*(i+1)//steps
            self.c.create_rectangle(x1, ya, x2, yb, fill=f"#{r:02x}{g:02x}{b:02x}", outline="", tags=tags)

    def pill_btn(self, x, y, w, h, color, text, fg="white", cmd=None, fd=0, outline=""):
        r = self.rr(x, y, x+w, y+h, r=h//2, fill=color, outline=outline)
        t = self.c.create_text(x+w//2, y+h//2, text=text, fill=fg, font=self.FSB(fd))
        if cmd:
            def click(e, f=cmd, rect=r):
                self.c.itemconfig(rect, fill=self._darken(color))
                self.after(100, lambda: self.c.itemconfig(rect, fill=color))
                f()
            for i in [r, t]:
                self.c.tag_bind(i, "<Button-1>", click)
        return r, t

    def _darken(self, hex_color, amt=20):
        h = hex_color.lstrip('#')
        r,g,b = (int(h[i:i+2],16) for i in (0,2,4))
        return f"#{max(0,r-amt):02x}{max(0,g-amt):02x}{max(0,b-amt):02x}"

    def status_bar(self):
        self.c.create_rectangle(0, 0, W, NOTCH_H, fill=self.T("white"), outline="")
        self.c.create_text(W//2, NOTCH_H-12, text="9:41", fill=self.T("text"), font=self.FSB(1))
        self.c.create_text(W-18, NOTCH_H-12, text="⚡", fill=self.T("text"), font=self.FS(-1))
        self.c.create_text(18, NOTCH_H-12, text="●●●●", fill=self.T("text"), font=self.FS(-4))

    def tab_bar(self):
        y0 = H - TABBAR_H
        self.c.create_rectangle(0, y0, W, H, fill=self.T("white"), outline="")
        self.c.create_line(0, y0, W, y0, fill=self.T("border"), width=1)
        tabs = [("👗","browse","Browse"),("✨","list","List"),
                ("📦","rentals","Rentals"),("💬","msgs","Messages"),("👤","profile","Profile")]
        tw = W // len(tabs)
        total_unread = sum(m["unread"] for m in MESSAGES)
        for i, (em, name, lbl) in enumerate(tabs):
            cx = i*tw + tw//2; cy = y0+16
            active = self.active_tab == name
            fg = self.T("primary") if active else self.T("muted")
            e = self.c.create_text(cx, cy, text=em, font=("Helvetica", 22))
            l = self.c.create_text(cx, cy+24, text=lbl, fill=fg,
                                   font=self.FSB(-2) if active else self.FS(-3))
            if active:
                self.rr(cx-16, cy+40, cx+16, cy+46, r=3, fill=self.T("primary"), outline="")
            if name == "msgs" and total_unread > 0:
                self.c.create_oval(cx+8, cy-8, cx+20, cy+4, fill=self.T("rose"), outline="")
                self.c.create_text(cx+14, cy-2, text=str(total_unread), fill="white", font=self.FSB(-4))
            for itm in [e,l]:
                self.c.tag_bind(itm, "<Button-1>", lambda ev,n=name: self._tab(n))

    def _tab(self, name):
        self.active_tab = name; self.selected_item = None
        self.chat_open  = None; self.contract_item = None
        self.scroll_y   = 0;    self.screen_stack  = []
        self._render(name)

    def _on_scroll(self, e):
        self.scroll_y = max(0, self.scroll_y - e.delta//3); self._rerender()
    def _on_scroll_up(self):
        self.scroll_y = max(0, self.scroll_y - 30); self._rerender()
    def _on_scroll_down(self):
        self.scroll_y += 30; self._rerender()

    def _render(self, screen):
        self.current_screen = screen
        mp = {
            "login":   self._login,   "signup":  self._signup,
            "signup2": self._signup2, "browse":  self._browse,
            "item":    self._item,    "contract":self._contract,
            "confirm": self._confirm, "done":    self._done,
            "list":    self._list,    "listed":  self._listed,
            "rentals": self._rentals, "msgs":    self._msgs,
            "chat":    self._chat,    "profile": self._profile,
        }
        if screen in mp: mp[screen]()

    def _rerender(self):
        self._render(getattr(self, "current_screen", "login"))

    def _push(self, screen):
        self.screen_stack.append(getattr(self, "current_screen", "browse"))
        self._render(screen)

    def _back(self):
        if self.screen_stack: self._render(self.screen_stack.pop())
        else: self._render(self.active_tab)

    def _input(self, x, y, w, h, key, ph, secret=False):
        val  = self.form_values.get(key, "")
        disp = ("•"*len(val)) if secret and val else val
        self.rr(x, y, x+w, y+h, fill=self.T("white"), outline=self.T("border") if not val else self.T("primary"))
        self.c.create_text(x+14, y+h//2, text=disp or ph,
                           fill=self.T("text") if val else "#C8B0C0",
                           font=self.FS(), anchor="w", width=w-28)
        ov = self.rr(x, y, x+w, y+h, fill="", outline="")
        self.c.tag_bind(ov, "<Button-1>", lambda e,k=key,p=ph,s=secret: self._popup(k,p,s))

    def _popup(self, key, ph, secret=False):
        pop = tk.Toplevel(self); pop.title(ph)
        pop.geometry(f"300x100+{self.winfo_x()+60}+{self.winfo_y()+400}")
        pop.configure(bg="#111120"); pop.grab_set()
        ent = tk.Entry(pop, font=("Helvetica", 13), show="•" if secret else "",
                       bg="#1A1A2E", fg="white", insertbackground="white",
                       relief="flat", bd=8, width=26)
        ent.insert(0, self.form_values.get(key, ""))
        ent.pack(padx=12, pady=12); ent.focus_set()
        def done(e=None):
            self.form_values[key] = ent.get(); pop.destroy(); self._rerender()
        ent.bind("<Return>", done)
        tk.Button(pop, text="Done", bg=self.T("primary"), fg="white",
                  font=("Helvetica",11,"bold"), bd=0, padx=14, pady=5,
                  command=done).pack()

    def _header(self, title, subtitle=None, back=True):
        self.c.create_rectangle(0, NOTCH_H, W, NOTCH_H+56, fill=self.T("white"), outline="")
        if back:
            b = self.c.create_text(20, NOTCH_H+28, text="‹", fill=self.T("primary"),
                                   font=("Helvetica", 28, "bold"), anchor="w")
            self.c.tag_bind(b, "<Button-1>", lambda e: self._back())
        self.c.create_text(W//2, NOTCH_H+22, text=title, fill=self.T("text"), font=self.FSB(3))
        if subtitle:
            self.c.create_text(W//2, NOTCH_H+40, text=subtitle, fill=self.T("muted"), font=self.FS(-2))
        self.c.create_line(0, NOTCH_H+56, W, NOTCH_H+56, fill=self.T("border"))

    def _stars(self, x, y, rating, size=10):
        filled = int(round(rating))
        for i in range(5):
            col = self.T("primary") if i < filled else self.T("border")
            self.c.create_text(x + i*(size+2), y, text="★", fill=col,
                               font=("Helvetica", size), anchor="w")

    def _show_toast(self, text, color=None):
        if color is None: color = self.T("primary")
        if self._toast_id:
            self.after_cancel(self._toast_id)
        self._toast_text  = text
        self._toast_color = color
        self._animate_toast(0)

    def _animate_toast(self, step):
        self.c.delete("toast")
        if step > 70: return
        if step < 8:
            y = NOTCH_H - 44 + step * 8
        elif step < 55:
            y = NOTCH_H + 20
        else:
            y = NOTCH_H + 20 - (step-55)*8
        self.rr(20, y, W-20, y+36, r=18,
                fill=self._toast_color, outline="", tags="toast")
        self.c.create_text(W//2, y+18, text=self._toast_text,
                           fill="white", font=self.FSB(-1), tags="toast")
        self._toast_id = self.after(22, lambda: self._animate_toast(step+1))

    # ══ LOGIN ═════════════════════════════════════════════════════════════════
    def _login(self):
        self.clear()
        self._gradient(0, 0, W, H, "#FFF9F5", "#FDE8EF")
        self.status_bar()

        # Hero card
        self.shadow(28, 110, W-28, 268, r=self.R(12))
        self.rr(28, 110, W-28, 268, r=self.R(12), fill=self.T("white"), outline=self.T("border"))
        self.c.create_text(W//2, 168, text="twirl", fill=self.T("primary"),
                           font=("Helvetica", 54, "bold italic"))
        self.c.create_text(W//2, 214, text="rent. wear. repeat.", fill=self.T("muted"), font=self.FS())
        self.c.create_text(W//2, 238, text="✦ trusted by 2,400+ sorority women ✦",
                           fill=self.T("rose"), font=self.FS(-2))

        # Inputs
        lbl_style = self.FS(-2)
        self.c.create_text(32, 292, text="College Email", fill=self.T("muted"), font=lbl_style, anchor="w")
        self._input(32, 308, W-64, 50, "email", "yourname@school.edu")
        self.c.create_text(32, 372, text="Password", fill=self.T("muted"), font=lbl_style, anchor="w")
        self._input(32, 388, W-64, 50, "password", "••••••••", secret=True)

        fp = self.c.create_text(W-32, 454, text="Forgot password?",
                                fill=self.T("primary"), font=self.FS(-2), anchor="e")

        # CTA
        self.shadow(32, 468, W-32, 524, r=26)
        self.pill_btn(32, 468, W-64, 56, self.T("primary"), "Sign In", fd=1,
                      cmd=lambda: [self.__setattr__("logged_in",True),
                                   self.__setattr__("form_values",{}),
                                   self._tab("browse")])

        # Divider
        self.c.create_line(32, 542, W//2-28, 542, fill=self.T("border"))
        self.c.create_text(W//2, 542, text="or", fill=self.T("muted"), font=self.FS(-2))
        self.c.create_line(W//2+28, 542, W-32, 542, fill=self.T("border"))

        # Apple + Google (visual)
        for i, (ico, lbl) in enumerate([("🍎","Continue with Apple"),("G","Continue with Google")]):
            bx = 32; by = 558 + i*60
            self.shadow(bx, by, W-32, by+48, r=24)
            self.rr(bx, by, W-32, by+48, r=24, fill=self.T("white"), outline=self.T("border"))
            self.c.create_text(bx+24, by+24, text=ico, font=("Helvetica",16), anchor="w")
            self.c.create_text(W//2, by+24, text=lbl, fill=self.T("text"), font=self.FSB(-1))

        # Sign up link
        self.c.create_text(W//2, 696, text="New to Twirl?", fill=self.T("muted"), font=self.FS(), anchor="e")
        su = self.c.create_text(W//2+4, 696, text="Join free →", fill=self.T("primary"), font=self.FSB(), anchor="w")
        self.c.tag_bind(su, "<Button-1>", lambda e: self._render("signup"))

    # ══ SIGNUP ════════════════════════════════════════════════════════════════
    def _signup(self):
        self.clear()
        self._gradient(0, 0, W, H, self.T("cream"), self.T("blush"))
        self.status_bar()
        self._header("Join Twirl", back=True)

        # Progress bar
        bar_y = NOTCH_H + 62
        self.c.create_text(W//2, bar_y-8, text="Step 1 of 2", fill=self.T("muted"), font=self.FS(-3))
        self.rr(32, bar_y, W-32, bar_y+6, r=3, fill=self.T("border"), outline="")
        self.rr(32, bar_y, W//2, bar_y+6, r=3, fill=self.T("primary"), outline="")

        y = NOTCH_H + 90
        self.c.create_text(32, y, text="Let's get started ✨",
                           fill=self.T("text"), font=self.FSB(4), anchor="w"); y += 36

        for key, ph, lbl in [("name","Your full name","Full Name"),
                               ("email","yourname@school.edu","College Email (.edu)"),
                               ("password","At least 8 characters","Password")]:
            self.c.create_text(32, y, text=lbl, fill=self.T("muted"), font=self.FS(-2), anchor="w"); y += 16
            self._input(32, y, W-64, 50, key, ph, secret=(key=="password")); y += 66

        self.shadow(32, y+6, W-32, y+62, r=28)
        self.pill_btn(32, y+6, W-64, 56, self.T("primary"), "Next  →", fd=1,
                      cmd=lambda: self._render("signup2"))

    def _signup2(self):
        self.clear()
        self._gradient(0, 0, W, H, self.T("cream"), self.T("blush"))
        self.status_bar()
        self._header("Your Style", back=True)

        bar_y = NOTCH_H + 62
        self.c.create_text(W//2, bar_y-8, text="Step 2 of 2", fill=self.T("muted"), font=self.FS(-3))
        self.rr(32, bar_y, W-32, bar_y+6, r=3, fill=self.T("border"), outline="")
        self.rr(32, bar_y, W-32, bar_y+6, r=3, fill=self.T("primary"), outline="")

        y = NOTCH_H + 90
        self.c.create_text(32, y, text="Which SEC campus? 🏛️",
                           fill=self.T("text"), font=self.FSB(4), anchor="w"); y += 36

        schools = ["University of Alabama","Auburn University","University of Florida",
                   "University of Georgia","LSU","Ole Miss","University of Tennessee","Vanderbilt"]
        sel = self.form_values.get("school", schools[0])
        self.c.create_text(32, y, text="School", fill=self.T("muted"), font=self.FS(-2), anchor="w"); y += 16
        self.shadow(32, y, W-32, y+50, r=self.R())
        self.rr(32, y, W-32, y+50, fill=self.T("white"), outline=self.T("border"))
        self.c.create_text(48, y+25, text=sel, fill=self.T("text"), font=self.FS(), anchor="w")
        self.c.create_text(W-40, y+25, text="›", fill=self.T("primary"), font=self.FSB(4))
        ov = self.rr(32, y, W-32, y+50, fill="", outline="")
        def pick_school(e):
            win = tk.Toplevel(self); win.title("Your Campus")
            win.geometry(f"270x300+{self.winfo_x()+60}+{self.winfo_y()+220}")
            win.configure(bg="#111120"); win.grab_set()
            lb = tk.Listbox(win, font=("Helvetica",12), bg="#1A1A2E", fg="white",
                            selectbackground=self.T("primary"), bd=0, highlightthickness=0)
            for s in schools: lb.insert("end", s)
            lb.pack(fill="both", expand=True, padx=8, pady=8)
            def choose(ev=None):
                s2 = lb.curselection()
                if s2: self.form_values["school"] = schools[s2[0]]
                win.destroy(); self._rerender()
            lb.bind("<Double-Button-1>", choose)
            tk.Button(win, text="Select", bg=self.T("primary"), fg="white",
                      font=("Helvetica",11,"bold"), bd=0, pady=6,
                      command=choose).pack(fill="x", padx=8, pady=4)
        self.c.tag_bind(ov, "<Button-1>", pick_school)
        y += 62

        self.c.create_text(32, y, text="Sorority (optional)", fill=self.T("muted"), font=self.FS(-2), anchor="w"); y += 16
        self._input(32, y, W-64, 50, "sorority", "e.g. Alpha Delta Pi"); y += 66

        self.c.create_text(32, y, text="Your Size", fill=self.T("muted"), font=self.FS(-2), anchor="w"); y += 18
        sel_sz = self.form_values.get("size", "S"); sx2 = 32
        for sz in ["XS","S","M","L","XL","XXL"]:
            active = sz == sel_sz
            bg = self.T("primary") if active else self.T("white")
            fg = "white" if active else self.T("muted")
            w2 = 46 if len(sz) < 3 else 54
            b2 = self.rr(sx2, y, sx2+w2, y+40, r=10, fill=bg, outline=self.T("border"))
            t2 = self.c.create_text(sx2+w2//2, y+20, text=sz, fill=fg, font=self.FSB(-1))
            for itm in [b2,t2]:
                self.c.tag_bind(itm, "<Button-1>",
                                lambda e,s=sz: [self.form_values.update({"size":s}), self._render("signup2")])
            sx2 += w2+8
        y += 56

        self.shadow(32, y+4, W-32, y+60, r=28)
        self.pill_btn(32, y+4, W-64, 56, self.T("primary"), "Join Twirl 🎀", fd=1,
                      cmd=lambda: [self.__setattr__("logged_in",True), self._tab("browse")])

    # ══ BROWSE ════════════════════════════════════════════════════════════════
    def _browse(self):
        self.clear()
        self.c.create_rectangle(0, 0, W, H, fill=self.T("cream"), outline="")
        self.status_bar()

        # Header
        self.c.create_rectangle(0, NOTCH_H, W, NOTCH_H+48, fill=self.T("white"), outline="")
        self.c.create_text(20, NOTCH_H+24, text="twirl", fill=self.T("text"),
                           font=("Helvetica", 22, "bold"), anchor="w")
        self.c.create_text(74, NOTCH_H+24, text="✨", fill=self.T("primary"),
                           font=("Helvetica", 18), anchor="w")
        name = self.form_values.get("name","").split()[0] if self.form_values.get("name") else "Savannah"
        self.c.create_text(W-16, NOTCH_H+16, text=f"Hey {name} 👋",
                           fill=self.T("muted"), font=self.FS(-2), anchor="e")
        # Notification bell
        bell = self.c.create_text(W-16, NOTCH_H+34, text="🔔", font=("Helvetica",14), anchor="e")

        # Search bar
        bar_y = NOTCH_H + 54
        self.rr(14, bar_y, W-14, bar_y+38, r=19, fill=self.T("blush"), outline="")
        self.c.create_text(34, bar_y+19, text="🔍", font=self.FS())
        sv = self.form_values.get("search","")
        self.c.create_text(56, bar_y+19, text=sv or "search dresses, sizes, occasions...",
                           fill=self.T("text") if sv else "#C8B0C0",
                           font=self.FS(-1), anchor="w")
        sr = self.rr(14, bar_y, W-14, bar_y+38, r=19, fill="", outline="")
        self.c.tag_bind(sr, "<Button-1>", lambda e: self._popup("search","Search"))

        # Filter chips
        chips_y = NOTCH_H + 98
        self.c.create_rectangle(0, chips_y, W, chips_y+38, fill=self.T("white"), outline="")
        self.c.create_line(0, chips_y+38, W, chips_y+38, fill=self.T("border"))
        cx = 10
        for occ in OCCASIONS:
            active = self.selected_occ == occ
            bg = self.T("primary") if active else self.T("white")
            fg = "white" if active else self.T("muted")
            tw = len(occ)*7+18
            self.rr(cx, chips_y+7, cx+tw, chips_y+31, r=12, fill=bg,
                    outline=self.T("primary") if active else "#F9A8D4")
            t = self.c.create_text(cx+tw//2, chips_y+19, text=occ, fill=fg,
                                   font=self.FSB(-2) if active else self.FS(-2))
            self.c.tag_bind(t, "<Button-1>",
                            lambda e,o=occ: [self.__setattr__("selected_occ",o),
                                             self.__setattr__("scroll_y",0),
                                             self._browse()])
            cx += tw+7

        # Stories row
        stories_y = NOTCH_H + 142 - self.scroll_y
        if stories_y > NOTCH_H+136 and stories_y < H - TABBAR_H - 40:
            self.c.create_rectangle(0, max(NOTCH_H+136, stories_y), W,
                                    max(NOTCH_H+136, stories_y)+78, fill=self.T("white"), outline="")
            self.c.create_text(14, max(NOTCH_H+136, stories_y)+8, text="New From Your Campus",
                               fill=self.T("text"), font=self.FSB(-2), anchor="w")
            sx = 14
            for st in STORIES:
                sy = max(NOTCH_H+136, stories_y) + 22
                if sx + 58 > W - 10: break
                ring_col = self.T("primary") if st["new"] else self.T("border")
                self.c.create_oval(sx-3, sy-3, sx+55, sy+55, fill=ring_col, outline="")
                self.c.create_oval(sx, sy, sx+52, sy+52, fill=st["color"], outline="")
                self.c.create_text(sx+26, sy+26, text=st["emoji"], font=("Helvetica",18))
                self.c.create_text(sx+26, sy+60, text=st["name"],
                                   fill=self.T("muted"), font=self.FS(-3))
                sx += 64

        # Hero featured card
        hero_y = NOTCH_H + 226 - self.scroll_y
        if hero_y < H - TABBAR_H - 20 and hero_y + 128 > NOTCH_H + 136:
            hero_item = ITEMS[2]  # Red Satin Slip (most saves)
            if hero_y > NOTCH_H + 136:
                self.shadow(14, hero_y, W-14, hero_y+124, r=self.R(6))
            self.rr(14, max(NOTCH_H+136, hero_y), W-14, hero_y+124,
                    r=self.R(6), fill=hero_item["color"], outline="")
            # Gradient overlay
            mid = max(NOTCH_H+136, hero_y)
            self._gradient(14, mid+60, W-14, hero_y+124, hero_item["color"], "#00000022")
            # Badge
            self.rr(26, max(NOTCH_H+138, hero_y+8), 150, max(NOTCH_H+156, hero_y+26),
                    r=9, fill=self.T("rose"), outline="")
            self.c.create_text(88, max(NOTCH_H+147, hero_y+17),
                               text="🔥 Trending This Weekend", fill="white", font=self.FSB(-3))
            # Content
            ey = max(NOTCH_H+136, hero_y)+62
            self.c.create_text(W//2, ey, text=hero_item["emoji"], font=("Helvetica",36))
            self.c.create_text(26, hero_y+92, text=hero_item["title"],
                               fill=self.T("text"), font=self.FSB(2), anchor="w")
            self.c.create_text(26, hero_y+110, text=f"${hero_item['price']}/day · 💕 {hero_item['saves']} saves",
                               fill=self.T("muted"), font=self.FS(-2), anchor="w")
            self.rr(W-100, hero_y+96, W-22, hero_y+120, r=12,
                    fill=self.T("primary"), outline="")
            self.c.create_text(W-61, hero_y+108, text="Rent Now", fill="white", font=self.FSB(-2))
            hero_ov = self.rr(14, max(NOTCH_H+136, hero_y), W-14, hero_y+124, fill="", outline="")
            self.c.tag_bind(hero_ov, "<Button-1>",
                            lambda e,it=hero_item: [self.__setattr__("selected_item",it),
                                                     self._push("item")])

        # Section label
        sec_y = NOTCH_H + 356 - self.scroll_y
        if sec_y > NOTCH_H + 136:
            self.c.create_text(16, sec_y, text="Available Now", fill=self.T("text"),
                               font=self.FSB(1), anchor="w")
            items_filter = ITEMS if self.selected_occ=="All" else [i for i in ITEMS if i["occasion"]==self.selected_occ]
            self.c.create_text(W-16, sec_y, text=f"{len(items_filter)} items",
                               fill=self.T("muted"), font=self.FS(-2), anchor="e")

        # Grid
        items = ITEMS if self.selected_occ=="All" else [i for i in ITEMS if i["occasion"]==self.selected_occ]
        cw = (W-36)//2
        ch = int(cw*1.52)
        gap = self.theme["card_gap"]
        top = NOTCH_H + 374 - self.scroll_y
        clip_top = NOTCH_H + 136

        for idx, item in enumerate(items):
            col = idx%2; row = idx//2
            x = 12+col*(cw+gap); y = top+row*(ch+gap)
            if y+ch < clip_top or y > H-TABBAR_H: continue

            self.shadow(x, y, x+cw, y+ch)
            self.rr(x, y, x+cw, y+ch, fill=self.T("white"), outline="")

            ph = int(cw*1.1)
            self.rr(x, y, x+cw, y+ph, fill=item["color"], outline="")
            self.c.create_text(x+cw//2, y+ph//2-6, text=item["emoji"], font=("Helvetica",38))

            # Social proof badge
            if item.get("looking", 0) > 0:
                lk = item["looking"]
                self.rr(x+6, y+6, x+6+len(f"👀 {lk}")*7+8, y+24, r=10,
                        fill="#00000055", outline="")
                self.c.create_text(x+10, y+15, text=f"👀 {lk}",
                                   fill="white", font=self.FSB(-4), anchor="w")

            # Heart button
            saved = item["title"] in self.saved_items
            hcol = self.T("rose") if saved else "#00000044"
            hico = "♥" if saved else "♡"
            heart_bg = self.rr(x+cw-34, y+6, x+cw-6, y+34, r=14, fill="#FFDDF0", outline="")
            heart = self.c.create_text(x+cw-20, y+20, text=hico, fill=hcol, font=("Helvetica",14))
            def toggle_save(e, it=item):
                if it["title"] in self.saved_items:
                    self.saved_items.discard(it["title"])
                    self._show_toast("Removed from saved")
                else:
                    self.saved_items.add(it["title"])
                    self._show_toast(f"Saved! 💕")
                self._rerender()
            for h in [heart_bg, heart]:
                self.c.tag_bind(h, "<Button-1>", toggle_save)

            # Info
            ty = y+ph+8
            self.c.create_text(x+10, ty, text=item["title"], fill=self.T("text"),
                               font=self.FSB(-1), anchor="w", width=cw-48)
            # Size badge
            self.rr(x+cw-38, ty+14, x+cw-8, ty+32, r=7, fill=self.T("blush"), outline="")
            self.c.create_text(x+cw-23, ty+23, text=item["size"],
                               fill=self.T("primary"), font=self.FSB(-3))
            # Price
            self.c.create_text(x+10, ty+24, text=f"${item['price']}",
                               fill=self.T("primary"), font=self.FSB(), anchor="w")
            self.c.create_text(x+10+len(str(item['price']))*8+4, ty+24, text="/day",
                               fill=self.T("muted"), font=self.FS(-3), anchor="w")
            # Saves
            self.c.create_text(x+10, ty+42, text=f"💕 {item['saves']}",
                               fill=self.T("muted"), font=self.FS(-3), anchor="w")
            # Stars
            self._stars(x+cw-80, ty+42, item.get("rating",4.9), size=8)

            ov = self.rr(x, y, x+cw, y+ch, fill="", outline="")
            self.c.tag_bind(ov, "<Button-1>",
                            lambda e,it=item: [self.__setattr__("selected_item",it),
                                               self._push("item")])

        self.tab_bar()

    # ══ ITEM DETAIL ═══════════════════════════════════════════════════════════
    def _item(self):
        item = self.selected_item
        if not item: return self._browse()
        self.clear()
        self.c.create_rectangle(0, 0, W, H, fill=self.T("white"), outline="")

        # Hero image area
        ih = 310
        self._gradient(0, 0, W, ih+30, item["color"], self.T("white"))
        self.rr(0, 0, W, ih+30, r=0, fill=item["color"], outline="")
        self._gradient(0, ih-60, W, ih+30, item["color"]+"00", self.T("white"))
        self.c.create_text(W//2, ih//2-16, text=item["emoji"], font=("Helvetica",88))

        # Dots
        for i in range(3):
            col = self.T("primary") if i==0 else self.T("border")
            self.c.create_oval(W//2-20+i*18, ih-10, W//2-8+i*18, ih+2, fill=col, outline="")

        # Floating back
        self.rr(12,52,54,94, r=21, fill="#00000066", outline="")
        b = self.c.create_text(33,73, text="‹", fill="white", font=("Helvetica",26,"bold"))
        self.c.tag_bind(b, "<Button-1>", lambda e: self._back())

        # Floating save
        saved = item["title"] in self.saved_items
        hcol  = self.T("rose") if saved else "white"
        hico  = "♥" if saved else "♡"
        self.rr(W-54,52,W-12,94, r=21, fill="#00000066", outline="")
        h2 = self.c.create_text(W-33, 73, text=hico, fill=hcol, font=("Helvetica",22))
        def toggle_hero_save(e):
            if item["title"] in self.saved_items:
                self.saved_items.discard(item["title"])
                self._show_toast("Removed from saved")
            else:
                self.saved_items.add(item["title"])
                self._show_toast("Saved! 💕")
            self._rerender()
        self.c.tag_bind(h2, "<Button-1>", toggle_hero_save)

        # Content sheet
        cy = ih - 8
        self.rr(0, cy, W, H, r=28, fill=self.T("white"), outline="")

        # Title + price
        self.c.create_text(20, cy+26, text=item["title"], fill=self.T("text"),
                           font=self.FSB(6), anchor="w", width=W-120)
        self.c.create_text(W-20, cy+20, text=f"${item['price']}", fill=self.T("primary"),
                           font=self.FSB(8), anchor="e")
        self.c.create_text(W-20, cy+42, text="per day", fill=self.T("muted"),
                           font=self.FS(-2), anchor="e")

        # Rating row
        self.c.create_text(20, cy+56, text=f"{item.get('rating',4.9)}",
                           fill=self.T("text"), font=self.FSB(-1), anchor="w")
        self._stars(52, cy+56, item.get("rating",4.9), size=11)
        self.c.create_text(128, cy+56, text=f"· {len(item.get('reviews',[]))} reviews",
                           fill=self.T("muted"), font=self.FS(-2), anchor="w")

        # Tags row
        tag_y = cy+74
        self.rr(20, tag_y, 78, tag_y+24, r=10, fill=self.T("blush"), outline="")
        self.c.create_text(49, tag_y+12, text=f"Size {item['size']}", fill=self.T("primary"), font=self.FSB(-2))
        self.rr(86, tag_y, 180, tag_y+24, r=10, fill="#FFF1F2", outline="")
        self.c.create_text(133, tag_y+12, text=f"${item['deposit']} deposit", fill=self.T("muted"), font=self.FS(-2))
        self.rr(188, tag_y, 240, tag_y+24, r=10, fill="#F0FDF4", outline="")
        self.c.create_text(214, tag_y+12, text=item["occasion"], fill="#16A34A", font=self.FS(-3))

        # Social proof
        sp_y = cy+108
        if item.get("looking",0) > 0:
            self.rr(20, sp_y, W-20, sp_y+28, r=10, fill="#FFF7ED", outline="#FED7AA")
            self.c.create_text(W//2, sp_y+14,
                               text=f"🔥  {item['looking']} girls are looking at this right now",
                               fill="#C2410C", font=self.FSB(-2))
            sp_y += 36

        # Description
        self.c.create_text(20, sp_y+4, text=item["desc"],
                           fill=self.T("muted"), font=self.FS(-1), anchor="nw", width=W-40)

        # Owner card
        oy = sp_y+56
        self.shadow(16, oy, W-16, oy+68)
        self.rr(16, oy, W-16, oy+68, r=self.R(2), fill=self.T("blush"), outline="")
        self.c.create_oval(26, oy+10, 66, oy+58, fill=self.T("white"), outline="")
        self.c.create_text(46, oy+34, text="👤", font=("Helvetica",18))
        self.c.create_text(76, oy+22, text=item["owner"], fill=self.T("text"), font=self.FSB(), anchor="w")
        self.c.create_text(76, oy+40, text=item["school"], fill=self.T("muted"), font=self.FS(-2), anchor="w")
        self.c.create_text(76, oy+56, text="✓ Verified Member", fill=self.T("success"), font=self.FSB(-3), anchor="w")
        self.c.create_text(W-24, oy+34, text="4.9★", fill=self.T("primary"), font=self.FSB())

        # Dates
        dy = oy+80
        self.c.create_text(20, dy, text="Select Dates", fill=self.T("text"), font=self.FSB(1), anchor="w")
        for i,(lbl,date) in enumerate([("From","Apr 25"),("Until","Apr 28")]):
            bx = 16+i*(W//2)
            self.shadow(bx, dy+16, bx+W//2-10, dy+60)
            self.rr(bx, dy+16, bx+W//2-10, dy+60, fill=self.T("white"), outline=self.T("border"))
            self.c.create_text(bx+12, dy+28, text=lbl, fill=self.T("muted"), font=self.FS(-2), anchor="w")
            self.c.create_text(bx+12, dy+48, text=date, fill=self.T("text"), font=self.FSB(), anchor="w")
            self.c.create_text(bx+W//2-20, dy+44, text="📅", font=("Helvetica",12))

        # Price breakdown
        py = dy+76
        self.shadow(16, py, W-16, py+100)
        self.rr(16, py, W-16, py+100, fill=self.T("white"), outline=self.T("border"))
        total = item['price']*3 + round(item['price']*3*0.15) + item['deposit']
        self.c.create_text(28, py+14, text="Price Breakdown", fill=self.T("text"), font=self.FSB(), anchor="w")
        for i,(lbl,val) in enumerate([(f"${item['price']}/day × 3 days", f"${item['price']*3}"),
                                       ("Service fee (15%)", f"${round(item['price']*3*0.15)}"),
                                       ("Security deposit (held)", f"${item['deposit']}")]):
            ry = py+34+i*22
            self.c.create_text(28, ry, text=lbl, fill=self.T("muted"), font=self.FS(-2), anchor="w")
            self.c.create_text(W-28, ry, text=val, fill=self.T("text"), font=self.FS(-1), anchor="e")
        self.c.create_line(28, py+88, W-28, py+88, fill=self.T("border"))
        self.c.create_text(28, py+96, text="Total", fill=self.T("text"), font=self.FSB(), anchor="w")
        self.c.create_text(W-28, py+96, text=f"${total}", fill=self.T("primary"), font=self.FSB(4), anchor="e")

        # Reviews
        rv_y = py+112
        reviews = item.get("reviews",[])
        if reviews:
            self.c.create_text(20, rv_y, text="Reviews", fill=self.T("text"), font=self.FSB(1), anchor="w")
            rv_y += 22
            for rev in reviews[:2]:
                self.shadow(16, rv_y, W-16, rv_y+72)
                self.rr(16, rv_y, W-16, rv_y+72, fill=self.T("white"), outline="")
                self.c.create_text(28, rv_y+14, text=rev["user"], fill=self.T("text"), font=self.FSB(-1), anchor="w")
                self._stars(28, rv_y+30, rev["stars"], size=10)
                self.c.create_text(28, rv_y+48, text=rev["text"],
                                   fill=self.T("muted"), font=self.FS(-2), anchor="nw", width=W-56)
                rv_y += 82

        # CTA
        cta_y = H - TABBAR_H - 72
        self.c.create_rectangle(0, cta_y-12, W, H-TABBAR_H, fill=self.T("white"), outline="")
        self.c.create_line(0, cta_y-12, W, cta_y-12, fill=self.T("border"))
        self.shadow(16, cta_y, W-16, cta_y+54, r=27)
        self.pill_btn(16, cta_y, W-32, 54, self.T("primary"),
                      f"Review Contract · ${total}", fd=1,
                      cmd=lambda: [self.__setattr__("contract_item",item), self._push("contract")])
        self.c.create_text(W//2, cta_y+64,
                           text=f"${item['deposit']} deposit · auto-refunded on safe return",
                           fill=self.T("muted"), font=self.FS(-3))
        self.tab_bar()

    # ══ CONTRACT ══════════════════════════════════════════════════════════════
    def _contract(self):
        item = self.contract_item or self.selected_item
        if not item: return self._back()
        self.clear()
        self.c.create_rectangle(0, 0, W, H, fill=self.T("cream"), outline="")
        self.status_bar()
        self._header("Rental Contract", "read carefully before signing")

        y = NOTCH_H+72 - self.scroll_y

        self.shadow(14, y, W-14, y+120)
        self.rr(14, y, W-14, y+120, fill=self.T("white"), outline="")
        self.rr(24, y+10, 82, y+78, r=self.R(), fill=item["color"], outline="")
        self.c.create_text(53, y+44, text=item["emoji"], font=("Helvetica",24))
        self.c.create_text(92, y+24, text=item["title"], fill=self.T("text"),
                           font=self.FSB(), anchor="w", width=220)
        self.c.create_text(92, y+42, text=f"${item['price']}/day · Size {item['size']}",
                           fill=self.T("muted"), font=self.FS(-2), anchor="w")
        total = item['price']*3+round(item['price']*3*0.15)+item['deposit']
        self.c.create_line(24, y+84, W-24, y+84, fill=self.T("border"))
        for i,(lbl,val) in enumerate([("3-day rental + 15% fee", f"${item['price']*3+round(item['price']*3*0.15)}"),
                                       ("Security deposit (refundable)", f"${item['deposit']}")]):
            self.c.create_text(26, y+96+i*16, text=lbl, fill=self.T("muted"), font=self.FS(-3), anchor="w")
            self.c.create_text(W-26, y+96+i*16, text=val, fill=self.T("text"), font=self.FSB(-3), anchor="e")
        y += 132

        # Terms
        term_h = 20 + len(CONTRACT_TERMS)*76
        self.shadow(14, y, W-14, y+term_h)
        self.rr(14, y, W-14, y+term_h, fill=self.T("white"), outline="")
        self.c.create_text(26, y+14, text="📋  Rental Agreement v2.0",
                           fill=self.T("text"), font=self.FSB(1), anchor="w")
        ty2 = y+36
        for i,(title,body) in enumerate(CONTRACT_TERMS):
            if i > 0: self.c.create_line(26, ty2-6, W-26, ty2-6, fill=self.T("border"))
            self.c.create_text(26, ty2, text=title, fill=self.T("text"), font=self.FSB(-1), anchor="w")
            self.c.create_text(26, ty2+14, text=body, fill=self.T("muted"),
                               font=self.FS(-2), anchor="nw", width=W-52)
            ty2 += 76
        y = ty2+16

        agreed = getattr(self, "agreed", False)
        self.shadow(14, y, W-14, y+74)
        self.rr(14, y, W-14, y+74, fill=self.T("white"),
                outline=self.T("primary") if agreed else self.T("border"))
        self.rr(24, y+22, 52, y+52, r=8,
                fill=self.T("primary") if agreed else self.T("white"),
                outline=self.T("primary"))
        if agreed:
            self.c.create_text(38, y+37, text="✓", fill="white", font=self.FSB())
        self.c.create_text(60, y+37,
                           text=f"I agree to the rental contract and understand\nthe ${item['deposit']} security deposit will be held.",
                           fill=self.T("text"), font=self.FS(-2), anchor="w", width=W-76)
        ov = self.rr(14, y, W-14, y+74, fill="", outline="")
        self.c.tag_bind(ov, "<Button-1>",
                        lambda e: [self.__setattr__("agreed", not getattr(self,"agreed",False)),
                                   self._rerender()])
        y += 86

        btn_color = self.T("primary") if agreed else "#E5E7EB"
        btn_text  = "white" if agreed else "#9CA3AF"
        self.shadow(14, y, W-14, y+56, r=28)
        self.pill_btn(14, y, W-28, 56, btn_color,
                      f"Agree & Pay ${total}" if agreed else "Agree to Contract First",
                      fg=btn_text, fd=1,
                      cmd=(lambda: [self.__setattr__("agreed",False), self._push("confirm")]) if agreed else None)
        y += 72
        self.c.create_text(W//2, y,
                           text="You won't be charged until the owner approves",
                           fill=self.T("muted"), font=self.FS(-3))

        self.tab_bar()

    # ══ CONFIRM ═══════════════════════════════════════════════════════════════
    def _confirm(self):
        item = self.contract_item or self.selected_item
        if not item: return self._back()
        total = item['price']*3+round(item['price']*3*0.15)+item['deposit']
        self.clear()
        self.c.create_rectangle(0, 0, W, H, fill=self.T("cream"), outline="")
        self.status_bar()
        self._header("Secure Payment", "deposit held · auto-refunded")

        y = NOTCH_H+72

        # Card visual
        self.shadow(20, y, W-20, y+100, r=22)
        self._gradient(20, y, W-20, y+100, "#2D1F3A", "#1C1024")
        self.rr(20, y, W-20, y+100, r=22, fill="", outline="#3D2F4A")
        # Card shine
        self.c.create_oval(W-80, y+6, W-20, y+66, fill="#FFFFFF08", outline="")
        self.c.create_text(38, y+28, text="•••• •••• •••• 4242",
                           fill="white", font=("Courier",14), anchor="w")
        self.c.create_text(38, y+58, text="SAVANNAH M.", fill="#AAAAAA",
                           font=("Helvetica",10), anchor="w")
        self.c.create_text(W-38, y+58, text="VISA", fill="white",
                           font=("Helvetica",16,"bold"), anchor="e")
        self.c.create_text(W-38, y+28, text="05/28", fill="#AAAAAA",
                           font=("Helvetica",10), anchor="e")
        y += 116

        # Breakdown
        self.shadow(20, y, W-20, y+130)
        self.rr(20, y, W-20, y+130, fill=self.T("white"), outline="")
        self.c.create_text(32, y+18, text="Payment Summary", fill=self.T("text"), font=self.FSB(1), anchor="w")
        rows = [
            (f"Rental fee (3 days @ ${item['price']})", f"${item['price']*3}"),
            ("Service fee (15%)",                       f"${round(item['price']*3*0.15)}"),
            ("Security deposit (held, refundable)",      f"${item['deposit']}"),
        ]
        for i,(lbl,val) in enumerate(rows):
            ry = y+42+i*26
            if "deposit" in lbl:
                self.rr(28, ry-8, W-28, ry+18, r=8, fill="#F0FDF4", outline="")
            self.c.create_text(32, ry, text=lbl, fill=self.T("muted"), font=self.FS(-2), anchor="w")
            self.c.create_text(W-32, ry, text=val, fill=self.T("text"), font=self.FSB(-2), anchor="e")
        self.c.create_line(30, y+120, W-30, y+120, fill=self.T("border"))
        self.c.create_text(32, y+127, text="Total charged today", fill=self.T("text"), font=self.FSB(), anchor="w")
        self.c.create_text(W-32, y+127, text=f"${total}", fill=self.T("primary"), font=self.FSB(4), anchor="e")
        y += 146

        # Deposit protection box
        self.rr(20, y, W-20, y+76, r=self.R(), fill=self.T("blush"), outline="")
        self.c.create_text(34, y+14, text="🔒  Security Deposit Protection",
                           fill=self.T("primary"), font=self.FSB(-1), anchor="w")
        self.c.create_text(34, y+34, text=f"${item['deposit']} held on your card. Automatically released",
                           fill=self.T("text"), font=self.FS(-2), anchor="w")
        self.c.create_text(34, y+52, text="within 48hrs of confirmed safe return.",
                           fill=self.T("text"), font=self.FS(-2), anchor="w")
        y += 92

        self.shadow(20, y, W-20, y+56, r=28)
        self.pill_btn(20, y, W-40, 56, self.T("primary"), f"Pay ${total} Now",
                      cmd=lambda: self._render("done"), fd=2)

        self.tab_bar()

    # ══ DONE ══════════════════════════════════════════════════════════════════
    def _done(self):
        item = self.contract_item or self.selected_item
        self.clear()
        self._gradient(0, 0, W, H, self.T("cream"), self.T("blush"))
        self.status_bar()

        self._start_confetti()

        self.c.create_text(W//2, 240, text="🎀", font=("Helvetica",80), tags="done_content")
        self.c.create_text(W//2, 340, text="You're all set!", fill=self.T("text"),
                           font=("Helvetica",30,"bold"), tags="done_content")
        self.c.create_text(W//2, 376, text="Request sent & contract signed.",
                           fill=self.T("muted"), font=self.FS(), tags="done_content")
        if item:
            self.c.create_text(W//2, 400, text=f"{item['owner']} will confirm within 24h.",
                               fill=self.T("muted"), font=self.FS(), tags="done_content")

        # Timer bar
        self.rr(40, 426, W-40, 438, r=6, fill=self.T("border"), outline="")
        self.rr(40, 426, 40+int((W-80)*0.7), 438, r=6, fill=self.T("primary"), outline="")
        self.c.create_text(W//2, 448, text="Owner notified · expires in 23h 58m",
                           fill=self.T("muted"), font=self.FS(-3))

        self.shadow(40, 472, W-40, 528, r=28)
        self.pill_btn(40, 472, W-80, 56, self.T("primary"), "View My Rentals",
                      cmd=lambda: self._tab("rentals"), fd=1)

        b2 = self.rr(40, 540, W-40, 592, r=self.R(), fill=self.T("white"), outline=self.T("border"))
        t2 = self.c.create_text(W//2, 566, text="Back to Browse", fill=self.T("primary"), font=self.FSB())
        for itm in [b2,t2]:
            self.c.tag_bind(itm, "<Button-1>", lambda e: self._tab("browse"))

        self.tab_bar()

    def _start_confetti(self):
        random.seed()
        colors = [self.T("primary"),self.T("rose"),"#A78BFA","#34D399","#FBBF24","#60A5FA"]
        self._confetti_pts = [
            {"x":random.randint(10,W-10), "y":random.randint(-80,-10),
             "vx":random.uniform(-1.2,1.2), "vy":random.uniform(2,5),
             "r":random.randint(4,9), "color":random.choice(colors), "rot":random.uniform(0,6)}
            for _ in range(34)
        ]
        self._animate_confetti(0)

    def _animate_confetti(self, step):
        self.c.delete("confetti")
        if step > 55: return
        for p in self._confetti_pts:
            x = p["x"] + p["vx"]*step
            y = p["y"] + p["vy"]*step + 0.08*step*step
            r = p["r"]
            if 0 < y < H-TABBAR_H:
                self.c.create_oval(x, y, x+r, y+r, fill=p["color"], outline="", tags="confetti")
        self.after(28, lambda: self._animate_confetti(step+1))

    # ══ LIST ══════════════════════════════════════════════════════════════════
    def _list(self):
        self.clear()
        self.c.create_rectangle(0, 0, W, H, fill=self.T("cream"), outline="")
        self.status_bar()
        self._header("List Your Piece", "earn money from your closet", back=False)

        y = NOTCH_H+66 - self.scroll_y

        self.c.create_text(20, y, text="Photos", fill=self.T("text"), font=self.FSB(), anchor="w"); y += 20
        for i in range(5):
            sx = 18+i*70
            bg  = self.T("blush") if i==0 else self.T("white")
            brd = self.T("primary") if i==0 else self.T("border")
            self.rr(sx, y, sx+62, y+82, r=self.R(), fill=bg, outline=brd)
            if i==0:
                self.c.create_text(sx+31, y+32, text="👗", font=("Helvetica",22))
                self.c.create_text(sx+31, y+62, text="+ Photo", fill=self.T("primary"), font=self.FSB(-3))
            else:
                self.c.create_text(sx+31, y+44, text="+", fill=self.T("border"), font=("Helvetica",28))
        y += 100

        for key, ph, lbl in [("item_title","e.g. Pink Sequin Mini Dress","Item Name *"),
                               ("item_brand","e.g. ASTR the Label","Brand"),
                               ("item_desc","Condition, fit notes, alterations...","Description")]:
            self.c.create_text(20, y, text=lbl, fill=self.T("muted"), font=self.FS(-2), anchor="w"); y += 16
            h = 52 if key != "item_desc" else 70
            self._input(20, y, W-40, h, key, ph); y += h+12

        hw = (W-48)//2
        for i,(k,ph,lbl) in enumerate([("price","$15","Price/Day *"),("deposit","$50","Deposit")]):
            bx = 20+i*(hw+8)
            self.c.create_text(bx, y, text=lbl, fill=self.T("muted"), font=self.FS(-2), anchor="w")
            self._input(bx, y+16, hw, 48, k, ph)
        y += 78

        self.c.create_text(20, y, text="Size", fill=self.T("muted"), font=self.FS(-2), anchor="w"); y += 18
        sel_sz = self.form_values.get("list_size","S"); sx2 = 20
        for sz in ["XS","S","M","L","XL"]:
            active = sz==sel_sz
            bg = self.T("primary") if active else self.T("white")
            fg = "white" if active else self.T("muted")
            b2 = self.rr(sx2, y, sx2+46, y+40, r=10, fill=bg, outline=self.T("border"))
            t2 = self.c.create_text(sx2+23, y+20, text=sz, fill=fg, font=self.FSB(-1))
            for itm in [b2,t2]:
                self.c.tag_bind(itm,"<Button-1>",
                                lambda e,s=sz: [self.form_values.update({"list_size":s}), self._list()])
            sx2 += 54
        y += 54

        self.c.create_text(20, y, text="Occasion", fill=self.T("muted"), font=self.FS(-2), anchor="w"); y += 18
        sel_occ = self.form_values.get("list_occ","Formals"); ox2 = 20
        for occ in ["Formals","Date Night","Darty","Game Day","Going Out","Recruitment"]:
            active = occ==sel_occ
            bg = self.T("primary") if active else self.T("white")
            fg = "white" if active else self.T("muted")
            tw = len(occ)*7+16
            if ox2+tw > W-20: ox2=20; y+=38
            b3 = self.rr(ox2, y, ox2+tw, y+36, r=10, fill=bg, outline=self.T("border"))
            t3 = self.c.create_text(ox2+tw//2, y+18, text=occ, fill=fg, font=self.FS(-2))
            for itm in [b3,t3]:
                self.c.tag_bind(itm,"<Button-1>",
                                lambda e,o=occ: [self.form_values.update({"list_occ":o}), self._list()])
            ox2 += tw+8
        y += 54

        self.shadow(20, y, W-20, y+56, r=28)
        self.pill_btn(20, y, W-40, 56, self.T("primary"), "List It ✨", cmd=self._listed, fd=1)
        self.tab_bar()

    def _listed(self):
        self.clear()
        self._gradient(0, 0, W, H, self.T("cream"), self.T("blush"))
        self.status_bar()
        self._start_confetti()
        self.c.create_text(W//2, 230, text="✨", font=("Helvetica",76))
        self.c.create_text(W//2, 326, text="It's Live!", fill=self.T("text"), font=("Helvetica",32,"bold"))
        self.c.create_text(W//2, 364, text="Your item is now visible to all Twirl members.",
                           fill=self.T("muted"), font=self.FS())
        self.c.create_text(W//2, 390, text="You'll be notified when someone requests it 💌",
                           fill=self.T("primary"), font=self.FS(-1))
        self.shadow(40, 424, W-40, 480, r=28)
        self.pill_btn(40, 424, W-80, 56, self.T("primary"), "Back to Browse",
                      cmd=lambda: self._tab("browse"), fd=1)
        b2 = self.rr(40, 498, W-40, 550, r=self.R(), fill=self.T("white"), outline=self.T("border"))
        t2 = self.c.create_text(W//2, 524, text="View My Listings", fill=self.T("primary"), font=self.FSB())
        for itm in [b2,t2]: self.c.tag_bind(itm,"<Button-1>",lambda e: self._tab("profile"))
        self.tab_bar()

    # ══ RENTALS ═══════════════════════════════════════════════════════════════
    def _rentals(self):
        self.clear()
        self.c.create_rectangle(0, 0, W, H, fill=self.T("cream"), outline="")
        self.status_bar()

        # Header
        self.c.create_rectangle(0, NOTCH_H, W, NOTCH_H+48, fill=self.T("white"), outline="")
        self.c.create_text(20, NOTCH_H+24, text="My Rentals", fill=self.T("text"), font=self.FSB(5), anchor="w")

        # Segment control
        seg_y = NOTCH_H+54
        self.rr(16, seg_y, W-16, seg_y+40, r=self.R(4), fill=self.T("blush"), outline="")
        hw = (W-44)//2
        for i,(lbl,val) in enumerate([("Renting","renting"),("Lending","lending")]):
            active = self.rental_tab==val; bx = 22+i*(hw+4)
            count = len(RENTALS[val])
            if active:
                self.shadow(bx, seg_y+4, bx+hw, seg_y+36, r=self.R())
                self.rr(bx, seg_y+4, bx+hw, seg_y+36, r=self.R(), fill=self.T("white"), outline="")
            clr = self.T("primary") if active else self.T("muted")
            t = self.c.create_text(bx+hw//2-8, seg_y+20, text=lbl, fill=clr,
                                   font=self.FSB() if active else self.FS())
            # Count badge
            bc = self.T("primary") if active else self.T("muted")
            self.c.create_oval(bx+hw//2+14, seg_y+10, bx+hw//2+30, seg_y+30, fill=bc, outline="")
            self.c.create_text(bx+hw//2+22, seg_y+20, text=str(count), fill="white", font=self.FSB(-3))
            self.c.tag_bind(t,"<Button-1>",
                            lambda e,v=val: [self.__setattr__("rental_tab",v), self._rentals()])

        self.c.create_line(0, NOTCH_H+98, W, NOTCH_H+98, fill=self.T("border"))

        SC = {"pending":(self.T("primary"),"#FFF1F2"),
              "approved":("#16A34A","#F0FDF4"),
              "active":("#2563EB","#EFF6FF"),
              "completed":(self.T("muted"),"#F1F5F9")}
        items_list = RENTALS[self.rental_tab]
        y = NOTCH_H+108

        for r_item in items_list:
            card_h = 140 if (self.rental_tab=="lending" and r_item["status"]=="pending") else 110
            self.shadow(12, y, W-12, y+card_h)
            self.rr(12, y, W-12, y+card_h, r=self.R(4), fill=self.T("white"), outline="")

            # Item emoji block
            self.rr(22, y+10, 82, y+90, r=self.R(), fill=self.T("blush"), outline="")
            self.c.create_text(52, y+50, text=r_item["emoji"], font=("Helvetica",28))

            self.c.create_text(92, y+22, text=r_item["item"], fill=self.T("text"),
                               font=self.FSB(), anchor="w", width=210)
            who = f"from {r_item['from']}" if self.rental_tab=="renting" else f"to {r_item['to']}"
            self.c.create_text(92, y+40, text=who, fill=self.T("muted"), font=self.FS(-2), anchor="w")
            self.c.create_text(92, y+56, text=f"📅  {r_item['start']} → {r_item['end']}",
                               fill=self.T("muted"), font=self.FS(-2), anchor="w")
            self.c.create_text(92, y+74, text=f"${r_item['total']} total",
                               fill=self.T("primary"), font=self.FSB(1), anchor="w")

            # Status pill
            sc2,sbg = SC.get(r_item["status"], (self.T("muted"),"#F1F5F9"))
            self.rr(W-104, y+14, W-18, y+38, r=12, fill=sbg, outline="")
            self.c.create_text(W-61, y+26, text=r_item["status"].upper(),
                               fill=sc2, font=self.FSB(-4))

            if self.rental_tab=="lending" and r_item["status"]=="pending":
                bw = (W-52)//2
                self.rr(22, y+100, 22+bw, y+134, r=self.R(), fill=self.T("primary"), outline="")
                self.c.create_text(22+bw//2, y+117, text="✓  Approve", fill="white", font=self.FSB(-1))
                self.rr(30+bw, y+100, 30+bw*2, y+134, r=self.R(), fill=self.T("white"), outline=self.T("border"))
                self.c.create_text(30+bw+bw//2, y+117, text="✕  Decline",
                                   fill=self.T("primary"), font=self.FSB(-1))

            y += card_h + 10

        if not items_list:
            self.c.create_text(W//2, 380, text="📦", font=("Helvetica",52))
            self.c.create_text(W//2, 446, text=f"No {self.rental_tab} yet",
                               fill=self.T("text"), font=self.FSB(3))
            self.c.create_text(W//2, 476, text="Discover items to rent on Browse",
                               fill=self.T("muted"), font=self.FS())
            self.shadow(60, 504, W-60, 558, r=28)
            self.pill_btn(60, 504, W-120, 54, self.T("primary"), "Browse Now",
                          cmd=lambda: self._tab("browse"), fd=1)

        self.tab_bar()

    # ══ MESSAGES ══════════════════════════════════════════════════════════════
    def _msgs(self):
        self.clear()
        self.c.create_rectangle(0, 0, W, H, fill=self.T("white"), outline="")
        self.status_bar()
        self.c.create_rectangle(0, NOTCH_H, W, NOTCH_H+56, fill=self.T("white"), outline="")
        self.c.create_text(20, NOTCH_H+28, text="Messages", fill=self.T("text"), font=self.FSB(6), anchor="w")
        # Compose
        self.c.create_oval(W-52, NOTCH_H+8, W-12, NOTCH_H+48, fill=self.T("primary"), outline="")
        self.c.create_text(W-32, NOTCH_H+28, text="+", fill="white", font=("Helvetica",20,"bold"))
        self.c.create_line(0, NOTCH_H+56, W, NOTCH_H+56, fill=self.T("border"))

        y = NOTCH_H+56
        for msg in MESSAGES:
            self.c.create_rectangle(0, y, W, y+80, fill=self.T("white"), outline="")
            self.c.create_line(0, y+80, W, y+80, fill=self.T("border"))

            # Avatar
            self.c.create_oval(14, y+14, 58, y+58, fill=self.T("blush"), outline="")
            self.c.create_text(36, y+36, text="👤", font=("Helvetica",18))
            # Online dot
            if msg.get("online"):
                self.c.create_oval(50, y+48, 62, y+60, fill=self.T("success"), outline="white")

            # Item thumbnail
            self.c.create_text(68, y+20, text=msg["user"], fill=self.T("text"), font=self.FSB(), anchor="w")
            self.c.create_text(68, y+37, text=f"re: {msg['re']}", fill=self.T("primary"),
                               font=self.FS(-2), anchor="w")
            self.c.create_text(68, y+54, text=msg["last"], fill=self.T("muted"),
                               font=self.FS(-1), anchor="w", width=W-140)
            self.c.create_text(W-14, y+20, text=msg["time"], fill=self.T("muted"),
                               font=self.FS(-2), anchor="e")
            if msg["unread"] > 0:
                self.c.create_oval(W-30, y+46, W-12, y+64, fill=self.T("primary"), outline="")
                self.c.create_text(W-21, y+55, text=str(msg["unread"]), fill="white", font=self.FSB(-3))
            row = self.c.create_rectangle(0, y, W, y+80, fill="", outline="")
            self.c.tag_bind(row,"<Button-1>",
                            lambda e,m=msg: [self.__setattr__("chat_open",m), self._push("chat")])
            y += 80
        self.tab_bar()

    def _chat(self):
        msg = self.chat_open
        if not msg: return self._msgs()
        self.clear()
        self.c.create_rectangle(0, 0, W, H, fill=self.T("cream"), outline="")
        self.status_bar()
        self._header(msg["user"], f"re: {msg['re']}")

        # Online indicator
        if msg.get("online"):
            self.c.create_oval(W//2+len(msg["user"])*4+4, NOTCH_H+20,
                               W//2+len(msg["user"])*4+14, NOTCH_H+30,
                               fill=self.T("success"), outline="white")

        bubbles = [
            ("them","Hey! Is this still available for Saturday?"),
            ("me","Yes! Still available 💗"),
            ("them","Does it run true to size?"),
            ("me","Runs TTS, maybe slightly small. I'm usually a S and it fits perfect 😊"),
            ("them",msg["last"]),
        ]
        typed = self.form_values.get(f"msg_{msg['user']}","")
        if typed: bubbles.append(("me",typed))

        y = NOTCH_H+66
        for who,text in bubbles:
            is_me = who=="me"
            bg = self.T("primary") if is_me else self.T("white")
            fg = "white" if is_me else self.T("text")
            max_w = int(W*0.62)
            cpw = self.theme["font_size"]-1
            words = text.split(); lines=[]; line=""
            for w2 in words:
                if len(line+w2)*cpw > max_w: lines.append(line.strip()); line=w2+" "
                else: line+=w2+" "
            if line: lines.append(line.strip())
            bh = 18+len(lines)*(self.theme["font_size"]+7)
            bw = min(max(len(l) for l in lines)*cpw+28, max_w+28)
            bx = W-bw-14 if is_me else 14
            if not is_me:
                self.shadow(bx, y, bx+bw, y+bh, r=self.R())
            self.rr(bx, y, bx+bw, y+bh, fill=bg, outline="" if is_me else self.T("border"))
            self.c.create_text(bx+12, y+9, text="\n".join(lines), fill=fg,
                               font=self.FS(), anchor="nw", width=max_w)
            y += bh+8
            if y > H-TABBAR_H-66: break

        # Input bar
        ib = H-TABBAR_H-58
        self.c.create_rectangle(0, ib, W, H-TABBAR_H, fill=self.T("white"), outline="")
        self.c.create_line(0, ib, W, ib, fill=self.T("border"))
        self.rr(12, ib+8, W-58, ib+46, r=20, fill=self.T("blush"), outline="")
        tv = typed if typed else "Message..."
        self.c.create_text(26, ib+27, text=tv,
                           fill=self.T("text") if typed else "#C8B0C0",
                           font=self.FS(), anchor="w", width=W-100)
        inp = self.rr(12, ib+8, W-58, ib+46, r=20, fill="", outline="")
        self.c.tag_bind(inp,"<Button-1>",lambda e: self._chat_input(msg))
        self.c.create_oval(W-50, ib+8, W-8, ib+46, fill=self.T("primary"), outline="")
        send = self.c.create_text(W-29, ib+27, text="↑", fill="white", font=self.FSB(2))
        def do_send():
            k = f"msg_{msg['user']}"
            if k in self.form_values: del self.form_values[k]
            self._show_toast(f"Sent to {msg['user'].split()[0]} ✓", self.T("success"))
            self._rerender()
        self.c.tag_bind(send,"<Button-1>",lambda e: do_send())
        self.tab_bar()

    def _chat_input(self, msg):
        k = f"msg_{msg['user']}"
        pop = tk.Toplevel(self); pop.title(f"Message {msg['user']}")
        pop.geometry(f"300x100+{self.winfo_x()+60}+{self.winfo_y()+600}")
        pop.configure(bg="#111120"); pop.grab_set()
        ent = tk.Entry(pop, font=("Helvetica",13), bg="#1A1A2E", fg="white",
                       insertbackground="white", relief="flat", bd=8, width=26)
        ent.insert(0, self.form_values.get(k,""))
        ent.pack(padx=12, pady=12); ent.focus_set()
        def done(e=None):
            self.form_values[k]=ent.get(); pop.destroy(); self._rerender()
        ent.bind("<Return>",done)
        tk.Button(pop,text="Send ↑",bg=self.T("primary"),fg="white",
                  font=("Helvetica",11,"bold"),bd=0,padx=14,pady=5,
                  command=done).pack()

    # ══ PROFILE ═══════════════════════════════════════════════════════════════
    def _profile(self):
        self.clear()
        self.c.create_rectangle(0, 0, W, H, fill=self.T("cream"), outline="")
        self.status_bar()

        # Gradient header
        self._gradient(0, NOTCH_H, W, NOTCH_H+180, self.T("primary"), self.T("rose"))
        self.c.create_rectangle(0, NOTCH_H, W, NOTCH_H+180, fill="", outline="")

        # Settings gear
        self.c.create_text(W-20, NOTCH_H+20, text="⚙️", font=("Helvetica",18), anchor="e")

        # Avatar
        self.c.create_oval(20, NOTCH_H+18, 90, NOTCH_H+88, fill="white", outline="")
        self.c.create_text(55, NOTCH_H+53, text="👤", font=("Helvetica",30))
        # Verified badge
        self.c.create_oval(72, NOTCH_H+74, 92, NOTCH_H+94, fill=self.T("success"), outline="white")
        self.c.create_text(82, NOTCH_H+84, text="✓", fill="white", font=self.FSB(-3))

        name   = self.form_values.get("name","Savannah M.")
        school = self.form_values.get("school","University of Georgia")
        self.c.create_text(100, NOTCH_H+32, text=name, fill="white", font=self.FSB(6), anchor="w")
        self.c.create_text(100, NOTCH_H+54, text=school, fill="#FFCCE8", font=self.FS(), anchor="w")
        self.c.create_text(100, NOTCH_H+72, text="Alpha Delta Pi  ·  SEC Verified",
                           fill="#FFCCE8", font=self.FSB(-2), anchor="w")

        # Sign out
        so = self.c.create_text(W-20, NOTCH_H+158, text="Sign Out →",
                                fill="#FFCCE8", font=self.FS(-2), anchor="e")
        self.c.tag_bind(so,"<Button-1>",
                        lambda e: [self.__setattr__("logged_in",False),
                                   self.__setattr__("form_values",{}),
                                   self._render("login")])

        # Stats strip
        stats_y = NOTCH_H+180
        self.c.create_rectangle(0, stats_y, W, stats_y+72, fill=self.T("white"), outline="")
        stats = [("S","Size"),("12","Rentals"),("$186","Earned"),("4.9★","Rating")]
        sw = W//4
        for i,(val,lbl) in enumerate(stats):
            bx = i*sw
            if i > 0:
                self.c.create_line(bx, stats_y+12, bx, stats_y+60, fill=self.T("border"))
            self.c.create_text(bx+sw//2, stats_y+24, text=val,
                               fill=self.T("primary"), font=self.FSB(3))
            self.c.create_text(bx+sw//2, stats_y+48, text=lbl,
                               fill=self.T("muted"), font=self.FS(-2))
        self.c.create_line(0, stats_y+72, W, stats_y+72, fill=self.T("border"))

        # Activity feed
        act_y = stats_y+82
        self.c.create_text(20, act_y, text="Recent Activity", fill=self.T("text"), font=self.FSB(1), anchor="w")
        act_y += 24
        for act in ACTIVITY:
            self.rr(16, act_y, W-16, act_y+46, r=self.R(), fill=self.T("white"), outline="")
            self.c.create_text(32, act_y+23, text=act["emoji"], font=("Helvetica",16))
            self.c.create_text(54, act_y+16, text=act["text"], fill=self.T("text"),
                               font=self.FSB(-2), anchor="w", width=W-100)
            self.c.create_text(54, act_y+34, text=act["time"]+" ago", fill=self.T("muted"), font=self.FS(-3), anchor="w")
            act_y += 54

        # My closet
        cl_y = act_y + 8
        self.c.create_text(20, cl_y, text="My Closet", fill=self.T("text"), font=self.FSB(3), anchor="w")
        add = self.c.create_text(W-20, cl_y, text="+ List Item", fill=self.T("primary"), font=self.FSB(), anchor="e")
        self.c.tag_bind(add,"<Button-1>",lambda e: self._tab("list"))

        cw = (W-36)//2; ch = int(cw*1.2)
        cl_y += 22
        for idx,item in enumerate(ITEMS[:4]):
            col=idx%2; row=idx//2
            x=12+col*(cw+12); y=cl_y+row*(ch+10)
            self.shadow(x,y,x+cw,y+ch)
            self.rr(x,y,x+cw,y+ch, fill=self.T("white"), outline="")
            self.rr(x,y,x+cw,y+int(cw*0.82), fill=item["color"], outline="")
            self.c.create_text(x+cw//2,y+int(cw*0.41), text=item["emoji"], font=("Helvetica",34))
            ty=y+int(cw*0.82)+6
            self.c.create_text(x+8,ty, text=item["title"], fill=self.T("text"),
                               font=self.FSB(-2), anchor="nw", width=cw-12)
            self.c.create_text(x+8,ty+22, text=f"${item['price']}/day · 💕{item['saves']}",
                               fill=self.T("primary"), font=self.FSB(-2), anchor="w")
            ov=self.rr(x,y,x+cw,y+ch, fill="",outline="")
            self.c.tag_bind(ov,"<Button-1>",
                            lambda e,it=item: [self.__setattr__("selected_item",it),
                                               self._push("item")])

        self.tab_bar()


if __name__ == "__main__":
    TwirlApp().mainloop()
