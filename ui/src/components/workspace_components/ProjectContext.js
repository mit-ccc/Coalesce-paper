import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import Stack from "@mui/material/Stack";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Slide from "@mui/material/Slide";
import Tooltip from "@mui/material/Tooltip";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HelpIcon from "@mui/icons-material/Help";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { addEvent } from "../../store/userTrackingSlice";

import HelpGuideDialog from "../common_components/HelpGuideDialog";
import ContextQuestion from "../start_components/ContextQuestion";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function ProjectContext(props) {
  // page where users can access the project context (button in the app bar)
  // props include open and handleClose

  const dispatch = useDispatch();

  // get the context from the projectContextSlice
  const context = useSelector((state) => state.projectContext.context);

  // get the project_id from the projectDetailsSlice
  const project_id = useSelector((state) => state.projectDetails.project_id);

  // CODE FOR HELP GUIDE DIALOG
  // state variable for help guide dialog
  const [openHelpGuide, setOpenHelpGuide] = useState(false);

  const handleOpenHelpGuide = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: "user_level",
        eventType: "openHelpGuide",
        eventDetail: {
          app_bar_type: "projectOverview",
        },
      })
    );
    setOpenHelpGuide(true);
  };

  const handleCloseHelpGuide = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: "user_level",
        eventType: "closeHelpGuide",
        eventDetail: {
          app_bar_type: "projectOverview",
        },
      })
    );
    setOpenHelpGuide(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <Dialog
        fullScreen
        open={props.open}
        onClose={props.handleClose}
        TransitionComponent={Transition}
      >
        <AppBar sx={{ position: "relative" }}>
          <Toolbar>
            <IconButton
              edge="start"
              onClick={props.handleClose}
              aria-label="close"
              variant="appBar"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Back
            </Typography>
            <Tooltip title="Help Guide">
              <IconButton variant="appBar" onClick={handleOpenHelpGuide}>
                <HelpIcon fontSize="large" />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <Stack
          direction="column"
          justifyContent="flex-start"
          alignItems="flex-start"
          spacing={5}
          style={{
            padding: 50,
          }}
        >
          <Typography variant="h5">Project Overview</Typography>

          {Object.keys(context).map((question_id, index) => {
            return (
              <ContextQuestion
                key={index}
                question_id={Number(question_id)}
                is_disabled={true}
                show_warnings_and_errors={false}
                show_check_response_button={false}
                question_number={index + 1}
              />
            );
          })}
        </Stack>
        <HelpGuideDialog
          open={openHelpGuide}
          handleClose={handleCloseHelpGuide}
          tab={"project_general"}
        />
      </Dialog>
    </ThemeProvider>
  );
}

export default ProjectContext;
