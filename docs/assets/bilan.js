/* ============================================================
   Page d'accueil : avancement, téléchargement du code,
   remise à zéro. Tout est lu dans le navigateur de l'élève.
   ============================================================ */

const SEANCES = [
  ["seance-00", "Ton premier programme"],
  ["seance-01", "La mémoire de la machine"],
  ["seance-02", "Compter juste"],
  ["seance-03", "Choisir"],
  ["seance-04", "Répéter sans se fatiguer"],
  ["seance-05", "Ranger plusieurs choses"],
  ["seance-06", "Fabriquer tes propres outils"],
  ["seance-07", "Retenir et sauvegarder"],
  ["seance-08", "Que ça ne plante jamais"],
  ["seance-09", "Ton projet à toi"],
];

function lireBrut(cle) {
  try { return localStorage.getItem("cp3:" + cle); } catch (e) { return null; }
}

function toutesLesCles() {
  const r = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf("cp3:") === 0) r.push(k.slice(4));
    }
  } catch (e) { /* rien */ }
  return r;
}

/* codes écrits pour une séance, dans l'ordre où ils apparaissent sur la page */
function codesDe(page) {
  return toutesLesCles()
    .filter((k) => k.indexOf("code:" + page + ":") === 0)
    .map((k) => ({ i: parseInt(k.split(":")[2], 10), texte: lireBrut(k) || "" }))
    .filter((c) => c.texte.trim())
    .sort((a, b) => a.i - b.i);
}

function exosDe(page) {
  const b = lireBrut("exo:" + page);
  if (!b) return { finis: 0, total: 4 };
  try { const o = JSON.parse(b); return { finis: o.finis || 0, total: o.total || 4 }; }
  catch (e) { return { finis: 0, total: 4 }; }
}

/* ---------- Téléchargement ---------- */
function assembler() {
  const t = new Date();
  const jour = t.getFullYear() + "-" +
    String(t.getMonth() + 1).padStart(2, "0") + "-" +
    String(t.getDate()).padStart(2, "0");

  let out = "";
  out += "# ==========================================================\n";
  out += "#  MES PROGRAMMES PYTHON\n";
  out += "#  Cours de Python, 10 séances\n";
  out += "#  Exporté le " + jour + "\n";
  out += "# ==========================================================\n";

  let vide = true;
  SEANCES.forEach(([page, titre], n) => {
    const codes = codesDe(page);
    const ex = exosDe(page);
    if (!codes.length && !ex.finis) return;
    vide = false;
    out += "\n\n# ==========================================================\n";
    out += "#  SÉANCE " + n + " : " + titre.toUpperCase() + "\n";
    if (ex.finis) out += "#  Exercices guidés terminés : " + ex.finis + " sur " + ex.total + "\n";
    out += "# ==========================================================\n";
    codes.forEach((c, k) => {
      out += "\n\n# ----- Programme " + (k + 1) + " -----\n\n" + c.texte.replace(/\s+$/, "") + "\n";
    });
  });

  if (vide) out += "\n# (rien d'enregistré pour l'instant)\n";
  return out;
}

/* ---------- Rapport pour le prof ----------
   Un texte compact que l'élève copie et envoie. Il ne contient que
   son avancement et les lignes qui lui ont résisté : aucun code,
   aucune donnée personnelle. */
function blocagesDe(page) {
  const b = lireBrut("bloc:" + page);
  if (!b) return [];
  try { return JSON.parse(b); } catch (e) { return []; }
}

function fabriquerCode() {
  const t = new Date();
  const jour = t.getFullYear() + "-" +
    String(t.getMonth() + 1).padStart(2, "0") + "-" +
    String(t.getDate()).padStart(2, "0");

  const seances = [], blocages = [];
  SEANCES.forEach(([page], n) => {
    const codes = codesDe(page).length;
    const ex = exosDe(page);
    if (codes || ex.finis) seances.push([n, codes, ex.finis, ex.total]);
    blocagesDe(page).forEach((b) => {
      blocages.push([n, b[0], b[1], b[2], b[3], b[4]]);
    });
  });

  const charge = JSON.stringify({ v: 1, d: jour, s: seances, b: blocages });
  const octets = new TextEncoder().encode(charge);
  let brut = "";
  octets.forEach((o) => { brut += String.fromCharCode(o); });
  return "CP3-" + btoa(brut);
}

function ouvrirRapport() {
  const code = fabriquerCode();
  const boite = document.getElementById("boite-rapport");
  boite.style.display = "block";
  boite.innerHTML =
    "<p><strong>Copie tout ce bloc et envoie-le à ton prof.</strong> " +
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
  a.download = "mes-programmes-python.py";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
}

/* ---------- Affichage ---------- */
function rendreBilan() {
  const zone = document.getElementById("mon-avancement");
  if (!zone) return;

  let nbCodes = 0, nbExos = 0, seancesTouchees = 0;
  const lignes = SEANCES.map(([page, titre], n) => {
    const codes = codesDe(page);
    const ex = exosDe(page);
    const bl = blocagesDe(page).length;
    nbCodes += codes.length;
    nbExos += ex.finis;
    // une séance compte comme commencée dès qu'il a écrit, terminé ou buté
    const touche = codes.length > 0 || ex.finis > 0 || bl > 0;
    if (touche) seancesTouchees++;
    return { n, page, titre, codes: codes.length, ex, bl, touche };
  });

  if (!seancesTouchees) {
    zone.innerHTML =
      '<div class="avanc-vide">' +
      "<p><strong>Rien d'enregistré pour l'instant.</strong></p>" +
      "<p>Dès que tu écris du code sur une séance, il est gardé automatiquement " +
      "dans ce navigateur. Tu pourras fermer la page et revenir : tout sera là.</p>" +
      "</div>";
    return;
  }

  const pct = Math.round((lignes.reduce((s, l) => s + l.ex.finis, 0) / (SEANCES.length * 4)) * 100);

  zone.innerHTML =
    '<div class="avanc-tete">' +
      "<div><div class='avanc-gros'>" + nbCodes + "</div><span>programmes écrits</span></div>" +
      "<div><div class='avanc-gros'>" + nbExos + " / 40</div><span>exercices guidés terminés</span></div>" +
      "<div><div class='avanc-gros'>" + seancesTouchees + " / 10</div><span>séances commencées</span></div>" +
    "</div>" +
    '<div class="avanc-barre"><i style="width:' + pct + '%"></i></div>' +
    '<div class="avanc-liste">' +
      lignes.filter((l) => l.touche).map((l) =>
        '<a class="avanc-l" href="' + l.page + '.html">' +
        '<span class="avanc-n">' + l.n + "</span>" +
        "<span class='avanc-t'>" + l.titre + "</span>" +
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
      '<button class="btn-ghost" id="rap">📤  Envoyer mon avancement au prof</button>' +
      '<button class="btn-ghost" id="rz">Tout effacer</button>' +
    "</div>" +
    '<div id="boite-rapport" class="boite-rapport"></div>' +
    '<p class="hint" style="margin-top:10px">Ton code est gardé dans ce navigateur, ' +
    "sur cet ordinateur. Télécharge-le si tu changes de machine.</p>";

  document.getElementById("dl").onclick = telecharger;
  document.getElementById("rap").onclick = ouvrirRapport;
  document.getElementById("rz").onclick = () => {
    if (!confirm("Effacer tout ton code et ton avancement ? C'est définitif.\n\nPense à télécharger avant.")) return;
    toutesLesCles().forEach((k) => {
      try { localStorage.removeItem("cp3:" + k); } catch (e) { /* rien */ }
    });
    rendreBilan();
  };
}

window.addEventListener("DOMContentLoaded", rendreBilan);
