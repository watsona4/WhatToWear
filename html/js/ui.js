const $ = (sel) => document.querySelector(sel);
const API = {
  suggest: async (lat, lon) => fetch(`./api/v2/suggest?lat=${lat}&lon=${lon}`).then(r=>r.json()),
  getCloset: async () => fetch(`./api/v2/closet`).then(r=>r.json()),
  saveCloset: async (items) => fetch(`./api/v2/closet`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({items})}).then(r=>r.json())
};

async function geolocate() {
  if (!navigator.geolocation) throw new Error("Geolocation not supported");
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({lat: pos.coords.latitude, lon: pos.coords.longitude}),
      err => reject(err),
      {enableHighAccuracy: true, timeout: 8000}
    );
  });
}

function renderWeather(weather) {
  const d = weather.daily;
  document.querySelector("#weather").innerHTML = `High ${d.high_f.toFixed(0)}°F, Low ${d.low_f.toFixed(0)}°F; UV max ${d.uv_index_max?.toFixed(0)}; Precip ${(d.precip_prob_max*100||0).toFixed(0)}%`;
}

function renderEffects(effects) {
  document.querySelector("#effects").innerHTML = `<div class="small">Tags: <code>${effects.tags.join(", ")||"none"}</code> | Notes: ${effects.notes.join("; ")||"none"}</div>`;
}

function renderOutfit(outfit) {
  const pieces = outfit.pieces.map(p => Object.values(p)[0]).join(", ");
  document.querySelector("#outfit").innerHTML = `<div class="fw-semibold">${outfit.name}</div><div class="small text-muted">${pieces}</div>`;
}

function constraintPass(constraints, ctx) {
  for (const entry of constraints) {
    const [k, raw] = entry.split("=").map(s=>s.trim());
    if (!k) continue;
    const v = Number.isFinite(+raw) ? +raw : raw;
    if (k.startsWith("min_")) {
      const metric = k.slice(4);
      if (ctx[metric] == null || ctx[metric] < v) return false;
    } else if (k.startsWith("max_")) {
      const metric = k.slice(4);
      if (ctx[metric] == null || ctx[metric] > v) return false;
    } else {
      if (k === "tag" && v && !(ctx.tags||[]).includes(String(v))) return false;
    }
  }
  return true;
}

function parseConstraints(s) {
  if (!s) return [];
  return s.split(",").map(x=>x.trim()).filter(Boolean);
}

function rowTemplate(item) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="form-control form-control-sm name" value="${item.name||""}" placeholder="e.g., Blue plaid shirt"></td>
    <td>
      <select class="form-select form-select-sm type">
        ${["top","bottom","outer","accessory","shoes"].map(t=>`<option ${item.type===t?"selected":""}>${t}</option>`).join("")}
      </select>
    </td>
    <td><input class="form-control form-control-sm tags" value="${(item.tags||[]).join(", ")}" placeholder="rain-ready, business"></td>
    <td><input class="form-control form-control-sm constraints" value="${(item.constraints||[]).join(", ")}" placeholder="min_temp_f=50, max_wind_mph=25"></td>
    <td class="text-end"><button class="btn btn-outline-danger btn-sm remove">✕</button></td>
  `;
  tr.querySelector(".remove").addEventListener("click", ()=> tr.remove());
  return tr;
}

async function loadCloset() {
  const data = await API.getCloset().catch(()=>({items:[]}));
  const tbody = document.querySelector("#closet-table tbody");
  tbody.innerHTML = "";
  (data.items||[]).forEach(item => tbody.appendChild(rowTemplate(item)));
}

function readCloset() {
  const rows = Array.from(document.querySelectorAll("#closet-table tbody tr"));
  return rows.map(r => ({
    name: r.querySelector(".name").value.trim(),
    type: r.querySelector(".type").value,
    tags: r.querySelector(".tags").value.split(",").map(x=>x.trim()).filter(Boolean),
    constraints: parseConstraints(r.querySelector(".constraints").value)
  })).filter(x => x.name);
}

function chooseShoes(items) {
  const shoes = items.filter(i=>i.type==="shoes");
  return shoes[0]?.name || null;
}

function generateCombos(items, ctx) {
  const tops = items.filter(i=>i.type==="top" && constraintPass(i.constraints||[], ctx));
  const bottoms = items.filter(i=>i.type==="bottom" && constraintPass(i.constraints||[], ctx));
  const outers = items.filter(i=>i.type==="outer" && constraintPass(i.constraints||[], ctx));
  const accessories = items.filter(i=>i.type==="accessory" && constraintPass(i.constraints||[], ctx));
  const shoes = chooseShoes(items);

  const combos = [];
  for (const t of tops) {
    for (const b of bottoms) {
      const base = {top:t.name, bottom:b.name, shoes};
      const o = outers.find(o => (o.tags||[]).some(tag => (ctx.tags||[]).includes(tag)));
      const acc = accessories.filter(a => (a.tags||[]).some(tag => (ctx.tags||[]).includes(tag))).slice(0,2);
      combos.push({
        ...base,
        ...(o ? {outer:o.name} : {}),
        ...(acc.length ? {accessories: acc.map(a=>a.name)} : {})
      });
    }
  }
  return combos;
}

function renderCombos(combos) {
  const el = document.querySelector("#combos");
  if (!combos.length) { el.innerHTML = "<div class='text-muted small'>No valid combinations match the conditions.</div>"; return; }
  el.innerHTML = combos.slice(0, 20).map(c => {
    const parts = [c.top, c.bottom, c.outer, (c.accessories||[]).join(" + "), c.shoes].filter(Boolean);
    return `<div class="p-2 border rounded mb-2">${parts.join(" + ")}</div>`;
  }).join("");
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
    uv_index: data.weather.daily.uv_index_max
  };
}

function addItemRow() {
  document.querySelector("#closet-table tbody").appendChild(rowTemplate({type:"top"}));
}

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelector("#btn-geolocate").addEventListener("click", async () => {
    try {
      const {lat, lon} = await geolocate();
      document.querySelector("#lat").value = lat.toFixed(6);
      document.querySelector("#lon").value = lon.toFixed(6);
      await refreshSuggest();
    } catch(e) {
      alert("Unable to get your location. You can still enter lat/lon manually.");
    }
  });
  document.querySelector("#btn-refresh").addEventListener("click", refreshSuggest);
  document.querySelector("#btn-add-item").addEventListener("click", addItemRow);
  document.querySelector("#btn-save-closet").addEventListener("click", async () => {
    const items = readCloset();
    await API.saveCloset(items);
  });
  document.querySelector("#btn-generate").addEventListener("click", () => {
    const items = readCloset();
    const ctx = window._effectsCtx || {};
    const combos = generateCombos(items, ctx);
    renderCombos(combos);
  });

  try { document.querySelector("#btn-geolocate").click(); } catch {}
  await loadCloset();
});
