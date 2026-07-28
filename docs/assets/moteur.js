/* ============================================================
   Moteur du cours - Python dans le navigateur (Pyodide)
   + une implémentation maison du module `turtle` qui dessine
     sur un <canvas> et rejoue le tracé en animation.
   ============================================================ */

let pyodide = null;
let pyReady = null;

/* ============================================================
   Mémoire locale : tout ce que l'élève écrit est conservé
   dans son navigateur, et rechargé à la visite suivante.
   ============================================================ */
const MEM = {
  page() {
    const f = (location.pathname.split("/").pop() || "index.html")
      .replace(".html", "") || "index";
    // chaque parcours a son espace, pour que deux séance-01 ne s'écrasent pas
    const m = document.querySelector('meta[name="parcours"]');
    const parcours = m ? m.content : "";
    return (parcours ? parcours + ":" : "") + f;
  },
  lire(cle) {
    try { return localStorage.getItem("cp3:" + cle); } catch (e) { return null; }
  },
  ecrire(cle, valeur) {
    try { localStorage.setItem("cp3:" + cle, valeur); } catch (e) { /* mode privé */ }
  },
  effacer(cle) {
    try { localStorage.removeItem("cp3:" + cle); } catch (e) { /* rien */ }
  },
  lireObjet(cle, defaut) {
    const b = this.lire(cle);
    if (!b) return defaut;
    try { return JSON.parse(b); } catch (e) { return defaut; }
  },
  ecrireObjet(cle, obj) { this.ecrire(cle, JSON.stringify(obj)); },
  toutesLesCles() {
    const r = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("cp3:")) r.push(k.slice(4));
      }
    } catch (e) { /* rien */ }
    return r;
  },
};

let compteurCellules = 0;

/* ---------- Le module turtle, écrit en Python ---------- */
const TURTLE_PY = String.raw`
import math, json

_ops = []

def _reset():
    del _ops[:]

def _dump():
    return json.dumps(_ops)

_COULEURS = {
    "orange": "#f07818", "white": "#ffffff", "green": "#0e8a55",
    "black": "#1c1a17", "red": "#d13a2c", "yellow": "#f5c518",
    "blue": "#2563c9", "blanc": "#ffffff", "vert": "#0e8a55",
    "rouge": "#d13a2c", "jaune": "#f5c518", "bleu": "#2563c9",
    "noir": "#1c1a17", "gray": "#808080", "grey": "#808080",
    "purple": "#7a3ea8", "pink": "#e87ba8", "brown": "#8a5a2b",
    "cyan": "#12b5c4", "magenta": "#c62b9e", "gold": "#d4a017",
}

def _c(v):
    if isinstance(v, tuple):
        return "rgb(%d,%d,%d)" % v
    return _COULEURS.get(str(v).lower(), str(v))


class Turtle:
    def __init__(self, shape="classic"):
        self.x = 0.0
        self.y = 0.0
        self.h = 0.0            # cap, en degrés, 0 = vers la droite
        self._down = True
        self._pen = "#1c1a17"
        self._fill = "#1c1a17"
        self._w = 2
        self._filling = False
        self._path = []
        self._visible = True
        self._speed = 3
        _ops.append(["speed", 3])

    # --- déplacements ---
    def forward(self, d):
        r = math.radians(self.h)
        nx = self.x + d * math.cos(r)
        ny = self.y + d * math.sin(r)
        self._trace(nx, ny)
    fd = forward

    def backward(self, d):
        self.forward(-d)
    bk = back = backward

    def right(self, a):
        self.h -= a
        _ops.append(["cap", self.x, self.y, self.h])
    rt = right

    def left(self, a):
        self.h += a
        _ops.append(["cap", self.x, self.y, self.h])
    lt = left

    def goto(self, x, y=None):
        if y is None:
            x, y = x
        self._trace(x, y)
    setpos = setposition = goto

    def setheading(self, a):
        self.h = a
        _ops.append(["cap", self.x, self.y, self.h])
    seth = setheading

    def home(self):
        self.goto(0, 0)
        self.setheading(0)

    def circle(self, rayon, extent=360, steps=None):
        if steps is None:
            steps = max(12, int(abs(extent) / 6))
        pas = 2 * math.pi * rayon * (extent / 360.0) / steps
        ang = float(extent) / steps
        for _ in range(steps):
            self.forward(pas)
            self.left(ang)

    def _trace(self, nx, ny):
        if self._down:
            _ops.append(["ligne", self.x, self.y, nx, ny, self._pen, self._w, self.h])
            if self._filling:
                if not self._path:
                    self._path.append([self.x, self.y])
                self._path.append([nx, ny])
        else:
            _ops.append(["saut", nx, ny, self.h])
            if self._filling:
                self._path.append([nx, ny])
        self.x, self.y = nx, ny

    # --- crayon ---
    def penup(self):
        self._down = False
    pu = up = penup

    def pendown(self):
        self._down = True
    pd = down = pendown

    def pensize(self, n=None):
        if n is None:
            return self._w
        self._w = n
    width = pensize

    def color(self, *a):
        if len(a) == 0:
            return (self._pen, self._fill)
        if len(a) == 1:
            self._pen = self._fill = _c(a[0])
        else:
            self._pen = _c(a[0])
            self._fill = _c(a[1])

    def pencolor(self, v=None):
        if v is None:
            return self._pen
        self._pen = _c(v)

    def fillcolor(self, v=None):
        if v is None:
            return self._fill
        self._fill = _c(v)

    def begin_fill(self):
        self._filling = True
        self._path = [[self.x, self.y]]

    def end_fill(self):
        if self._filling and len(self._path) > 2:
            pts = []
            for p in self._path:
                pts.append(p[0])
                pts.append(p[1])
            _ops.append(["forme", pts, self._fill, self._pen, self._w])
        self._filling = False
        self._path = []

    def dot(self, taille=None, couleur=None):
        t = taille if taille else max(6, self._w * 2)
        _ops.append(["point", self.x, self.y, t / 2.0,
                     _c(couleur) if couleur else self._pen])

    def write(self, txt, move=False, align="left", font=("Arial", 14, "normal")):
        _ops.append(["texte", self.x, self.y, str(txt), self._pen, int(font[1]), align])

    def stamp(self):
        pass

    def clear(self):
        _reset()

    # --- affichage ---
    def hideturtle(self):
        self._visible = False
        _ops.append(["cacher"])
    ht = hideturtle

    def showturtle(self):
        self._visible = True
        _ops.append(["montrer"])
    st = showturtle

    def speed(self, v=None):
        if v is None:
            return self._speed
        self._speed = v
        _ops.append(["speed", v])

    # --- lecture d'état ---
    def position(self):
        return (self.x, self.y)
    pos = position

    def xcor(self):
        return self.x

    def ycor(self):
        return self.y

    def heading(self):
        return self.h

    def isdown(self):
        return self._down


class _Screen:
    def bgcolor(self, c=None):
        if c is not None:
            _ops.append(["fond", _c(c)])

    def title(self, t=None):
        pass

    def setup(self, *a, **k):
        pass

    def screensize(self, *a, **k):
        pass

    def exitonclick(self):
        pass

    def mainloop(self):
        pass

    def tracer(self, *a, **k):
        pass

    def update(self):
        pass

    def textinput(self, titre, question):
        return input(question)


_ecran = _Screen()


def Screen():
    return _ecran


def getscreen():
    return _ecran


# --- tortue par défaut, pour le style « turtle.forward(100) » ---
_defaut = None


def _t():
    global _defaut
    if _defaut is None:
        _defaut = Turtle()
    return _defaut


def forward(d): _t().forward(d)
fd = forward
def backward(d): _t().backward(d)
bk = back = backward
def right(a): _t().right(a)
rt = right
def left(a): _t().left(a)
lt = left
def goto(x, y=None): _t().goto(x, y)
def setheading(a): _t().setheading(a)
def penup(): _t().penup()
pu = up = penup
def pendown(): _t().pendown()
pd = down = pendown
def color(*a): return _t().color(*a)
def pencolor(v=None): return _t().pencolor(v)
def fillcolor(v=None): return _t().fillcolor(v)
def begin_fill(): _t().begin_fill()
def end_fill(): _t().end_fill()
def circle(r, extent=360, steps=None): _t().circle(r, extent, steps)
def dot(t=None, c=None): _t().dot(t, c)
def write(txt, **k): _t().write(txt, **k)
def speed(v=None): return _t().speed(v)
def pensize(n=None): return _t().pensize(n)
width = pensize
def hideturtle(): _t().hideturtle()
ht = hideturtle
def showturtle(): _t().showturtle()
st = showturtle
def home(): _t().home()
def position(): return _t().position()
def heading(): return _t().heading()
def bgcolor(c=None): _ecran.bgcolor(c)


def pause(secondes):
    """Marque une pause pendant l'animation : de quoi faire de vraies images."""
    _ops.append(["pause", int(float(secondes) * 1000)])


def done(): pass
mainloop = done
def exitonclick(): pass
def clear(): _reset()
def reset(): _reset()
`;

/* ---------- Jeux de données ----------
   Une page déclare window.FICHIERS = ["donnees/xxx.csv", ...] et les fichiers
   sont déposés dans le dossier de travail de Python. L'élève écrit alors
   simplement open("xxx.csv"), comme sur sa propre machine. */
async function chargerDonnees(py) {
  const liste = window.FICHIERS || [];
  const charges = [];
  for (const chemin of liste) {
    const nom = chemin.split("/").pop();
    try {
      const r = await fetch(chemin);
      if (!r.ok) continue;
      py.FS.writeFile("/home/pyodide/" + nom, new Uint8Array(await r.arrayBuffer()));
      charges.push(nom);
    } catch (e) { /* fichier introuvable : on continue sans */ }
  }
  return charges;
}

/* ---------- Démarrage de Pyodide ---------- */
async function demarrerPython() {
  if (pyReady) return pyReady;
  pyReady = (async () => {
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    });
    pyodide.FS.writeFile("/home/pyodide/turtle.py", TURTLE_PY, { encoding: "utf8" });
    pyodide.runPython(`
import sys
sys.path.insert(0, "/home/pyodide")
`);
    await chargerDonnees(pyodide);
    return pyodide;
  })();
  return pyReady;
}

/* ---------- Rejoue le tracé de la tortue en animation ---------- */
class Toile {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.timer = null;
  }

  _px(x, y) {
    return [this.cv.width / 2 + x, this.cv.height / 2 - y];
  }

  effacer() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.cv.width, this.cv.height);
  }

  _tortue(x, y, cap) {
    const [px, py] = this._px(x, y);
    const c = this.ctx;
    c.save();
    c.translate(px, py);
    c.rotate((-cap * Math.PI) / 180);
    c.beginPath();
    c.moveTo(11, 0); c.lineTo(-7, 7); c.lineTo(-3, 0); c.lineTo(-7, -7);
    c.closePath();
    c.fillStyle = "#0e8a55";
    c.strokeStyle = "#0a6b42";
    c.lineWidth = 1.5;
    c.fill(); c.stroke();
    c.restore();
  }

  jouer(ops) {
    this.effacer();
    const c = this.ctx;
    let i = 0;
    let vitesse = 3;
    let visible = true;
    let cap = 0, cx = 0, cy = 0;
    // instantané du dessin sans la tortue, pour pouvoir la redessiner par-dessus
    const buffer = document.createElement("canvas");
    buffer.width = this.cv.width;
    buffer.height = this.cv.height;
    const bx = buffer.getContext("2d");
    bx.fillStyle = "#ffffff";
    bx.fillRect(0, 0, buffer.width, buffer.height);

    const dessiner = (op) => {
      const t = op[0];
      if (t === "ligne") {
        const [, x1, y1, x2, y2, col, w, h] = op;
        const [a, b] = this._px(x1, y1);
        const [d, e] = this._px(x2, y2);
        bx.beginPath();
        bx.moveTo(a, b); bx.lineTo(d, e);
        bx.strokeStyle = col; bx.lineWidth = w; bx.lineCap = "round";
        bx.stroke();
        cx = x2; cy = y2; cap = h;
      } else if (t === "saut") {
        cx = op[1]; cy = op[2]; cap = op[3];
      } else if (t === "cap") {
        cx = op[1]; cy = op[2]; cap = op[3];
      } else if (t === "forme") {
        const pts = op[1];
        bx.beginPath();
        for (let k = 0; k < pts.length; k += 2) {
          const [a, b] = this._px(pts[k], pts[k + 1]);
          if (k === 0) bx.moveTo(a, b); else bx.lineTo(a, b);
        }
        bx.closePath();
        bx.fillStyle = op[2]; bx.fill();
        bx.strokeStyle = op[3]; bx.lineWidth = op[4]; bx.stroke();
      } else if (t === "point") {
        const [a, b] = this._px(op[1], op[2]);
        bx.beginPath(); bx.arc(a, b, op[3], 0, 6.284);
        bx.fillStyle = op[4]; bx.fill();
      } else if (t === "texte") {
        const [a, b] = this._px(op[1], op[2]);
        bx.fillStyle = op[4];
        bx.font = op[5] + "px system-ui, sans-serif";
        bx.textAlign = op[6] === "center" ? "center" : op[6] === "right" ? "right" : "left";
        bx.fillText(op[3], a, b);
      } else if (t === "fond") {
        bx.fillStyle = op[1];
        bx.fillRect(0, 0, buffer.width, buffer.height);
      } else if (t === "cacher") { visible = false; }
      else if (t === "montrer") { visible = true; }
      else if (t === "speed") { vitesse = op[1]; }
    };

    const rendu = () => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, this.cv.width, this.cv.height);
      c.drawImage(buffer, 0, 0);
      if (visible) this._tortue(cx, cy, cap);
    };

    const pas = () => {
      const t0 = performance.now();
      let attente = null;

      while (i < ops.length) {
        const op = ops[i];
        // une pause explicite découpe l'animation en vraies images
        if (op[0] === "pause") { i++; attente = op[1]; break; }
        dessiner(op);
        i++;
        if (vitesse === 0) continue;                     // tout d'un coup
        if (vitesse >= 9) {
          if (performance.now() - t0 >= 4) break;        // par paquets
        } else break;                                    // op par op
      }

      rendu();
      if (i < ops.length) {
        const delai = attente !== null ? attente
          : vitesse === 0 ? 0
          : Math.max(8, 260 / (vitesse * vitesse));
        this.timer = setTimeout(pas, delai);
      }
    };
    pas();
  }
}

/* ---------- Une cellule de code exécutable ---------- */
class Cellule {
  constructor(el, opts) {
    this.el = el;
    this.avecTortue = el.dataset.tortue === "oui";
    this.editeur = null;
    this.sortie = null;
    this.toile = null;
    this.memorise = !(opts && opts.memorise === false);
    this.cle = this.memorise ? "code:" + MEM.page() + ":" + compteurCellules++ : null;
    this._monter();
  }

  _sauver() {
    if (!this.cle) return;
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      const v = this.editeur.getValue();
      if (v.trim()) MEM.ecrire(this.cle, v);
      else MEM.effacer(this.cle);
    }, 400);
  }

  _monter() {
    const depart = lireCode(this.el);
    const garde = this.cle ? MEM.lire(this.cle) : null;
    const holder = document.createElement("div");
    this.el.appendChild(holder);

    this.editeur = CodeMirror(holder, {
      value: garde !== null ? garde : depart,
      mode: "python",
      theme: "material-darker",
      lineNumbers: true,
      indentUnit: 4,
      viewportMargin: Infinity,
      extraKeys: {
        Tab: (cm) => cm.replaceSelection("    "),
        "Ctrl-Enter": () => this.lancer(),
        "Cmd-Enter": () => this.lancer(),
      },
    });

    const bar = document.createElement("div");
    bar.className = "runbar";

    const bRun = document.createElement("button");
    bRun.className = "btn-run";
    bRun.textContent = "▶  Exécuter";
    bRun.onclick = () => this.lancer();

    const bClear = document.createElement("button");
    bClear.className = "btn-ghost";
    bClear.textContent = "Effacer";
    bClear.onclick = () => {
      this.editeur.setValue("");
      this.sortie.classList.remove("on");
      if (this.toile) this.toile.cv.classList.remove("on");
      this._sauver();
    };

    bar.append(bRun, bClear);

    if (this.cle) {
      const bDepart = document.createElement("button");
      bDepart.className = "btn-ghost";
      bDepart.title = "Revenir au code de départ";
      bDepart.textContent = "↺";
      bDepart.onclick = () => {
        this.editeur.setValue(depart);
        this._sauver();
      };
      bar.append(bDepart);

      this.editeur.on("change", () => {
        this._sauver();
        if (this.marque) {
          this.marque.textContent = "sauvegardé";
          this.marque.style.opacity = "1";
          clearTimeout(this._tm);
          this._tm = setTimeout(() => { this.marque.style.opacity = ".45"; }, 1400);
        }
      });
    }

    const astuce = document.createElement("span");
    astuce.className = "hint";
    astuce.textContent = "Ctrl + Entrée pour lancer";
    bar.append(astuce);

    if (this.cle) {
      this.marque = document.createElement("span");
      this.marque.className = "hint";
      this.marque.style.cssText = "margin-left:auto;opacity:.45;transition:opacity .3s";
      this.marque.textContent = garde !== null ? "repris de la dernière fois" : "sauvegarde automatique";
      bar.append(this.marque);
    }
    this.el.appendChild(bar);
    this.btn = bRun;

    if (this.avecTortue) {
      const cv = document.createElement("canvas");
      cv.className = "toile";
      cv.width = 520;
      cv.height = 380;
      this.el.appendChild(cv);
      this.toile = new Toile(cv);
    }

    this.sortie = document.createElement("div");
    this.sortie.className = "sortie";
    this.el.appendChild(this.sortie);
  }

  async lancer() {
    this.btn.disabled = true;
    this.btn.textContent = "…";
    this.sortie.classList.add("on");
    this.sortie.textContent = "";
    try {
      const py = await demarrerPython();
      const lignes = [];

      py.setStdout({ batched: (s) => lignes.push(s) });
      py.setStderr({ batched: (s) => lignes.push(s) });

      // input() → boîte de dialogue du navigateur, avec écho dans la sortie
      py.globals.set("_js_input", (q) => {
        const r = window.prompt(q || "");
        lignes.push((q || "") + (r === null ? "" : r));
        return r === null ? "" : r;
      });
      py.runPython(`
import builtins
builtins.input = lambda p="": _js_input(str(p))
`);

      let ops = null;
      if (this.avecTortue) {
        py.runPython("import turtle; turtle._reset(); turtle._defaut = None");
      }

      await py.runPythonAsync(this.editeur.getValue());

      if (this.avecTortue) {
        const brut = py.runPython("import turtle; turtle._dump()");
        ops = JSON.parse(brut);
      }

      this.sortie.textContent = lignes.join("\n");
      if (!lignes.length) this.sortie.textContent = "(le programme s'est exécuté, sans rien afficher)";

      if (ops && ops.length) {
        this.toile.cv.classList.add("on");
        this.toile.jouer(ops);
      }
    } catch (e) {
      const msg = String(e.message || e);
      const utiles = msg.split("\n").filter(
        (l) => !l.includes("/lib/python") && !l.includes("pyodide") && l.trim() !== ""
      );
      this.sortie.innerHTML =
        '<span class="err">' +
        utiles.slice(-6).join("\n").replace(/</g, "&lt;") +
        "</span>";
    } finally {
      this.btn.disabled = false;
      this.btn.textContent = "▶  Exécuter";
    }
  }
}

/* ---------- Lit le code déposé dans un <script type="text/python"> ---------- */
function lireCode(el) {
  const s = el.querySelector('script[type="text/python"]');
  if (!s) return "";
  const brut = s.textContent.replace(/\t/g, "    ");
  const lignes = brut.split("\n");
  while (lignes.length && !lignes[0].trim()) lignes.shift();
  while (lignes.length && !lignes[lignes.length - 1].trim()) lignes.pop();
  // retire l'indentation commune héritée du HTML
  let creux = Infinity;
  lignes.forEach((l) => {
    if (l.trim()) creux = Math.min(creux, l.match(/^ */)[0].length);
  });
  if (!isFinite(creux)) creux = 0;
  return lignes.map((l) => l.slice(creux)).join("\n");
}

/* ---------- Blocs de référence (le code du prof, non modifiable) ---------- */
function monterReferences() {
  document.querySelectorAll("[data-ref]").forEach((el) => {
    const code = lireCode(el);
    el.innerHTML = "";
    CodeMirror(el, {
      value: code,
      mode: "python",
      theme: "material-darker",
      lineNumbers: true,
      readOnly: true,
      viewportMargin: Infinity,
    });
  });
}

/* ---------- Amorçage ---------- */
window.addEventListener("DOMContentLoaded", () => {
  monterReferences();
  document.querySelectorAll("[data-cellule]").forEach((el) => new Cellule(el));

  /* L'écran de démarrage ne doit jamais tourner indéfiniment :
     on informe si c'est long, et on explique si ça échoue. */
  const boot = document.getElementById("boot");
  const dire = (html) => {
    const p = boot && boot.querySelector(".boot-inner p");
    if (p) p.innerHTML = html;
  };

  const lent = setTimeout(() => dire(
    "Python se télécharge…<br><span style='font-size:13.5px;opacity:.7'>" +
    "environ 10 Mo la première fois, ensuite c'est instantané</span>"), 8000);

  const tresLent = setTimeout(() => dire(
    "C'est plus long que prévu.<br><span style='font-size:13.5px;opacity:.7'>" +
    "Connexion lente, ou un bloqueur de publicités qui empêche le téléchargement.</span>"), 25000);

  demarrerPython()
    .then(() => {
      clearTimeout(lent); clearTimeout(tresLent);
      if (boot) { boot.classList.add("gone"); setTimeout(() => boot.remove(), 500); }
    })
    .catch((e) => {
      clearTimeout(lent); clearTimeout(tresLent);
      const msg = String((e && e.message) || e).slice(0, 200);
      dire(
        "<strong style='color:var(--red)'>Python n'a pas pu démarrer.</strong><br>" +
        "<span style='font-size:13.5px;opacity:.75;display:block;margin:10px auto;max-width:34ch'>" +
        "La cause la plus fréquente est un bloqueur de publicités ou un réseau " +
        "d'entreprise qui bloque <code>cdn.jsdelivr.net</code>. Désactive-le sur ce site, " +
        "ou essaie un autre navigateur.</span>" +
        "<span style='font-size:12px;opacity:.5;font-family:var(--mono)'>" +
        msg.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span><br>" +
        "<button class='btn-run' style='margin-top:16px' onclick='location.reload()'>Réessayer</button>");
    });
});
