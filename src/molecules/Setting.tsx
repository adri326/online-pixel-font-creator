import Input, { InputProps, InputType } from "../atoms/Input.jsx";
import classes from "./Setting.module.css";

export type SettingProps<Type extends keyof InputType> = {
    type: Type,
    prefix: string,
    placeholder?: InputType[Type] | (() => InputType[Type]),
    description?: string,
    onChange: (value: InputType[Type], element: HTMLInputElement) => void,
} & Omit<InputProps<Type>, "onChange" | "onKeyUp" | "title" | "type" | "theme" | "children">;

export default function Setting<Type extends keyof InputType = "text">(
    {type, description, onChange, placeholder, ...props}: SettingProps<Type>
) {
    function convertValue(value: string): InputType[Type] {
        if (type === "number") {
            return Number(value) as any;
        } else {
            return value as any;
        }
    }

    return <div class={classes.setting}>
        <span>{props.prefix}</span>
        <Input
            {...props}
            theme="setting"
            type={type}
            title={description}
            onKeyUp={(event) => {
                onChange(convertValue(event.currentTarget.value), event.currentTarget);
            }}
            onChange={onChange}
        >{typeof placeholder === "function" ? String(placeholder()) : String(placeholder ?? "")}</Input>
    </div>;
}
