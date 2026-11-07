"""Extract calculator layouts from the workbook into www/js/ui.js."""
import json, re, sys
import openpyxl
from openpyxl.utils import get_column_letter
from xlcompile import Compiler, CompileError, split_sheet, parse_cell

SRC, OUT = sys.argv[1], sys.argv[2]
SKIP = {"App Logic (for Android)"}
wb = openpyxl.load_workbook(SRC)
sheets = [ws for ws in wb.worksheets if ws.title not in SKIP]
SI = {ws.title: i for i, ws in enumerate(sheets)}

names = {}
for n, dn in wb.defined_names.items():
    sh, addr = split_sheet(dn.attr_text)
    a, b = (addr.split(":") + [addr])[:2]
    p1, p2 = parse_cell(a), parse_cell(b)
    names[n] = (sh, p1[0], p1[1], p2[0], p2[1])
comp = Compiler(SI, names)

# ----------------------------------------------------------------- catalogue
CATS = [
    ("pipe", "Pipe", "pipe", [
        ("Pipe Size Calculator", "Pipe Size", "Pipe size, velocity, pressure drop, schedule, flange class"),
        ("PI4 Thermal Expansion", "Thermal Expansion & Loop", "Free expansion between anchors, loop leg length"),
        ("PI5 Hydrotest Pressure", "Piping Test Pressure", "Hydro & pneumatic test pressure (B31.3)"),
    ]),
    ("pump", "Pump", "pump", [
        ("Pump & Motor Calculator", "Pump & Motor", "Total head, NPSH, pump type, motor kW/FLC/starter/breaker"),
        ("P3 Affinity Laws VFD", "Affinity Laws / VFD", "New flow, head & power after speed change or trim"),
        ("P5 Pump Specific Speed", "Pump Specific Speed", "Impeller type, suction specific speed risk"),
    ]),
    ("valve", "Valve", "valve", [
        ("Control Valve Calculator", "Control Valve", "Cv/Kv, choked / flashing / cavitation, valve type"),
        ("Safety Valve Calculator", "Safety Valve (PSV)", "PSV required area, API 526 orifice letter"),
    ]),
    ("heat", "Heat", "heat", [
        ("Heat Exchanger Calculator", "Heat Exchanger", "Duty, LMTD & F, area, tubes, shell size"),
        ("Boiler & Steam Calculator", "Boiler & Steam", "Steam demand, boiler t/h & type, fuel, feed pump"),
        ("Insulation Calculator", "Insulation", "Insulation type, thickness, kg needed, cladding"),
        ("H4 Batch Heating Time", "Batch Heating / Cooling", "Time to heat or cool a batch"),
    ]),
    ("utility", "Utility", "fan", [
        ("Cooling Tower Calculator", "Cooling Tower", "Heat load, CT-TR, tower type, cells"),
        ("Air Compressor Calculator", "Air Compressor", "Compressor type & kW, receiver, dryer, header"),
        ("Fan & Ventilation Calc", "Fan & Ventilation", "Room airflow (air changes + heat), fans, ducts"),
    ]),
    ("vessel", "Vessel", "vessel", [
        ("Pressure Vessel Calculator", "Pressure Vessel", "Shell/head thickness, MAWP, hydrotest, weight"),
        ("Storage Tank Calculator", "Storage Tank", "API 650 capacity, shell courses, bottom/annular"),
        ("V3 Horizontal Tank Vol", "Horizontal Tank Volume", "Liquid volume at any level, 2:1 heads"),
        ("V4 Vertical Tank Vol", "Vertical Tank Fill / Drain", "Volume at level, time to fill or empty"),
    ]),
    ("process", "Process", "flask", [
        ("PR6 Gas Flow Nm3 Conv", "Gas Flow Nm³ ↔ Actual", "Am³/h ↔ Nm³/h, Sm³/h, SCFM, kg/h"),
        ("PR7 Agitator Power", "Agitator Power", "Power, kW/m³, tip speed, mixing duty"),
        ("PR8 Stream Mixing", "Stream Mixing", "Blended flow, concentration & temperature"),
        ("PR9 Dilution", "Dilution", "Water needed to dilute a concentrate"),
    ]),
    ("material", "Material", "drop", [
        ("Material Selection", "Material Selection", "Which material for which liquid: pipe, tank, pump, gasket"),
        ("Chemical Compatibility", "Chemical Compatibility", "Compatible pipe, flange & gasket for a chemical"),
    ]),
    ("machine", "Machine", "gear", [
        ("M2 Shaft Diameter", "Shaft Diameter", "Bending + torsion (ASME code), standard size"),
        ("M4 Bolt Torque", "Bolt Torque & Preload", "Tightening torque for metric bolts"),
        ("M5 V-Belt Drive", "V-Belt Drive", "Pulley size, belt length, speed, wrap angle"),
        ("M6 Gearbox Selection", "Gearbox & Coupling", "Ratio, output torque, rating with service factor"),
    ]),
    ("maint", "Maint.", "wrench", [
        ("Maintenance Calculator", "Maintenance", "Vibration zone, bearing L10, re-greasing, OEE"),
        ("R3 Weibull PM Interval", "Weibull & PM Interval", "B10 life, MTTF, cost-optimal replacement age"),
        ("R5 Spare Parts EOQ", "Spare Parts EOQ", "Order quantity, safety stock, reorder point"),
        ("R6 Repair vs Replace", "Repair vs Replace", "Equivalent annual cost comparison"),
        ("R8 Maintenance KPI", "Maintenance KPI", "KPIs vs world-class benchmarks"),
        ("FMEA", "FMEA & Criticality", "RPN = S×O×D, action priority (25 items)"),
    ]),
    ("energy", "Energy", "bolt", [
        ("Motor & Power Calculator", "Motor & Power", "Motor, PF capacitor kVAR, transformer & generator"),
        ("E1 Air Leak Cost", "Compressed Air Leak Cost", "Air loss and yearly cost of leaks"),
        ("E2 Steam Leak Cost", "Steam Leak / Trap Loss", "Steam lost and annual cost"),
        ("E3 Motor Upgrade Payback", "Motor Upgrade Payback", "IE3/IE4 saving and payback"),
        ("E4 VFD Savings", "VFD Savings", "Throttle vs variable speed, pump / fan"),
        ("E5 Boiler Efficiency", "Boiler Efficiency", "Direct method, evaporation ratio, steam cost"),
        ("E7 Chiller kW per TR", "Chiller kW/TR & COP", "Chiller performance benchmark"),
    ]),
    ("steel", "Steel", "grid", [
        ("Steel Section Weight", "Steel Section Weight", "Weight of beams, channels, angles, flats"),
        ("Material Weight Calculator", "Material Take-off (MTO)", "Plate, bar, pipe, angle, SHS/RHS weight & cost"),
        ("Roofing Sheet Calculator", "Roofing Sheet", "Profile sheets, purlins, ridge cap, flashing"),
        ("ST1 Beam Selection", "Beam / Channel Selection", "Point load + UDL, checks every section"),
    ]),
    ("lifting", "Lifting", "hook", [
        ("Rigging & Lifting Calculator", "Rigging & Lifting", "Gross lift, crane capacity, sling & shackle"),
        ("M8 Lifting Beam", "Lifting Beam (ISMB)", "Beam check with hoist load, auto-select"),
    ]),
    ("project", "Project", "chart", [
        ("Project Cost Calculator", "Project Cost", "Man-hours, duration, finish date, CAPEX, EVM"),
        ("J1 NPV IRR Payback", "NPV, IRR & Payback", "Should we invest?"),
        ("J3 Cost Estimate", "Capacity-factored Estimate", "Six-tenths rule, cost index, Lang factor"),
    ]),
    ("units", "Units", "swap", [
        ("Unit Converter", "Unit Converter", "Any engineering unit to any other unit"),
    ]),
]
# sheets renamed/removed in Excel are skipped; new sheets go to an "Other" category
for _, _, _, items in CATS:
    for it in list(items):
        if it[0] not in SI:
            print("WARNING: sheet not found in workbook, skipped:", it[0])
            items.remove(it)
listed = [s for _, _, _, items in CATS for s, _, _ in items]
extra = [ws.title for ws in sheets if ws.title not in listed and ws.title not in ("HOME", "Data", "Data A")]
if extra:
    print("New sheets added to 'Other':", extra)
    CATS.append(("other", "Other", "list", [(t, t, "") for t in extra]))
CATS = [c for c in CATS if c[3]]

# ----------------------------------------------------------------- helpers
def rgb(color):
    try:
        if color is None or color.type != "rgb" or not isinstance(color.rgb, str):
            return None
        return color.rgb[-6:].upper()
    except Exception:
        return None


def fill_rgb(c):
    if c.fill is None or c.fill.fill_type in (None, "none"):
        return None
    return rgb(c.fill.fgColor)


def is_greenish(h):
    if not h:
        return False
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return g > 150 and g > r + 8 and g > b + 8


def is_yellowish(h):
    if not h:
        return False
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return r > 220 and g > 200 and b < 210 and r - b > 30


def is_dark(h):
    if not h:
        return False
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (r * 299 + g * 587 + b * 114) / 1000 < 140


def cell_text(v):
    if v is None:
        return ""
    return str(v)


def build_dv_map(ws, si):
    out = {}
    for dv in ws.data_validations.dataValidation:
        if dv.type != "list" or not dv.formula1:
            continue
        f = str(dv.formula1)
        try:
            js = comp.compile("=" + f.lstrip("="), ws.title)
        except Exception as e:
            print("DV compile fail", ws.title, f, e)
            continue
        for rng in str(dv.sqref).split():
            if ":" in rng:
                a, b = rng.split(":")
            else:
                a = b = rng
            (r1, c1), (r2, c2) = parse_cell(a), parse_cell(b)
            for r in range(r1, r2 + 1):
                for c in range(c1, c2 + 1):
                    out[(r, c)] = js
    return out


DV_FUNCS = {}  # js expr -> id
def dv_id(js):
    if js not in DV_FUNCS:
        DV_FUNCS[js] = len(DV_FUNCS)
    return DV_FUNCS[js]


def merged_map(ws):
    m = {}
    for rng in ws.merged_cells.ranges:
        m[(rng.min_row, rng.min_col)] = (rng.max_row - rng.min_row + 1, rng.max_col - rng.min_col + 1)
        for r in range(rng.min_row, rng.max_row + 1):
            for c in range(rng.min_col, rng.max_col + 1):
                if (r, c) != (rng.min_row, rng.min_col):
                    m[(r, c)] = None  # covered
    return m


def cell_obj(ws, c, dvmap, protected):
    """compact descriptor of a cell for the UI"""
    o = {"r": c.row, "c": c.column}
    inp = protected and not c.protection.locked
    if inp:
        o["in"] = 1
        if (c.row, c.column) in dvmap:
            o["dv"] = dv_id(dvmap[(c.row, c.column)])
        if isinstance(c.value, str) and c.value.startswith("="):
            o["fx"] = 1
    fmt = c.number_format
    if fmt and fmt != "General":
        o["f"] = fmt
    if c.font is not None:
        if c.font.b:
            o["b"] = 1
        if c.font.sz and c.font.sz >= 13:
            o["z"] = 1
    fr = fill_rgb(c)
    if not inp and is_greenish(fr):
        o["g"] = 1
    return o


def used(c):
    return c.value is not None


# ----------------------------------------------------------------- layout per sheet
def visible_cols(ws, maxc):
    hidden = set()
    for k, d in ws.column_dimensions.items():
        if d.hidden:
            lo, hi = (d.min or 0), (d.max or 0)
            if lo and hi:
                hidden.update(range(lo, hi + 1))
            else:
                from openpyxl.utils import column_index_from_string
                hidden.add(column_index_from_string(k))
    return [c for c in range(1, maxc + 1) if c not in hidden]


def is_nav(c):
    if c.hyperlink is not None:
        return True
    v = c.value
    return isinstance(v, str) and (("HOME" in v and "🏠" in v) or v.strip().startswith("◄") or v.strip().endswith("►"))


def layout(ws):
    si = SI[ws.title]
    protected = bool(ws.protection.sheet)
    dvmap = build_dv_map(ws, si)
    mm = merged_map(ws)
    maxr, maxc = ws.max_row, ws.max_column
    vcols = visible_cols(ws, maxc)
    grid = {}
    for row in ws.iter_rows(min_row=1, max_row=maxr, max_col=maxc):
        for c in row:
            if c.column not in vcols or c.__class__.__name__ == "MergedCell":
                continue
            if is_nav(c):
                continue
            inp = protected and not c.protection.locked
            if used(c) or inp:
                grid[(c.row, c.column)] = c
    # split into left/right regions when a fully empty visible column exists after column D
    cols_used = sorted({k[1] for k in grid})
    split = None
    for col in range(5, maxc + 1):
        if col in vcols and col not in cols_used and any(cc > col for cc in cols_used) and any(cc < col for cc in cols_used):
            # confirm nothing spans across it
            split = col
            break
    regions = [(1, split - 1), (split + 1, maxc)] if split else [(1, maxc)]

    title = subtitle = ""
    blocks = []
    texts = []

    for ri, (lo, hi) in enumerate(regions):
        rows = sorted({k[0] for k in grid if lo <= k[1] <= hi})
        table = None
        prev_row = None
        for r in rows:
            cells = [grid[(r, c)] for c in range(lo, hi + 1) if (r, c) in grid]
            if not cells:
                continue
            for c in cells:
                if isinstance(c.value, str) and not c.value.startswith("="):
                    texts.append(c.value)
            if ri == 0 and r == 1 and not title:
                title = cell_text(cells[0].value)
                continue
            if ri == 0 and r == 2 and not subtitle and len(cells) == 1:
                subtitle = cell_text(cells[0].value)
                continue
            beyond = any(c.column > lo + 3 for c in cells)
            # table rows: anything wider than 4 columns of the region, or the right region
            if beyond or ri > 0:
                if table is None or (prev_row is not None and r - prev_row > 1):
                    table = {"t": "table", "rows": []}
                    blocks.append(table)
                trow = []
                for col in range(lo, hi + 1):
                    if mm.get((r, col), 0) is None:
                        continue
                    span = mm.get((r, col))
                    c = grid.get((r, col))
                    if c is None:
                        trow.append(None)
                        continue
                    o = cell_obj(ws, c, dvmap, protected)
                    if span and span[1] > 1:
                        o["cs"] = min(span[1], hi - col + 1)
                    trow.append(o)
                # trim trailing empties
                while trow and trow[-1] is None:
                    trow.pop()
                table["rows"].append(trow)
                table["c0"] = min(table.get("c0", 99), lo)
                prev_row = r
                continue
            table = None
            prev_row = r
            inputs = [c for c in cells if protected and not c.protection.locked]
            if len(cells) == 1 and not inputs:
                c = cells[0]
                fr = fill_rgb(c)
                txt = cell_text(c.value)
                is_formula = isinstance(c.value, str) and c.value.startswith("=")
                if (c.font.b and not is_formula and len(txt) < 90) or is_dark(fr):
                    blocks.append({"t": "h", "text": txt})
                else:
                    blocks.append({"t": "note", "cell": cell_obj(ws, c, dvmap, protected)})
                continue
            label, rest = cells[0], cells[1:]
            if protected and not label.protection.locked:  # row starts with an input (no label)
                label, rest = None, cells
            row = {"t": "row", "label": cell_obj(ws, label, dvmap, protected) if label else None}
            if rest:
                row["value"] = cell_obj(ws, rest[0], dvmap, protected)
                vcol = rest[0].column
                others = rest[1:]
                if others and others[0].column == vcol + 1 + (mm.get((r, vcol), (1, 1)) or (1, 1))[1] - 1:
                    row["unit"] = cell_obj(ws, others[0], dvmap, protected)
                    others = others[1:]
                if others:
                    row["note"] = cell_obj(ws, others[0], dvmap, protected)
            blocks.append(row)
    return {"title": title, "subtitle": subtitle, "blocks": blocks, "text": " ".join(texts)[:4000]}


def data_layout(ws):
    """Reference data sheet → list of titled tables split on blank rows."""
    mm = merged_map(ws)
    maxc = ws.max_column
    rows = {}
    for row in ws.iter_rows():
        vals = [c for c in row if c.value is not None and c.__class__.__name__ != "MergedCell" and not is_nav(c)]
        if vals:
            rows[row[0].row] = vals
    blocks, cur, last = [], None, None
    for r in sorted(rows):
        if r <= 2:
            continue
        cells = rows[r]
        if cur is None or r - last > 1:
            cur = {"title": "", "note": "", "rows": []}
            blocks.append(cur)
            first = cells[0]
            if first.font.b and (len(cells) <= 2) and isinstance(first.value, str):
                cur["title"] = first.value
                if len(cells) == 2 and isinstance(cells[1].value, str):
                    cur["note"] = cells[1].value
                last = r
                continue
        trow, c0 = [], min(c.column for c in cells)
        maxcol = max(c.column for c in cells)
        bycol = {c.column: c for c in cells}
        for col in range(1, maxcol + 1):
            c = bycol.get(col)
            if c is None:
                trow.append(None)
            else:
                o = {"r": c.row, "c": c.column}
                if c.number_format and c.number_format != "General":
                    o["f"] = c.number_format
                if c.font.b:
                    o["b"] = 1
                trow.append(o)
        cur["rows"].append(trow)
        last = r
    # merge title-only blocks with the following block; drop empties
    out = []
    for b in blocks:
        if out and not out[-1]["rows"] and out[-1]["title"]:
            b2 = out.pop()
            b["title"] = b["title"] or b2["title"]
            b["note"] = b["note"] or b2["note"]
        out.append(b)
    out = [b for b in out if b["rows"]]
    # strip leading empty columns per block
    for b in out:
        lead = min((next((i for i, x in enumerate(rw) if x is not None), 99) for rw in b["rows"]), default=0)
        b["rows"] = [rw[lead:] for rw in b["rows"]]
    return out


calcs = {}
for cid, label, icon, items in CATS:
    for name, short, desc in items:
        ws = wb[name]
        lay = layout(ws)
        code = name.split(" ")[0] if re.match(r"^[A-Z]{1,2}\d", name) else ""
        calcs[SI[name]] = {"name": short, "desc": desc, "code": code, "cat": cid, **lay}

data = []
for nm, label in (("Data", "Data (Mechanical Engineer All-in-One)"), ("Data A", "Data A (Engineering Calculator Suite)")):
    if nm not in SI:
        continue
    data.append({"sheet": SI[nm], "label": label, "blocks": data_layout(wb[nm])})

dv_src = ",\n".join(f"{i}:()=>{js}" for js, i in sorted(DV_FUNCS.items(), key=lambda x: x[1]))
cats = [{"id": cid, "label": label, "icon": icon, "items": [SI[n] for n, _, _ in items]} for cid, label, icon, items in CATS]
n_calc = sum(len(c["items"]) for c in cats if c["id"] != "units")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("/* generated – calculator layouts */\n(function(root){\n")
    f.write("root.ENGCALC_UI=" + json.dumps({"cats": cats, "calcs": calcs, "data": data, "nCalc": n_calc}, ensure_ascii=False, separators=(",", ":")) + ";\n")
    f.write("root.ENGCALC_UI.dv={\n" + dv_src + "\n};\n")
    f.write("})(typeof window!=='undefined'?window:globalThis);\n")
print("calcs", len(calcs), "dv lists", len(DV_FUNCS), "data blocks", [len(d["blocks"]) for d in data], "n_calc", n_calc)
