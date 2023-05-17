import { SetStoreFunction } from "solid-js/store";
import Setting from "../molecules/Setting.jsx";
import { FontData } from "../utils/FontData.js";

export type FontNameProps = {
    currentFont: FontData,
    setCurrentFont: SetStoreFunction<FontData>
};

export default function FontName(props: FontNameProps) {
    function createSetter<Name extends keyof FontData>(name: Name) {
        return (value: FontData[Name]) => props.setCurrentFont(name, value);
    }

    return (<div>
        <h2>Font name</h2>
        <Setting
            type="text"
            prefix="Name:"
            value={() => props.currentFont.name}
            placeholder="My Amazing Font"
            description="The font name"
            onChange={createSetter("name")}
        />
        <Setting
            type="text"
            prefix="Author:"
            value={() => props.currentFont.author}
            placeholder="Anonymous"
            description="The font author's name or copyright"
            onChange={createSetter("author")}
        />
        <Setting
            type="text"
            prefix="Style:"
            value={() => props.currentFont.style}
            placeholder="Medium"
            description="The font style (eg. 'Medium' or 'Light')"
            onChange={createSetter("style")}
        />
    </div>);
}
