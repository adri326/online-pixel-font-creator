import type { JSX } from "solid-js/jsx-runtime";
import classes from "./Input.module.css";

export type InputProps = {
    children: string,
    onEnter?: (value: string, element: HTMLInputElement) => void,
    onChange?: (value: string, element: HTMLInputElement) => void,
    size?: "small" | "default"
};

export default function Input(props: InputProps) {
    return (<input
        type="text"
        class={[
            classes.input,
            props.size === "small" ? classes.small : undefined,
        ].filter((x): x is string => !!x).join(" ")}
        placeholder={props.children}
        onKeyDown={(event) => {
            if (event.key === "Enter") {
                props.onEnter?.(event.currentTarget.value, event.currentTarget);
            }
        }}
        onChange={(event) => {
            props.onChange?.(event.currentTarget.value, event.currentTarget);
        }}
    />);
}
