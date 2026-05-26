import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type PracticeFocusState = {
    activeBarIndex: number;
};

const initialState: PracticeFocusState = {
    activeBarIndex: 0,
};

const practiceFocus = createSlice({
    name: "practiceFocus",
    initialState,
    reducers: {
        selectBar(state, action: PayloadAction<number>) {
            state.activeBarIndex = action.payload;
        },
        resetSelectedBar(state) {
            state.activeBarIndex = 0;
        },
    },
    selectors: {
        selectActiveBarIndex(state) {
            return state.activeBarIndex;
        },
    },
});

export const { selectBar, resetSelectedBar } = practiceFocus.actions;
export const { selectActiveBarIndex } = practiceFocus.selectors;
export const practiceFocusReducer = practiceFocus.reducer;