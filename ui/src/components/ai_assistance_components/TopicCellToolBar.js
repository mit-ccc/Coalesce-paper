import React, { useState, useEffect, useRef } from "react";
import { Stack } from "@mui/system";
import { IconButton, Typography } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";

import DeleteIcon from "@mui/icons-material/Delete";
import FlagIcon from "@mui/icons-material/Flag";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// helper components
import ConfirmationDialog from "../common_components/ConfirmationDialog";
import AssignTopicsDialog from "./AssignTopicsDialog";

// redux stuff
import { useSelector, useDispatch } from "react-redux";
import { addEvent } from "../../store/userTrackingSlice";

function TopicCellToolBar(props) {
  // props takes in cell_id and handleDeleteCell

  const dispatch = useDispatch();

  // get the cellInfo from redux store
  const cellInfo = useSelector(
    (state) => state.projectDetails.cells[props.cell_id]
  );

  // get the project id from the Redux store
  const project_id = useSelector((state) => state.projectDetails.project_id);

  // NOTE: question type is not in the MVP
  // const [questionType, setQuestionType] = useState("attitudinal");

  // // TODO: implement change question type
  // const handleQuestionTypeChange = (e) => {
  //   console.log("Change question type");
  //   setQuestionType(e.target.value);
  // };

  // CODE FOR RE-ASSIGN DIALOG

  // state variable for the dialog box
  const [openAssignDialog, setOpenAssignDialog] = useState(false);

  const handleOpenAssignDialog = () => {
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "openModifyTopicsForCell",
        eventDetail: {
          cell_id: props.cell_id,
        },
      })
    );
    setOpenAssignDialog(true);
  };

  const handleCloseAssignDialog = () => {
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "closeModifyTopicsForCell",
        eventDetail: {
          cell_id: props.cell_id,
        },
      })
    );
    setOpenAssignDialog(false);
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

  return (
    <ThemeProvider theme={theme}>
      <Stack direction="row" alignItems="center" justifyContent="flex-end">
        {/* Select question type */}
        {/* <FormControl size="small">
          <Typography
            variant="body2"
            component="div"
            sx={{
              paddingBottom: 0.5,
            }}
          >
            Question type
          </Typography>
          <Select
            value={questionType}
            onChange={handleQuestionTypeChange}
            displayEmpty
          >
            <MenuItem value={"attitudinal"}>Attitudinal</MenuItem>
            <MenuItem value={"behavioral"}>Behavioral</MenuItem>
            <MenuItem value={"demographic"}>Demographic</MenuItem>
          </Select>
        </FormControl> */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={0}
        >
          <Tooltip title="Re-Assign Topics">
            <IconButton color="inherit" onClick={handleOpenAssignDialog}>
              <FlagIcon fontSize="large" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="inherit" onClick={handleOpenDeleteDialog}>
              <DeleteIcon fontSize="large" />
            </IconButton>
          </Tooltip>
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
      {/* Re-Assign Dialog */}
      <AssignTopicsDialog
        cell_id={props.cell_id}
        open={openAssignDialog}
        handleClose={handleCloseAssignDialog}
      />
    </ThemeProvider>
  );
}

export default TopicCellToolBar;
