// Part of Redux Store that stores user tracking data. I will need to access this in most components.

import { createSlice } from "@reduxjs/toolkit";

export const userTrackingSlice = createSlice({
  name: "userTracking",
  initialState: {
    events_added: false,
    events: {
      user_level: [],
    },
  },
  reducers: {
    // reset state to initialState
    resetEvents: (state, action) => {
      // action.payload contains the time stamp
      const { timeSaved } = action.payload;
      // console.log("Resetting events to timeSaved: ", timeSaved);
      // iterate through events and remove all events that are older than timeSaved
      Object.keys(state.events).forEach((projectId) => {
        state.events[projectId] = state.events[projectId].filter(
          (event) => event.timeStamp > timeSaved
        );
      });
      // set events_added to false if there no projects have any events
      state.events_added = Object.values(state.events).some(
        (events) => events.length > 0
      );
    },
    // adds a user tracking data point to the store
    addEvent: (state, action) => {
      // action.payload contains the project_id, action_name, and any action details
      const { projectId, eventType, eventDetail } = action.payload;
      // get the time stamp
      const timeStamp = new Date().toISOString();
      // check if the project_id exists in the events object
      if (!state.events[projectId]) {
        // if it doesn't exist, create a new array
        state.events[projectId] = [];
      }
      // add the event to the events array
      state.events[projectId].push({
        eventType: eventType,
        eventDetail: eventDetail,
        timeStamp: timeStamp,
      });
      // set events_added to true
      state.events_added = true;
    },
  },
});

export const { resetEvents, addEvent } = userTrackingSlice.actions;

export default userTrackingSlice.reducer;
