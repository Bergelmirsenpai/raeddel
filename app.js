(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    P = window.RAEDDEL_PUZZLES || [],
    KEY = "raeddel-v2",
    OLD = "raeddel-v1",
    TZ = "Europe/Berlin",
    START = "2026-11-14";
  const calendarDate = (value) =>
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  const iso = () => calendarDate(Date.now());
  const completedOn = (record, date) =>
    record?.completedAt &&
    !Number.isNaN(Date.parse(record.completedAt)) &&
    calendarDate(record.completedAt) === date;
  const dayIndex = (d) =>
    Math.round(
      (Date.parse(d + "T12:00:00Z") - Date.parse(START + "T12:00:00Z")) /
        86400000,
    );
  const dateOf = (i) =>
    new Date(Date.parse(START + "T12:00:00Z") + i * 86400000)
      .toISOString()
      .slice(0, 10);
  const nice = (d) =>
    new Intl.DateTimeFormat("de-DE", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(d + "T12:00:00Z"));
  const read = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch {
      return null;
    }
  };
  const clamp = (v, n) => Math.max(0, Math.min(n, Number(v) || 0));
  const norm = (s) =>
    String(s || "")
      .trim()
      .normalize("NFC")
      .toLocaleUpperCase("de-DE")
      .replace(/ẞ/g, "SS");
  function migrate() {
    let v = read(KEY);
    if (
      v &&
      v.schemaVersion === 2 &&
      v.records &&
      typeof v.records === "object"
    )
      return v;
    const old = read(OLD);
    v = {
      schemaVersion: 2,
      records: {},
      migration: {
        source: old ? "raeddel-v1" : "new",
        at: new Date().toISOString(),
      },
    };
    if (old?.records && typeof old.records === "object")
      for (const [date, r] of Object.entries(old.records)) {
        if (!/^\d{4}-\d\d-\d\d$/.test(date) || !r || typeof r !== "object")
          continue;
        const n = clamp(r.step, 4);
        v.records[date] = {
          step: n,
          finished: !!r.finished || n === 4,
          legacyHints: clamp(r.hints, 1000),
          legacyReveals: clamp(r.reveals, 1000),
          score: null,
          scoreStatus: "legacy-unrated",
          hintedSteps: [],
          revealedSteps: [],
          clueOrder: null,
        };
      }
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {}
    return v;
  }
  const adminMode =
    new URLSearchParams(location.search).get("admin") === "sesamraeddel";
  let state = adminMode ? { schemaVersion: 2, records: {} } : migrate(),
    selected,
    puzzle,
    rec,
    side = "left",
    showTip = false;
  let adminRecords = {};
  function save() {
    if (adminMode) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      alert("Speichern nicht möglich. Bitte Browser-Speicher prüfen.");
    }
  }
  function hash(s) {
    let h = 2166136261;
    for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function shuffle(n, seed) {
    const a = Array.from({ length: n }, (_, i) => i);
    let x = seed;
    for (let i = n - 1; i > 0; i--) {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      const j = x % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // Identity of the actual word sequence, independent of wording and editorialVersion.
  // Keep the sequence itself: a short hash could silently collide.
  function structure(p) {
    return {
      puzzleId: p.id,
      structureVersion: p.structureVersion || 1,
      chainSignature: [p.start, ...p.steps.map((s) => s.answer)].map(norm).join("|"),
    };
  }
  function compatible(r, p) {
    const expected = structure(p);
    return (
      r.puzzleId === expected.puzzleId &&
      r.structureVersion === expected.structureVersion &&
      r.chainSignature === expected.chainSignature
    );
  }
  function freshRecord(p, resetNotice = false) {
    return {
      ...structure(p),
      step: 0,
      solvedEdges: [],
      finished: false,
      score: 0,
      scoreStatus: "v2",
      hintedSteps: [],
      revealedSteps: [],
      clueOrder: null,
      resetNotice,
    };
  }
  function ensure(date, p) {
    const previous = state.records[date];
    if (!previous || !compatible(previous, p)) {
      const hadProgress = previous && (previous.finished || previous.step > 0 ||
        previous.solvedEdges?.length || previous.hintedSteps?.length ||
        previous.revealedSteps?.length || previous.score > 0 || previous.resetNotice);
      state.records[date] = freshRecord(p, !!hadProgress);
    }
    const r = state.records[date],
      n = p.steps.length;
    Object.assign(r, structure(p));
    // Only a record for the SAME structure may migrate a forward-progress counter.
    if (!Array.isArray(r.solvedEdges)) {
      const count = clamp(r.step, n);
      r.solvedEdges = Array.from({ length: count }, (_, i) => i);
      r.migrationV22 = "forward-prefix";
    }
    r.solvedEdges = [
      ...new Set(
        r.solvedEdges.filter((x) => Number.isInteger(x) && x >= 0 && x < n),
      ),
    ].sort((a, b) => a - b);
    r.hintedSteps = Array.isArray(r.hintedSteps)
      ? r.hintedSteps.filter((x) => Number.isInteger(x) && x >= 0 && x < n)
      : [];
    r.revealedSteps = Array.isArray(r.revealedSteps)
      ? r.revealedSteps.filter((x) => Number.isInteger(x) && x >= 0 && x < n)
      : [];
    if (
      !Array.isArray(r.clueOrder) ||
      r.clueOrder.length !== n ||
      new Set(r.clueOrder).size !== n ||
      r.clueOrder.some((i) => !Number.isInteger(i) || i < 0 || i >= n)
    )
      r.clueOrder = shuffle(n, hash(p.id));
    r.finished = r.solvedEdges.length === n;
    r.step = r.solvedEdges.length;
    return r;
  }
  function load(date) {
    const p = P.find((x) => x.date === date);
    if (!p || (!adminMode && date > iso())) return;
    selected = date;
    puzzle = p;
    if (adminMode) {
      if (!adminRecords[date])
        adminRecords[date] = {
          step: 0,
          finished: false,
          score: 0,
          scoreStatus: "v2",
          hintedSteps: [],
          revealedSteps: [],
          clueOrder: null,
        };
      const original = state;
      state = { records: adminRecords };
      rec = ensure(date, p);
      state = original;
    } else rec = ensure(date, p);
    side = "left";
    save();
    render();
  }
  const words = () => [puzzle.start, ...puzzle.steps.map((s) => s.answer)];
  function boundaries() {
    const solved = new Set(rec.solvedEdges),
      n = puzzle.steps.length;
    let l = 0,
      r = n;
    while (l < n && solved.has(l)) l++;
    while (r > l && solved.has(r - 1)) r--;
    return { l, r };
  }
  function active() {
    const { l, r } = boundaries();
    return side === "left" ? l : r - 1;
  }
  function target(i) {
    const w = words();
    return side === "left" ? w[i + 1] : w[i];
  }
  function source(i) {
    const w = words();
    return side === "left" ? w[i] : w[i + 1];
  }
  function clue(i) {
    const step = puzzle.steps[i],
      tpl = step.clues?.[side === "left" ? "forward" : "reverse"] || step.hint;
    // All unsolved clues receive the SAME currently available word.
    // Never reveal the hidden source of an unsolved edge.
    const current = source(active());
    const known = rec.solvedEdges.includes(i);
    const word = known ? source(i) : current;
    // Quote every context as a word label. All open inserts remain identical,
    // including letter case and punctuation; no clue receives an active marker.
    const context = `„${word}“`;
    const parts = tpl.split("_");
    return { parts, context };
  }
  function appendClueText(container, i) {
    const { parts, context } = clue(i);
    parts.forEach((part, j) => {
      if (j) {
        const word = document.createElement("span");
        word.className = "clue-insert";
        word.textContent = context;
        container.append(word);
      }
      container.append(document.createTextNode(part));
    });
  }

  function finalizeIfComplete() {
    const n = puzzle.steps.length;
    if (rec.solvedEdges.length !== n) return false;
    rec.finished = true;
    rec.step = n;
    rec.completedAt ||= new Date().toISOString();
    return true;
  }

  function render() {
    const n = puzzle.steps.length,
      w = words(),
      solved = new Set(rec.solvedEdges),
      { l, r } = boundaries(),
      finished = rec.finished || l === r;
    $("puzzleTitle").textContent =
      `Räddel #${puzzle.legacyId || dayIndex(selected) + 1}`;
    $("dateLabel").textContent = nice(selected);
    $("updateNotice").hidden = !rec.resetNotice;
    $("startWord").textContent = puzzle.start;
    $("endWord").textContent = puzzle.end;
    $("progressText").textContent =
      `${solved.size} von ${n} Verbindungen · ${rec.scoreStatus === "legacy-unrated" ? "Altspielstand" : (rec.score || 0) + " Punkte"}`;
    $("progressBar").replaceChildren(
      ...Array.from({ length: n }, (_, i) => {
        const e = document.createElement("span");
        if (solved.has(i)) e.className = "done";
        return e;
      }),
    );
    $("trail").replaceChildren();
    w.forEach((word, i) => {
      if (i) {
        const a = document.createElement("span");
        a.className = "trail-arrow";
        a.textContent = solved.has(i - 1) ? "→" : "·";
        $("trail").append(a);
      }
      const e = document.createElement("span");
      e.className = "wordchip" + (i <= l || i >= r ? "" : " pending");
      e.textContent = i <= l || i >= r ? word : "?".repeat([...word].length);
      $("trail").append(e);
    });
    $("playArea").hidden = finished;
    $("finishArea").hidden = !finished;
    $("guess").value = "";
    $("feedback").textContent = "";
    showTip = false;
    $("tipText").hidden = true;
    $("tipBtn").textContent = "✦ Tipp anzeigen";
    $("directionBtn").disabled = false;
    $("directionBtn").textContent =
      side === "left"
        ? "Von START lösen · zum ZIEL wechseln ⇄"
        : "Von ZIEL lösen · zum START wechseln ⇄";
    if (!finished) {
      const i = active();
      $("currentWord").textContent = source(i);
      $("lengthLabel").textContent = `${[...target(i)].length} Buchstaben`;
      $("stepLabel").textContent =
        `Noch ${r - l} offene Verbindung${r - l === 1 ? "" : "en"} · ${side === "left" ? "von START" : "von ZIEL"}`;
      $("clues").replaceChildren();
      rec.clueOrder.forEach((k) => {
        const li = document.createElement("li"),
          used = solved.has(k),
          hinted = rec.hintedSteps.includes(k);
        li.className =
          "clue" + (used ? " used" : "") + (hinted ? " highlight" : "");
        const mark = document.createElement("span");
        mark.className = "clue-state";
        mark.textContent = used
          ? rec.autoClosedEdges?.includes(k)
            ? "✓ Verbunden"
            : "✓ Gelöst"
          : hinted
            ? "✦ Tipp verwendet"
            : "";
        const content = document.createElement("span");
        appendClueText(content, k);
        li.append(content, mark);
        $("clues").append(li);
      });
    } else
      $("finishText").textContent =
        rec.scoreStatus === "legacy-unrated"
          ? "Dieser ältere Spielstand wurde erhalten; rückwirkende Punkte werden nicht geschätzt."
          : `${n} Verbindungen gelöst · ${rec.score || 0} von ${n * 5} Punkten · ${rec.hintedSteps.length} Tipps · ${rec.revealedSteps.length} aufgedeckt.`;
  }
  function mark(reveal = false) {
    const i = active();
    if (rec.solvedEdges.includes(i)) return;
    if (rec.scoreStatus === "v2" && !reveal)
      rec.score = (rec.score || 0) + (rec.hintedSteps.includes(i) ? 2 : 5);
    if (reveal && !rec.revealedSteps.includes(i)) rec.revealedSteps.push(i);
    rec.solvedEdges.push(i);
    rec.solvedEdges.sort((a, b) => a - b);
    rec.step = rec.solvedEdges.length;
    finalizeIfComplete();
    save();
    render();
  }
  $("guessForm").onsubmit = (e) => {
    e.preventDefault();
    if (norm($("guess").value) === norm(target(active()))) mark();
    else
      $("feedback").textContent =
        "Leider nicht richtig. Beachte Wortlänge und Hinweise.";
  };
  $("directionBtn").onclick = () => {
    side = side === "left" ? "right" : "left";
    render();
  };
  $("tipBtn").onclick = () => {
    const i = active();
    showTip = !showTip;
    $("tipText").hidden = !showTip;
    if (showTip) {
      if (!rec.hintedSteps.includes(i)) rec.hintedSteps.push(i);
      save();
      $("tipText").textContent =
        `Zusatzhilfe: Der erste Buchstabe ist ${target(i)[0]}.`;
      $("tipBtn").textContent = "✦ Tipp ausblenden";
      renderTipMarks();
    } else $("tipBtn").textContent = "✦ Tipp anzeigen";
  };
  function renderTipMarks() {
    const used = new Set(rec.solvedEdges);
    [...$("clues").children].forEach((li, j) => {
      const k = rec.clueOrder[j];
      li.classList.toggle("highlight", rec.hintedSteps.includes(k));
      li.classList.toggle("used", used.has(k));
      li.querySelector(".clue-state").textContent = used.has(k)
        ? rec.autoClosedEdges?.includes(k)
          ? "✓ Verbunden"
          : "✓ Gelöst"
        : rec.hintedSteps.includes(k)
          ? "✦ Tipp verwendet"
          : "";
    });
  }
  $("revealBtn").onclick = () => {
    if (
      confirm(
        `„${target(active())}“ aufdecken? Für diese Verbindung gibt es 0 Punkte.`,
      )
    )
      mark(true);
  };
  function modal(t, html) {
    $("modalTitle").textContent = t;
    $("modalBody").innerHTML = html;
    $("modal").showModal();
  }
  $("closeModal").onclick = () => $("modal").close();
  $("modal").onclick = (e) => {
    if (e.target === $("modal")) $("modal").close();
  };
  $("helpBtn").onclick = () =>
    modal(
      "Spielregeln",
      "<p>Alle offenen Hinweise zeigen dasselbe aktuelle Wort in Blau. Du musst selbst erkennen, welcher Hinweis passt. Gelöste Hinweise zeigen das zugehörige Ausgangswort. Die Hinweise stehen in fester, gemischter Reihenfolge. </p><p>Löse die Wortkette von START oder ZIEL aus. Du kannst <strong>jederzeit</strong> die Richtung wechseln, auch nach mehreren gelösten Verbindungen. Bereits gelöste Hinweise werden mit ✓ markiert.</p><p>5 Punkte ohne Tipp, 2 Punkte nach Tipp, 0 Punkte beim Aufdecken. Auch die letzte Verbindung muss eingegeben werden. Jede Verbindung kann nur einmal Punkte geben.</p><p>Archivrätsel zählen nicht rückwirkend zur Tages-Serie. Spielstände werden lokal auf diesem Gerät gespeichert.</p>",
    );
  $("statsBtn").onclick = () => {
    if (adminMode) {
      modal(
        "Testmodus",
        "Testfortschritte werden nicht gespeichert und beeinflussen keine Nutzerstatistiken.",
      );
      return;
    }
    const entries = Object.entries(state.records).filter(
      ([d, r]) => r.finished && P.some((p) => p.date === d),
    );
    const today = iso();
    let streak = 0,
      cursor = dayIndex(today);
    if (!completedOn(state.records[dateOf(cursor)], today)) cursor--;
    while (cursor >= 0) {
      const d = dateOf(cursor),
        r = state.records[d];
      if (!r?.finished || !completedOn(r, d)) break;
      streak++;
      cursor--;
    }
    const points = entries.reduce(
      (s, [, r]) => s + (r.scoreStatus === "v2" ? r.score || 0 : 0),
      0,
    );
    modal(
      "Statistik",
      `<div class="statgrid"><div class="stat"><strong>${entries.length}</strong><span>Gelöst</span></div><div class="stat"><strong>${streak}</strong><span>Tages-Serie</span></div><div class="stat"><strong>${points}</strong><span>Punkte</span></div></div><p>Spielstände unveränderter Wortketten bleiben erhalten. Bei neu bearbeiteten Ketten beginnen Fortschritt und Punkte neu; betroffene Rätsel zeigen einen Hinweis.</p><button id="exportBtn" class="outline">Spielstände exportieren</button><p class="muted">Sicherung als JSON-Datei. Importiert werden nur Datensätze für dieselbe Wortkette.</p><input type="file" id="importFile" accept="application/json,.json"><button id="importBtn" class="outline">Spielstände importieren</button>`,
    );
    $("exportBtn").onclick = () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json",
        }),
        a = document.createElement("a"),
        url = URL.createObjectURL(blob);
      a.href = url;
      a.download = "raeddel-spielstaende.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };
    $("importBtn").onclick = async () => {
      const f = $("importFile").files[0];
      if (!f) return alert("Bitte JSON-Datei auswählen.");
      try {
        const v = JSON.parse(await f.text());
        if (
          v.schemaVersion !== 2 ||
          !v.records ||
          typeof v.records !== "object" ||
          Array.isArray(v.records)
        )
          throw Error("Ungültig");
        if (!confirm("Spielstände zusammenführen?")) return;
        let skipped = 0;
        for (const [d, r] of Object.entries(v.records)) {
          const p = P.find((x) => x.date === d);
          if (!p || !r || typeof r !== "object" || Array.isArray(r) || !compatible(r, p)) {
            skipped++;
            continue;
          }
          const incoming = Array.isArray(r.solvedEdges)
              ? r.solvedEdges.length
              : clamp(r.step, p.steps.length),
            existing = state.records[d];
          const oldCount = existing
            ? Array.isArray(existing.solvedEdges)
              ? existing.solvedEdges.length
              : clamp(existing.step, p.steps.length)
            : -1;
          if (incoming > oldCount) state.records[d] = r;
        }
        save();
        $("modal").close();
        load(selected);
        if (skipped) alert(`${skipped} Datensätze passen nicht zur aktuellen Wortkette und wurden nicht importiert.`);
      } catch {
        alert("Ungültige Sicherungsdatei.");
      }
    };
  };
  $("archiveBtn").onclick = () => {
    const list = P.filter((p) => adminMode || p.date <= iso()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    modal(
      "Rätselarchiv",
      '<p>Vergangene Rätsel bleiben spielbar.</p><div class="archive-grid">' +
        list
          .map(
            (p) =>
              `<button data-date="${p.date}" class="${state.records[p.date]?.finished ? "completed" : ""}">#${p.legacyId || dayIndex(p.date) + 1}${state.records[p.date]?.finished ? " ✓" : ""}</button>`,
          )
          .join("") +
        "</div>",
    );
    $("modalBody")
      .querySelectorAll("[data-date]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            $("modal").close();
            load(b.dataset.date);
          }),
      );
  };
  $("shareBtn").onclick = async () => {
    const s = `Räddel #${puzzle.legacyId || dayIndex(selected) + 1} · ${rec.scoreStatus === "v2" ? rec.score + " Punkte" : "gelöst"}\n${"🟩".repeat(puzzle.steps.length - rec.revealedSteps.length)}${"⬜".repeat(rec.revealedSteps.length)}\n${new URL("./", location.href).href}`;
    try {
      if (navigator.share) await navigator.share({ text: s });
      else await navigator.clipboard.writeText(s);
      $("shareStatus").textContent = "Ergebnis geteilt oder kopiert.";
    } catch (e) {
      if (e.name !== "AbortError")
        $("shareStatus").textContent = "Teilen nicht möglich.";
    }
  };
  let observedDay = iso();
  // Reconcile ALL existing records before archive badges or statistics can use them.
  // Never touch regular storage in admin mode.
  if (!adminMode) {
    P.forEach((p) => {
      if (state.records[p.date]) ensure(p.date, p);
    });
    save();
  }
  const todayPuzzle = () =>
    P.filter((p) => p.date <= iso())
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
  if (adminMode) {
    document.body.classList.add("admin-mode");
    $("adminPanel").hidden = false;
    const chooser = $("adminPuzzle");
    P.forEach((p, i) => {
      const option = document.createElement("option");
      option.value = p.date;
      option.textContent = `#${p.legacyId || i + 1} · ${p.date} · ${p.start} → ${p.end}`;
      chooser.append(option);
    });
    chooser.onchange = () => load(chooser.value);
    $("adminReset").onclick = () => {
      delete adminRecords[selected];
      load(selected);
    };
    load(todayPuzzle()?.date || P[0]?.date);
    chooser.value = selected;
  } else if (todayPuzzle()) load(todayPuzzle().date);
  else $("puzzleTitle").textContent = "Noch kein Rätsel veröffentlicht";
  setInterval(() => {
    if (adminMode) return;
    const day = iso();
    if (day === observedDay) return;
    const previous = observedDay;
    observedDay = day;
    const p = todayPuzzle();
    if (p && selected === previous && p.date !== selected) load(p.date);
  }, 30000);
})();
