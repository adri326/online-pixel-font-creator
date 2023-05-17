import { For } from "solid-js";
import classes from "./Input.module.css";

export type DropdownProps<Value> = {
    values: [label: string, value: Value][],
    onChange?: (value: Value) => void,
    theme?: "setting" | "default",
};

// TODO: style this properly
export default function Dropdown<Value>(props: DropdownProps<Value>) {
    return (<button class={[classes.input, props.theme === "setting" && classes.setting].filter(Boolean).join(" ")}>
        <select
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
        <i>&#x25bc;</i>
    </button>);
}
