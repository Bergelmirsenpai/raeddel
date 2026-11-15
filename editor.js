(() => {
  "use strict";
  const $ = (x) => document.getElementById(x),
    P = window.RAEDDEL_PUZZLES || [];
  let n = 0;
  const norm = (s) => s.trim().normalize("NFC").toLocaleUpperCase("de-DE");
  const add = (v = {}) => {
    const e = document.createElement("div");
    e.className = "editstep";
    e.innerHTML = `<strong>Schritt ${++n}</strong><label>Lösungswort</label><input class="answer" placeholder="Zielwort"><label>Typ</label><select class="kind"><option value="letter">Buchstaben</option><option value="meaning">Bedeutung</option></select><label>Hinweis (deutsch, eindeutig)</label><textarea class="hint"></textarea><label>Rückwärtshinweis (genau ein _ als Platzhalter)</label><textarea class="reverse"></textarea><label>Erklärung der Verbindung</label><textarea class="explanation"></textarea>`;
    e.querySelector(".answer").value = v.answer || "";
    e.querySelector(".kind").value = v.kind || "letter";
    e.querySelector(".hint").value = v.clues?.forward || v.hint || "";
    e.querySelector(".reverse").value = v.clues?.reverse || "";
    e.querySelector(".explanation").value = v.explanation || "";
    $("steps").append(e);
  };
  const diff = (a, b) => {
    if (a === b) return false;
    const aa = [...a],
      bb = [...b];
    if (aa.length === bb.length)
      return aa.filter((x, i) => x !== bb[i]).length <= 2;
    const longer = aa.length > bb.length ? aa : bb,
      shorter = aa.length > bb.length ? bb : aa;
    let i = 0,
      j = 0,
      edits = 0;
    while (i < longer.length) {
      if (longer[i] === shorter[j]) {
        i++;
        j++;
      } else {
        i++;
        edits++;
      }
    }
    return edits <= 2;
  };
  function collect() {
    const date = $("date").value,
      start = norm($("start").value),
      steps = [...document.querySelectorAll(".editstep")].map((e) => ({
        answer: norm(e.querySelector(".answer").value),
        kind: e.querySelector(".kind").value,
        hint: e.querySelector(".hint").value.trim(),
        clues: {
          forward: e.querySelector(".hint").value.trim(),
          reverse: e.querySelector(".reverse").value.trim(),
        },
        explanation: e.querySelector(".explanation").value.trim(),
      }));
    return {
      schemaVersion: 2,
      editorialVersion: 3,
      id: "rd-" + date,
      date,
      legacyId: P.length + 1,
      theme: $("theme").value.trim(),
      start,
      end: steps.at(-1)?.answer || "",
      steps,
    };
  }
  function check(p) {
    const errors = [],
      warnings = [];
    if (!/^\d{4}-\d\d-\d\d$/.test(p.date)) errors.push("Datum fehlt.");
    if (P.some((x) => x.date === p.date))
      errors.push("Datum ist bereits belegt.");
    if (!p.start) errors.push("Startwort fehlt.");
    if (p.steps.length < 3 || p.steps.length > 12)
      errors.push("Bitte 3 bis 12 Schritte verwenden.");
    let from = p.start;
    for (const [i, s] of p.steps.entries()) {
      if (!s.answer || !s.hint || !s.explanation)
        errors.push(`Schritt ${i + 1}: Wort, Hinweis oder Erklärung fehlen.`);
      if (
        s.clues.forward.split("_").length !== 2 ||
        s.clues.reverse.split("_").length !== 2
      )
        errors.push(
          `Schritt ${i + 1}: Beide Hinweise benötigen genau einen Platzhalter _.`,
        );
      if (s.answer === from) errors.push(`Schritt ${i + 1}: Wort unverändert.`);
      if (s.kind === "letter" && !diff(from, s.answer))
        warnings.push(
          `Schritt ${i + 1}: Keine einfache Änderung (bis zu zwei Buchstaben) erkannt; bitte Buchstabenoperation manuell überprüfen.`,
        );
      if (s.kind === "meaning")
        warnings.push(
          `Schritt ${i + 1}: Bedeutungsbeziehung und Mehrdeutigkeit müssen redaktionell geprüft werden.`,
        );
      from = s.answer;
    }
    return { errors, warnings };
  }
  function report(v) {
    $("report").textContent = [
      ...v.errors.map((s) => "FEHLER: " + s),
      ...v.warnings.map((s) => "PRÜFEN: " + s),
      v.errors.length
        ? "Export gesperrt."
        : "Formale Prüfung bestanden. Redaktionelle Prüfung bleibt erforderlich.",
    ].join("\n");
  }
  $("add").onclick = () => add();
  $("validate").onclick = () => report(check(collect()));
  $("export").onclick = () => {
    const p = collect(),
      v = check(p);
    report(v);
    if (v.errors.length) return;
    if (
      !confirm(
        "Hast du sämtliche Wortbeziehungen und Hinweise manuell auf Deutsch geprüft?",
      )
    )
      return;
    const data = [...P, p].sort((a, b) => a.date.localeCompare(b.date));
    const blob = new Blob(
        ["window.RAEDDEL_PUZZLES=" + JSON.stringify(data, null, 2) + ";\n"],
        { type: "text/javascript" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "puzzles.js";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const last =
    P.map((x) => x.date)
      .sort()
      .at(-1) || "2026-11-14";
  $("date").value = new Date(Date.parse(last + "T12:00:00Z") + 86400000)
    .toISOString()
    .slice(0, 10);
  for (let i = 0; i < 4; i++) add();
})();
