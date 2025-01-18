// Part of Redux Store that stores the list of user projects

import { createSlice } from "@reduxjs/toolkit";

export const userProjectsSlice = createSlice({
  name: "userProjects",
  initialState: {
    projects: [], // same as projects field in users collection
    lastSaved: "", // timestamp of the last save
  },
  reducers: {
    setProjects: (state, action) => {
      // action.payload is the list of projects
      state.projects = action.payload;
    },
    addProject: (state, action) => {
      // action.payload is the new project
      state.projects.push(action.payload);
    },
    editProject: (state, action) => {
      // action.payload.project_id is the project_id
      // action.payload.project_title is the new project title
      // find the project with project_id and update the project_title
      let project = state.projects.find(
        (project) => project.project_id === action.payload.project_id
      );
      project.project_title = action.payload.project_title;
    },
    deleteProject: (state, action) => {
      // action.payload is the project_id
      // find the project with project_id and remove it from the list
      state.projects = state.projects.filter(
        (project) => project.project_id !== action.payload
      );
    },
    setLastSaved: (state, action) => {
      // action.payload is the timestamp
      state.lastSaved = action.payload;
    },
    // duplicateProject
  },
});

export const {
  setProjects,
  addProject,
  editProject,
  deleteProject,
  setLastSaved,
} = userProjectsSlice.actions;

export default userProjectsSlice.reducer;
