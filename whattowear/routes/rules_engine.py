import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

import yaml

LOG = logging.getLogger(__name__)


@dataclass
class Outfit:
    id: str
    name: str
    tags: List[str] = field(default_factory=list)
    pieces: List[Dict[str, str]] = field(default_factory=list)
    requires: Dict[str, Any] = field(default_factory=dict)


class LazyConfig:
    def __init__(self, paths: Dict[str, str]):
        self.paths = paths
        self.cache: Dict[str, Any] = {}
        self.mtimes: Dict[str, float] = {}

    def _maybe(self, key: str):
        path = self.paths[key]
        if not os.path.exists(path):
            return
        mtime = os.path.getmtime(path)
        if self.mtimes.get(key) != mtime:
            with open(path, "r") as f:
                self.cache[key] = yaml.safe_load(f) or {}
            self.mtimes[key] = mtime
            LOG.info("Reloaded %s", key)

    def outfits(self) -> Dict[str, Outfit]:
        self._maybe("outfits")
        data = self.cache.get("outfits", {})
        out = {}
        for it in data.get("outfits", []):
            out[it["id"]] = Outfit(**it)
        return out

    def rules(self) -> Dict[str, Any]:
        self._maybe("rules")
        return self.cache.get("rules", {})


def _metric(ctx: Dict[str, Any], name: str):
    """
    Return a metric from context, honoring effective values if provided.
    - temperature_f -> temperature_f_eff (fallback to temperature_f)
    - apparent_f    -> apparent_f_eff (fallback to apparent_f)
    """
    if name == "temperature_f":
        return ctx.get("temperature_f_eff", ctx.get("temperature_f"))
    if name == "apparent_f":
        return ctx.get("apparent_f_eff", ctx.get("apparent_f"))
    return ctx.get(name)


def matches_requires(req: Dict[str, Any], ctx: Dict[str, Any]) -> bool:
    for k, v in req.items():
        if k.startswith("min_"):
            metric = k[4:]
            val = _metric(ctx, metric)
            if val is None or val < v:
                return False
        elif k.startswith("max_"):
            metric = k[4:]
            val = _metric(ctx, metric)
            if val is None or val > v:
                return False
    return True


def evaluate_rules(rules_cfg: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    tags, add_items, notes = set(), set(), []
    temp_bias = 0.0
    for rs in rules_cfg.get("rule_sets", []):
        cont = rs.get("continue", True)
        for r in rs.get("rules", []):
            if matches_requires(r.get("when", {}), context):
                tags.update(r.get("add_tags", []))
                add_items.update(r.get("add_items", []))
                temp_bias += float(str(r.get("temp_bias_f", 0)).replace("+", ""))
                if r.get("note"):
                    notes.append(r["note"])
                if not cont:
                    break
    return {
        "tags": sorted(tags),
        "add_items": sorted(add_items),
        "temp_bias_f": temp_bias,
        "notes": notes,
    }


class WearHistory:
    def __init__(
        self, backend: str = "json", json_path: str = "./data/wear_history.json", redis=None
    ):
        self.backend = backend
        self.json_path = json_path
        self.redis = redis

    def record(self, outfit_id: str, date: Optional[str] = None):
        date = date or datetime.now().strftime("%Y-%m-%d")
        entry = {"date": date, "outfit": outfit_id}
        if self.backend == "json":
            os.makedirs(os.path.dirname(self.json_path), exist_ok=True)
            data = []
            if os.path.exists(self.json_path):
                with open(self.json_path) as f:
                    data = json.load(f)
            data.append(entry)
            with open(self.json_path, "w") as f:
                json.dump(data, f, indent=2)
        elif self.backend == "redis" and self.redis:
            self.redis.lpush("what2wear:history", json.dumps(entry))

    def last_worn_map(self) -> Dict[str, str]:
        if self.backend == "json" and os.path.exists(self.json_path):
            with open(self.json_path) as f:
                data = json.load(f)
        elif self.backend == "redis" and self.redis:
            data = [json.loads(x) for x in self.redis.lrange("what2wear:history", 0, 1000)]
        else:
            data = []
        latest = {}
        for e in data:
            latest[e["outfit"]] = e["date"]
        return latest


def choose_outfit(
    outfits: Dict[str, Outfit],
    tags: List[str],
    context: Dict[str, Any],
    history: WearHistory,
    rules_cfg: Dict[str, Any],
) -> Outfit:
    candidates = [o for o in outfits.values() if matches_requires(o.requires, context)]
    if not candidates:
        raise ValueError("No outfits match current conditions")
    last = history.last_worn_map()

    def days_since(o):
        d = last.get(o.id)
        if not d:
            return 9999
        return (datetime.now() - datetime.strptime(d, "%Y-%m-%d")).days

    candidates.sort(key=lambda o: days_since(o), reverse=True)
    weights = []
    wb = rules_cfg.get("selection", {}).get("weights_by_tag", {})
    for o in candidates:
        w = 1.0
        for t in o.tags:
            w *= float(wb.get(t, 1.0))
        weights.append(w)
    import random

    return random.choices(candidates, weights=weights, k=1)[0]
