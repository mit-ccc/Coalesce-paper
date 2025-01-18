import React, { useState, useEffect, useRef } from "react";
import { Stack } from "@mui/system";
import { IconButton, Typography } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";

// import LoopIcon from '@mui/icons-material/Loop';
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// helper components
import GenerateOptionsDialog from "../ai_assistance_components/GenerateOptionsDialog";
import MoreMenu from "../common_components/MoreMenu";
import ConfirmationDialog from "../common_components/ConfirmationDialog";
import CheckQuestionSection from "../ai_assistance_components/CheckQuestionSection";
import { timeoutPromise, estimateTime } from "../../utils";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { editCell, duplicateCell } from "../../store/projectDetailsSlice";
import {
  addResponseFormat,
  updateSwitchTimestamp,
} from "../../store/generateOptionsSlice";
import { addEvent } from "../../store/userTrackingSlice";

import { v4 as uuidv4 } from "uuid";

function CellToolBar(props) {
  // props takes in cell_id and handleDeleteCell and setLoadingCell

  const dispatch = useDispatch();

  // get the cellInfo from redux store
  const cellInfo = useSelector(
    (state) => state.projectDetails.cells[props.cell_id]
  );

  // // for testing only, print cellInfo
  // useEffect(() => {
  //   console.log(cellInfo);
  // }, [cellInfo]);

  // get the project_id from the store
  const project_id = useSelector((state) => state.projectDetails.project_id);

  // get engagement_type from Redux
  const engagement_type = useSelector(
    (state) => state.projectDetails.engagement_type
  );

  // ref for tool bar
  const topOfCellToolBar = useRef(null);

  // CODE FOR QUESTION TYPE

  // get switch_response_format from Redux
  const switch_response_format = useSelector(
    (state) => state.generateOptions.switch_response_format
  );

  // // for testing only print switch_response_format for the cell
  // useEffect(() => {
  //   if (props.cell_id in switch_response_format) {
  //     console.log(switch_response_format[props.cell_id]);
  //   }
  // }, [switch_response_format, props.cell_id]);

  // function to get new question from the back-end
  const getNewQuestion = (newHumanAiStatus) => {
    console.log("Switch response format");
    let data = {
      project_id: project_id,
      cell_id: props.cell_id,
      cell_details: cellInfo.cell_details,
    };
    timeoutPromise(
      21000,
      fetch("/api/switch_response_format", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
    )
      // check for any raised exceptions
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error();
        }
      })
      .then((data) => {
        // console.log(data);
        // update the switch_response_format
        if (cellInfo.cell_details.response_format === "open") {
          dispatch(
            addResponseFormat({
              cell_id: props.cell_id,
              closed_cell_details: data.content.cell_details,
              open_cell_details: cellInfo.cell_details,
              open_time_estimate: cellInfo.time_estimate,
              closed_time_estimate: data.content.time_estimate,
              open_human_ai_status: cellInfo.human_ai_status,
              closed_human_ai_status: newHumanAiStatus,
            })
          );
        } else {
          dispatch(
            addResponseFormat({
              cell_id: props.cell_id,
              closed_cell_details: cellInfo.cell_details,
              open_cell_details: data.content.cell_details,
              open_time_estimate: data.content.time_estimate,
              closed_time_estimate: cellInfo.time_estimate,
              open_human_ai_status: newHumanAiStatus,
              closed_human_ai_status: cellInfo.human_ai_status,
            })
          );
        }
        // update the cell in Redux
        dispatch(
          editCell({
            cell_id: props.cell_id,
            edit_main_text: true,
            cellInfo: {
              ...cellInfo,
              cell_details: data.content.cell_details,
              human_ai_status: newHumanAiStatus,
              time_estimate: data.content.time_estimate,
              checks_to_ignore: [],
            },
          })
        );
        // add event to user tracking
        dispatch(
          addEvent({
            projectId: project_id,
            eventType: "switchResponseFormat",
            eventDetail: {
              edited_cell_id: props.cell_id,
              previous_response_format: cellInfo.cell_details.response_format,
              new_response_format: data.content.cell_details.response_format,
              previous_cell_details: cellInfo.cell_details,
              new_cell_details: data.content.cell_details,
            },
          })
        );
        props.setLoadingCell(false);
      })
      .catch((_error) => {
        console.error("Error switching response format");
        // just flip the response format
        dispatch(
          editCell({
            cell_id: props.cell_id,
            edit_main_text: true,
            cellInfo: {
              ...cellInfo,
              cell_details: {
                ...cellInfo.cell_details,
                response_format:
                  cellInfo.cell_details.response_format === "open"
                    ? "closed"
                    : "open",
              },
              time_estimate: estimateTime(
                {
                  ...cellInfo.cell_details,
                  response_format:
                    cellInfo.cell_details.response_format === "open"
                      ? "closed"
                      : "open",
                },
                engagement_type
              ),
            },
          })
        );
        // update the switch_response_format
        if (cellInfo.cell_details.response_format === "open") {
          dispatch(
            addResponseFormat({
              cell_id: props.cell_id,
              closed_cell_details: {
                ...cellInfo.cell_details,
                response_format: "closed",
              },
              open_cell_details: cellInfo.cell_details,
              open_time_estimate: cellInfo.time_estimate,
              closed_time_estimate: estimateTime(
                { ...cellInfo.cell_details, response_format: "closed" },
                engagement_type
              ),
              open_human_ai_status: cellInfo.human_ai_status,
              closed_human_ai_status: cellInfo.human_ai_status,
            })
          );
        } else {
          dispatch(
            addResponseFormat({
              cell_id: props.cell_id,
              closed_cell_details: cellInfo.cell_details,
              open_cell_details: {
                ...cellInfo.cell_details,
                response_format: "open",
              },
              open_time_estimate: estimateTime(
                { ...cellInfo.cell_details, response_format: "open" },
                engagement_type
              ),
              closed_time_estimate: cellInfo.time_estimate,
              open_human_ai_status: cellInfo.human_ai_status,
              closed_human_ai_status: cellInfo.human_ai_status,
            })
          );
        }
        // add event to user tracking
        dispatch(
          addEvent({
            projectId: project_id,
            eventType: "switchResponseFormat",
            eventDetail: {
              edited_cell_id: props.cell_id,
              previous_response_format: cellInfo.cell_details.response_format,
              new_response_format:
                cellInfo.cell_details.response_format === "open"
                  ? "closed"
                  : "open",
              previous_cell_details: cellInfo.cell_details,
              new_cell_details: {
                ...cellInfo.cell_details,
                response_format:
                  cellInfo.cell_details.response_format === "open"
                    ? "closed"
                    : "open",
              },
            },
          })
        );
        props.setLoadingCell(false);
      });
  };

  // function to update question type
  const handleQuestionTypeChange = (e) => {
    // console.log("Question Type Change");
    props.setLoadingCell(true);
    // if the main text is empty then don't post to the back-end; just update the cellInfo
    if (cellInfo.cell_details.main_text === "") {
      // add event to user tracking
      // add event to user tracking
      dispatch(
        addEvent({
          projectId: project_id,
          eventType: "switchResponseFormat",
          eventDetail: {
            edited_cell_id: props.cell_id,
            previous_response_format: cellInfo.cell_details.response_format,
            new_response_format: e.target.value,
            previous_cell_details: cellInfo.cell_details,
            new_cell_details: {
              ...cellInfo.cell_details,
              response_format: e.target.value,
            },
          },
        })
      );
      dispatch(
        editCell({
          cell_id: props.cell_id,
          edit_main_text: true,
          cellInfo: {
            ...cellInfo,
            cell_details: {
              ...cellInfo.cell_details,
              response_format: e.target.value,
            },
            human_ai_status: "human",
          },
        })
      );
      // set loading to false
      props.setLoadingCell(false);
      return;
    }
    // determine the human_ai_status of the new cell
    let newHumanAiStatus = "ai";
    if (
      cellInfo.human_ai_status === "human" ||
      cellInfo.human_ai_status === "human_ai"
    ) {
      newHumanAiStatus = "human_ai";
    }
    // check if cell_id is in switch_response_format
    if (props.cell_id in switch_response_format) {
      // check if last_switched >= last_updated in cellInfo
      if (
        switch_response_format[props.cell_id].last_switched >=
        cellInfo.last_updated
      ) {
        let newResponseFormat = {};
        // if so, then update the cellInfo based on switch_response_format
        if (cellInfo.cell_details.response_format === "open") {
          dispatch(
            editCell({
              cell_id: props.cell_id,
              edit_main_text: true,
              cellInfo: {
                ...cellInfo,
                cell_details: switch_response_format[props.cell_id].closed,
                human_ai_status:
                  switch_response_format[props.cell_id].closed_human_ai_status,
                time_estimate:
                  switch_response_format[props.cell_id].closed_time_estimate,
                checks_to_ignore: [],
              },
            })
          );
          newResponseFormat = switch_response_format[props.cell_id].closed;
        } else {
          dispatch(
            editCell({
              cell_id: props.cell_id,
              edit_main_text: true,
              cellInfo: {
                ...cellInfo,
                cell_details: switch_response_format[props.cell_id].open,
                human_ai_status:
                  switch_response_format[props.cell_id].open_human_ai_status,
                time_estimate:
                  switch_response_format[props.cell_id].open_time_estimate,
                checks_to_ignore: [],
              },
            })
          );
          newResponseFormat = switch_response_format[props.cell_id].open;
        }
        // also update the last_switched timestamp
        dispatch(updateSwitchTimestamp({ cell_id: props.cell_id }));
        // add event to user tracking
        dispatch(
          addEvent({
            projectId: project_id,
            eventType: "switchResponseFormat",
            eventDetail: {
              edited_cell_id: props.cell_id,
              previous_response_format: cellInfo.cell_details.response_format,
              new_response_format: newResponseFormat.response_format,
              previous_cell_details: cellInfo.cell_details,
              new_cell_details: newResponseFormat,
            },
          })
        );
        // set loading to false
        props.setLoadingCell(false);
      } else {
        getNewQuestion(newHumanAiStatus);
      }
    } else {
      getNewQuestion(newHumanAiStatus);
    }
  };

  // CODE FOR DELETE DIALOG

  // state variable for the dialog box
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // CODE FOR GENERATE OPTIONS DIALOG

  // state variable for generate options dialog
  const [openGenerateOptions, setOpenGenerateOptions] = useState(false);

  const handleOpenGenerateOptions = () => {
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "openGenerateOptions",
        eventDetail: {
          cell_id: props.cell_id,
          cell: cellInfo,
        },
      })
    );
    setOpenGenerateOptions(true);
  };

  const handleCloseGenerateOptions = () => {
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "closeGenerateOptions",
        eventDetail: {
          cell_id: props.cell_id,
        },
      })
    );
    setOpenGenerateOptions(false);
  };

  // CODE FOR CHECK QUESTION

  // state variable for check question section
  const [openCheckQuestion, setOpenCheckQuestion] = useState(false);

  const toggleCheckQuestion = () => {
    // add event to user tracking
    if (openCheckQuestion === false) {
      dispatch(
        addEvent({
          projectId: project_id,
          eventType: "openCheckQuestion",
          eventDetail: {
            cell_id: props.cell_id,
            cell: cellInfo,
          },
        })
      );
    } else {
      dispatch(
        addEvent({
          projectId: project_id,
          eventType: "closeCheckQuestion",
          eventDetail: {
            cell_id: props.cell_id,
          },
        })
      );
    }
    setOpenCheckQuestion(!openCheckQuestion);
  };

  // CODE FOR DUPLICATE

  const handleDuplicate = () => {
    // console.log("Duplicate Cell");
    // get a new cell_id
    const newCellId = uuidv4();
    // duplicate the cell
    let newCell = {
      ...cellInfo,
    };
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "duplicateCell",
        eventDetail: {
          new_cell_id: newCellId,
          original_cell_id: props.cell_id,
          cell_details: cellInfo.cell_details,
        },
      })
    );
    // add the new cell to the store
    dispatch(
      duplicateCell({
        cell_id: newCellId,
        cell: newCell,
        original_cell_id: props.cell_id,
      })
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        {/* Select question type */}
        <FormControl
          size="small"
          sx={{
            visibility:
              cellInfo.cell_details.cell_type === "question"
                ? "visible"
                : "hidden",
          }}
        >
          {/* Add a label */}
          <Typography
            variant="body2"
            component="div"
            sx={{
              paddingBottom: 0.5,
            }}
          >
            Response Format
          </Typography>
          <Select
            value={cellInfo.cell_details.response_format}
            onChange={handleQuestionTypeChange}
            displayEmpty
          >
            <MenuItem value={"open"}>Open-ended</MenuItem>
            <MenuItem value={"closed"}>Close-ended</MenuItem>
          </Select>
        </FormControl>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={0}
        >
          <Tooltip
            title="Generate Alternative Questions"
            sx={{
              visibility:
                cellInfo.cell_details.cell_type === "question"
                  ? "visible"
                  : "hidden",
            }}
          >
            <IconButton color="inherit" onClick={handleOpenGenerateOptions}>
              <TipsAndUpdatesIcon fontSize="large" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title="Check Question for Issues"
            sx={{
              visibility:
                cellInfo.cell_details.cell_type === "question"
                  ? "visible"
                  : "hidden",
            }}
          >
            <IconButton
              color="inherit"
              onClick={toggleCheckQuestion}
              ref={topOfCellToolBar}
            >
              <SearchIcon fontSize="large" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="inherit" onClick={handleOpenDeleteDialog}>
              <DeleteIcon fontSize="large" />
            </IconButton>
          </Tooltip>
          <MoreMenu
            items={["Duplicate"]}
            clickHandlers={[() => handleDuplicate()]}
          />
        </Stack>
      </Stack>
      {/* Delete Dialog */}
      <ConfirmationDialog
        openDialog={openDeleteDialog}
        handleCloseDialog={handleCloseDeleteDialog}
        handleConfirm={() => {
          props.handleDeleteCell(props.cell_id);
          handleCloseDeleteDialog();
        }}
        dialogTitle="Confirm Cell Deletion"
        dialogContent={`The ${cellInfo.cell_details.cell_type} cell will be permanently deleted.`}
        confirmText="Delete Cell"
        cancelText="Cancel"
      />
      {/* Generate Options Dialog */}
      <GenerateOptionsDialog
        cell_id={props.cell_id}
        open={openGenerateOptions}
        handleClose={handleCloseGenerateOptions}
      />
      {/* Check Question Section */}
      {openCheckQuestion && (
        <CheckQuestionSection
          cell_id={props.cell_id}
          open={openCheckQuestion}
          handleClose={() => {
            setOpenCheckQuestion(false);
            topOfCellToolBar.current.scrollIntoView({
              behavior: "smooth",
              block: "end",
            });
          }}
        />
      )}
    </ThemeProvider>
  );
}

export default CellToolBar;
