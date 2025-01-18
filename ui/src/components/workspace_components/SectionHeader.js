import React, { useState, useEffect } from "react";

import { Stack } from "@mui/material";
import Typography from "@mui/material/Typography";
import Input from "@mui/material/Input";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import {
  editSectionName,
  deleteSection,
} from "../../store/projectDetailsSlice";
import { addEvent } from "../../store/userTrackingSlice";

// helper components
import MoreMenu from "../common_components/MoreMenu";
import ConfirmationDialog from "../common_components/ConfirmationDialog";

function SectionHeader(props) {
  // header for each section
  // props will contain the sectionRef and the section number
  // I'll read the section details from the Redux store

  // get the section details from the store
  const section = useSelector(
    (state) => state.projectDetails.sections[props.number]
  );

  // get the project id from the store
  const projectId = useSelector((state) => state.projectDetails.project_id);

  // get the cells from the store (for user tracking)
  const cells = useSelector((state) => state.projectDetails.cells);

  const dispatch = useDispatch();

  // local state variable for the section time estimate
  const [sectionTimeEstimate, setSectionTimeEstimate] = useState(0);

  // set the time estimate as the sum of the cell time estimates
  useEffect(() => {
    let timeEstimate = 0;
    Object.values(cells).forEach((cell) => {
      if (cell.section_index === section.id) {
        timeEstimate += cell.time_estimate;
      }
    });
    // round to 1 decimal place
    timeEstimate = Math.round(timeEstimate * 10) / 10;
    setSectionTimeEstimate(timeEstimate);
  }, [cells, section.id]);

  // local state variable for the section name
  const [sectionName, setSectionName] = useState("");

  // set the section name from the Redux store
  useEffect(() => {
    setSectionName(section.title);
  }, [section.title]);

  // function to edit the section name (using local state)
  const handleEditLocalSectionName = (e) => {
    setSectionName(e.target.value);
  };

  // function to edit the section name (using only the Redux store)
  const handleEditGlobalSectionName = (e) => {
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "editSectionName",
        eventDetail: {
          previous_section_name: section.title,
          new_section_name: e.target.value,
        },
      })
    );
    dispatch(
      editSectionName({
        section_index: props.number,
        new_section_name: e.target.value,
      })
    );
  };

  // state variable for the dialog box
  const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);

  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // function to delete the section
  const handleDeleteSection = () => {
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "deleteSection",
        eventDetail: {
          deleted_section: section,
          deleted_cells: Object.values(cells).filter(
            (cell) => cell.section_index === section.id
          ),
        },
      })
    );
    // console.log("Delete Section");
    dispatch(deleteSection({ section_id: section.id }));
    handleCloseDeleteDialog();
  };

  // // for testing only
  // useEffect(() => {
  //     console.log(section);
  // }, [section]);

  return (
    <ThemeProvider theme={theme}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          paddingBottom: 1,
          width: { md: "100%", xl: "90%" },
        }}
      >
        {/* Create section title with input for props.text value */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={"flex-start"}
          spacing={0}
          ref={props.sectionRef}
          sx={{ width: "100%" }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              minWidth: `10ch`,
              m: 0,
            }}
          >
            Section {props.number + 1}:
          </Typography>
          {/* LOW PRIORITY BUG: maxWidth in Input is not big enough for larger screens */}
          <Input
            id={"section-name-" + props.number.toString()}
            autoFocus={section.title === "New Section" ? true : false}
            // defaultValue={section.title}
            value={sectionName}
            fullWidth
            margin="dense"
            multiline={true}
            sx={{ typography: "h6", mr: 0.5 }}
            onChange={handleEditLocalSectionName}
            onBlur={handleEditGlobalSectionName}
          />
          <Typography
            variant="h6"
            component="div"
            sx={{ m: 0, minWidth: `15ch` }}
          >
            ( ~ {sectionTimeEstimate}{" "}
            {sectionTimeEstimate === 1 ? "minute" : "minutes"})
          </Typography>
        </Stack>
        {/* triple dot */}
        {/* LOW PRIORITY TODO: could add merge and duplicate */}
        <MoreMenu items={["Delete"]} clickHandlers={[handleOpenDeleteDialog]} />
      </Stack>
      {/* Delete Dialog */}
      <ConfirmationDialog
        openDialog={openDeleteDialog}
        handleCloseDialog={handleCloseDeleteDialog}
        handleConfirm={handleDeleteSection}
        dialogTitle={"Confirm Section Deletion"}
        dialogContent={
          "Section " + (props.number + 1) + " will be permanently deleted."
        }
        confirmText={"Delete Section"}
        cancelText={"Cancel"}
      />
    </ThemeProvider>
  );
}

export default SectionHeader;
