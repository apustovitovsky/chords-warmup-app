import { configureStore } from "@reduxjs/toolkit";

import { practiceFocusReducer } from "@/features/warmup/model/practiceFocus";

export function makeStore() {
    return configureStore({
        reducer: {
            practiceFocus: practiceFocusReducer,
        },
    });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];