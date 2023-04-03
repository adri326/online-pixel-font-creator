import type { JSX } from "solid-js/jsx-runtime";
import classes from "./Button.module.css";

export type ButtonProps = {
    children: JSX.Element,
    selected?: boolean,
    onClick?: () => void,
    theme?: "settings" | "default"
};

export default function Button(props: ButtonProps) {
    return (<button
        class={[
            classes.button,
            props.selected ? classes.selected : undefined,
            props.theme === "settings" ? classes.settings : undefined,
        ].filter((x): x is string => !!x).join(" ")}
        onClick={props.onClick}
    >
            {props.children}
    </button>);
}
