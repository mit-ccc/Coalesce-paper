// Part of Redux store that stores all the info for the generate multiple options feature

import { createSlice } from "@reduxjs/toolkit";

export const generateOptionsSlice = createSlice({
  name: "generateOptions",
  initialState: {
    general_options: {}, // mapping from cell_id to list of question re-wordings
    specific_options: {}, // mapping from cell_id to { } with key = special request text and value = list of question re-wordings and current_id (which key we are on before we have to re-generate more via the back-end)
    switch_response_format: {}, // mapping from cell_id to { } with cell_details for the closed and open response formats for that given cell_id
  },
  reducers: {
    resetGenerateOptions: (state) => {
      state.general_options = {};
      state.specific_options = {};
      state.switch_response_format = {};
    },
    updateSpecificOptionsId: (state, action) => {
      // update current_id
      if (action.payload.cell_id in state.specific_options) {
        state.specific_options[action.payload.cell_id].current_id =
          state.specific_options[action.payload.cell_id].current_id + 1;
      }
    },
    updateGeneralOptions: (state, action) => {
      // check if cell_id does not exist in general_options
      // if it doesn't exist, create a new entry
      if (!(action.payload.cell_id in state.general_options)) {
        state.general_options[action.payload.cell_id] = {
          content: action.payload.content,
          timestamp: new Date().toISOString(),
        };
      } else {
        // update general_options for a cell_id
        state.general_options[action.payload.cell_id]["content"] =
          action.payload.content;
        // update timestamp
        state.general_options[action.payload.cell_id]["timestamp"] =
          new Date().toISOString();
      }
    },
    updateSpecificOptions: (state, action) => {
      // check if cell_id does not exist in specific_options
      // if it doesn't exist, create a new entry
      if (!(action.payload.cell_id in state.specific_options)) {
        state.specific_options[action.payload.cell_id] = {
          request_text: action.payload.request_text,
          content: action.payload.content,
          current_id: 0,
          timestamp: new Date().toISOString(),
        };
      } else {
        // update specific_options for a cell_id
        state.specific_options[action.payload.cell_id]["request_text"] =
          action.payload.request_text;
        state.specific_options[action.payload.cell_id]["content"] =
          action.payload.content;
        state.specific_options[action.payload.cell_id]["current_id"] = 0;
        // update timestamp
        state.specific_options[action.payload.cell_id]["timestamp"] =
          new Date().toISOString();
      }
    },
    addResponseFormat: (state, action) => {
      // check if cell_id does not exist in switch_response_format
      // if it doesn't exist, create a new entry
      if (!(action.payload.cell_id in state.switch_response_format)) {
        state.switch_response_format[action.payload.cell_id] = {
          open: action.payload.open_cell_details,
          closed: action.payload.closed_cell_details,
          open_time_estimate: action.payload.open_time_estimate,
          closed_time_estimate: action.payload.closed_time_estimate,
          last_switched: new Date().toISOString(),
          open_human_ai_status: action.payload.open_human_ai_status,
          closed_human_ai_status: action.payload.closed_human_ai_status,
        };
      } else {
        // update open and closed fields for a cell_id
        state.switch_response_format[action.payload.cell_id]["open"] =
          action.payload.open_cell_details;
        state.switch_response_format[action.payload.cell_id]["closed"] =
          action.payload.closed_cell_details;
        // update timestamp
        state.switch_response_format[action.payload.cell_id]["last_switched"] =
          new Date().toISOString();
        // update time estimates
        state.switch_response_format[action.payload.cell_id][
          "open_time_estimate"
        ] = action.payload.open_time_estimate;
        state.switch_response_format[action.payload.cell_id][
          "closed_time_estimate"
        ] = action.payload.closed_time_estimate;
        // update human_ai statuses
        state.switch_response_format[action.payload.cell_id][
          "open_human_ai_status"
        ] = action.payload.open_human_ai_status;
        state.switch_response_format[action.payload.cell_id][
          "closed_human_ai_status"
        ] = action.payload.closed_human_ai_status;
      }
    },
    updateSwitchTimestamp: (state, action) => {
      state.switch_response_format[action.payload.cell_id]["last_switched"] =
        new Date().toISOString();
    },
  },
});

export const {
  resetGenerateOptions,
  updateSpecificOptionsId,
  updateGeneralOptions,
  updateSpecificOptions,
  addResponseFormat,
  updateSwitchTimestamp,
} = generateOptionsSlice.actions;

export default generateOptionsSlice.reducer;
