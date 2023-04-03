import { createEffect } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import classes from "./Input.module.css";

export type InputType = {
    text: string,
    number: number,
};

export type InputProps<Type extends keyof InputType = "text"> = {
    type: Type,
    children: string,
    value?: InputType[Type] | (() => InputType[Type]),
    onEnter?: (value: InputType[Type], element: HTMLInputElement) => void,
    onChange?: (value: InputType[Type], element: HTMLInputElement) => void,
    onKeyDown?: (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => void,
    onKeyUp?: (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => void,
    size?: "tiny" | "small" | "default",
    theme?: "setting" | "default",
    title?: string,
};

// export default function Input(props: Omit<InputProps<"text">, "type">): JSX.Element;
// export default function Input<Type extends keyof InputType>(props: InputProps<Type>): JSX.Element;

export default function Input<Type extends keyof InputType>(
    props: InputProps<Type>
) {
    function convertValue(value: string): InputType[Type] {
        if (props.type === "number") {
            return Number(value) as any;
        } else {
            return value as any;
        }
    }

    let inputRef: HTMLInputElement;

    createEffect(() => {
        if (!inputRef) return;

        if (props.value !== undefined) {
            let value: string;
            if (typeof props.value === "function") {
                value = String(props.value());
            } else {
                value = String(props.value);
            }

            inputRef.value = value;
        }
    });

    return (<input
        ref={(ref) => inputRef = ref}
        type={props.type}
        title={props.title}
        class={[
            classes.input,
            props.size === "small" ? classes.small : undefined,
            props.size === "tiny" ? classes.tiny : undefined,
            props.theme === "setting" ? classes.setting : undefined
        ].filter((x): x is string => !!x).join(" ")}
        placeholder={props.children}
        onKeyDown={(event) => {
            props.onKeyDown?.(event);
            if (event.key !== "Enter") return;
            props.onEnter?.(convertValue(event.currentTarget.value), event.currentTarget);
        }}
        onKeyUp={props.onKeyUp}
        onChange={(event) => {
            props.onChange?.(convertValue(event.currentTarget.value), event.currentTarget);
        }}
    />);
}
