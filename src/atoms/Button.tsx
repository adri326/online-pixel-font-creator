import type { JSX } from "solid-js/jsx-runtime";
import classes from "./Button.module.css";

export type ButtonProps = {
    children: JSX.Element,
    selected?: boolean,
    onClick?: () => void,
    theme?: "settings" | "default",
    disabled?: (() => boolean) | boolean,
} & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'>;

export default function Button({children, selected, onClick, theme, class: className, disabled, ...props}: ButtonProps) {
    return (<button
        class={[
            classes.button,
            selected ? classes.selected : undefined,
            theme === "settings" ? classes.settings : undefined,
            className
        ].filter((x): x is string => !!x).join(" ")}
        onClick={onClick}
        disabled={typeof disabled === "function" ? disabled() : disabled}
        {...props}
    >
        {children}
    </button>);
}
