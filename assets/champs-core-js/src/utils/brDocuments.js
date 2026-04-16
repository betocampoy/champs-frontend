// Champs Core JS - Brazilian Documents Utilities
// - CPF
// - CNPJ
// - IE (Inscrição Estadual) - all UFs

export function onlyDigits(value) {
    return String(value ?? '').replace(/\D+/g, '');
}

export function isRepeatedDigits(value) {
    const s = String(value ?? '');
    return s.length > 0 && /^([0-9])\1+$/.test(s);
}

export function detectCpfCnpjType(value) {
    const d = onlyDigits(value);
    if (d.length === 11) return 'cpf';
    if (d.length === 14) return 'cnpj';
    return null;
}

export function isValidCPF(value) {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11) return false;
    if (isRepeatedDigits(cpf)) return false;

    const calcDigit = (base) => {
        let sum = 0;
        for (let i = 0; i < base.length; i++) {
            sum += parseInt(base[i], 10) * (base.length + 1 - i);
        }
        const m = sum % 11;
        return m < 2 ? 0 : 11 - m;
    };

    const d1 = calcDigit(cpf.slice(0, 9));
    const d2 = calcDigit(cpf.slice(0, 9) + String(d1));

    return cpf === cpf.slice(0, 9) + String(d1) + String(d2);
}

export function isValidCNPJ(value) {
    const cnpj = onlyDigits(value);
    if (cnpj.length !== 14) return false;
    if (isRepeatedDigits(cnpj)) return false;

    const calcDigit = (base, weights) => {
        let sum = 0;
        for (let i = 0; i < weights.length; i++) {
            sum += parseInt(base[i], 10) * weights[i];
        }
        const m = sum % 11;
        return m < 2 ? 0 : 11 - m;
    };

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const d1 = calcDigit(cnpj.slice(0, 12), w1);
    const d2 = calcDigit(cnpj.slice(0, 12) + String(d1), w2);

    return cnpj === cnpj.slice(0, 12) + String(d1) + String(d2);
}

export function isValidCpfOrCnpj(value) {
    const type = detectCpfCnpjType(value);
    if (type === 'cpf') return isValidCPF(value);
    if (type === 'cnpj') return isValidCNPJ(value);
    return false;
}

// =============================
// IE (Inscrição Estadual)
// =============================

function isUndefined(v) {
    return typeof v === 'undefined';
}

function lengthIsNot(s, len = 9) {
    return s.length !== len;
}

function lengthIs(s, len) {
    return !lengthIsNot(s, len);
}

function range(from, to) {
    const r = [];
    for (let i = from; i <= to; i++) r.push(i);
    return r;
}

function firsts(s, qty = 8) {
    return s.substring(0, qty);
}

function sub11(v) {
    return v < 2 ? 0 : 11 - v;
}

function mod(value, multipliers = range(2, 9), divisor = 11) {
    let i = 0;
    return value
        .split('')
        .reduceRight((acc, ch) => {
            if (i > multipliers.length - 1) i = 0;
            return multipliers[i++] * parseInt(ch, 10) + acc;
        }, 0) % divisor;
}

function trivialCalc(value, base, validateSize) {
    if (!validateSize && lengthIsNot(value)) return false;
    if (isUndefined(base)) base = firsts(value);
    const digit = sub11(mod(base));
    return value === base + String(digit);
}

function notStartsWith(s, prefix) {
    return s.substring(0, prefix.length) !== prefix;
}

function between(v, min, max) {
    const n = typeof v === 'string' ? parseInt(v, 10) : v;
    return n >= min && n <= max;
}

// Regras do Sintegra (todas as UFs) - adaptadas para ES Modules.
const ieFns = {
    ba: (value) => {
        if (lengthIsNot(value, 8) && lengthIsNot(value)) return false;
        const base = firsts(value, value.length - 2);
        let d1, d2;
        const m2 = range(2, 7);
        const m1 = range(2, 8);
        let compareDigit = value.substring(0, 1);
        if (lengthIs(value, 9)) {
            m2.push(8);
            m1.push(9);
            compareDigit = value.substring(1, 2);
        }
        if ('0123458'.split('').includes(compareDigit)) {
            const r2 = mod(base, m2, 10);
            d2 = r2 === 0 ? 0 : 10 - r2;
            const r1 = mod(base + String(d2), m1, 10);
            d1 = r1 === 0 ? 0 : 10 - r1;
        } else {
            const r2 = mod(base, m2);
            d2 = sub11(r2);
            const r1 = mod(base + String(d2), m1);
            d1 = sub11(r1);
        }
        return value === base + String(d1) + String(d2);
    },
    se: (value) => {
        if (lengthIsNot(value)) return false;
        return trivialCalc(value);
    },
    al: (value) => {
        if (lengthIsNot(value)) return false;
        if (notStartsWith(value, '24')) return false;
        const base = firsts(value);
        let r = mod(base) * 10;
        r = r - Math.trunc(r / 11) * 11;
        const digit = r === 10 ? 0 : r;
        return value === base + String(digit);
    },
    pb: (value) => {
        if (lengthIsNot(value)) return false;
        return trivialCalc(value);
    },
    rn: (value) => {
        if (lengthIsNot(value) && lengthIsNot(value, 10)) return false;
        if (notStartsWith(value, '20')) return false;
        const base = value.substring(0, value.length - 1);
        const multipliers = range(2, 9);
        if (lengthIs(value, 10)) multipliers.push(10);
        const r = (mod(base, multipliers) * 10) % 11;
        const digit = r === 10 ? 0 : r;
        return value === base + String(digit);
    },
    ap: (value) => {
        if (lengthIsNot(value)) return false;
        if (notStartsWith(value, '03')) return false;
        const base = firsts(value);
        let p, d;
        if (between(base, 3000001, 3017000)) {
            p = 5;
            d = 0;
        } else if (between(base, 3017001, 3019022)) {
            p = 9;
            d = 1;
        } else {
            p = 0;
            d = 0;
        }
        const r = mod(String(p) + base, [2, 3, 4, 5, 6, 7, 8, 9, 1]);
        let digit;
        if (r === 1) digit = 0;
        else if (r === 0) digit = d;
        else digit = 11 - r;
        return value === base + String(digit);
    },
    rr: (value) => {
        if (lengthIsNot(value)) return false;
        if (notStartsWith(value, '24')) return false;
        const base = firsts(value);
        const digit = mod(base, [8, 7, 6, 5, 4, 3, 2, 1], 9);
        return value === base + String(digit);
    },
    am: (value) => {
        if (lengthIsNot(value)) return false;
        return trivialCalc(value);
    },
    ro: (value) => {
        if (lengthIs(value, 9)) {
            const base = value.substring(3, 8);
            const digit = sub11(mod(base));
            return value === value.substring(0, 3) + base + String(digit);
        }
        if (lengthIs(value, 14)) {
            const base = firsts(value, 13);
            const r = mod(base);
            const digit = r <= 1 ? 1 : 11 - r;
            return value === base + String(digit);
        }
        return false;
    },
    rj: (value) => {
        if (lengthIsNot(value, 8)) return false;
        const base = firsts(value, 7);
        const digit = sub11(mod(base, range(2, 7)));
        return value === base + String(digit);
    },
    sc: (value) => trivialCalc(value),
    pi: (value) => trivialCalc(value),
    es: (value) => trivialCalc(value),
    pr: (value) => {
        if (lengthIsNot(value, 10)) return false;
        const base = firsts(value);
        const r1 = mod(base, range(2, 7));
        const d1 = 11 - r1 >= 10 ? 0 : 11 - r1;
        const r2 = mod(base + String(d1), range(2, 7));
        const d2 = 11 - r2 >= 10 ? 0 : 11 - r2;
        return value === base + String(d1) + String(d2);
    },
    pa: (value) => {
        if (lengthIsNot(value)) return false;
        if (notStartsWith(value, '15')) return false;
        return trivialCalc(value);
    },
    ce: (value) => {
        if (lengthIsNot(value)) return false;
        if (notStartsWith(value, '06')) return false;
        return trivialCalc(value);
    },
    pe: (value) => {
        const base = value.substring(0, value.length - 2);
        const r1 = mod(base);
        const d1 = 11 - r1 >= 10 ? 0 : 11 - r1;
        const r2 = mod(base + String(d1));
        const d2 = 11 - r2 >= 10 ? 0 : 11 - r2;
        return value === base + String(d1) + String(d2);
    },
    ma: (value) => {
        if (lengthIsNot(value)) return false;
        if (notStartsWith(value, '12')) return false;
        return trivialCalc(value);
    },
    ac: (value) => {
        if (lengthIsNot(value, 13)) return false;
        if (notStartsWith(value, '01')) return false;
        const base = firsts(value, 11);
        const d1 = sub11(mod(base));
        const d2 = sub11(mod(base + String(d1)));
        return value === base + String(d1) + String(d2);
    },
    rs: (value) => {
        if (lengthIsNot(value, 10)) return false;
        const base = firsts(value, 9);
        return trivialCalc(value, base, true);
    },
    mt: (value) => {
        if (lengthIsNot(value, 11) && lengthIsNot(value)) return false;
        const base = lengthIs(value, 11) ? value.substring(0, 10) : firsts(value);
        return trivialCalc(value, base);
    },
    sp: (value) => {
        const v = value.toUpperCase();
        if (v.startsWith('P')) {
            if (lengthIsNot(v, 13)) return false;
            const base = v.substring(1, 9);
            const suffix = v.substring(10, 13);
            const r = String(mod(base, [10, 8, 7, 6, 5, 4, 3, 1]));
            const d1 = r.length > 1 ? r[1] : r[0];
            return v === 'P' + base + String(d1) + suffix;
        }
        if (lengthIsNot(v, 12)) return false;
        const base1 = firsts(v);
        const suffix2 = v.substring(9, 11);
        const r1 = String(mod(base1, [10, 8, 7, 6, 5, 4, 3, 1]));
        const d1 = r1.length > 1 ? r1[1] : r1[0];
        const r2 = String(mod(base1 + String(d1) + suffix2, range(2, 10)));
        const d2 = r2.length > 1 ? r2[1] : r2[0];
        return v === base1 + String(d1) + suffix2 + String(d2);
    },
    mg: (value) => {
        if (lengthIsNot(value, 13)) return false;
        const base = firsts(value, 11);
        const baseZero = value.substring(0, 3) + '0' + value.substring(3, 11);
        let i = 0;
        const prod = baseZero
            .split('')
            .reduceRight((acc, ch) => {
                if (i > [2, 1].length - 1) i = 0;
                return String([2, 1][i++] * parseInt(ch, 10)) + String(acc);
            }, '')
            .split('')
            .reduce((acc, ch) => acc + parseInt(ch, 10), 0);
        let d1 = (Math.trunc(prod / 10) + 1) * 10 - prod;
        if (d1 === 10) d1 = 0;
        const d2 = sub11(mod(base + String(d1), range(2, 11)));
        return value === base + String(d1) + String(d2);
    },
    to: (value) => {
        if (lengthIsNot(value) && lengthIsNot(value, 11)) return false;
        let base;
        if (lengthIs(value, 11)) {
            if (!['01', '02', '03', '99'].includes(value.substring(2, 4))) return false;
            base = value.substring(0, 2) + value.substring(4, 10);
        } else {
            base = firsts(value);
        }
        const digit = sub11(mod(base));
        return value === value.substring(0, value.length - 1) + String(digit);
    },
    go: (value) => {
        if (lengthIsNot(value)) return false;
        if (!['10', '11', '15'].includes(value.substring(0, 2))) return false;
        const base = firsts(value);
        if (base === '11094402') {
            return value.substr(8) === '1' || value.substr(8) === '0';
        }
        const r = mod(base);
        let digit;
        if (r === 0) digit = 0;
        else if (r === 1) digit = between(base, 10103105, 10119997) ? 1 : 0;
        else digit = 11 - r;
        return value === base + String(digit);
    },
    ms: (value) => {
        if (notStartsWith(value, '28')) return false;
        return trivialCalc(value);
    },
    df: (value) => {
        if (lengthIsNot(value, 13)) return false;
        const base = firsts(value, 11);
        const d1 = sub11(mod(base));
        const d2 = sub11(mod(base + String(d1)));
        return value === base + String(d1) + String(d2);
    },
};

export function isValidIE(value, uf) {
    if (typeof value === 'undefined' || value === null) return false;
    if (typeof value !== 'string' && typeof value !== 'number') return false;

    const raw = String(value).trim();
    if (/^ISENTO$/i.test(raw)) return true;

    const ie = raw.replace(/[\.\-\/\s]/g, '');
    if (!ie) return false;

    if (!uf) return false;
    const state = String(uf).trim().toLowerCase();
    if (!state || !(state in ieFns)) return false;

    if (!/^\d+$/.test(ie) && state !== 'sp') return false;
    return ieFns[state](ie);
}
