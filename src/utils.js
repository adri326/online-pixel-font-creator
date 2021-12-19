
Array.prototype.findLastIndex = function(predicate) {
    let l = this.length;
    while (l--) {
        if (predicate(this[l], l, this)) return l;
    }
    return -1;
}

Array.prototype.findSecondLastIndex = function(predicate) {
    let l = this.length;
    let first = true;
    while (l--) {
        if (predicate(this[l], l, this)) {
            if (first) {
                first = false;
            } else {
                return l;
            }
        }
    }
    return -1;
}

export function get_elements_by_id(object) {
    if (Array.isArray(object)) {
        return object.map(id => document.getElementById(id));
    } else {
        let res = {};
        for (let key in object) {
            res[key] = document.getElementById(object[key]);
        }
        return res;
    }
}

// Of course fromCharCode doesn't handle utf-16, so we have to manually do the conversion and hope it works
export function to_utf16(codepoint) {
    if (codepoint > 0xFFFF) {
        let high = Math.floor((codepoint - 0x10000) / 0x400) + 0xD800;
        let low = (codepoint - 0x10000) % 0x400 + 0xDC00;
        return String.fromCharCode(high, low);
    } else {
        return String.fromCharCode(codepoint);
    }
}

export function from_utf16(str) {
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

export function parse_utf16(str) {
    let res = [];
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

export class ProxyListener {
    constructor(object, listeners = []) {
        this.listeners = listeners;
        let handler = {
            get: (target, property, receiver) => {
                if (property === "listen") {
                    return function(listener) {
                        listeners.push(listener);
                    };
                } else if (property === "update") {
                    return this.update.bind(this);
                }
                return Reflect.get(target, property, receiver);
            },
            set: (target, property, value) => {
                let res = Reflect.set(target, property, value);
                this.update(property, value);
                return res;
            }
        };
        this.target = object;
        this._proxy = Proxy.revocable(object, handler);
    }

    revoke() {
        this._proxy.revoke();
        this.target = null;
    }

    get proxy() {
        return this._proxy.proxy;
    }

    update(property, value) {
        for (let listener of this.listeners) {
            listener(this.target, property, value);
        }
    }
}

let scheduled = new Set();
export function schedule_frame(draw_fn) {
    if (!scheduled.has(draw_fn)) {
        scheduled.add(draw_fn);
        window.requestAnimationFrame((...params) => {
            scheduled.delete(draw_fn);
            draw_fn(...params);
        });
    }
};

// Used to style file inputs
document.querySelectorAll(".upload").forEach((wrapper) => {
    let input = wrapper.querySelector("input[type=file]");
    let label = wrapper.querySelector("label");
    let status = wrapper.querySelector("span");

    input.addEventListener("change", (event) => {
        status.innerText = input.files[0].name;
    });
});


export function new_glyph(width, height) {
    return new Array(height).fill(null).map(_ => new Array(width).fill(false));
}
