import { createContext, useContext } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";


export type AppSettings = {
    doubleTapDelay: number,
    doubleTapDistance: number,
    doubleTapTimeout: number,

    arrowArea: number,
};

const defaultSettings: AppSettings = {
    doubleTapDelay: 200,
    doubleTapDistance: 50,
    doubleTapTimeout: 1000,

    arrowArea: 0.125,
};

function tryLoadSettings() {
    let parsedSettings: AppSettings | undefined = undefined;
    try {
        const loadedSettings = window.localStorage.getItem("settings");
        if (!loadedSettings) return defaultSettings;
        parsedSettings = JSON.parse(loadedSettings);

        return {
            ...defaultSettings,
            ...parsedSettings
        };
    } catch {
        return defaultSettings;
    }
}

const [appSettings, setAppSettingsBase] = createStore(tryLoadSettings());

export {
    appSettings
};

export function setAppSettings<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setAppSettingsBase(key, value);

    window.localStorage.setItem("settings", JSON.stringify(appSettings));
}
