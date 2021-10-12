class CompileError extends Error {
}

class IntervalManager {
    constructor() {
        this.intervals = {};
    }

    cancelInterval(id) {
        delete this.intervals[id];
        clearInterval(id);
    }

    createInterval(callback, timeout = 50) {
        let id = setInterval(callback, timeout);
        this.intervals[id] = id;
        return id;
    }
}

const canvas = document.getElementById("canvas");
const scene = new Scene(canvas);

let heldKeys = {};
let canvasFocused = false;
let _repeatLimit = 1024;

addEventListener("keydown", ev => heldKeys[ev.key]);
addEventListener("keyup", ev => delete heldKeys[ev.key]);
addEventListener("blur", () => {
    heldKeys = {};
    canvasFocused = false;
});
addEventListener("click", ev => canvasFocused = ev.clientX >= 8 && ev.clientY >= 8 && ev.clientX <= 658 && ev.clientY <= 658);

let vars = new Map();
let uniqueEntities = {};

const compile = {
    createEntity: (t) => {
        const model = {
            "kare": SquareModel,
            "yuvarlak": CircleModel,
            "resim": ImageModel
        }[t];
        if (!model) throw new CompileError(t + " beklenmiyordu!");
        const entity = new Entity({
            x: 0,
            y: 0,
            model: new model(1, 1)
        });
        uniqueEntities[entity.uuid] = entity;
        return entity.uuid;
    },
    set: (a, b) => {
        if ("0123456789".split("").some(i => i === a.charAt(0))) throw new CompileError(a.charAt(0) + " beklenmiyordu!");
        let e = a.split("").filter(i => !"abcçdefghıijklmnoprştuüvyzqwx0123456789".split("").includes(i))[0];
        if (e) throw new CompileError(e + " beklenmiyordu!");
        vars.set(a, b);
    },
    auto: i => {
        i = i || "";
        while (i.startsWith(" ")) i = i.split("").slice(1).join("");
        switch (i.split(" ")[0]) {
            case "canlı":
                if (i.split(" ")[1] === "oluştur") return compile.createEntity(i.split(" ")[2]);
                const ent = Array.from(scene.entities).map(i => i[0]).filter(j => j.uuid === compile.auto(i.split(" ")[2]))[0];
                switch (i.split(" ")[1]) {
                    case "genişlik":
                        return ent ? ent.model.width : 0;
                    case "uzunluk":
                        return ent ? ent.model.height : 0;
                    case "x":
                        return ent ? ent.x : 0;
                    case "y":
                        return ent ? ent.y : 0;
                }
                break;
        }
        let val = [];
        let now = null;
        let startNow = null;
        for (let j = 0; j < i.length; j++) {
            let k = i.charAt(j);
            let backslashes = 0;
            if (k === "\"" || k === "'") {
                for (let n = j - 1; n > 0; n--) {
                    if (i.charAt(n) !== "\\") break;
                    backslashes++;
                }
            }
            if ((k === "\"" || k === "'") && (backslashes % 2 === 0)) {
                if (!now) {
                    now = k;
                    startNow = j;
                } else if (now === k) {
                    now = null;
                    let str = i.split("").slice(startNow + 1, j).join("").replace(/"/g, "\\\"");
                    while (str.includes(`\\\\`)) str = str.replace("\\\\", "\\");
                    val.push({
                        start: startNow,
                        end: j,
                        type: "string",
                        value: str,
                        rendered: `"${str}"`
                    });
                }
            }
        }
        if (now) throw new CompileError(now + " bekleniyordu!");
        let nw = "";
        for (let j = 0; j < i.length; j++) {
            const operators = {
                "veya": "||",
                "ve": "&&",
                "büyükse": ">",
                "küçükse": "<",
                "eşitse": "==",
                "eşit değilse": "!="
            };
            if (!val.some(a => a.start <= j && a.end >= j)) {
                let ops = Object.keys(operators);
                let k = i.charAt(j);
                if (ops.some(b => b.startsWith(nw + k))) {
                    nw += k;
                    let nww = nw;
                    while (nww.startsWith(" ")) nww = nww.split("").slice(1).join("");
                    switch (nww) {
                        case "veya":
                        case "büyükse":
                        case "küçükse":
                        case "eşitse":
                        case "eşit değilse":
                            val.push({
                                start: j - (nww.length - 1),
                                end: j,
                                type: "operator",
                                value: operators[nww]
                            });
                            nw = "";
                            break;
                        default:
                            if (nww === "ve" && i.charAt(j + 1) !== "y") {
                                val.push({
                                    start: j - (nww.length - 1),
                                    end: j,
                                    type: "operator",
                                    value: operators[nww]
                                });
                                nw = "";
                            }
                            break;
                    }
                }
            }
        }
        nw = "";
        let varA = [];
        for (let j = 0; j < i.length; j++) {
            if (!val.some(a => a.start <= j && a.end >= j)) {
                let k = i.charAt(j);
                nw += k;
                let nww = nw;
                while (nww.startsWith(" ")) nww = nww.split("").slice(1).join("");
                if (vars.has(nww)) {
                    varA.push({
                        index: nww,
                        value: vars.get(nww)
                    });
                    nw = "";
                }
            }
        }
        /*
        * TODO: an error happens there because it replaces variable
        *  with value 10 so index increases by 1 at the end input
        *  goes from ' 10' to 'e 10' (real input was 'a küçükse 10')
        * */
        varA.forEach(f => i = i.replace(f.index, f.value));
        let mw = "";
        for (let j = 0; j < i.length; j++) {
            if (!val.some(a => a.start <= j && a.end >= j)) {
                mw += i.charAt(j);
            } else if (mw.split("").filter(c => c !== " ").length > 0) {
                let ww = mw;
                if (/tuş.+/.test(mw)) {
                    mw = heldKeys[mw.split("").slice(3).join("")] ? 1 : 0;
                } else mw = compile.int(mw);
                val.push({
                    start: j - (ww.length - 1),
                    end: j,
                    type: "auto",
                    value: mw
                });
                mw = "";
            }
        }
        if (mw.split("").filter(c => c !== " ").length > 0) {
            val.push({
                start: i.length - 1 - (mw.length - 1),
                end: i.length - 1,
                type: "auto",
                value: compile.int(mw)
            });
        }
        val = val.sort((a, b) => a.start < b.start ? -1 : 1);
        val = val.map(i => i.rendered || i.value).join("");
        return eval(val);
    },
    string: i => {
        let reg;
        while ((reg = /[^\\]{.*}/.exec(i))) {
            i = i.replace(reg[0].split("").slice(1).join(""), compile.auto(reg[0].split("").slice(2, reg[0].length - 1).join("")));
        }
        return i;
    },
    int: i => {
        if ("+-*/".split("").some(a => i.includes(a))) i.split(/[\+|\-|\*\/]/).forEach(a => {
            if (a.replace(/[\(|\)]/g, "")) i = i.replace(a.replace(/[\(|\)]/g, ""), compile.auto(a.replace(/[\(|\)]/g, "")))
        });
        let c = i.toString().split("").filter(i => !".0123456789+-*/() ".includes(i))[0];
        if (c) throw new CompileError(c + " beklenmiyordu!");
        try {
            i = eval(i);
            return i;
        } catch (e) {
            throw new CompileError(e);
        }
    },
    /**
     * @return {"argument", "string", "variable", "integer"}
     */
    getType: i => {
        i = (i == null ? "" : i).toString();
        if (i.startsWith("canlı")) return "argument";
        if ((i.startsWith("\"") && i.endsWith("\"")) || (i.startsWith("\'") && i.endsWith("\'"))) return "string";
        return vars.has(i.replace(/ /g, "")) ? "variable" : "integer";
    },
    /**
     * @deprecated
     * @param i
     * @return {string|any}
     */
    autoR: i => {
        if (typeof i === "object" || typeof i === "function") return i;
        i = (i == null ? "" : i).toString();
        while (i.startsWith(" ")) i = i.split("").slice(1).join("");
        let now = null;
        let rs = null;
        let res = [];
        for (let j = 0; j < i.length; j++) {
            const k = i.charAt(j);
            if ((k === "\"" || k === "\'")) {
                if (!now) {
                    now = k;
                    rs = j + 1;
                } else {
                    res.push(i.split("").slice(rs, j).join(""));
                    now = null;
                }
            }
        }
        res.forEach(a => i = i.replace(`"${a}"`, compile.string(a)));
        if (res.length > 0) return i;
        //if ((i.startsWith("\"") && i.endsWith("\"")) || (i.startsWith("\'") && i.endsWith("\'"))) return compile.string(i);
        return vars.has(i.replace(/ /g, "")) ? vars.get(i.replace(/ /g, "")) : compile.int(i);
    }
};

let intervalManager = new IntervalManager();

function stop() {
    vars = new Map();
    scene.entities = new Map();
    uniqueEntities = {};
    Object.keys(intervalManager.intervals).forEach(i=> intervalManager.cancelInterval(i));
    logToArea("Durduruldu...", "rgb(0, 0, 255)");
}

function run() {
    stop();
    clearLogArea();
    const background = new Entity({
        x: 0,
        y: 0,
        model: new SquareModel(0, 0)
    });
    scene.addEntity(background);
    const lines = code.split("\n");
    let ifStatements = [];
    let whileStatements = [];
    let finishedWhiles = [];
    let intervalStatements = [];
    let finishedIntervals = [];
    let __threads = 1;
    // TODO: switch, functions, wait, arrays, objects
    const processWhile = () => {
        const lastWh = finishedWhiles[finishedWhiles.length - 1];
        const th = __threads++;
        let repeat = 0;
        while (compile.auto(lastWh.statement) && repeat++ < _repeatLimit) {
            lastWh.lines.forEach((i, j) => compileLine(i, j, th, true));
        }
        finishedWhiles.pop();
    }
    const processInterval = () => {
        const lastInt = finishedIntervals[finishedIntervals.length - 1];
        const th = __threads++;
        finishedWhiles.pop();
        let r = true;
        let id = intervalManager.createInterval(() => {
            if(r) {
                r = false;
                if (compile.auto(lastInt.statement)) {
                    lastInt.lines.forEach((i, j) => {
                        compileLine(i, j, th, false, id);
                        if(j === lastInt.lines.length-1) r = true;
                    }); // TODO: a + 1 doesnt work in intervals
                }
            }
        });
    }
    const compileLine = (l, j, thread = 0, w = false, intervalId = null) => {
        if (l.replace(/ /g, "") === "}" && ifStatements.length > 0) {
            return ifStatements.pop();
        }
        if (l.replace(/ /g, "") === "}değilse{" && ifStatements.length > 0 && !ifStatements[ifStatements.length - 1].else) {
            const st = ifStatements[ifStatements.length - 1].statement;
            ifStatements.pop();
            return ifStatements.push({
                statement: st,
                else: true
            });
        }
        if (ifStatements.length > 0) {
            let lastIf = ifStatements[ifStatements.length - 1];
            let st = compile.auto(lastIf.statement);
            if (st === lastIf.else) return;
        }


        let lastInterval = intervalStatements[intervalStatements.length - 1];
        if (l.replace(/ /g, "") === "}" && intervalStatements.length > 0) {
            finishedIntervals.push(lastInterval);
            return intervalStatements.pop();
        }
        if (lastInterval) {
            return intervalStatements[intervalStatements.length - 1].lines.push(l);
        }
        if (finishedIntervals.length > 0 && intervalId == null) {
            processInterval();
            return;
        }


        let lastWhile = whileStatements[whileStatements.length - 1];
        if (l.replace(/ /g, "") === "}" && whileStatements.length > 0) {
            finishedWhiles.push(lastWhile);
            return whileStatements.pop();
        }
        if (lastWhile && compile.auto(lastWhile.statement)) return whileStatements[whileStatements.length - 1].lines.push(l);
        if (finishedWhiles.length > 0 && !w) {
            processWhile();
            return;
        }


        try {
            while (l.startsWith(" ")) l = l.split("").slice(1).join("");
            const a = l.split(" ")[0];
            const b = l.split(" ").slice(1);
            if (/([\w|\d|\s]+)=.+/.test(l)) {
                const c = l.split("=");
                c[1] = c.slice(1).join(" ");
                while (c[0].endsWith(" ")) {
                    c[0] = c[0].split("").slice(0, c[0].length - 1).join("");
                }
                compile.set(c[0], compile.auto(c[1]));
                return;
            }
            switch (a) {
                case "yaz":
                    alert(compile.auto(b.join(" ")));
                    break;
                case "kayıt":
                    const res = compile.auto(b.join(" "));
                    /*r*/
                    console.info(res);
                    logToArea("[KAYIT] " + res);
                    break;
                case "arkaplan":
                    switch (b[0]) {
                        case "renk":
                            background.model = new SquareModel(canvas.width, canvas.height).setColor(b.slice(1).join(" "));
                            break;
                        case "link":
                            background.model = new ImageModel(canvas.width, canvas.height).setURL(b[1]);
                            break;
                        default:
                            throw new CompileError(b[0] + " beklenmiyordu!");
                    }
                    break;
                case "canlı":
                    let entity = uniqueEntities[compile.auto(b[1])];
                    switch (b[0]) {
                        case "oluştur":
                            compile.createEntity();
                            break;
                        case "çağır":
                            scene.addEntity(entity, compile.auto(b[2]) || 9);
                            break;
                        case "genişlik":
                            if (!entity) throw new CompileError("Canlı bulunamadı!");
                            entity.model.width = compile.auto(b[2]);
                            break;
                        case "x":
                            if (!entity) throw new CompileError("Canlı bulunamadı!");
                            const res = compile.auto(b[2]);
                            if (typeof res !== "number") throw new CompileError(res + " bir sayı değil!");
                            entity.x = res;
                            break;
                        case "y":
                            if (!entity) throw new CompileError("Canlı bulunamadı!");
                            const resA = compile.auto(b[2]);
                            if (typeof resA !== "number") throw new CompileError(resA + " bir sayı değil!");
                            entity.y = resA;
                            break;
                        case "uzunluk":
                            if (!entity) throw new CompileError("Canlı bulunamadı!");
                            entity.model.height = compile.auto(b[2]);
                            break;
                        case "ilerle":
                            if (!entity) throw new CompileError("Canlı bulunamadı!");
                            entity.x += compile.auto(b[2] || "1");
                            break;
                        case "yukarı":
                            if (!entity) throw new CompileError("Canlı bulunamadı!");
                            entity.y -= compile.auto(b[2] || "1");
                            break;
                        case "sıçra":
                            if (!entity) throw new CompileError("Canlı bulunamadı!");
                            entity.motion.x += compile.auto(b[2] || "1");
                            entity.motion.y -= compile.auto(b[3] || "1");
                            break;
                        default:
                            throw new CompileError(a + " beklenmiyordu!");
                    }
                    break;
                case "eğer":
                    if (!b.join(" ").split("{")[0].replace(/ /g, "")) throw new CompileError("Durum bekleniyordu!");
                    ifStatements.push({
                        statement: b.join(" ").split("{")[0],
                        else: false
                    });
                    break;
                case "tekrarla":
                    if (!b.join(" ").split("{")[0].replace(/ /g, "")) throw new CompileError("Durum bekleniyordu!");
                    whileStatements.push({
                        statement: b.join(" ").split("{")[0],
                        lines: []
                    });
                    break;
                case "sürekli":
                    if (b[0] === "tekrarla") {
                        if (!b.slice(1).join(" ").split("{")[0].replace(/ /g, "")) throw new CompileError("Durum bekleniyordu!");
                        intervalStatements.push({
                            statement: b.slice(1).join(" ").split("{")[0],
                            lines: []
                        });
                    }
                    break;
                default:
                    if (a) throw new CompileError(a + " beklenmiyordu!");
                    break;
            }
        } catch (e) {
            /*r*/
            console.error(e);
            logToArea("[HATA] " + (j + 1) + ". satırda hata çıktı, " + e.toString().replace("Error", "Hata"), "rgb(255, 0, 0)");
        }
    };
    lines.forEach((i, j) => compileLine(i, j, 0));
    if (finishedWhiles.length > 0) {
        processWhile();
    }
}