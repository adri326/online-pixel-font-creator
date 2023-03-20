// Since fromCharCode doesn't handle utf-16 (gotta love js), we have to manually do the conversion and hope it works
export function UTF16FromCharCode(codepoint: number) {
    if (codepoint > 0xFFFF) {
        let high = Math.floor((codepoint - 0x10000) / 0x400) + 0xD800;
        let low = (codepoint - 0x10000) % 0x400 + 0xDC00;
        return String.fromCharCode(high, low);
    } else {
        return String.fromCharCode(codepoint);
    }
}

export function charCodeFromUTF16(str: string) {
    if (str.length === 2) {
        let high = str.charCodeAt(0);
        let low = str.charCodeAt(1);
        return (high - 0xD800) * 0x400 + low - 0xDC00 + 0x10000;
    } else if (str.length === 1) {
        return str.charCodeAt(0);
    } else {
        return 0;
    }
}

export function parseUTF16(str: string) {
    let res: number[] = [];
    for (let n = 0; n < str.length; n++) {
        let current = str.charCodeAt(n);
        if (current >= 0xD800 && current <= 0xDFFF) {
            n++;
            let low = str.charCodeAt(n);
            res.push((current - 0xD800) * 0x400 + low - 0xDC00 + 0x10000);
        } else {
            res.push(current);
        }
    }
    return res;
}
