import { createContext, createResource, Show, Suspense, useContext } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";

const Context = createContext<Map<number, string>>(new Map());

export function useUnicodeData() {
    return useContext(Context);
}

export type UnicodeDataProps = {
    children: JSX.Element,
    fallback?: JSX.Element,
};

let fetchUnicodeData = fetch("./UnicodeData.txt")
    .then(res => res.text())
    .then(async raw => {
        const result: Map<number, string> = new Map();
        let n = 0;
        for (let line of raw.split(/[\n\r]/g)) {
            if ((++n) % 2500 === 0) await new Promise((res) => setTimeout(res, 0));
            let [codepoint, name] = line.split("#")[0].split(";");
            if (/\./.exec(codepoint)) continue; // Line contains a range, skipping
            const parsedCodepoint = Number.parseInt(codepoint, 16);
            if (isNaN(parsedCodepoint)) continue; // Ignore invalid codepoints

            result.set(parsedCodepoint, name.trim());
        }
        return result;
    });

export default function UnicodeData(props: UnicodeDataProps) {
    const [resource] = createResource(() => fetchUnicodeData);

    return (<Suspense fallback={props.fallback ?? "Loading unicode data..."}>
        <Show when={resource()}>
            <Context.Provider value={resource()!}>
                {props.children}
            </Context.Provider>
        </Show>
    </Suspense>);
}
