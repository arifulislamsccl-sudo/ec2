"""Excel formula -> JavaScript expression compiler (subset used by the workbook)."""
import json, re
from openpyxl.formula.tokenizer import Tokenizer, Token
from openpyxl.utils import column_index_from_string


class CompileError(Exception):
    pass


CELL_RE = re.compile(r"^\$?([A-Z]{1,3})\$?(\d+)$")


def split_sheet(ref):
    if "!" in ref:
        sh, addr = ref.rsplit("!", 1)
        if sh.startswith("'") and sh.endswith("'"):
            sh = sh[1:-1].replace("''", "'")
        return sh, addr
    return None, ref


def parse_cell(a):
    m = CELL_RE.match(a)
    if not m:
        return None
    return int(m.group(2)), column_index_from_string(m.group(1))


class Compiler:
    def __init__(self, sheet_index, names):
        """sheet_index: name->idx ; names: defined name -> (sheet, r1,c1,r2,c2)"""
        self.sheet_index = sheet_index
        self.names = names

    # ---------- reference handling
    def ref_js(self, text, cur_sheet):
        sh, addr = split_sheet(text)
        if sh is None and addr.upper() in ("TRUE", "FALSE"):
            return "true" if addr.upper() == "TRUE" else "false"
        if sh is None and addr in self.names:
            s, r1, c1, r2, c2 = self.names[addr]
            return f"R({self.sheet_index[s]},{r1},{c1},{r2},{c2})"
        si = self.sheet_index[sh] if sh else self.sheet_index[cur_sheet]
        if ":" in addr:
            a, b = addr.split(":")
            p1, p2 = parse_cell(a), parse_cell(b)
            if not p1 or not p2:
                raise CompileError("bad range " + text)
            return f"R({si},{min(p1[0],p2[0])},{min(p1[1],p2[1])},{max(p1[0],p2[0])},{max(p1[1],p2[1])})"
        p = parse_cell(addr)
        if not p:
            raise CompileError("unknown ref " + text)
        return f"C({si},{p[0]},{p[1]})"

    # ---------- parser
    def compile(self, formula, cur_sheet):
        tok = Tokenizer(formula)
        self.toks = [t for t in tok.items if t.type != Token.WSPACE]
        self.i = 0
        self.cur = cur_sheet
        js = self.expr(0)
        if self.i != len(self.toks):
            raise CompileError("trailing tokens in " + formula)
        return js

    def peek(self):
        return self.toks[self.i] if self.i < len(self.toks) else None

    def take(self):
        t = self.toks[self.i]
        self.i += 1
        return t

    BIN = {
        "=": (1, "EQ"), "<>": (1, "NE"), "<": (1, "LT"), ">": (1, "GT"), "<=": (1, "LE"), ">=": (1, "GE"),
        "&": (2, "CAT"), "+": (3, "ADD"), "-": (3, "SUB"), "*": (4, "MUL"), "/": (4, "DIV"), "^": (5, "POW"),
    }

    def expr(self, minp):
        left = self.unary()
        while True:
            t = self.peek()
            if t is None or t.type != Token.OP_IN or t.value not in self.BIN:
                break
            p, name = self.BIN[t.value]
            if p < minp:
                break
            self.take()
            right = self.expr(p + 1)
            left = f"{name}({left},{right})"
        return left

    def unary(self):
        t = self.peek()
        if t is not None and t.type == Token.OP_PRE:
            self.take()
            v = self.unary()
            return f"NEG({v})" if t.value == "-" else f"POS({v})"
        v = self.primary()
        t = self.peek()
        while t is not None and t.type == Token.OP_POST and t.value == "%":
            self.take()
            v = f"PCT({v})"
            t = self.peek()
        return v

    LAZY = {"IF": (1, 2), "IFERROR": (0, 1)}

    def primary(self):
        t = self.take()
        if t.type == Token.OPERAND:
            if t.subtype == Token.NUMBER:
                return repr(float(t.value)) if ("." in t.value or "E" in t.value.upper()) else str(int(t.value))
            if t.subtype == Token.TEXT:
                return json.dumps(t.value[1:-1].replace('""', '"'), ensure_ascii=False)
            if t.subtype == Token.LOGICAL:
                return "true" if t.value.upper() == "TRUE" else "false"
            if t.subtype == Token.ERROR:
                return f"ERR({json.dumps(t.value)})"
            return self.ref_js(t.value, self.cur)
        if t.type == Token.PAREN and t.subtype == Token.OPEN:
            v = self.expr(0)
            c = self.take()
            if not (c.type == Token.PAREN and c.subtype == Token.CLOSE):
                raise CompileError("expected )")
            return f"({v})"
        if t.type == Token.FUNC and t.subtype == Token.OPEN:
            name = t.value[:-1].upper()
            if name.startswith("_XLFN."):
                name = name[6:]
            args = []
            nt = self.peek()
            if nt.type == Token.FUNC and nt.subtype == Token.CLOSE:
                self.take()
            else:
                while True:
                    nt = self.peek()
                    if nt.type == Token.SEP or (nt.type == Token.FUNC and nt.subtype == Token.CLOSE):
                        args.append("MISSING")  # empty argument
                    else:
                        args.append(self.expr(0))
                    s = self.take()
                    if s.type == Token.SEP and s.subtype == Token.ARG:
                        continue
                    if s.type == Token.FUNC and s.subtype == Token.CLOSE:
                        break
                    raise CompileError("bad arg separator " + str(s.value))
            lazy = self.LAZY.get(name, ())
            args = [f"()=>{a}" if k in lazy else a for k, a in enumerate(args)]
            return f"F.{name}({','.join(args)})"
        raise CompileError(f"unexpected token {t.type} {t.value}")
