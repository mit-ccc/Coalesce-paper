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

import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { addTopic, deleteTopic } from "../../store/analyzeTopicsSlice";
import { addEvent } from "../../store/userTrackingSlice";

function EditTopicsDialog(props) {
  // dialog for editing topics for analyze topics feature
  // props include open, handleClose, handleUpdateAnalysis
  // and setSelectedTopic

  const dispatch = useDispatch();

  // get the topics from Redux store
  const topics = useSelector((state) => state.analyzeTopics.topics);

  // get the project id from Redux store
  const project_id = useSelector((state) => state.projectDetails.project_id);

  // state variable for text field
  const [newTopic, setNewTopic] = useState("");

  const handleNewTopicChange = (e) => {
    setNewTopic(e.target.value);
  };

  // function to handle adding a new topic
  const handleAddTopic = () => {
    // trimm whitespace from the new topic
    const trimmedNewTopic = newTopic.trim();
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "addTopic",
        eventDetail: {
          added_topic_name: trimmedNewTopic,
        },
      })
    );
    dispatch(addTopic({ topic_name: trimmedNewTopic }));
    setNewTopic("");
  };

  // function to handle deleting a topic
  const handleDeleteTopic = (topic) => {
    // set selected topic to the next topic in the list after the deleted topic
    // if the deleted topic is the last topic, set selected topic to the previous topic
    // if the deleted topic is the only topic, set selected topic to "Unclassified"
    let topicList = Object.keys(topics);
    let index = topicList.indexOf(topic);
    let nextTopic = "";
    if (topicList.length === 1) {
      nextTopic = "Unclassified";
    } else if (index === topicList.length - 1) {
      nextTopic = topicList[index - 1];
    } else {
      nextTopic = topicList[index + 1];
    }
    props.setSelectedTopic(nextTopic);
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "deleteTopic",
        eventDetail: {
          deleted_topic_name: topic,
        },
      })
    );
    dispatch(deleteTopic({ topic_name: topic }));
  };

  return (
    <ThemeProvider theme={theme}>
      <Dialog
        fullWidth={true}
        maxWidth={"md"}
        open={props.open}
        onClose={props.handleClose}
      >
        <DialogTitle sx={{ m: 0, p: 2 }}>Edit Topics</DialogTitle>
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
          {/* <Typography variant="h6">Topics</Typography> */}
          <Typography
            variant="body1"
            sx={{
              marginBottom: 2,
            }}
          >
            Please edit the topic list by adding and deleting topics.
          </Typography>
          {/* Display the list of topics */}
          <Stack
            direction="column"
            spacing={2}
            sx={{
              width: "100%",
            }}
          >
            {Object.keys(topics).map((topic, index) => {
              if (topic === "Unclassified") {
                return null;
              }
              return (
                <Stack
                  key={index}
                  direction={"row"}
                  justifyContent={"space-between"}
                  alignItems={"center"}
                  sx={{
                    width: "100%",
                    ":hover": {
                      backgroundColor: "#f0f0f0",
                    },
                    padding: 1,
                  }}
                >
                  <Typography variant="body1">{topic}</Typography>
                  <Button
                    onClick={() => {
                      handleDeleteTopic(topic);
                    }}
                    variant="contained"
                    size="small"
                    startIcon={<DeleteIcon />}
                  >
                    Delete
                  </Button>
                </Stack>
              );
            })}
            {/* Show the unclassified topic without delete button */}
            <Stack
              key={"unclassified"}
              direction={"row"}
              justifyContent={"space-between"}
              alignItems={"center"}
              sx={{
                width: "100%",
                ":hover": {
                  backgroundColor: "#f0f0f0",
                },
                padding: 1,
              }}
            >
              <Typography variant="body1">Unclassified</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        {/* Add a topic section */}
        <DialogActions
          sx={{
            justifyContent: "center",
            marginTop: 0,
            marginBottom: 2,
          }}
        >
          <Stack
            direction={"column"}
            spacing={2}
            sx={{
              width: "95%",
            }}
          >
            <Divider
              sx={{
                borderBottomWidth: "2px",
              }}
            />
            <Typography variant="h6">Add a topic</Typography>
            <Stack
              direction={"row"}
              spacing={2}
              alignItems={"center"}
              justifyContent={"space-between"}
            >
              <TextField
                hiddenLabel
                variant="outlined"
                size="small"
                placeholder="Enter a topic"
                fullWidth
                value={newTopic}
                onChange={handleNewTopicChange}
              />
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleAddTopic}
              >
                Add
              </Button>
            </Stack>
          </Stack>
        </DialogActions>
        {/* Have one update button at the bottom in the center */}
        <DialogActions
          sx={{
            justifyContent: "center",
            paddingBottom: 3,
          }}
        >
          <Button
            onClick={() => {
              console.log("Update topics");
              props.handleUpdateAnalysis();
            }}
            color="primary"
            variant="contained"
          >
            Update Topic Analysis
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default EditTopicsDialog;
