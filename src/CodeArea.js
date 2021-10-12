let code = localStorage.getItem("code") || "";
/** @type {HTMLCanvasElement} */
const scc = document.getElementById("code");
const sc = new Scene(scc);

let canvasSelected = false;
let _pixels = 16;
let _font = "calibri";
let _currentLine = 0;
let _realLine = 0;
let _additionLines = {};
let _cursor = false;
let _cursorTimer = 0;
let _lineLen = 1;
let _lineLenAddition = [];

addEventListener("click", ev => canvasSelected = ev.clientX >= 8 && ev.clientY >= 8 && ev.clientX <= 658 && ev.clientY <= 658);

const letterSizes = {
    "i": 4,
    "ı": 4,
    "l": 4,
    "r": 3,
    "t": 3,
    "w": 1.4,
    "s": 2.3,
    "ş": 2.3,
    " ": 3,
    "'": 4,
    "W": 1.2,
    "Q": 1.4,
    "D": 1.6,
};

const calcPx = (index, line) => {
    let px = 0;
    for (let i = (_additionLines[_realLine] || 0); i < index; i++) {
        px += _pixels / (letterSizes[code.split("\n")[line].charAt(i)] || 2);
    }
    return px;
};

const writeChar = (char, index, color = "#000000", t = "") => {
    sc.ctx.font = t + _pixels + "px " + _font;
    sc.ctx.fillStyle = color || "#000000";
    let x = calcPx(index, _realLine) + _lineLen * 16;
    let y = _currentLine * _pixels;
    if (x >= scc.width - _pixels) {
        _additionLines[_realLine] = index;
        _currentLine++;
        x = calcPx(index, _realLine) + _lineLen * 16;
        y += _pixels;
        _lineLenAddition[_realLine]++;
    }
    sc.ctx.fillText(char, x, y);
};

sc.on("onTickEnd", () => {
    if (code !== localStorage.getItem("code")) localStorage.setItem("code", code);
    _currentLine = 0;
    _realLine = -1;
    _additionLines = {};
    _lineLenAddition = {};
    _lineLen = code.split("\n").length.toString().length;
    sc.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    sc.ctx.fillRect(0, 0, _lineLen * 16, canvas.height + 300);
    let cd = [];
    code.split("\n").forEach((j, l) => {
        while (j.startsWith(" ")) j = j.split("").slice(1).join("");
        cd[l] = j;
    });
    let n = 0;
    cd.forEach(line => {
        _currentLine++;
        _realLine++;
        _lineLenAddition[_realLine] = 1;
        for (let i = 0; i < line.length; i++) {
            const char = line.charAt(i);
            if (char !== " ") {
                let spaces = 0;
                for (let j = 0; j < i; j++) {
                    if (line.charAt(j) === " ") spaces++;
                }
                let word = line.split(" ")[spaces] || line;
                let otherWord = line.split(" ")[spaces + 1];
                let color = "#000000";
                let now = null;
                let isPr = false;
                let t = "";
                for (let j = 0; j < i + 1; j++) {
                    const k = line.charAt(j);
                    if ((k === "\"" || k === "\'")) {
                        if (!now) {
                            now = k;
                            if (j === i) {
                                isPr = true;
                            }
                        } else if (j < i) now = null;
                    }
                }
                if (isPr) {
                    color = "rgb(255, 150, 0)";
                } else if (now) {
                    color = "rgb(255, 0, 0)";
                } else if (char === "}" || char === "{") {
                    color = "rgb(150, 255, 0)";
                } else if (word === "eğer" || word === "değilse" || word === "tekrarla") {
                    color = "rgb(0, 0, 255)";
                    t = "italic ";
                } else if ([
                    "eşitse", "büyükse", "küçükse", "ve", "veya"
                ].includes(word) || (word === "eşitse" && otherWord === "değilse")) {
                    color = "rgb(0, 150, 255)";
                    t = "italic ";
                } else if ([
                    "yaz", "kayıt", "ayarla", "canlı", "arkaplan"
                ].includes(word)) {
                    color = "rgb(150, 150, 255)";
                    t = "italic ";
                }
                writeChar(char, i, color, t);
            }
            n = i;
        }
    });
    if (_cursorTimer++ >= 10) {
        _cursor = !_cursor;
        _cursorTimer = 0;
    }
    if (_cursor && canvasSelected) writeChar("_", code.split("\n")[_realLine].length === 0 ? 0 : n + 1, "#" + Math.floor(Math.random() * 888889) + 111111);
});

addEventListener("keydown", ev => {
    if (canvasSelected) {
        if (ev.ctrlKey) {
            switch (ev.key) {
                case "v":
                    break;
            }
        } else {
            if (ev.key.length === 1) {
                code += ev.key;
            } else {
                switch (ev.code) {
                    case "Enter":
                        code += "\n";
                        break;
                    case "Backspace":
                        code = code.split("").slice(0, code.length - 1).join("");
                        break;
                    default:
                        //console.log(JSON.stringify(ev.code))
                        break;
                }
            }
        }
    }
});