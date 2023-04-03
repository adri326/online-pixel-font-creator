import { createSignal, For, JSX, Match, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";
import classes from "./Tabbed.module.css";

export type TabbedProps = {
    children: Record<string, () => JSX.Element>
};


export default function Tabbed(props: TabbedProps) {
    const [activeTab, setActiveTab] = createSignal<string>(Object.keys(props.children)[0] ?? "");

    return <div class={classes.tabbed}>
        <ul class={classes.names}>
            <For each={Object.keys(props.children)}>
                {(key) => (
                    <li
                        class={activeTab() === key ? classes.active : ""}
                        tabindex={0}
                        onClick={() => setActiveTab(key)}
                        onKeyUp={(event) => {
                            if (event.key === "Enter") setActiveTab(key);
                        }}
                        title={`Switch tab to the "${key}" tab`}
                    >
                        {key}
                    </li>
                )}
            </For>
        </ul>
        <section class={classes.content}>
            <Dynamic component={props.children[activeTab()]} />
        </section>
    </div>
}
