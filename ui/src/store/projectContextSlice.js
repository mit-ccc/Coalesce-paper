// Part of Redux Store that stores the context users submit in step 1

import { createSlice } from "@reduxjs/toolkit";

export const projectContextSlice = createSlice({
  name: "projectContext",
  initialState: {
    context: {},
    project_id: "",
    edited: false,
  },
  reducers: {
    initProjectContext: (state, action) => {
      // set project_id and set up context object
      // action.payload contains the project_id and context questions
      state.project_id = action.payload.project_id;
      // iterate through the context questions and add default values of response, warnings, errors, checked_warnings, and ignored_warnings
      // context is an object with keys as question_id and values as the question object
      Object.keys(action.payload.context_questions).forEach((question_id) => {
        state.context[question_id] = {
          ...action.payload.context_questions[question_id],
          // response: "", // TEMP: getting dummy responses from back-end
          warnings: [],
          errors: [],
          checked_warnings: false,
          ignored_warnings: [],
        };
      });
      // set edited to true
      state.edited = true;
    },
    setProjectContext: (state, action) => {
      // action.payload contains the project_id and context
      // context contains the context questions and their responses
      // if state.project_id !== action.payload.project_id
      // then update the context with the new project_id and responses
      // else leave the context as is
      if (state.project_id !== action.payload.project_id) {
        state.context = action.payload.context;
        state.project_id = action.payload.project_id;
      }
      // // set edited to false
      // state.edited = false;
      // go through each question and set warnings, errors, checked_warnings, and ignored_warnings to default values
      // if they don't exist
      Object.keys(state.context).forEach((question_id) => {
        if (!("warnings" in state.context[question_id])) {
          state.context[question_id].warnings = [];
          // set edited to true
          // state.edited = true;
        }
        if (!("errors" in state.context[question_id])) {
          state.context[question_id].errors = [];
          // set edited to true
          // state.edited = true;
        }
        if (!("checked_warnings" in state.context[question_id])) {
          state.context[question_id].checked_warnings = false;
          // set edited to true
          // state.edited = true;
        }
        if (!("ignored_warnings" in state.context[question_id])) {
          state.context[question_id].ignored_warnings = [];
          // set edited to true
          // state.edited = true;
        }
      });
    },
    resetEdited: (state) => {
      state.edited = false;
    },
    editResponse: (state, action) => {
      // action.payload contains the question_id and the new response
      // and sometimes contains part_2_response
      state.context[action.payload.question_id].response =
        action.payload.response;
      if (action.payload.part_2_response !== undefined) {
        state.context[action.payload.question_id].part_2_response =
          action.payload.part_2_response;
      }
      // set edited to true
      state.edited = true;
    },
    addIgnoredWarning: (state, action) => {
      // action.payload contains the question_id and the warning message
      state.context[action.payload.question_id].ignored_warnings.push(
        action.payload.warning
      );
      // also remove the warning from the "warnings" field
      const index = state.context[action.payload.question_id].warnings.indexOf(
        action.payload.warning
      );
      if (index > -1) {
        state.context[action.payload.question_id].warnings.splice(index, 1);
      }
      // set edited to true
      state.edited = true;
    },
    editErrors: (state, action) => {
      // set errors from the payload
      state.context[action.payload.question_id].errors = action.payload.errors;
      // set edited to true
      state.edited = true;
    },
    editWarnings: (state, action) => {
      // set checked_warnings to true
      state.context[action.payload.question_id].checked_warnings = true;
      // set warnings from the payload
      state.context[action.payload.question_id].warnings =
        action.payload.warnings;
      // set edited to true
      state.edited = true;
    },
  },
});

export const {
  initProjectContext,
  setProjectContext,
  resetEdited,
  editResponse,
  addIgnoredWarning,
  editErrors,
  editWarnings,
} = projectContextSlice.actions;

export default projectContextSlice.reducer;
