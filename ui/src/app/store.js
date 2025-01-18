import { configureStore } from "@reduxjs/toolkit";
import analyzeTopicsReducer from "../store/analyzeTopicsSlice";
import editHistoryReducer from "../store/editHistorySlice";
import projectContextReducer from "../store/projectContextSlice";
import projectDetailsReducer from "../store/projectDetailsSlice";
import questionChecksReducer from "../store/questionChecksSlice";
import userProjectsReducer from "../store/userProjectsSlice";
import userTrackingReducer from "../store/userTrackingSlice";
import generateOptionsReducer from "../store/generateOptionsSlice";

export const store = configureStore({
  reducer: {
    analyzeTopics: analyzeTopicsReducer,
    editHistory: editHistoryReducer,
    projectContext: projectContextReducer,
    projectDetails: projectDetailsReducer,
    questionChecks: questionChecksReducer,
    userProjects: userProjectsReducer,
    userTracking: userTrackingReducer,
    generateOptions: generateOptionsReducer,
  },
});
