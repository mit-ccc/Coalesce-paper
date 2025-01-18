// Part of Redux Store that stores all the project details

import { createSlice } from "@reduxjs/toolkit";
import { estimateTime } from "../utils";

export const projectDetailsSlice = createSlice({
  name: "projectDetails",
  initialState: {
    project_id: "",
    project_title: "",
    sections: [], // same as sections field in projects collection
    cells: {}, // key is cell_id and value is JSON with "cell_details", "ai_rationale", "human_ai_status"
    deleted_cells: [], // list of cell_ids that have been deleted
    added_cells: [], // list of cell_ids that have been added
    edited_cells: [], // list of cell_ids that have been edited
    cells_for_classification: [], // list of cell_ids that need to be classified
    edited_title: false, // boolean to check if project title has been edited
    engagement_type: "", // survey, interview, or conversation
  },
  reducers: {
    setProjectDetails: (state, action) => {
      // set project_id and set up sections and cells objects
      state.project_id = action.payload.project_id;
      state.project_title = action.payload.project_title;
      state.sections = action.payload.sections;
      state.cells = action.payload.cells;
    },
    // editProjectTitle // update the value of project_title
    addSection: (state, _action) => {
      // add a new section to the sections object
      state.sections.push({
        id: state.sections.length,
        title: "New Section",
        // time_estimate: 0,
        cells: [],
      });
    },
    deleteSection: (state, action) => {
      // delete a section from the sections object. also delete all cells in that section from the cells object
      // delete all cells in that section from the cells object
      for (let cell_id of state.sections[action.payload.section_id].cells) {
        // remove the cell_id from the added_cells and edited_cells lists if applicable
        state.added_cells = state.added_cells.filter(
          (cell_id2) => cell_id2 !== cell_id
        );
        state.edited_cells = state.edited_cells.filter(
          (cell_id2) => cell_id2 !== cell_id
        );
        // remove the cell_id from the cells_for_classification list
        state.cells_for_classification = state.cells_for_classification.filter(
          (cell_id2) => cell_id2 !== cell_id
        );
        // add the cell_id to the deleted_cells list
        if (!state.deleted_cells.includes(cell_id)) {
          state.deleted_cells.push(cell_id);
        }
        delete state.cells[cell_id];
      }
      // delete the section from the sections object
      state.sections = state.sections.filter(
        (section) => section.id !== action.payload.section_id
      );
      // update the section.id for each section in the sections object
      for (let i = 0; i < state.sections.length; i++) {
        state.sections[i].id = i;
      }
      // update the section_index in the cells
      for (let section of state.sections) {
        for (let cell_id of section.cells) {
          // if section_index isn't the same as the index in the sections object,
          // add the cell_id to the edited_cells list
          if (state.cells[cell_id].section_index !== section.id) {
            if (
              !state.edited_cells.includes(cell_id) &&
              !state.added_cells.includes(cell_id)
            ) {
              state.edited_cells.push(cell_id);
            }
            state.cells[cell_id].section_index = section.id;
          }
        }
      }
    },
    editSectionName: (state, action) => {
      // update the value of a key in sections (change section name)
      state.sections[action.payload.section_index].title =
        action.payload.new_section_name;
    },
    moveSection: (state, action) => {
      // update the section_index in the cells
      for (let section of action.payload.new_sections) {
        for (let cell_id of section.cells) {
          // if section_index isn't the same as the index in the sections object,
          // add the cell_id to the edited_cells list
          if (state.cells[cell_id].section_index !== section.id) {
            if (
              !state.edited_cells.includes(cell_id) &&
              !state.added_cells.includes(cell_id)
            ) {
              state.edited_cells.push(cell_id);
            }
            state.cells[cell_id].section_index = section.id;
          }
        }
      }
      // move a section up or down in the sections object
      state.sections = action.payload.new_sections;
    },
    // mergeSections // merge two sections into one
    // duplicateSection // duplicate a section
    resetCellHistory: (state) => {
      state.added_cells = [];
      state.edited_cells = [];
      state.deleted_cells = [];
      state.edited_title = false;
    },
    resetClassificationList: (state) => {
      state.cells_for_classification = [];
    },
    addCell: (state, action) => {
      // add a new key to cells. also add the cell_id to the section's list of cell_ids
      // add the cell_id to the added_cells list if cell_id is not in cells
      if (
        !state.cells[action.payload.cell_id] &&
        !state.added_cells.includes(action.payload.cell_id)
      ) {
        state.added_cells.push(action.payload.cell_id);
        // add cell to cells_for_classification list if the cell_type is a question
        if (action.payload.cell.cell_details.cell_type === "question") {
          state.cells_for_classification.push(action.payload.cell_id);
        }
      }
      // add a new cell to the cells object with the last_updated field
      state.cells[action.payload.cell_id] = {
        ...action.payload.cell,
        last_updated: new Date().toISOString(),
      };
      // add the cell_id to the section's list of cell_ids
      state.sections[action.payload.section_index].cells.push(
        action.payload.cell_id
      );
      // // update the last_updated field
      // state.cells[action.payload.cell_id].last_updated =
      //   new Date().toISOString();
    },
    editCell: (state, action) => {
      // add the cell_id to the edited_cells list
      if (
        !state.edited_cells.includes(action.payload.cell_id) &&
        !state.added_cells.includes(action.payload.cell_id)
      ) {
        state.edited_cells.push(action.payload.cell_id);
        // if the payload has edit_main_text == True and the cell_type is a question
        // then add to cells_for_classification list
        if (
          action.payload.edit_main_text &&
          action.payload.cellInfo.cell_details.cell_type === "question"
        ) {
          state.cells_for_classification.push(action.payload.cell_id);
        }
      }
      // update the value of a key in cells
      state.cells[action.payload.cell_id] = action.payload.cellInfo;
      // update the last_updated field
      state.cells[action.payload.cell_id].last_updated =
        new Date().toISOString();
      // if the time_estimate is 0 then call the estimateTime function
      if (
        state.cells[action.payload.cell_id].time_estimate === 0 &&
        action.payload.cellInfo.cell_details.main_text.length > 0
      ) {
        state.cells[action.payload.cell_id].time_estimate = estimateTime(
          action.payload.cellInfo.cell_details,
          state.engagement_type
        );
      }
    },
    editTimeEstimate: (state, action) => {
      // add the cell_id to the edited_cells list
      if (
        !state.edited_cells.includes(action.payload.cell_id) &&
        !state.added_cells.includes(action.payload.cell_id)
      ) {
        state.edited_cells.push(action.payload.cell_id);
      }
      // update the time_estimate field in the cells object
      state.cells[action.payload.cell_id].time_estimate =
        action.payload.time_estimate;
    },
    deleteCell: (state, action) => {
      // delete a cell from the cells object. also delete the cell_id from the section's list of cell_ids
      // add the cell_id to the deleted_cells list
      if (!state.deleted_cells.includes(action.payload.cell_id)) {
        state.deleted_cells.push(action.payload.cell_id);
        // remove the cell_id from the added_cells and edited_cells lists if applicable
        state.added_cells = state.added_cells.filter(
          (cell_id) => cell_id !== action.payload.cell_id
        );
        state.edited_cells = state.edited_cells.filter(
          (cell_id) => cell_id !== action.payload.cell_id
        );
        // remove the cell_id from the cells_for_classification list
        state.cells_for_classification = state.cells_for_classification.filter(
          (cell_id) => cell_id !== action.payload.cell_id
        );
      }
      // delete the cell_id from the section's list of cell_ids
      // console.log(action.payload.section_index, action.payload.cell_id);
      state.sections[action.payload.section_index].cells = state.sections[
        action.payload.section_index
      ].cells.filter((cell_id) => cell_id !== action.payload.cell_id);
      // delete the cell from the cells object
      delete state.cells[action.payload.cell_id];
    },
    moveCell: (state, action) => {
      // move a cell up or down in the section's list of cell_ids
      // action.payload has prev_section_index, prev_cell_index, new_section_index, new_cell_index
      // console.log(action.payload);
      // remove the prev_cell_index from the prev_section_index
      const cell_id =
        state.sections[action.payload.prev_section_index].cells[
          action.payload.prev_cell_index
        ];
      state.sections[action.payload.prev_section_index].cells = state.sections[
        action.payload.prev_section_index
      ].cells.filter((item) => item !== cell_id);
      // add the cell_id to the new_section_index at new_cell_index
      state.sections[action.payload.new_section_index].cells.splice(
        action.payload.new_cell_index,
        0,
        cell_id
      );
      // add the cell_id to the edited_cells list
      if (
        !state.edited_cells.includes(cell_id) &&
        !state.added_cells.includes(cell_id)
      ) {
        state.edited_cells.push(cell_id);
      }
      // update the section_index in the cell
      state.cells[cell_id].section_index = action.payload.new_section_index;
    },
    duplicateCell: (state, action) => {
      if (
        !state.cells[action.payload.cell_id] &&
        !state.added_cells.includes(action.payload.cell_id)
      ) {
        state.added_cells.push(action.payload.cell_id);
        // add cell to cells_for_classification list if the cell_type is a question
        if (action.payload.cell.cell_details.cell_type === "question") {
          state.cells_for_classification.push(action.payload.cell_id);
        }
      }
      // add a new cell to the cells object with the last_updated field
      state.cells[action.payload.cell_id] = {
        ...action.payload.cell,
        last_updated: new Date().toISOString(),
      };
      // get the section_index of original_cell_id
      const section_index =
        state.cells[action.payload.original_cell_id].section_index;
      // get the index of original_cell_id in the section
      const cell_index = state.sections[section_index].cells.indexOf(
        action.payload.original_cell_id
      );
      // add the new cell_id right after the original_cell_id
      state.sections[section_index].cells.splice(
        cell_index + 1,
        0,
        action.payload.cell_id
      );
    },
    editProjectTitle: (state, action) => {
      state.project_title = action.payload.project_title;
      state.edited_title = true;
    },
    updateEngagementType: (state, action) => {
      state.engagement_type = action.payload.engagement_type;
    },
  },
});

export const {
  setProjectDetails,
  addSection,
  addCell,
  editSectionName,
  moveSection,
  editCell,
  editTimeEstimate,
  deleteCell,
  moveCell,
  deleteSection,
  resetCellHistory,
  resetClassificationList,
  duplicateCell,
  editProjectTitle,
  updateEngagementType,
} = projectDetailsSlice.actions;

export default projectDetailsSlice.reducer;
