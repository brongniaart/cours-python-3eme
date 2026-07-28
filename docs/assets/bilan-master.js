/* ============================================================
   Avancement du parcours master : finance, politique, conseil.
   Fichier distinct de bilan.js, qui sert le parcours 3ème :
   les deux cours n'ont ni le même nombre de séances, ni les
   mêmes clés de stockage, ni le même livrable final.
   Tout est lu dans le navigateur de l'étudiant.
   ============================================================ */

const SEANCES = [
  ["seance-01", "Le premier modèle", "Calculer"],
  ["seance-02", "Décider", "Calculer"],
  ["seance-03", "Répéter", "Calculer"],
  ["seance-04", "Ranger un portefeuille", "Structurer"],
  ["seance-05", "Ta boîte à outils", "Structurer"],
  ["seance-06", "De vraies données", "Structurer"],
  ["seance-07", "Les données sont sales", "Structurer"],
  ["seance-08", "Ton environnement de travail", "Analyser"],
  ["seance-09", "pandas, premiers pas", "Analyser"],
  ["seance-10", "Croiser et agréger", "Analyser"],
  ["seance-11", "Séries temporelles", "Analyser"],
  ["seance-12", "Le graphique qui ment", "Convaincre"],
  ["seance-13", "La carte électorale", "Convaincre"],
  ["seance-14", "L'incertitude", "Convaincre"],
  ["seance-15", "Ton analyse devient une appli", "Convaincre"],
  ["seance-16", "Ta note d'analyse", "Convaincre"],
];

/* la séance 16 est le projet final : pas d'exercices guidés,
   mais une liste de contrôle avant de rendre */
const EXOS_TOTAL = 15 * 4;
const CHECK_TOTAL = 12;
const CLE_CHECK = "master:projet-final";

/* les pages du master sont enregistrées sous « master:seance-xx » */
const prefixe = (page) => "master:" + page;

function lireBrut(cle) {
  try { return localStorage.getItem("cp3:" + cle); } catch (e) { return null; }
}

/* les clés valent « cp3:code:master:seance-10:2 », « cp3:exo:master:seance-10 »…
   Le préfixe « master: » vient après le type, pas avant : on ne peut donc pas
   filtrer sur le début de la clé. Ce filtre garantit aussi que la remise à zéro
   du master ne touche jamais aux clés du parcours 3ème. */
const TYPES = ["code:master:", "exo:master:", "bloc:master:"];

function toutesLesCles() {
  const r = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf("cp3:") !== 0) continue;
      const reste = k.slice(4);
      if (TYPES.some((t) => reste.indexOf(t) === 0)) r.push(reste);
    }
  } catch (e) { /* mode privé */ }
  return r;
}

/* codes écrits pour une séance, dans l'ordre où ils apparaissent sur la page.
   La clé complète vaut « code:master:seance-10:2 » : l'indice est en 4e position. */
function codesDe(page) {
  const tete = "code:" + prefixe(page) + ":";
  return toutesLesCles()
    .filter((k) => k.indexOf(tete) === 0)
    .map((k) => ({ i: parseInt(k.slice(tete.length), 10) || 0, texte: lireBrut(k) || "" }))
    .filter((c) => c.texte.trim())
    .sort((a, b) => a.i - b.i);
}

function exosDe(page) {
  const b = lireBrut("exo:" + prefixe(page));
  if (!b) return { finis: 0, total: 4 };
  try { const o = JSON.parse(b); return { finis: o.finis || 0, total: o.total || 4 }; }
  catch (e) { return { finis: 0, total: 4 }; }
}

function blocagesDe(page) {
  const b = lireBrut("bloc:" + prefixe(page));
  if (!b) return [];
  try { return JSON.parse(b); } catch (e) { return []; }
}

/* la liste de contrôle du projet final vit hors du système de séances */
function checklist() {
  try {
    const o = JSON.parse(localStorage.getItem(CLE_CHECK) || "{}");
    return Object.values(o).filter(Boolean).length;
  } catch (e) { return 0; }
}

/* ---------- Téléchargement ---------- */
function assembler() {
  const t = new Date();
  const jour = t.getFullYear() + "-" +
    String(t.getMonth() + 1).padStart(2, "0") + "-" +
    String(t.getDate()).padStart(2, "0");

  let out = "";
  out += "# ==========================================================\n";
  out += "#  MON TRAVAIL PYTHON\n";
  out += "#  Python pour la finance, la politique et le conseil\n";
  out += "#  16 séances - exporté le " + jour + "\n";
  out += "# ==========================================================\n";

  let vide = true;
  let blocCourant = "";
  SEANCES.forEach(([page, titre, bloc], i) => {
    const codes = codesDe(page);
    const ex = exosDe(page);
    if (!codes.length && !ex.finis) return;
    vide = false;
    if (bloc !== blocCourant) {
      blocCourant = bloc;
      out += "\n\n# ##########################################################\n";
      out += "#  BLOC : " + bloc.toUpperCase() + "\n";
      out += "# ##########################################################\n";
    }
    out += "\n\n# ==========================================================\n";
    out += "#  SÉANCE " + (i + 1) + " : " + titre.toUpperCase() + "\n";
    if (ex.finis) out += "#  Exercices guidés terminés : " + ex.finis + " sur " + ex.total + "\n";
    out += "# ==========================================================\n";
    codes.forEach((c, k) => {
      out += "\n\n# ----- Programme " + (k + 1) + " -----\n\n" +
        c.texte.replace(/\s+$/, "") + "\n";
    });
  });

  if (vide) out += "\n# (rien d'enregistré pour l'instant)\n";
  return out;
}

/* ---------- Rapport pour l'enseignant ----------
   Un texte compact que l'étudiant copie et envoie. Il ne contient que
   son avancement et les lignes qui lui ont résisté : aucun code,
   aucune donnée personnelle. Le préfixe CPM le distingue du parcours 3ème. */
function fabriquerCode() {
  const t = new Date();
  const jour = t.getFullYear() + "-" +
    String(t.getMonth() + 1).padStart(2, "0") + "-" +
    String(t.getDate()).padStart(2, "0");

  const seances = [], blocages = [];
  SEANCES.forEach(([page], i) => {
    const n = i + 1;
    const codes = codesDe(page).length;
    const ex = exosDe(page);
    if (codes || ex.finis) seances.push([n, codes, ex.finis, ex.total]);
    blocagesDe(page).forEach((b) => {
      blocages.push([n, b[0], b[1], b[2], b[3], b[4]]);
    });
  });

  const charge = JSON.stringify({
    v: 1, p: "master", d: jour, s: seances, b: blocages, c: checklist(),
  });
  const octets = new TextEncoder().encode(charge);
  let brut = "";
  octets.forEach((o) => { brut += String.fromCharCode(o); });
  return "CPM-" + btoa(brut);
}

function ouvrirRapport() {
  const code = fabriquerCode();
  const boite = document.getElementById("boite-rapport");
  boite.style.display = "block";
  boite.innerHTML =
    "<p><strong>Copie tout ce bloc et envoie-le à ton enseignant.</strong> " +
    "Il contient ton avancement et les lignes sur lesquelles tu as buté, " +
    "rien d'autre : ni ton code, ni aucune information personnelle.</p>" +
    '<textarea id="code-rapport" readonly>' + code + "</textarea>" +
    '<div class="avanc-bar" style="margin-top:12px">' +
      '<button class="btn-run" id="copier">📋  Copier le code</button>' +
      '<button class="btn-ghost" id="fermer-rapport">Fermer</button>' +
      '<span class="hint" id="copie-ok" style="margin-left:6px"></span>' +
    "</div>";

  const zone = document.getElementById("code-rapport");
  document.getElementById("copier").onclick = () => {
    zone.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
    document.getElementById("copie-ok").textContent =
      ok || navigator.clipboard ? "copié !" : "sélectionne et fais Cmd+C";
  };
  document.getElementById("fermer-rapport").onclick = () => {
    boite.style.display = "none";
  };
}

function telecharger() {
  const blob = new Blob([assembler()], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mon-travail-python-master.py";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
}

/* ---------- Affichage ---------- */
function rendreBilan() {
  const zone = document.getElementById("mon-avancement");
  if (!zone) return;

  let nbCodes = 0, nbExos = 0, seancesTouchees = 0;
  const lignes = SEANCES.map(([page, titre, bloc], i) => {
    const codes = codesDe(page);
    const ex = exosDe(page);
    const bl = blocagesDe(page).length;
    nbCodes += codes.length;
    nbExos += ex.finis;
    const touche = codes.length > 0 || ex.finis > 0 || bl > 0;
    if (touche) seancesTouchees++;
    return { n: i + 1, page, titre, bloc, codes: codes.length, ex, bl, touche };
  });

  const coches = checklist();

  if (!seancesTouchees && !coches) {
    zone.innerHTML =
      '<div class="avanc-vide">' +
      "<p><strong>Rien d'enregistré pour l'instant.</strong></p>" +
      "<p>Dès que tu écris du code sur une séance, il est gardé automatiquement " +
      "dans ce navigateur. Tu peux fermer la page et revenir : tout sera là.</p>" +
      "</div>";
    return;
  }

  const pct = Math.round((nbExos / EXOS_TOTAL) * 100);

  zone.innerHTML =
    '<div class="avanc-tete">' +
      "<div><div class='avanc-gros'>" + nbCodes + "</div><span>programmes écrits</span></div>" +
      "<div><div class='avanc-gros'>" + nbExos + " / " + EXOS_TOTAL +
        "</div><span>exercices guidés terminés</span></div>" +
      "<div><div class='avanc-gros'>" + seancesTouchees +
        " / 16</div><span>séances commencées</span></div>" +
      "<div><div class='avanc-gros'>" + coches + " / " + CHECK_TOTAL +
        "</div><span>points du projet final validés</span></div>" +
    "</div>" +
    '<div class="avanc-barre"><i style="width:' + pct + '%"></i></div>' +
    '<div class="avanc-liste">' +
      lignes.filter((l) => l.touche).map((l) =>
        '<a class="avanc-l" href="' + l.page + '.html">' +
        '<span class="avanc-n">' + l.n + "</span>" +
        "<span class='avanc-t'>" + l.titre +
          " <span class='hint'>· " + l.bloc + "</span></span>" +
        "<span class='avanc-d'>" +
          [
            l.codes ? l.codes + " programme" + (l.codes > 1 ? "s" : "") : "",
            l.ex.finis ? l.ex.finis + "/" + l.ex.total + " exercices" : "",
          ].filter(Boolean).join(" · ") +
        "</span></a>"
      ).join("") +
    "</div>" +
    '<div class="avanc-bar">' +
      '<button class="btn-run" id="dl">⬇  Télécharger tout mon code</button>' +
      '<button class="btn-ghost" id="rap">📤  Envoyer mon avancement à l\'enseignant</button>' +
      '<button class="btn-ghost" id="rz">Tout effacer</button>' +
    "</div>" +
    '<div id="boite-rapport" class="boite-rapport"></div>' +
    '<p class="hint" style="margin-top:10px">Ton code est gardé dans ce navigateur, ' +
    "sur cet ordinateur. Télécharge-le si tu changes de machine. " +
    "À partir de la séance 8, ton vrai travail vit dans VS Code : " +
    "cette sauvegarde ne couvre que ce que tu écris ici.</p>";

  document.getElementById("dl").onclick = telecharger;
  document.getElementById("rap").onclick = ouvrirRapport;
  document.getElementById("rz").onclick = () => {
    if (!confirm("Effacer tout ton code et ton avancement du parcours master ?\n\n" +
                 "C'est définitif. Pense à télécharger avant.")) return;
    toutesLesCles().forEach((k) => {
      try { localStorage.removeItem("cp3:" + k); } catch (e) { /* rien */ }
    });
    try { localStorage.removeItem(CLE_CHECK); } catch (e) { /* rien */ }
    rendreBilan();
  };
}

window.addEventListener("DOMContentLoaded", rendreBilan);
