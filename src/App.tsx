import { createResource } from "solid-js";
import { createStore } from "solid-js/store";
import classes from "./App.module.css";
import Editor from "./Editor/index.jsx";
import { FontData } from "./utils/FontData.js";

export default function App() {
    const [currentFont, setCurrentFont] = createStore<FontData>({
        width: 8,
        height: 10,
        baseline: 8,
        ascend: 7,
        descend: 0,
        spacing: 1,
        emSize: 8,
        leftOffset: 0,
        glyphs: new Map(),
        // history: [],

        name: "My Amazing Font",
        author: "Anonymous",
        style: "Medium",
    });

    return (<div class={classes.App}>
        <Editor fontData={currentFont} setFontData={setCurrentFont} />
    </div>);
}
