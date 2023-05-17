import { Accessor } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import Button from "../atoms/Button.jsx";
import { generateTruetype } from "../convert/generateTruetype.js";
import { FontData } from "../utils/FontData.js";
import { clearSave, loadFont, saveFont, saveStatus } from "../convert/save.js";
import UnicodeData, { useUnicodeData } from "../utils/UnicodeData.jsx";
import FontName from "./FontName.jsx";
import classes from "./settings.module.css";
import { downloadFont } from "../convert/serialize.js";

export type IOSettingsProps = {
    currentFont: FontData,
    setCurrentFont: SetStoreFunction<FontData>,
};

function DownloadButton(props: Pick<IOSettingsProps, 'currentFont'>) {
    const unicodeData = useUnicodeData();

    return <Button
        theme="settings"
        onClick={() => {
            generateTruetype(props.currentFont, unicodeData).download();
        }}
    >Download OTF</Button>
}

export default function IOSettings(props: IOSettingsProps) {
    let saveButton: HTMLButtonElement;

    return (<article class={classes.settings}>
        <FontName {...props} />
        <h2>Save</h2>
        <div class={classes.flex}>
            <Button
                theme="settings"
                onClick={() => {
                    saveFont(props.currentFont);
                }}
                ref={(s) => saveButton = s}
            >Save in browser</Button>
            <Button
                theme="settings"
                disabled={() => !saveStatus()}
                onClick={() => {
                    const font = loadFont();
                    if (font) {
                        props.setCurrentFont(font);
                    }
                }}
            >Restore browser save</Button>
            <Button
                theme="settings"
                disabled={() => !saveStatus()}
                onClick={() => {
                    clearSave();
                    saveButton.focus();
                }}
            >Empty browser save</Button>
        </div>

        <h2>Export</h2>
        <div class={classes.flex}>
            <Button
                theme="settings"
                onClick={() => {
                    downloadFont(props.currentFont);
                }}
            >Download</Button>
            <UnicodeData fallback={<i class={classes.info}>Loading unicode data...</i>}>
                <DownloadButton currentFont={props.currentFont} />
            </UnicodeData>
        </div>
    </article>);
}
