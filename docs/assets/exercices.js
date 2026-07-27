/* ============================================================
   Exerciseur guidé
   L'élève remplit le programme une ligne à la fois.
   Succès → ligne suivante. Trois échecs → on lui montre.
   ============================================================ */

function normaliser(s) {
  return String(s)
    .replace(/ /g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/'/g, '"')          // guillemets simples ou doubles : les deux acceptés
    .replace(/\s+/g, " ")
    .replace(/\s*([(),:])\s*/g, "$1")
    .replace(/\s*=\s*/g, "=")
    .replace(/\s*([+\-*/])\s*/g, "$1")
    .trim();
}

class Exerciseur {
  constructor(el, exos) {
    this.el = el;
    this.exos = exos;
    this.iExo = 0;
    this.iTrou = 0;
    this.essais = 0;
    this.reponses = {};      // index de ligne -> texte validé
    this.stats = { reussis: 0, montres: 0 };
    this.rendre();
  }

  get exo() { return this.exos[this.iExo]; }

  get trous() {
    return this.exo.lignes
      .map((l, i) => (l.b ? i : -1))
      .filter((i) => i >= 0);
  }

  get ligneActive() { return this.trous[this.iTrou]; }

  /* ---------- affichage ---------- */
  rendre() {
    const ex = this.exo;
    const actif = this.ligneActive;

    const pastilles = this.exos.map((_, k) =>
      '<i class="' + (k < this.iExo ? "fini" : k === this.iExo ? "actif" : "") + '"></i>'
    ).join("");

    const lignes = ex.lignes.map((l, i) => {
      const num = '<span class="n">' + (i + 1) + "</span>";
      if (!l.b) {
        return '<div class="exo-l"><span class="n">' + (i + 1) +
               '</span><span class="txt">' + esc(l.t || "") + "</span></div>";
      }
      if (this.reponses[i] !== undefined) {
        return '<div class="exo-l faite">' + num +
               '<span class="txt">' + esc(this.reponses[i]) + "</span></div>";
      }
      if (i === actif) {
        return '<div class="exo-l" data-ici>' + num +
               (l.indent ? '<span class="txt">' + " ".repeat(l.indent) + "</span>" : "") +
               '<input class="exo-saisie" id="exo-in" autocomplete="off" spellcheck="false" ' +
               'placeholder="écris cette ligne…"></div>';
      }
      return '<div class="exo-l futur">' + num +
             '<span class="masque">' + "▪".repeat(Math.min(22, (l.long || 14))) + "</span></div>";
    }).join("");

    const l = ex.lignes[actif] || {};

    this.el.innerHTML =
      '<div class="exo-zone">' +
        '<div class="exo-top">' +
          '<span class="exo-num">Exercice ' + (this.iExo + 1) + " sur " + this.exos.length + "</span>" +
          '<div class="exo-pastilles">' + pastilles + "</div>" +
          '<h3 class="exo-titre">' + esc(ex.titre) + "</h3>" +
        "</div>" +
        (ex.contexte ? '<p class="exo-contexte">' + ex.contexte + "</p>" : "") +
        '<div class="exo-code">' + lignes + "</div>" +
        '<div class="exo-consigne">' +
          '<div class="lab">Ligne ' + (actif + 1) + " — à écrire</div>" +
          (l.consigne || "") +
        "</div>" +
        '<div class="exo-bar">' +
          '<button class="btn-run" id="exo-ok">Vérifier</button>' +
          '<button class="btn-ghost" id="exo-aide">Un indice</button>' +
          '<span class="exo-essais" id="exo-cpt"></span>' +
        "</div>" +
        '<div id="exo-retour"></div>' +
      "</div>";

    this.maj();
    const inp = this.el.querySelector("#exo-in");
    if (inp) {
      inp.focus();
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); this.verifier(); }
      });
    }
    this.el.querySelector("#exo-ok").onclick = () => this.verifier();
    this.el.querySelector("#exo-aide").onclick = () => this.indice();
  }

  maj() {
    const c = this.el.querySelector("#exo-cpt");
    if (!c) return;
    c.textContent = this.essais === 0 ? "" :
      this.essais + (this.essais > 1 ? " essais" : " essai") + " sur 3";
  }

  retour(type, titre, corps) {
    const z = this.el.querySelector("#exo-retour");
    z.innerHTML = '<div class="exo-retour ' + type + '">' +
      '<div class="t">' + titre + "</div>" + corps + "</div>";
  }

  /* ---------- vérification ---------- */
  verifier() {
    const inp = this.el.querySelector("#exo-in");
    if (!inp) return;
    const saisie = inp.value;
    if (!saisie.trim()) { inp.focus(); return; }

    const l = this.exo.lignes[this.ligneActive];
    const attendu = (l.ok || []).map(normaliser);
    const juste = attendu.includes(normaliser(saisie));

    if (juste) {
      this.essais = 0;
      this.stats.reussis++;
      inp.classList.add("juste");
      this.retour("ok", "✅ Correct",
        l.pourquoi ? "<p style='margin:0'>" + l.pourquoi + "</p>" : "");
      this.reponses[this.ligneActive] =
        (l.indent ? " ".repeat(l.indent) : "") + saisie.trim();
      setTimeout(() => this.avancer(), 950);
      return;
    }

    this.essais++;
    inp.classList.add("faux");
    setTimeout(() => inp.classList.remove("faux"), 400);
    this.maj();

    if (this.essais >= 3) {
      this.stats.montres++;
      const bonne = (l.ok || [""])[0];
      this.reponses[this.ligneActive] =
        (l.indent ? " ".repeat(l.indent) : "") + bonne;
      this.retour("sol", "La bonne réponse",
        "<p><code>" + esc(bonne) + "</code></p>" +
        "<p style='margin-bottom:0'>" + (l.pourquoi || "") +
        " <strong>Relis-la à voix haute avant de continuer.</strong></p>");
      this.essais = 0;
      setTimeout(() => this.avancer(), 3200);
      return;
    }

    const ind = (l.indices || [])[this.essais - 1];
    this.retour("nok", "❌ Pas encore — essai " + this.essais + " sur 3",
      "<p style='margin-bottom:0'>" + (ind || "Relis bien la consigne, mot par mot.") + "</p>");
  }

  indice() {
    const l = this.exo.lignes[this.ligneActive];
    const ind = (l.indices || [])[Math.min(this.essais, 1)];
    this.retour("nok", "💡 Indice",
      "<p style='margin-bottom:0'>" + (ind || "Regarde comment on a écrit les lignes du dessus.") + "</p>");
  }

  /* ---------- navigation ---------- */
  avancer() {
    if (this.iTrou < this.trous.length - 1) {
      this.iTrou++;
      this.rendre();
    } else {
      this.finExercice();
    }
  }

  finExercice() {
    const ex = this.exo;
    const code = ex.lignes.map((l, i) =>
      l.b ? (this.reponses[i] || "") : (l.t || "")
    ).join("\n");

    const dernier = this.iExo >= this.exos.length - 1;

    this.el.innerHTML =
      '<div class="exo-zone">' +
        '<div class="exo-top">' +
          '<span class="exo-num">Exercice ' + (this.iExo + 1) + " terminé</span>" +
          '<h3 class="exo-titre">' + esc(ex.titre) + " ✅</h3>" +
        "</div>" +
        '<p class="exo-contexte">Ton programme est complet. Lance-le pour voir le résultat.</p>' +
        '<div data-cellule' + (ex.tortue ? ' data-tortue="oui"' : "") + ' id="exo-run">' +
          '<script type="text/python">' + esc(code) + "</script>" +
        "</div>" +
        '<div class="exo-bar" style="margin-top:18px">' +
          '<button class="btn-run" id="exo-next">' +
            (dernier ? "Voir mon résultat →" : "Exercice suivant →") +
          "</button>" +
        "</div>" +
      "</div>";

    new Cellule(this.el.querySelector("#exo-run"));
    this.el.querySelector("#exo-next").onclick = () => {
      if (dernier) { this.bilan(); }
      else { this.iExo++; this.iTrou = 0; this.essais = 0; this.reponses = {}; this.rendre(); }
    };
  }

  bilan() {
    const total = this.stats.reussis + this.stats.montres;
    const pct = total ? Math.round((this.stats.reussis / total) * 100) : 0;
    let mot;
    if (pct >= 90) mot = "Tu n'as presque rien lâché. Passe au défi bonus de la séance.";
    else if (pct >= 70) mot = "Solide. Les lignes que tu as ratées, réécris-les une fois de mémoire.";
    else if (pct >= 40) mot = "C'est normal, c'est nouveau. Refais la série demain sans regarder — tu verras la différence.";
    else mot = "Ne t'inquiète pas. Refais la série depuis le début : la deuxième fois, tout change.";

    this.el.innerHTML =
      '<div class="exo-zone"><div class="exo-fin">' +
        '<div class="score">' + this.stats.reussis + " / " + total + "</div>" +
        '<p class="mot">lignes trouvées sans aide</p>' +
        '<p class="mot" style="max-width:46ch;margin:14px auto 0">' + mot + "</p>" +
        '<button class="btn-ghost" id="exo-again" style="margin-top:20px">Refaire la série</button>' +
      "</div></div>";

    this.el.querySelector("#exo-again").onclick = () => {
      this.iExo = 0; this.iTrou = 0; this.essais = 0;
      this.reponses = {}; this.stats = { reussis: 0, montres: 0 };
      this.rendre();
    };
  }
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

window.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("exerciseur");
  if (el && window.EXERCICES) new Exerciseur(el, window.EXERCICES);
});
