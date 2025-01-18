import React, { useEffect, useState } from "react";

import {
  saveProjectDetails,
  saveProjectContext,
  saveAnalyzeTopics,
} from "../utils";

import { useSelector, useDispatch } from "react-redux";
import { resetEvents } from "../store/userTrackingSlice";
import { timeoutPromise } from "../utils";
import { resetCellHistory } from "../store/projectDetailsSlice";
import { resetEdited } from "../store/projectContextSlice";
import { resetNeedToSave } from "../store/analyzeTopicsSlice";
import { setLastSaved } from "../store/userProjectsSlice";

function EventTracking(props) {
  const dispatch = useDispatch();

  // CODE TO SAVE DATA

  // state variable for last time saved
  const [lastSaved2, setLastSaved2] = useState(Date.now());

  // get all the necessary info from the redux store
  const projectDetails = useSelector((state) => state.projectDetails);
  const projectContext = useSelector((state) => state.projectContext);
  const analyzeTopics = useSelector((state) => state.analyzeTopics);

  const handleSave = async () => {
    // console.log("Saving data in the background" + new Date().toISOString());
    const timeStamp = new Date().toISOString();
    let projectDetailsStatus = "nan";
    let projectContextStatus = "nan";
    let analyzeTopicsStatus = "nan";

    // await on all the save functions
    await Promise.all([
      saveProjectDetails(projectDetails),
      saveProjectContext(projectContext),
      saveAnalyzeTopics(analyzeTopics, projectDetails.project_id),
    ]).then((results) => {
      projectDetailsStatus = results[0];
      projectContextStatus = results[1];
      analyzeTopicsStatus = results[2];
    });

    if (projectDetailsStatus === "success") {
      // reset cell history
      dispatch(resetCellHistory());
    }

    if (projectContextStatus === "success") {
      // reset edited to false
      dispatch(resetEdited());
    }

    if (analyzeTopicsStatus === "success") {
      // reset need_to_save
      dispatch(resetNeedToSave());
    }

    // set the last saved time
    if (
      projectDetailsStatus !== "error" &&
      projectContextStatus !== "error" &&
      analyzeTopicsStatus !== "error"
    ) {
      // console.log("Saved data" + new Date().toISOString());
      dispatch(setLastSaved(timeStamp));
      setLastSaved2(Date.now());
    }
  };

  // useEffect to save the data every 30 seconds
  useEffect(() => {
    if (props.userCode === "") {
      return;
    }
    // check if the last saved time is more than 30 seconds ago
    if (Date.now() - lastSaved2 >= 30000) {
      handleSave();
    }
  }, [props.userCode, projectDetails, projectContext, analyzeTopics]);

  // CODE TO SAVE USER EVENTS

  // state variable for last time saved
  const [lastSavedEvents, setLastSavedEvents] = useState(Date.now());

  // get the events from the redux store
  const events = useSelector((state) => state.userTracking.events);
  // get the events_added from the redux store
  const events_added = useSelector((state) => state.userTracking.events_added);

  // helper function to save the user events
  const saveUserEvents = () => {
    if (props.userCode === "") {
      return;
    }
    // console.log("Saving user events" + new Date().toISOString());
    // save the user events
    if (events_added) {
      // get current timestamp
      const timeStamp = new Date().toISOString();
      console.log("Save user events");
      let data = {
        user_code: props.userCode,
        events: events,
      };
      timeoutPromise(
        10000,
        fetch("/api/track_user_action", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })
      )
        .then((response) => response.json())
        .then((_data) => {
          // console.log(data);
          // reset the events in the store
          dispatch(resetEvents({ timeSaved: timeStamp }));
          setLastSavedEvents(Date.now());
          // console.log("Saved user events" + new Date().toISOString());
        })
        .catch((_error) => {
          console.error("Error in saving user events");
        });
    }
  };

  // // for testing only, print events
  // useEffect(() => {
  //   console.log(events);
  // }, [events]);

  // save user events when user tries to reload page or leave the website
  // calls the hook whenever events changes
  useEffect(() => {
    window.addEventListener("beforeunload", (e) => {
      e.preventDefault(); // uncomment if you want user to confirm before reloading / leaving
      saveUserEvents();
      // // wait 100 ms
      // setTimeout(() => {
      //   // console.log("waiting");
      // }, 100);
    });
    // React also makes sure that whenever the component gets unmounted, or the hook is about to be
    // re-executed for the same component, that the "cleanup function" gets called. The cleanup function
    // is basically whatever function you return within the hook. If you don't return any, no cleanup function
    // will be called.
    return () => {
      window.removeEventListener("beforeunload", (e) => {
        e.preventDefault(); // uncomment if you want user to confirm before reloading / leaving
        saveUserEvents();
        // // wait 100 ms
        // setTimeout(() => {
        //   // console.log("waiting");
        // }, 100);
      });
    };
  }, [props.userCode, events, events_added]);

  // useEffect to save the user events every 13 seconds
  useEffect(() => {
    if (props.userCode === "") {
      return;
    }
    // check if the last saved time is more than 13 seconds ago
    if (Date.now() - lastSavedEvents >= 13000) {
      saveUserEvents();
    }
  }, [props.userCode, events, events_added]);

  return <div></div>;
}

export default EventTracking;
