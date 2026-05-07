import { useState, useMemo, useCallback, useEffect } from "react";
import { create, all } from "mathjs";

const math = create(all, { number: "number" });

type Mode = "DEG" | "RAD";

const FN_MAP: Record<string, (mode: Mode) => string> = {
  sin: (m) => (m === "DEG" ? "sin(unit(" : "sin(("),
  cos: (m) => (m === "DEG" ? "cos(unit(" : "cos(("),
  tan: (m) => (m === "DEG" ? "tan(unit(" : "tan(("),
};

function wrapTrig(token: string, mode: Mode) {
  // Returns the inserted snippet; user closes paren themselves
  if (mode === "DEG") return `${token}(`;
  return `${token}(`;
}

const BTN_BASE =
  "select-none rounded-xl text-sm md:text-base font-medium transition-all active:translate-y-1 active:shadow-none border border-white/5";
const KEY_NUM = "bg-[var(--key-num)] text-foreground hover:bg-[var(--key-bg-hover)]";
const KEY_FN = "bg-[var(--key-fn)] text-[var(--neon-cyan)] hover:brightness-125";
const KEY_OP =
  "bg-[image:var(--gradient-op)] text-white hover:brightness-110 shadow-[0_0_12px_oklch(0.7_0.22_30/0.4)]";
const KEY_EQ =
  "bg-[image:var(--gradient-eq)] text-black font-bold hover:brightness-110 shadow-[0_0_18px_oklch(0.8_0.22_145/0.55)]";
const KEY_DEL = "bg-[oklch(0.4_0.18_25)] text-white hover:brightness-110";
const KEY_SHIFT = "bg-[oklch(0.45_0.15_60)] text-white hover:brightness-110";
const KEY_ALPHA = "bg-[oklch(0.4_0.18_330)] text-white hover:brightness-110";

interface Btn {
  label: React.ReactNode;
  insert?: string;
  action?: string;
  cls?: string;
  shiftLabel?: React.ReactNode;
  shiftInsert?: string;
}

export default function Calculator() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("0");
  const [mode, setMode] = useState<Mode>("DEG");
  const [shift, setShift] = useState(false);
  const [memory, setMemory] = useState(0);
  const [ans, setAns] = useState(0);
  const [error, setError] = useState(false);

  const evaluate = useCallback(
    (raw: string) => {
      if (!raw.trim()) return "0";
      let s = raw
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/π/g, "pi")
        .replace(/Ans/g, `(${ans})`)
        .replace(/√/g, "sqrt")
        .replace(/∛/g, "cbrt")
        .replace(/x²/g, "^2")
        .replace(/x³/g, "^3")
        .replace(/x⁻¹/g, "^(-1)")
        .replace(/EXP/g, "e")
        .replace(/⁻¹/g, "^(-1)");

      // Convert deg trig: sin(  -> sin(unit(  , close inserted via balance
      if (mode === "DEG") {
        s = s.replace(/\b(sin|cos|tan)\(/g, "$1(unit(");
        // Close the unit() before the matching close paren of the trig
        // Simpler: append ' deg)' inside. We'll instead transform: sin(X) -> sin(X deg)
        // Reset and use second strategy:
      }
      // Reset and use deg conversion strategy via degToRad multiplication
      s = raw
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/π/g, "pi")
        .replace(/Ans/g, `(${ans})`)
        .replace(/√/g, "sqrt")
        .replace(/∛/g, "cbrt")
        .replace(/x²/g, "^2")
        .replace(/x³/g, "^3")
        .replace(/x⁻¹/g, "^(-1)")
        .replace(/EXP/g, "*10^")
        .replace(/⁻¹/g, "^(-1)");

      if (mode === "DEG") {
        // wrap arg of sin/cos/tan with (... * pi/180) and asin/etc results * 180/pi
        s = s.replace(/\b(asin|acos|atan)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, "($1($2)*180/pi)");
        s = s.replace(/\b(sin|cos|tan)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, "$1(($2)*pi/180)");
      }

      const v = math.evaluate(s);
      if (typeof v === "number") {
        if (!isFinite(v)) throw new Error("Math error");
        return Math.abs(v) < 1e-12 ? "0" : +v.toPrecision(12) + "";
      }
      return v.toString();
    },
    [ans, mode]
  );

  // Live preview
  useEffect(() => {
    if (!expr) {
      setResult("0");
      setError(false);
      return;
    }
    try {
      setResult(evaluate(expr));
      setError(false);
    } catch {
      setResult(result);
    }
  }, [expr, evaluate]); // eslint-disable-line

  const insert = (t: string) => {
    setError(false);
    setExpr((e) => e + t);
  };

  const onEquals = () => {
    try {
      const r = evaluate(expr);
      setAns(parseFloat(r) || 0);
      setResult(r);
      setError(false);
    } catch {
      setError(true);
      setResult("Math ERROR");
    }
  };

  const onKey = (b: Btn) => {
    const useShift = shift && b.shiftInsert !== undefined;
    const text = useShift ? b.shiftInsert! : b.insert;
    if (b.action) {
      switch (b.action) {
        case "AC":
          setExpr("");
          setResult("0");
          setError(false);
          break;
        case "DEL":
          setExpr((e) => e.slice(0, -1));
          break;
        case "EQ":
          onEquals();
          break;
        case "SHIFT":
          setShift((s) => !s);
          return;
        case "MODE":
          setMode((m) => (m === "DEG" ? "RAD" : "DEG"));
          break;
        case "MS":
          setMemory(parseFloat(result) || 0);
          break;
        case "MR":
          insert(result === "0" ? `${memory}` : `${memory}`);
          setExpr((e) => e + `${memory}`);
          break;
        case "MC":
          setMemory(0);
          break;
        case "MPLUS":
          setMemory((m) => m + (parseFloat(result) || 0));
          break;
        case "ANS":
          insert("Ans");
          break;
      }
    } else if (text !== undefined) {
      insert(text);
    }
    if (shift) setShift(false);
  };

  const layout: Btn[][] = useMemo(
    () => [
      [
        { label: "SHIFT", action: "SHIFT", cls: KEY_SHIFT },
        { label: "ALPHA", cls: KEY_ALPHA, insert: "" },
        { label: "MODE", action: "MODE", cls: KEY_FN },
        { label: "ON/AC", action: "AC", cls: KEY_DEL },
        { label: "DEL", action: "DEL", cls: KEY_DEL },
      ],
      [
        { label: <>x<sup>−1</sup></>, insert: "^(-1)", cls: KEY_FN },
        { label: "nCr", insert: "combinations(", cls: KEY_FN, shiftLabel: "nPr", shiftInsert: "permutations(" },
        { label: <>°’”</>, insert: "", cls: KEY_FN },
        { label: <>Pol(</>, insert: "", cls: KEY_FN },
        { label: <>Rec(</>, insert: "", cls: KEY_FN },
      ],
      [
        { label: <>x<sup>2</sup></>, insert: "^2", cls: KEY_FN },
        { label: <>x<sup>3</sup></>, insert: "^3", cls: KEY_FN },
        { label: <>√</>, insert: "sqrt(", cls: KEY_FN, shiftLabel: <>∛</>, shiftInsert: "cbrt(" },
        { label: "log", insert: "log10(", cls: KEY_FN, shiftLabel: <>10<sup>x</sup></>, shiftInsert: "10^(" },
        { label: "ln", insert: "log(", cls: KEY_FN, shiftLabel: <>e<sup>x</sup></>, shiftInsert: "exp(" },
      ],
      [
        { label: "(−)", insert: "-", cls: KEY_FN },
        { label: "° ’ ”", insert: "", cls: KEY_FN },
        { label: "hyp", insert: "", cls: KEY_FN },
        { label: "sin", insert: "sin(", cls: KEY_FN, shiftLabel: <>sin<sup>−1</sup></>, shiftInsert: "asin(" },
        { label: "cos", insert: "cos(", cls: KEY_FN, shiftLabel: <>cos<sup>−1</sup></>, shiftInsert: "acos(" },
      ],
      [
        { label: "tan", insert: "tan(", cls: KEY_FN, shiftLabel: <>tan<sup>−1</sup></>, shiftInsert: "atan(" },
        { label: "RCL", action: "MR", cls: KEY_FN },
        { label: "ENG", insert: "", cls: KEY_FN },
        { label: "(", insert: "(", cls: KEY_FN },
        { label: ")", insert: ")", cls: KEY_FN },
      ],
      [
        { label: "7", insert: "7", cls: KEY_NUM },
        { label: "8", insert: "8", cls: KEY_NUM },
        { label: "9", insert: "9", cls: KEY_NUM },
        { label: "DEL", action: "DEL", cls: KEY_DEL },
        { label: "AC", action: "AC", cls: KEY_DEL },
      ],
      [
        { label: "4", insert: "4", cls: KEY_NUM },
        { label: "5", insert: "5", cls: KEY_NUM },
        { label: "6", insert: "6", cls: KEY_NUM },
        { label: "×", insert: "×", cls: KEY_OP },
        { label: "÷", insert: "÷", cls: KEY_OP },
      ],
      [
        { label: "1", insert: "1", cls: KEY_NUM },
        { label: "2", insert: "2", cls: KEY_NUM },
        { label: "3", insert: "3", cls: KEY_NUM },
        { label: "+", insert: "+", cls: KEY_OP },
        { label: "−", insert: "−", cls: KEY_OP },
      ],
      [
        { label: "0", insert: "0", cls: KEY_NUM },
        { label: ".", insert: ".", cls: KEY_NUM },
        { label: "EXP", insert: "EXP", cls: KEY_FN },
        { label: "Ans", action: "ANS", cls: KEY_FN },
        { label: "=", action: "EQ", cls: KEY_EQ },
      ],
    ],
    []
  );

  // Keyboard support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9.]$/.test(k)) insert(k);
      else if (k === "+" || k === "-") insert(k === "-" ? "−" : "+");
      else if (k === "*") insert("×");
      else if (k === "/") { e.preventDefault(); insert("÷"); }
      else if (k === "(" || k === ")") insert(k);
      else if (k === "Enter" || k === "=") { e.preventDefault(); onEquals(); }
      else if (k === "Backspace") setExpr((s) => s.slice(0, -1));
      else if (k === "Escape") { setExpr(""); setResult("0"); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expr, ans, mode]); // eslint-disable-line

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl p-5 md:p-6 shadow-[var(--shadow-neon)]"
      style={{ background: "var(--gradient-frame)" }}>
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="text-xs tracking-[0.3em] text-[var(--neon-cyan)] font-semibold">
          NEON-X · fx-82MS
        </div>
        <div className="text-[10px] tracking-widest text-[var(--neon-magenta)]">SCIENTIFIC</div>
      </div>

      {/* Screen */}
      <div
        className="rounded-xl p-4 mb-5 font-mono"
        style={{
          background: "var(--screen-bg)",
          color: "var(--screen-fg)",
          boxShadow: "var(--shadow-screen)",
        }}
      >
        <div className="flex justify-between text-[10px] mb-1 opacity-80">
          <span>{shift ? "S" : ""} {mode}</span>
          <span>{memory ? "M" : ""}</span>
        </div>
        <div className="min-h-[1.5rem] text-right text-sm break-all">
          {expr || " "}
        </div>
        <div className={`text-right text-3xl md:text-4xl font-bold tracking-wider mt-1 ${error ? "text-red-700" : ""}`}>
          {result}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid gap-2.5">
        {layout.map((row, ri) => (
          <div key={ri} className="grid grid-cols-5 gap-2.5">
            {row.map((b, ci) => {
              const useShift = shift && b.shiftLabel !== undefined;
              return (
                <button
                  key={ci}
                  onClick={() => onKey(b)}
                  className={`${BTN_BASE} ${b.cls ?? KEY_NUM} h-12 md:h-14 shadow-[var(--shadow-key)]`}
                  style={{}}
                >
                  {useShift ? b.shiftLabel : b.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 text-center text-[10px] tracking-[0.25em] text-muted-foreground/70">
        KEYBOARD SUPPORTED · ENTER = · ESC AC
      </div>
    </div>
  );
}
