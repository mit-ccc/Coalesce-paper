// Part of Redux Store that stores info from the check question feature

import { createSlice } from "@reduxjs/toolkit";

export const questionChecksSlice = createSlice({
  name: "questionChecks",
  initialState: {
    checks: {}, // key is cell_id and value is JSON with "last_checked" and list of checks JSONs
  },
  reducers: {
    // updateSuggestionStatus // update the status field for one suggestion
    // replaceChecks // for one cell_id, replace the list of checks JSONs. also update the "last_checked" field
    // updateProblemStatus // update the problem_status field for one check JSON
    resetChecks: (state) => {
      state.checks = {};
    },
    updateChecksForCell: (state, action) => {
      // takes in cell_id and value of "cell_checks" field
      // check if cell_id is in state.checks
      // if not, add it
      if (!(action.payload.cell_id in state.checks)) {
        state.checks[action.payload.cell_id] = {
          last_checked: action.payload.last_checked,
          cell_checks: action.payload.cell_checks,
          check_suggestions: action.payload.check_suggestions,
        };
      } else {
        // update the "last_checked" and "cell_checks" fields
        state.checks[action.payload.cell_id]["last_checked"] =
          action.payload.last_checked;
        state.checks[action.payload.cell_id]["cell_checks"] =
          action.payload.cell_checks;
        state.checks[action.payload.cell_id]["check_suggestions"] =
          action.payload.check_suggestions;
      }
    },
  },
});

export const { resetChecks, updateChecksForCell } = questionChecksSlice.actions;

export default questionChecksSlice.reducer;
