// NOTE: not implementing this in MVP
// Part of Redux Store that stores the latest user actions for the undo / redo feature

import { createSlice } from "@reduxjs/toolkit";

export const editHistorySlice = createSlice({
  name: "editHistory",
  initialState: {
    history: [], // can limit size to 10
    redo_queue: [],
  },
  reducers: {
    // addAction // add an action to the history
    // undo // pop the last action from the history and push it to the redo queue
    // redo // pop the last action from the redo queue and push it to the history
    // resetHistory // clear the history and redo queue
  },
});

// export const { addAction, undo, redo, resetHistory } = editHistorySlice.actions;

export default editHistorySlice.reducer;
