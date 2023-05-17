import { For } from "solid-js";
import dropdownClasses from "./Dropdown.module.css";
import inputClasses from "./Input.module.css";

export type DropdownProps<Value> = {
    values: [label: string, value: Value][],
    onChange?: (value: Value) => void,
    theme?: "setting" | "default",
};

// TODO: style this properly
export default function Dropdown<Value>(props: DropdownProps<Value>) {
    const selectId = "select-" + randomString(4);

    return (<span
            class={[
                // inputClasses.input,
                dropdownClasses.dropdown,
                props.theme === "setting" ? dropdownClasses.setting : undefined,
            ].filter(Boolean).join(" ")}
            tabindex="-1"
        >
        <select
            id={selectId}
            onChange={(event) => {
                const value = props.values[+event.currentTarget.value][1];

                props.onChange?.(value);
            }}
        >
            <For each={props.values}>
                {([label], index) => {
                    return <option value={index().toString()} selected={index() === 0}>{label}</option>
                }}
            </For>
        </select>
        <label aria-hidden for={selectId}>&#x25bc;</label>
    </span>);
}

function randomString(length: number) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

    let result = [];
    for (let n = 0; n < length; n++) {
        result.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
    }

    return result.join("");
}
