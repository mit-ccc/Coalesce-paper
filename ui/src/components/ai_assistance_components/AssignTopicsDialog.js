import React, { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { updateTopicClassification } from "../../store/analyzeTopicsSlice";
import { addEvent } from "../../store/userTrackingSlice";

function AssignTopicsDialog(props) {
  // dialog for re-assigning topics for analyze topics feature
  // props include open, handleClose, cell_id

  const dispatch = useDispatch();

  // get the cell details from the store using the cell_id
  const cellInfo = useSelector(
    (state) => state.projectDetails.cells[props.cell_id]
  );

  // get the project id from the Redux store
  const project_id = useSelector((state) => state.projectDetails.project_id);

  // get the topics from Redux store
  const topics = useSelector((state) => state.analyzeTopics.topics);

  // state variable for the topics
  const [localTopics, setLocalTopics] = useState([]);

  // useEffect to set the localTopics
  useEffect(() => {
    // go through an make sure that the unclassified topic is at the end
    let topicsArray = Object.keys(topics);
    let unclassifiedIndex = topicsArray.indexOf("Unclassified");
    if (unclassifiedIndex !== -1) {
      topicsArray.splice(unclassifiedIndex, 1);
      topicsArray.push("Unclassified");
    }
    setLocalTopics(topicsArray);
  }, [topics]);

  // state variable to keep track of the topics selected
  const [selectedTopics, setSelectedTopics] = useState([]);

  useEffect(() => {
    // get the topics for the cell
    let cellTopics = [];
    // iterate through topics and see if the cell is in the topic
    Object.keys(topics).forEach((topic) => {
      if (topics[topic].cells.includes(props.cell_id)) {
        cellTopics.push(topic);
      }
    });
    setSelectedTopics(cellTopics);
  }, [topics, props.cell_id]);

  // // for testing only
  // useEffect(() => {
  //   console.log("selectedTopics", selectedTopics);
  // }, [selectedTopics]);

  // function to handle selecting a topic
  const handleSelectTopic = (topic) => {
    if (selectedTopics.includes(topic)) {
      let newTopics = selectedTopics.filter((t) => t !== topic);
      // if no other topic is selected, set unclassified to true
      if (newTopics.length === 0) {
        newTopics = ["Unclassified"];
      }
      setSelectedTopics(newTopics);
    } else {
      let newTopics = [...selectedTopics, topic];
      // set unclassified to false if any other topic is selected
      if (selectedTopics.includes("Unclassified")) {
        newTopics = newTopics.filter((t) => t !== "Unclassified");
      }
      setSelectedTopics(newTopics);
    }
  };

  // function to handle saving the topics
  const handleSaveTopics = () => {
    // add event to user tracking
    // get the original topics for the cell
    // get the topics for the cell
    let cellTopics = [];
    // iterate through topics and see if the cell is in the topic
    Object.keys(topics).forEach((topic) => {
      if (topics[topic].cells.includes(props.cell_id)) {
        cellTopics.push(topic);
      }
    });
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "saveTopicModificationsForCell",
        eventDetail: {
          cell_id: props.cell_id,
          previous_topics: cellTopics,
          new_topics: selectedTopics,
        },
      })
    );
    dispatch(
      updateTopicClassification({
        cell_id: props.cell_id,
        selected_topics: selectedTopics,
      })
    );
    props.handleClose();
  };

  return (
    <ThemeProvider theme={theme}>
      <Dialog
        fullWidth={true}
        maxWidth={"sm"}
        open={props.open}
        onClose={props.handleClose}
      >
        <DialogTitle sx={{ m: 0, p: 2 }}>Re-Assign Topics</DialogTitle>
        {/* Add a exit icon button */}
        <IconButton
          color="inherit"
          onClick={props.handleClose}
          aria-label="close"
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{
              marginBottom: 2,
              marginTop: -2,
            }}
          >
            Question is "{cellInfo.cell_details.main_text}"
          </Typography>
          {/* List out topics as a checkbox list */}
          <FormGroup>
            {localTopics.map((topic) => (
              <FormControlLabel
                control={<Checkbox />}
                label={topic}
                key={topic}
                checked={selectedTopics.includes(topic)}
                onChange={() => handleSelectTopic(topic)}
                disabled={topic === "Unclassified"}
              />
            ))}
          </FormGroup>
        </DialogContent>
        {/* Save and cancel buttons */}
        <DialogActions>
          <Button variant="outlined" onClick={props.handleClose}>Cancel</Button>
          <Button
            onClick={() => {
              console.log("Save topics");
              handleSaveTopics();
            }}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default AssignTopicsDialog;
