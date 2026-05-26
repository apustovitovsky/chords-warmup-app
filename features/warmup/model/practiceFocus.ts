import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type PlaybackStatus = "stopped" | "playing" | "paused";

type PracticeFocusState = {
    activeBarIndex: number;
    playbackStatus: PlaybackStatus;
    tempoBpm: number;
};

const initialState: PracticeFocusState = {
    activeBarIndex: 0,
    playbackStatus: "stopped",
    tempoBpm: 80,
};

const practiceFocus = createSlice({
    name: "practiceFocus",
    initialState,
    reducers: {
        selectBar(state, action: PayloadAction<number>) {
            state.activeBarIndex = action.payload;
        },
        advanceBar(state, action: PayloadAction<number>) {
            const barsCount = action.payload;

            if (barsCount === 0) {
                return;
            }

            state.activeBarIndex = (state.activeBarIndex + 1) % barsCount;
        },
        play(state) {
            state.playbackStatus = "playing";
        },
        pause(state) {
            state.playbackStatus = "paused";
        },
        stop(state) {
            state.playbackStatus = "stopped";
            state.activeBarIndex = 0;
        },
        resetSelectedBar(state) {
            state.activeBarIndex = 0;
        },
        setTempoBpm(state, action: PayloadAction<number>) {
            state.tempoBpm = action.payload;
        },
    },
    selectors: {
        selectActiveBarIndex(state) {
            return state.activeBarIndex;
        },
        selectPlaybackStatus(state) {
            return state.playbackStatus;
        },
        selectTempoBpm(state) {
            return state.tempoBpm;
        },
    },
});

export const {
    selectBar,
    advanceBar,
    setTempoBpm,
    play,
    pause,
    stop,
    resetSelectedBar,
} = practiceFocus.actions;

export const {
    selectActiveBarIndex,
    selectPlaybackStatus,
    selectTempoBpm,
} = practiceFocus.selectors;

export const practiceFocusReducer = practiceFocus.reducer;