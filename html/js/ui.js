const $ = (sel) => document.querySelector(sel);
const API = {
  suggest: async (lat, lon) =>
    fetch(`./api/v2/suggest?lat=${lat}&lon=${lon}`).then((r) => r.json()),
  getCloset: async () => fetch(`./api/v2/closet`).then((r) => r.json()),
  saveCloset: async (items) =>
    fetch(`./api/v2/closet`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }).then((r) => r.json()),
  availability: async () => {
    const r = await fetch(`./api/v2/availability`);
    const txt = await r.text();
    if (!r.ok) {
      throw new Error(`availability ${r.status}: ${txt.slice(0, 200)}`);
    }
    try {
      return JSON.parse(txt);
    } catch (e) {
      console.error("availability non-JSON response:", txt);
      throw e;
    }
  },
  saveSelection: async (items) =>
    fetch(`./api/v2/selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }).then(async (r) => {
      const body = await r.json().catch(() => ({}));
      if (!r.ok || body.ok === false)
        throw new Error(body.error || `HTTP ${r.status}`);
      return body;
    }),
  resetLastWorn: async () => {
    const r = await fetch(`./api/v2/reset_last_worn`, { method: "POST" });
    const txt = await r.text();
    if (!r.ok) throw new Error(`reset ${r.status}: ${txt.slice(0, 200)}`);
    return JSON.parse(txt);
  },
  history: async (days = 14) => {
    const r = await fetch(`./api/v2/history?days=${days}`);
    const txt = await r.text();
    if (!r.ok) throw new Error(`history ${r.status}: ${txt.slice(0, 200)}`);
    return JSON.parse(txt);
  },
};

async function geolocate() {
  if (!navigator.geolocation) throw new Error("Geolocation not supported");
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

function renderWeather(weather) {
  const d = weather.daily;
  document.querySelector("#weather").innerHTML = `High ${d.high_f.toFixed(
    0,
  )}°F, Low ${d.low_f.toFixed(0)}°F; UV max ${d.uv_index_max?.toFixed(
    0,
  )}; Precip ${(d.precip_prob_max * 100 || 0).toFixed(0)}%`;
}

function renderEffects(effects) {
  document.querySelector("#effects").innerHTML =
    `<div class="small">Tags: <code>${
      effects.tags.join(", ") || "none"
    }</code> | Notes: ${effects.notes.join("; ") || "none"}</div>`;
}

function renderOutfit(outfit) {
  const pieces = outfit.pieces.map((p) => Object.values(p)[0]).join(", ");
  document.querySelector("#outfit").innerHTML =
    `<div class="fw-semibold">${outfit.name}</div><div class="small text-muted">${pieces}</div>`;
}

function constraintPass(constraints, ctx) {
  for (const entry of constraints) {
    const [k, raw] = entry.split("=").map((s) => s.trim());
    if (!k) continue;
    const v = Number.isFinite(+raw) ? +raw : raw;
    if (k.startsWith("min_")) {
      const metric = k.slice(4);
      if (ctx[metric] == null || ctx[metric] < v) return false;
    } else if (k.startsWith("max_")) {
      const metric = k.slice(4);
      if (ctx[metric] == null || ctx[metric] > v) return false;
    } else {
      if (k === "tag" && v && !(ctx.tags || []).includes(String(v)))
        return false;
    }
  }
  return true;
}

function parseConstraints(s) {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function rowTemplate(item) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="form-control form-control-sm name" value="${
      item.name || ""
    }" placeholder="e.g., Blue plaid shirt"></td>
    <td>
      <select class="form-select form-select-sm type">
        ${["top", "bottom", "outer", "accessory", "shoes"]
          .map(
            (t) => `<option ${item.type === t ? "selected" : ""}>${t}</option>`,
          )
          .join("")}
      </select>
    </td>
    <td><input class="form-control form-control-sm tags" value="${(
      item.tags || []
    ).join(", ")}" placeholder="rain-ready, business"></td>
    <td><input class="form-control form-control-sm constraints" value="${(
      item.constraints || []
    ).join(", ")}" placeholder="min_temp_f=50, max_wind_mph=25"></td>
    <td><input class="form-control form-control-sm warmth" type="number" step="1" value="${
      item.warmth_bonus_f ?? ""
    }" placeholder="e.g., 7"></td>
    <td class="text-end"><button class="btn btn-outline-danger btn-sm remove">✕</button></td>
  `;
  tr.querySelector(".remove").addEventListener("click", () => tr.remove());
  return tr;
}

async function loadCloset() {
  const data = await API.getCloset().catch(() => ({ items: [] }));
  const tbody = document.querySelector("#closet-table tbody");
  tbody.innerHTML = "";
  (data.items || []).forEach((item) => tbody.appendChild(rowTemplate(item)));
}

function readCloset() {
  const rows = Array.from(document.querySelectorAll("#closet-table tbody tr"));
  return rows
    .map((r) => ({
      name: r.querySelector(".name").value.trim(),
      type: r.querySelector(".type").value,
      tags: r
        .querySelector(".tags")
        .value.split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      constraints: parseConstraints(r.querySelector(".constraints").value),
      warmth_bonus_f: (() => {
        const v = r.querySelector(".warmth").value.trim();
        return v === "" ? undefined : Number(v);
      })(),
    }))
    .filter((x) => x.name);
}

function comboItems(c) {
  const items = [c.top, c.bottom];
  if (c.outer) items.push(c.outer);
  if (c.accessories?.length) items.push(...c.accessories);
  if (c.shoes) items.push(c.shoes);
  return items.filter(Boolean);
}

function isItemAvailable(name) {
  const today = window._availabilityToday;
  const d = window._availability?.[name];
  if (!name) return true;
  if (!d || !today) return true; // unknown → allow
  return d <= today; // available_on <= today
}

function chooseShoes(items) {
  const shoes = items.filter((i) => i.type === "shoes");
  return shoes[0]?.name || null;
}

function generateCombos(items, ctx) {
  const tops = items.filter(
    (i) => i.type === "top" && constraintPass(i.constraints || [], ctx),
  );
  const bottoms = items.filter(
    (i) => i.type === "bottom" && constraintPass(i.constraints || [], ctx),
  );
  const outers = items.filter(
    (i) => i.type === "outer" && constraintPass(i.constraints || [], ctx),
  );
  const accessories = items.filter(
    (i) => i.type === "accessory" && constraintPass(i.constraints || [], ctx),
  );
  const shoes = chooseShoes(items);

  const combos = [];
  for (const t of tops) {
    for (const b of bottoms) {
      const base = { top: t.name, bottom: b.name, shoes };
      // include at most one outer that matches any effect tag, otherwise none
      const o = outers.find((o) =>
        (o.tags || []).some((tag) => (ctx.tags || []).includes(tag)),
      );
      // include up to two accessories matching tags
      const acc = accessories
        .filter((a) =>
          (a.tags || []).some((tag) => (ctx.tags || []).includes(tag)),
        )
        .slice(0, 2);

      // ---- EFFECTIVE TEMPERATURE CALCULATION ----
      const rawTemp =
        ctx.temperature_f ?? ctx.max_temp_f ?? ctx.apparent_f ?? 0;
      const warmthBonus =
        o && Number.isFinite(+o.warmth_bonus_f) ? +o.warmth_bonus_f : 0;
      const ctxEff = {
        ...ctx,
        temperature_f_eff: rawTemp + warmthBonus,
        apparent_f_eff: (ctx.apparent_f ?? rawTemp) + warmthBonus,
      };

      // Re-validate constraints against the effective temp for all chosen pieces
      if (!constraintPass(t.constraints || [], ctxEff)) continue;
      if (!constraintPass(b.constraints || [], ctxEff)) continue;
      if (o && !constraintPass(o.constraints || [], ctxEff)) continue;
      if (acc.some((a) => !constraintPass(a.constraints || [], ctxEff)))
        continue;

      // Availability filter: every item in the combo must be available today
      const names = [
        t.name,
        b.name,
        o?.name,
        ...(acc || []).map((a) => a.name),
        shoes,
      ].filter(Boolean);
      if (!names.every(isItemAvailable)) continue;

      combos.push({
        ...base,
        ...(o ? { outer: o.name } : {}),
        ...(acc.length ? { accessories: acc.map((a) => a.name) } : {}),
      });
    }
  }
  return combos;
}

function renderCombos(combos) {
  const el = document.querySelector("#combos");
  if (!combos.length) {
    el.innerHTML =
      "<div class='text-muted small'>No valid combinations match the conditions.</div>";
    return;
  }
  el.innerHTML = combos
    .slice(0, 20)
    .map((c) => {
      const parts = [
        c.top,
        c.bottom,
        c.outer,
        (c.accessories || []).join(" + "),
        c.shoes,
      ].filter(Boolean);
      const items = JSON.stringify(comboItems(c)).replace(/"/g, "&quot;");
      return `
      <div class="combo-card p-2 border rounded mb-2"
           role="button" tabindex="0"
           data-items="${items}"
           style="cursor:pointer; user-select:none;">
        <div class="fw-semibold">${parts.join(" + ")}</div>
        <div class="text-muted small">Tap to wear</div>
      </div>
    `;
    })
    .join("");
}

async function refreshSuggest() {
  const lat = +(document.querySelector("#lat").value || 0);
  const lon = +(document.querySelector("#lon").value || 0);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  const data = await API.suggest(lat, lon);
  renderWeather(data.weather);
  renderEffects(data.effects);
  renderOutfit(data.outfit);
  window._effectsCtx = {
    tags: data.effects.tags,
    min_temp_f: data.weather.daily.low_f,
    max_temp_f: data.weather.daily.high_f,
    precip_prob: data.weather.daily.precip_prob_max,
    wind_mph: data.weather.daily.wind_mph_max,
    uv_index: data.weather.daily.uv_index_max,
    temperature_f: data.weather.current.temp_f,
    apparent_f: data.weather.daily.high_f,
  };

  // Load availability after we have context (used to filter combos)
  try {
    const avail = await API.availability();
    window._availability = avail.availability || {};
    window._availabilityToday = avail.today;
    window._lastWorn = avail.last_worn || {};
    // in addition to last_worn map, load daily history to render the table
    try {
      const hist = await API.history(21); // ~3 weeks
      renderRecentWornTable(hist.days || []);
    } catch (e) {
      console.warn("history failed", e);
      renderRecentWorn(window._lastWorn); // fallback simple list
    }
  } catch (e) {
    console.warn("availability failed", e);
  }
}

function addItemRow() {
  document
    .querySelector("#closet-table tbody")
    .appendChild(rowTemplate({ type: "top" }));
}

document.addEventListener("DOMContentLoaded", async () => {
  document
    .querySelector("#btn-geolocate")
    .addEventListener("click", async () => {
      try {
        const { lat, lon } = await geolocate();
        document.querySelector("#lat").value = lat.toFixed(6);
        document.querySelector("#lon").value = lon.toFixed(6);
        await refreshSuggest();
      } catch (e) {
        alert(
          "Unable to get your location. You can still enter lat/lon manually.",
        );
      }
    });
  document
    .querySelector("#btn-refresh")
    .addEventListener("click", refreshSuggest);
  document.querySelector("#btn-add-item").addEventListener("click", addItemRow);
  document
    .querySelector("#btn-save-closet")
    .addEventListener("click", async () => {
      const items = readCloset();
      await API.saveCloset(items);
    });
  document.querySelector("#btn-generate").addEventListener("click", () => {
    const items = readCloset();
    const ctx = window._effectsCtx || {};
    const combos = generateCombos(items, ctx);
    renderCombos(combos);
  });

  // Tap-to-select: the entire combo card acts as the button
  document.addEventListener("click", async (e) => {
    const card = e.target.closest(".combo-card");
    if (!card) return;
    let items = [];
    try {
      items = JSON.parse(card.dataset.items || "[]");
    } catch (err) {
      console.error("Bad combo payload", err, card.dataset.items);
      alert("Internal error: bad combo payload");
      return;
    }
    card.classList.add("opacity-50");
    try {
      await API.saveSelection(items);
      const avail = await API.availability();
      window._availability = avail.availability || {};
      window._availabilityToday = avail.today;
      window._lastWorn = avail.last_worn || {};
      try {
        const hist = await API.history(21);
        renderRecentWornTable(hist.days || []);
      } catch (e) {
        console.warn("history failed", e);
        renderRecentWorn(window._lastWorn);
      }
      const closet = readCloset();
      const ctx = window._effectsCtx || {};
      renderCombos(generateCombos(closet, ctx));
      // brief visual confirmation
      card.classList.add("border-success");
      setTimeout(
        () => card.classList.remove("border-success", "opacity-50"),
        600,
      );
    } catch (err) {
      console.error(err);
      alert(`Could not save selection: ${err.message || err}`);
      card.classList.remove("opacity-50");
    }
  });

  try {
    document.querySelector("#btn-geolocate").click();
  } catch {}
  await loadCloset();

  // --- Reset history modal wiring ---
  const resetOpen = document.querySelector("#btn-reset-open");
  const resetConfirm = document.querySelector("#btn-reset-confirm");
  const resetModalEl = document.querySelector("#resetModal");
  let resetModal;
  if (resetModalEl) {
    resetModal = new bootstrap.Modal(resetModalEl);
  }
  if (resetOpen && resetModal) {
    resetOpen.addEventListener("click", () => resetModal.show());
  }
  if (resetConfirm && resetModal) {
    resetConfirm.addEventListener("click", async () => {
      resetConfirm.disabled = true;
      resetConfirm.textContent = "Resetting…";
      try {
        const res = await API.resetLastWorn();
        console.debug("reset_last_worn:", res);
        // Refresh availability + UI
        const avail = await API.availability();
        window._availability = avail.availability || {};
        window._availabilityToday = avail.today;
        window._lastWorn = avail.last_worn || {};
        renderRecentWornTable([]);
        const closet = readCloset();
        const ctx = window._effectsCtx || {};
        renderCombos(generateCombos(closet, ctx));
        resetModal.hide();
      } catch (err) {
        console.error(err);
        alert(`Could not reset: ${err.message || err}`);
      } finally {
        resetConfirm.disabled = false;
        resetConfirm.textContent = "Yes, reset";
      }
    });
  }
});

// --- Recently worn rendering ---
function renderRecentWorn(lastMap) {
  const el = document.querySelector("#recent-worn");
  if (!el) return;
  const entries = Object.entries(lastMap || {}).filter(([, d]) => !!d);
  if (!entries.length) {
    el.textContent = "No wear data yet.";
    return;
  }
  // sort by date desc
  entries.sort((a, b) => (a[1] < b[1] ? 1 : -1));
  const top = entries.slice(0, 12); // show up to 12
  el.innerHTML = top
    .map(([name, d]) => `<span class="me-3"><code>${d}</code> — ${name}</span>`)
    .join("");
}

// Modern table by day: [{date, items:[...]}]
function renderRecentWornTable(days) {
  const table = document.getElementById("recent-worn-table");
  const thead = document.getElementById("recent-worn-head");
  const tbody = table?.querySelector("tbody");
  const empty = document.querySelector("#recent-empty");
  if (!table || !thead || !tbody) return;
  tbody.innerHTML = "";
  thead.innerHTML = "";

  const hasData = Array.isArray(days) && days.length > 0;
  if (empty) empty.classList.toggle("visually-hidden", hasData);
  table.classList.toggle("visually-hidden", !hasData);
  if (!hasData) return;

  // Build item -> tags map from current closet configuration
  const closet = readCloset(); // uses current table
  const tagMap = new Map(); // name -> Set(tags)
  for (const it of closet) {
    tagMap.set(it.name, new Set((it.tags || []).map(String)));
  }

  // Count tags present in the history window
  const tagCounts = new Map(); // tag -> count
  for (const day of days) {
    for (const name of day.items || []) {
      const tset = tagMap.get(name);
      if (!tset || tset.size === 0) continue;
      for (const tag of tset) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  // Choose top N tags to become columns (tweakable)
  const MAX_TAG_COLS = 3;
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TAG_COLS)
    .map(([t]) => t);

  // Render thead: Date | tag cols... | Other
  const htr = document.createElement("tr");
  const thDate = document.createElement("th");
  thDate.className = "date-cell";
  thDate.textContent = "Date";
  htr.appendChild(thDate);
  for (const tag of topTags) {
    const th = document.createElement("th");
    th.textContent = tag.replace(/_/g, " ");
    htr.appendChild(th);
  }
  const thOther = document.createElement("th");
  thOther.textContent = topTags.length ? "Other" : "Outfit";
  htr.appendChild(thOther);
  thead.appendChild(htr);

  // For each day, distribute items into matching tag columns (can appear in multiple)
  for (const { date, items } of days) {
    const tr = document.createElement("tr");
    const tdDate = document.createElement("td");
    tdDate.className = "date-cell";
    tdDate.innerHTML = `<span class="fw-semibold">${date}</span>`;
    tr.appendChild(tdDate);

    // buckets per column tag
    const colBuckets = new Map(topTags.map((t) => [t, []]));
    const other = [];
    for (const name of items || []) {
      const tset = tagMap.get(name) || new Set();
      let matched = false;
      for (const t of topTags) {
        if (tset.has(t)) {
          colBuckets.get(t).push(name);
          matched = true;
        }
      }
      if (!matched) other.push(name);
    }

    // emit tag columns
    for (const t of topTags) {
      const td = document.createElement("td");
      td.className = "outfit-cell";
      const names = colBuckets.get(t) || [];
      td.innerHTML = names
        .map(
          (n) =>
            `<span class="badge rounded-pill text-bg-light">${escapeHtml(n)}</span>`,
        )
        .join("");
      tr.appendChild(td);
    }
    // emit Other / Outfit
    const tdOther = document.createElement("td");
    tdOther.className = "outfit-cell";
    tdOther.innerHTML = other
      .map(
        (n) =>
          `<span class="badge rounded-pill text-bg-light">${escapeHtml(n)}</span>`,
      )
      .join("");
    tr.appendChild(tdOther);
    tbody.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
