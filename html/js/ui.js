const $ = (sel) => document.querySelector(sel);

// ---- Session caches to keep the "Recently worn" table stable ----
let _historyDays = [];
let _recentTopTags = null; // array of chosen tag columns

const API = {
  suggest: async (lat, lon, mode) =>
    fetch(
      `./api/v2/suggest?lat=${lat}&lon=${lon}&mode=${encodeURIComponent(
        mode || "all_day",
      )}`,
    ).then((r) => r.json()),
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

function currentMode() {
  const el = document.querySelector('input[name="mode"]:checked');
  return el?.value || "all_day";
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

// Helper: display label "Name (ID)" when available
function displayLabel(name) {
  const closet = readCloset();
  const it = closet.find((x) => x.name === name);
  if (!it) return name;
  return it.id_code ? `${name} ` + `<span class="badge rounded-pill id-badge">${escapeHtml(it.id_code)}</span>` : name;
}

// ---------- ID helper: infer a prefix + auto-increment ----------
function inferIdPrefixFrom(item) {
  const name = (item.name || "").toLowerCase();
  const tags = new Set((item.tags || []).map((t) => String(t).toLowerCase()));
  const has = (t) => tags.has(t);
  // tops
  if (item.type === "top") {
    const bd = has("button_down") || /button|ocbd/.test(name);
    if ((has("short_sleeves") || /short/.test(name)) && bd) return "SSBD";
    if ((has("long_sleeves") || /long/.test(name)) && bd) return "LSBD";
    if (has("tee") || /tee|t-?shirt/.test(name)) return "TEE";
  }
  // bottoms
  if (item.type === "bottom") {
    if (has("chino") || /chino|khaki/.test(name)) return "CHINO";
    if (has("jeans") || /jean/.test(name)) return "JEAN";
    if (has("shorts") || /short/.test(name)) return "SHORT";
  }
  return null;
}

function nextIdForPrefix(prefix) {
  // scan current closet for existing IDs with this prefix and pick next 2-digit
  const closet = readCloset();
  let max = 0;
  for (const it of closet) {
    const m = String(it.id_code || "").match(new RegExp("^" + prefix + "-(\\d{2})$"));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const n = String(max + 1).padStart(2, "0");
  return `${prefix}-${n}`;
}

function handleAutoIdClick(tr) {
  const item = {
    name: tr.querySelector(".name")?.value || "",
    type: tr.querySelector(".type")?.value || "",
    tags: (tr.querySelector(".tags")?.value || "")
      .split(",").map((s) => s.trim()).filter(Boolean),
  };
  let prefix = inferIdPrefixFrom(item);
  if (!prefix) {
    const input = prompt("Enter ID prefix (SSBD, LSBD, TEE, CHINO, JEAN, SHORT):", "TEE");
    if (!input) return;
    const up = input.toUpperCase().trim();
    if (!/^SSBD|LSBD|TEE|CHINO|JEAN|SHORT$/.test(up)) {
      alert("Invalid prefix.");
      return;
    }
    prefix = up;
  }
  tr.querySelector(".id_code").value = nextIdForPrefix(prefix);
}

function renderPlan(plan) {
  const el = document.querySelector("#plan");
  if (!el || !plan) return;
  const swing = Math.round(plan.swing_f || 0);
  const notes = (plan.notes || [])
    .map((n) => `<li>${escapeHtml(n)}</li>`)
    .join("");
  const blocks = (plan.blocks || [])
    .map(
      (b) =>
        `<span class="badge rounded-pill text-bg-light me-2 mb-1">${b.name}: ${Math.round(
          b.temp_f,
        )}°F</span>`,
    )
    .join("");
  const rec = plan.recommend_layers
    ? `<span class="badge text-bg-warning">Large swing → bring/removable layers</span>`
    : `<span class="badge text-bg-success">Stable day</span>`;
  el.innerHTML = `
    <div class="d-flex flex-wrap align-items-center gap-2">
      <div><strong>Low/High:</strong> ${Math.round(plan.low_f)}° / ${Math.round(
        plan.high_f,
      )}°</div>
      <div><strong>Swing:</strong> ${swing}°</div><div>${rec}</div></div>
    <div class="mt-2">${blocks}</div>${
      notes ? `<ul class="mt-2 mb-0 small text-muted">${notes}</ul>` : ``
    }`;
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
    <td>
      <div class="input-group input-group-sm">
        <input class="form-control id_code" value="${item.id_code || ""}" placeholder="e.g., SSBD-07">
        <button class="btn btn-outline-secondary auto-id" type="button" title="Generate next ID">Auto</button>
      </div>
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
    <td class="text-center">
      <input class="form-check-input wearable" type="checkbox" ${item.wearable === false ? "" : "checked"} title="Currently wearable">
    </td>
    <td class="text-end"><button class="btn btn-outline-danger btn-sm remove">✕</button></td>
  `;
  tr.querySelector(".remove").addEventListener("click", () => tr.remove());
  tr.querySelector(".auto-id").addEventListener("click", () => handleAutoIdClick(tr));
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
      id_code: r.querySelector(".id_code").value.trim(),
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
      wearable: r.querySelector(".wearable").checked,
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
  const wearable = (i) => i.wearable !== false; // default true
  const tops = items.filter((i) => i.type === "top" && wearable(i) && constraintPass(i.constraints || [], ctx));
  const bottoms = items.filter((i) => i.type === "bottom" && wearable(i) && constraintPass(i.constraints || [], ctx));
  const outers = items.filter((i) => i.type === "outer" && wearable(i) && constraintPass(i.constraints || [], ctx));
  const accessories = items.filter((i) => i.type === "accessory" && wearable(i) && constraintPass(i.constraints || [], ctx));
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

function generateCombosForBlock(items, baseCtx, tempF) {
  const t = Number(tempF) || 0;
  const ctx = {
    ...baseCtx,
    temperature_f: t,
    apparent_f: t,
    min_temp_f: Math.min(baseCtx.min_temp_f ?? t, t),
    max_temp_f: Math.max(baseCtx.max_temp_f ?? t, t),
  };
  return generateCombos(items, ctx);
}

function renderCombosByBlocks(items, baseCtx, plan) {
  const el = document.querySelector("#combos");
  const blocks = plan?.blocks || [];
  if (!blocks.length) {
    el.innerHTML = "<div class='text-muted small'>No blocks available.</div>";
    return;
  }
  el.innerHTML = blocks
    .map((b) => {
      const list = generateCombosForBlock(items, baseCtx, b.temp_f).slice(
        0,
        10,
      );
      const inner = list.length
        ? list
            .map((c) => {
              const parts = [
                displayLabel(c.top),
                displayLabel(c.bottom),
                c.outer ? displayLabel(c.outer) : null,
                (c.accessories || []).map(displayLabel).join(" + "),
                c.shoes ? displayLabel(c.shoes) : null,
              ]
                 .filter(Boolean)
                 .join(" + ");
              const itemsStr = JSON.stringify(comboItems(c)).replace(
                /"/g,
                "&quot;",
              );
              return `<div class="combo-card p-2 border rounded mb-2" role="button" tabindex="0" data-items="${itemsStr}" style="cursor:pointer; user-select:none;"><div class="fw-semibold">${parts}</div><div class="text-muted small">${Math.round(
                b.temp_f,
              )}°F • Tap to wear</div></div>`;
            })
            .join("")
        : `<div class="text-muted small">No valid combos for ~${Math.round(
            b.temp_f,
          )}°F.</div>`;
      return `<div class="mb-3"><div class="h6 mb-2">${b.name}</div>${inner}</div>`;
    })
    .join("");
}

// ---------- History loading & stable rendering ----------
async function loadHistory(days = 21) {
  try {
    const hist = await API.history(days);
    _historyDays = hist.days || [];
    // Only compute tag columns once (at startup) if not already set
    if (!_recentTopTags) {
      const closet = readCloset();
      _recentTopTags = computeTopTags(_historyDays, closet, 3);
    }
    renderRecentWornTable(_historyDays, _recentTopTags);
  } catch (e) {
    console.warn("history failed", e);
    _historyDays = [];
    renderRecentWornTable([], _recentTopTags);
  }
}

function computeTopTags(days, closetItems, maxCols = 3) {
  // name -> tags set from closet config
  const tagMap = new Map();
  for (const it of closetItems || []) {
    tagMap.set(it.name, new Set((it.tags || []).map(String)));
  }
  // count tag frequency across all days
  const counts = new Map();
  for (const d of days || []) {
    for (const name of d.items || []) {
      const set = tagMap.get(name);
      if (!set) continue;
      for (const t of set) counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCols)
    .map(([t]) => t);
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
        displayLabel(c.top),
        displayLabel(c.bottom),
        c.outer ? displayLabel(c.outer) : null,
        (c.accessories || []).map(displayLabel).join(" + "),
        c.shoes ? displayLabel(c.shoes) : null,
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
  const data = await API.suggest(lat, lon, currentMode());
  renderWeather(data.weather);
  renderEffects(data.effects);
  renderOutfit(data.outfit);
  window._plan = data.plan || null;
  renderPlan(window._plan);
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

  // Keep history separate (we DO NOT re-render history here).
  // We can still load availability for filtering combos.
  try {
    const avail = await API.availability();
    window._availability = avail.availability || {};
    window._availabilityToday = avail.today;
    window._lastWorn = avail.last_worn || {};
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
    const plan = window._plan || {};
    if (currentMode() === "blocks" && plan?.blocks?.length) {
      renderCombosByBlocks(items, ctx, plan);
    } else {
      renderCombos(generateCombos(items, ctx));
    }
  });

  // Initial history load (once)
  await loadHistory(21);

  // ---- Auto-generate combos on first load ----
  try {
    // If geolocation succeeded earlier, refreshSuggest already ran.
    // Either way, attempt to render combos right away.
    const items = readCloset();
    const ctx = window._effectsCtx || {};
    const plan = window._plan || {};
    if (currentMode() === "blocks" && plan?.blocks?.length) {
      renderCombosByBlocks(items, ctx, plan);
    } else {
      renderCombos(generateCombos(items, ctx));
    }
  } catch {}

  // Mode toggle → refresh plan and (re)render combos WITHOUT touching history
  document.querySelectorAll('input[name="mode"]').forEach((el) => {
    el.addEventListener("change", async () => {
      await refreshSuggest();
      const items = readCloset();
      const ctx = window._effectsCtx || {};
      const plan = window._plan || {};
      if (currentMode() === "blocks" && plan?.blocks?.length) {
        renderCombosByBlocks(items, ctx, plan);
      } else {
        renderCombos(generateCombos(items, ctx));
      }
    });
  });

  // Tap-to-select: scope clicks ONLY inside the combos container
  document.getElementById("combos")?.addEventListener("click", async (e) => {
    const card = e.target.closest("#combos .combo-card");
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

      // Refresh history ONLY after a real selection
      await loadHistory(21);

      // Optional: refresh availability
      try {
        const avail = await API.availability();
        window._availability = avail.availability || {};
        window._availabilityToday = avail.today;
        window._lastWorn = avail.last_worn || {};
      } catch (e) {
        console.warn("availability failed", e);
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
        await API.resetLastWorn();

        // After a reset, clear history completely
        _historyDays = [];
        renderRecentWornTable([], _recentTopTags);

        // Optional: refresh availability
        try {
          const avail = await API.availability();
          window._availability = avail.availability || {};
          window._availabilityToday = avail.today;
          window._lastWorn = avail.last_worn || {};
        } catch {}

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

// --- Recently worn (legacy, simple text) ---
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

// Modern table by day with fixed type columns
function renderRecentWornTable(days) {
  const table = document.getElementById("recent-worn-table");
  const thead = table?.querySelector("thead");
  const tbody = table?.querySelector("tbody");
  const empty = document.querySelector("#recent-empty");
  if (!table || !thead || !tbody) return;
  tbody.innerHTML = "";
  thead.innerHTML = "";

  const hasData = Array.isArray(days) && days.length > 0;
  if (empty) empty.classList.toggle("visually-hidden", hasData);
  table.classList.toggle("visually-hidden", !hasData);
  if (!hasData) return;

  const closet = readCloset();
  const types = ["top", "bottom", "outer", "accessory", "shoes"];
  const findType = (name) => closet.find((x) => x.name === name)?.type || "accessory";

  // Render header: Date + each type
  const htr = document.createElement("tr");
  const thDate = document.createElement("th");
  thDate.className = "date-cell";
  thDate.textContent = "Date";
  htr.appendChild(thDate);
  for (const t of types) {
    const th = document.createElement("th");
    th.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    htr.appendChild(th);
  }
  thead.appendChild(htr);

  // Render rows
  for (const { date, items } of days) {
    const tr = document.createElement("tr");
    const tdDate = document.createElement("td");
    tdDate.className = "date-cell";
    tdDate.innerHTML = `<span class="fw-semibold">${date}</span>`;
    tr.appendChild(tdDate);

    const bucket = { top: [], bottom: [], outer: [], accessory: [], shoes: [] };
    for (const name of items || []) {
      const type = findType(name);
      bucket[type].push(displayLabel(name));
    }

    for (const t of types) {
      const td = document.createElement("td");
      td.className = "outfit-cell";
      td.innerHTML = bucket[t]
        .map(
          (n) =>
            `<span class="badge rounded-pill text-bg-light">${escapeHtml(
              n
            )}</span>`
        )
        .join("");
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}
