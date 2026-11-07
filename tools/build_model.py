"""Compile the merged workbook into www/js/model.js (cells + formulas)."""
import json, sys, datetime
import openpyxl
from openpyxl.utils import column_index_from_string
from xlcompile import Compiler, CompileError, split_sheet, parse_cell

SRC, OUT = sys.argv[1], sys.argv[2]
SKIP = {"App Logic (for Android)"}

wb = openpyxl.load_workbook(SRC)
sheets = [ws for ws in wb.worksheets if ws.title not in SKIP]
sheet_index = {ws.title: i for i, ws in enumerate(sheets)}

names = {}
for n, dn in wb.defined_names.items():
    sh, addr = split_sheet(dn.attr_text)
    a, b = (addr.split(":") + [addr])[:2]
    p1, p2 = parse_cell(a), parse_cell(b)
    names[n] = (sh, p1[0], p1[1], p2[0], p2[1])

comp = Compiler(sheet_index, names)


def const(v):
    if isinstance(v, datetime.datetime):
        return (v - datetime.datetime(1899, 12, 30)).total_seconds() / 86400
    if isinstance(v, datetime.date):
        return (v - datetime.date(1899, 12, 30)).days
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v


model_sheets, formula_src, errors = [], [], []
for si, ws in enumerate(sheets):
    cells = {}
    for row in ws.iter_rows():
        for c in row:
            v = c.value
            if v is None or c.__class__.__name__ == "MergedCell":
                continue
            if isinstance(v, str) and v.startswith("=") and len(v) > 1:
                try:
                    js = comp.compile(v, ws.title)
                except (CompileError, KeyError, IndexError) as e:
                    errors.append((ws.title, c.coordinate, v, repr(e)))
                    continue
                formula_src.append(f'"{si}:{c.row}:{c.column}":()=>{js}')
            else:
                cells[f"{c.row},{c.column}"] = const(v)
    model_sheets.append({"name": ws.title, "cells": cells})

names_js = {n: [sheet_index[s], r1, c1, r2, c2] for n, (s, r1, c1, r2, c2) in names.items()}

with open(OUT, "w", encoding="utf-8") as f:
    f.write("/* generated from the Excel workbook – do not edit by hand */\n")
    f.write("(function(root){\n")
    f.write("root.ENGCALC_NAMES=" + json.dumps(names_js) + ";\n")
    f.write("root.ENGCALC_MODEL={sheets:" + json.dumps(model_sheets, ensure_ascii=False, separators=(",", ":")) + ",\n")
    f.write("formulas:{\n" + ",\n".join(formula_src) + "\n}};\n")
    f.write("})(typeof window!=='undefined'?window:globalThis);\n")

print("sheets", len(sheets), "formulas", len(formula_src), "compile errors", len(errors))
for e in errors[:20]:
    print(e)
