import React, { useState, useEffect, useRef } from "react";
import { Stack } from "@mui/system";
import Box from "@mui/material/Box";
import { IconButton, Typography } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import Input from "@mui/material/Input";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";

import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import FaceIcon from "@mui/icons-material/Face";
import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// help components
import ResponseCategories from "../common_components/ResponseCategories";
import CellToolBar from "./CellToolBar";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { editCell, editTimeEstimate } from "../../store/projectDetailsSlice";
import { addEvent } from "../../store/userTrackingSlice";

function Cell(props) {
  // text and question cells.

  // props include the cell_id, and the letter, and handleDeleteCell
  // I can get the cell details from the Redux store

  const dispatch = useDispatch();

  // get the cell details from the store using the cell_id
  const cellInfo = useSelector(
    (state) => state.projectDetails.cells[props.cell_id]
  );

  // get the project_id from the store
  const projectId = useSelector((state) => state.projectDetails.project_id);

  // // for testing only, print the props.cell_id
  // useEffect(() => {
  //     console.log(props.cell_id);
  // }, [props.cell_id]);

  // // for testing only, print the cell details when redux store changes
  // useEffect(() => {
  //     console.log(cellInfo);
  // }, [cellInfo]);

  // state variable for loading
  const [loadingCell, setLoadingCell] = useState(false);

  // state variable for seconds passed while loading
  const [secondsPassed, setSecondsPassed] = useState(0);

  const timerInterval = useRef();

  // function to start or stop timer based on loadingCell
  useEffect(() => {
    if (loadingCell) {
      // console.log("Start switch response format timer");
      timerInterval.current = setInterval(() => {
        setSecondsPassed((prevSeconds) => prevSeconds + 1);
      }, 1000);
    } else {
      // console.log("Stop switch response format timer");
      clearInterval(timerInterval.current);
      timerInterval.current = null;
      setSecondsPassed(0);
    }
    return () => clearInterval(timerInterval.current);
  }, [loadingCell]);

  // CODE FOR INPUT COMPONENTS

  // local state variable for the main text
  const [mainText, setMainText] = useState("");

  // function to update the main text (using local state)
  const handleEditLocalMainText = (e) => {
    setMainText(e.target.value);
  };

  // function to update the main text (using only the Redux store)
  const handleEditGlobalMainText = (e) => {
    // update the cell in Redux only if the text has changed
    if (e.target.value === cellInfo.cell_details.main_text) {
      // console.log("No change in main text");
      return;
    }
    // find the new human_ai_status
    let newHumanAiStatus = "human";
    if (
      cellInfo.human_ai_status === "ai" ||
      cellInfo.human_ai_status === "human_ai"
    ) {
      newHumanAiStatus = "human_ai";
    }
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "editCellMainTextFromBuilder",
        eventDetail: {
          edited_cell_id: props.cell_id,
          previous_main_text: cellInfo.cell_details.main_text,
          new_main_text: e.target.value,
        },
      })
    );
    dispatch(
      editCell({
        cell_id: props.cell_id,
        edit_main_text: true,
        cellInfo: {
          ...cellInfo,
          cell_details: { ...cellInfo.cell_details, main_text: e.target.value },
          human_ai_status: newHumanAiStatus,
          checks_to_ignore: [],
        },
      })
    );
  };

  // local state variable for the description text
  const [description, setDescription] = useState("");

  // function to update the description text (using local state)
  const handleEditLocalDescriptionText = (e) => {
    setDescription(e.target.value);
  };

  // function to update the description text (using only the Redux store)
  const handleEditGlobalDescriptionText = (e) => {
    // update the cell in Redux only if the text has changed
    if (e.target.value === cellInfo.cell_details.description) {
      // console.log("No change in description text");
      return;
    }
    // find the new human_ai_status
    let newHumanAiStatus = "human";
    if (
      cellInfo.human_ai_status === "ai" ||
      cellInfo.human_ai_status === "human_ai"
    ) {
      newHumanAiStatus = "human_ai";
    }
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "editCellDescriptionFromBuilder",
        eventDetail: {
          edited_cell_id: props.cell_id,
          previous_description: cellInfo.cell_details.description,
          new_description: e.target.value,
        },
      })
    );
    dispatch(
      editCell({
        cell_id: props.cell_id,
        edit_main_text: false,
        cellInfo: {
          ...cellInfo,
          cell_details: {
            ...cellInfo.cell_details,
            description: e.target.value,
          },
          human_ai_status: newHumanAiStatus,
        },
      })
    );
  };

  // local state variable for time estimate
  const [timeEstimate, setTimeEstimate] = useState(0);

  // function to update the time estimate locally
  const handleEditLocalTimeEstimate = (e) => {
    setTimeEstimate(e.target.value);
  };

  // function to update the time estimate globally
  const handleEditGlobalTimeEstimate = (e) => {
    // update the cell in Redux only if the time estimate has changed
    if (parseFloat(e.target.value) === cellInfo.time_estimate) {
      // console.log("No change in time estimate");
      return;
    }
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "editCellTimeEstimateFromBuilder",
        eventDetail: {
          edited_cell_id: props.cell_id,
          previous_time_estimate: cellInfo.time_estimate,
          new_time_estimate: parseFloat(e.target.value),
        },
      })
    );
    dispatch(
      editTimeEstimate({
        cell_id: props.cell_id,
        time_estimate: parseFloat(e.target.value),
      })
    );
  };

  // useEffect to update local state variables when cellInfo changes
  useEffect(() => {
    setMainText(cellInfo.cell_details.main_text);
    setDescription(cellInfo.cell_details.description);
    setTimeEstimate(cellInfo.time_estimate);
  }, [cellInfo]);

  // CODE FOR RESPONSE CATEGORIES

  // function to update response categories in Redux store
  const updateResponseCategories = (newCategories) => {
    // find the new human_ai_status
    let newHumanAiStatus = "human";
    if (
      cellInfo.human_ai_status === "ai" ||
      cellInfo.human_ai_status === "human_ai"
    ) {
      newHumanAiStatus = "human_ai";
    }
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "editResponseCategoriesFromBuilder",
        eventDetail: {
          edited_cell_id: props.cell_id,
          previous_response_categories:
            cellInfo.cell_details.response_categories,
          new_response_categories: newCategories,
        },
      })
    );
    // update the cell in Redux
    dispatch(
      editCell({
        cell_id: props.cell_id,
        edit_main_text: false,
        cellInfo: {
          ...cellInfo,
          cell_details: {
            ...cellInfo.cell_details,
            response_categories: newCategories,
          },
          human_ai_status: newHumanAiStatus,
        },
      })
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          flexGrow: 1,
          padding: 2,
          border: `2px solid #e0e0e0`, // or #bdbdbd
          bgcolor: `#FFFFFF`,
          // round corners
          borderRadius: 3,
          mb: 3,
          width: { md: "100%", xl: "90%" },
          mt: 4,
        }}
      >
        {loadingCell === true ? (
          <Stack
            direction="column"
            alignItems="center"
            justifyContent="center"
            spacing={2}
          >
            <CircularProgress />
            <Typography variant="body1">
              Switching response format...
            </Typography>
            {secondsPassed <= 10 ? (
              <Typography variant="body1">
                Estimated time remaining: {10 - secondsPassed} seconds
              </Typography>
            ) : (
              <>
                <Typography variant="body1" align="center">
                  Total time elapsed: {secondsPassed} seconds
                </Typography>
                <Typography
                  variant="body1"
                  color="error"
                  align="center"
                  sx={{ width: "90%" }}
                >
                  Using AI to switch the response format is taking longer than
                  expected. Waiting for at most 20 seconds before manually
                  updating the response format.
                </Typography>
              </>
            )}
          </Stack>
        ) : (
          // Create the letter icon on the left side of the cell
          <Stack
            direction="row"
            alignItems="space-between"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar>{props.letter.toUpperCase()}</Avatar>
              <Stack direction="column" spacing={0}>
                {/* BUG = The input doesn't become the full width unless I have a Typography component
                                before it that covers the full width.
                                SOLUTION = I added a hidden Typography component to cover the full width */}
                <Typography
                  variant="body1"
                  component="div"
                  sx={{
                    width: "100%",
                    visibility: "hidden",
                    height: 0,
                    overflow: "hidden",
                  }}
                >
                  This is some hidden text to address the width issue. This
                  feels really hacky, but it works, so I will do it. QED. This
                  is some hidden text to address the width issue. This feels
                  really hacky, but it works, so I will do it. QED. This is some
                  hidden text to address the width issue. This feels really
                  hacky, but it works, so I will do it. QED.
                </Typography>
                <Input
                  id={"cell-main-text-" + props.cell_id}
                  // defaultValue={cellInfo.cell_details.main_text}
                  value={mainText}
                  placeholder={
                    cellInfo.cell_details.cell_type === "question"
                      ? "Enter question here"
                      : "Enter text here"
                  }
                  fullWidth
                  multiline={true}
                  margin="dense"
                  sx={{ typography: "body1" }}
                  onChange={handleEditLocalMainText}
                  onBlur={handleEditGlobalMainText}
                />
                {cellInfo.cell_details.cell_type === "question" && (
                  <Input
                    id={"cell-description-" + props.cell_id}
                    // defaultValue={cellInfo.cell_details.description}
                    value={description}
                    placeholder="Input optional description here"
                    fullWidth
                    multiline={true}
                    margin="dense"
                    sx={{ typography: "caption", paddingTop: 3 }}
                    onChange={handleEditLocalDescriptionText}
                    onBlur={handleEditGlobalDescriptionText}
                  />
                )}
                {cellInfo.cell_details.cell_type === "question" && [
                  cellInfo.cell_details.response_format === "closed" ? (
                    <ResponseCategories
                      key="0"
                      editable={true}
                      responseCategories={
                        cellInfo.cell_details.response_categories
                      }
                      updateResponseCategories={updateResponseCategories}
                    />
                  ) : (
                    <TextField
                      key="1"
                      placeholder="Answer goes here..."
                      disabled={true}
                      sx={{ marginTop: 3 }}
                    />
                  ),
                ]}
              </Stack>
            </Stack>
            <Tooltip title="Move Cell" className="draggy">
              <IconButton
                disableFocusRipple={true}
                disableRipple={true}
                className="draggy"
                variant="secondary"
              >
                <DragIndicatorIcon fontSize="large" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-start"
          spacing={2}
          sx={{ marginTop: 3 }}
        >
          <Tooltip
            title={
              cellInfo.human_ai_status === "ai"
                ? "AI Generated"
                : cellInfo.human_ai_status === "human"
                ? "Human Generated"
                : "Human + AI Generated"
            }
            placement="bottom"
          >
            <Avatar
              sx={{
                width: 35,
                height: 35,
              }}
              variant="questionStatus"
            >
              {
                {
                  ai: <SmartToyIcon />,
                  human: <FaceIcon />,
                  human_ai: <FaceRetouchingNaturalIcon />,
                }[cellInfo.human_ai_status]
              }
            </Avatar>
          </Tooltip>
          <Chip
            label={
              cellInfo.cell_details.cell_type === "question"
                ? "Question"
                : "Text"
            }
            color="primary"
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar
              sx={{
                width: 24,
                height: 24,
              }}
            >
              <AccessTimeFilledIcon />
            </Avatar>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Input
                id={"cell-time-estimate-" + props.cell_id}
                value={timeEstimate}
                multiline={false}
                type="number"
                margin="dense"
                sx={{
                  typography: "body1",
                  // have the width be as long as the number of digits in the time estimate
                  width: `${timeEstimate.toString().length + 3}ch`,
                }}
                onChange={handleEditLocalTimeEstimate}
                onBlur={handleEditGlobalTimeEstimate}
              />
              <Typography variant="body1">
                {timeEstimate === 1 ? "minute" : "minutes"}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
        <Divider
          sx={{
            marginTop: 4,
            marginBottom:
              cellInfo.cell_details.cell_type === "question" ? 3 : 1,
            borderBottomWidth: "2px",
          }}
        />
        {/* Edit bar */}
        <CellToolBar
          cell_id={props.cell_id}
          handleDeleteCell={props.handleDeleteCell}
          setLoadingCell={setLoadingCell}
        />
      </Box>
    </ThemeProvider>
  );
}

export default Cell;
