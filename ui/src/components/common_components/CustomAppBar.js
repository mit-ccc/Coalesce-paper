import React, { useState, useEffect } from "react";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import { Stack } from "@mui/material";
import { Button } from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import Tooltip from "@mui/material/Tooltip";
import Input from "@mui/material/Input";

import MenuIcon from "@mui/icons-material/Menu";
import HelpIcon from "@mui/icons-material/Help";
import AccountCircle from "@mui/icons-material/AccountCircle";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SaveIcon from "@mui/icons-material/Save";
import SummarizeIcon from "@mui/icons-material/Summarize";
import AssessmentIcon from "@mui/icons-material/Assessment";

import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import useMediaQuery from "@mui/material/useMediaQuery";

import HelpGuideDialog from "./HelpGuideDialog";
import ProjectContext from "../workspace_components/ProjectContext";
import EndTaskDialog from "../workspace_components/EndTaskDialog";
import AnalyzeTopics from "../ai_assistance_components/AnalyzeTopics";
import {
  saveProjectDetails,
  saveProjectContext,
  saveAnalyzeTopics,
} from "../../utils";

// routing
import { useNavigate } from "react-router-dom";

// redux stuff
import { useSelector, useDispatch } from "react-redux";
import { addEvent } from "../../store/userTrackingSlice";
import {
  resetCellHistory,
  editProjectTitle,
} from "../../store/projectDetailsSlice";
import { resetEdited } from "../../store/projectContextSlice";
import { resetNeedToSave } from "../../store/analyzeTopicsSlice";
import { setLastSaved, editProject } from "../../store/userProjectsSlice";

//   Set style for AppBar component
const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open, topheight }) => ({
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginTop: `${topheight}px`,
  // height: `theme.height+ ${topheight}px`,
  zIndex: theme.zIndex.drawer + 1,
  ...(open && {
    //   width: `calc(100% - ${drawerWidth}px)`,
    //   marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

function CustomAppBar(props) {
  const navigate = useNavigate();

  const dispatch = useDispatch();

  // variable to keep track of whether the screen is small
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg")); // [0, md) or [0, 900px)

  // // for testing only, print isSmallScreen
  // useEffect(() => {
  //   console.log("isSmallScreen: ", isSmallScreen);
  // }, [isSmallScreen]);

  // get project_id from projectDetailsSlice
  const projectId = useSelector((state) => state.projectDetails.project_id);

  // state variable to keep track of whether user is logged in
  const [auth, setAuth] = useState(false);

  // set auth to true if the user code is already in the global state
  useEffect(() => {
    if (props.userCode) {
      setAuth(true);
    }
  }, [props.userCode]);

  // state variable for user profile menu
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleViewProjectsClick = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: "user_level",
        eventType: "navigateToProjectsPage",
        eventDetail: {},
      })
    );
    navigate(`/projects`);
  };

  const handleGoToHome = () => {
    // add event to userTrackingSlice
    if (auth) {
      dispatch(
        addEvent({
          projectId: "user_level",
          eventType: "navigateToHomePage",
          eventDetail: {},
        })
      );
    }
    navigate(`/`);
  };

  // state variable for project context dialog
  const [openProjectContext, setOpenProjectContext] = useState(false);

  const handleOpenProjectContext = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "openContextPage",
        eventDetail: {},
      })
    );
    setOpenProjectContext(true);
  };

  const handleCloseProjectContext = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "closeContextPage",
        eventDetail: {},
      })
    );
    setOpenProjectContext(false);
  };

  // state variable for end task dialog
  const [openEndTask, setOpenEndTask] = useState(false);

  const handleOpenEndTask = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "openEndTaskPage",
        eventDetail: {},
      })
    );
    setOpenEndTask(true);
  };

  const handleCloseEndTask = () => {
    setOpenEndTask(false);
  };

  // state variable for analyze topics dialog
  const [openAnalyzeTopics, setOpenAnalyzeTopics] = useState(false);

  const handleOpenAnalyzeTopics = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "openAnalyzeTopics",
        eventDetail: {},
      })
    );
    setOpenAnalyzeTopics(true);
  };

  const handleCloseAnalyzeTopics = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "closeAnalyzeTopics",
        eventDetail: {},
      })
    );
    setOpenAnalyzeTopics(false);
  };

  // state variable for help guide dialog
  const [openHelpGuide, setOpenHelpGuide] = useState(false);

  const handleOpenHelpGuide = () => {
    // add event to userTrackingSlice
    if (auth) {
      dispatch(
        addEvent({
          projectId: "user_level",
          eventType: "openHelpGuide",
          eventDetail: {
            app_bar_type: props.appBarType,
          },
        })
      );
    }
    setOpenHelpGuide(true);
  };

  const handleCloseHelpGuide = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: "user_level",
        eventType: "closeHelpGuide",
        eventDetail: {
          app_bar_type: props.appBarType,
        },
      })
    );
    setOpenHelpGuide(false);
  };

  // code for the save button
  const [saving, setSaving] = useState(false);

  // get all the necessary info from the redux store
  const projectDetails = useSelector((state) => state.projectDetails);
  const projectContext = useSelector((state) => state.projectContext);
  const analyzeTopics = useSelector((state) => state.analyzeTopics);

  const lastSaved = useSelector((state) => state.userProjects.lastSaved);

  // state variable for minutes since last save
  const [secondsSinceLastSave, setSecondsSinceLastSave] = useState(null);

  // function to calculate the minutes since last save
  const findSecondsSinceLastSave = (lastSaved) => {
    if (lastSaved !== "") {
      const lastSavedTime = new Date(lastSaved);
      const currentTime = new Date();
      const diff = currentTime - lastSavedTime;
      // const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor(diff / 1000);
      setSecondsSinceLastSave(seconds);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: "user_level",
        eventType: "saveData",
        eventDetail: {
          app_bar_type: props.appBarType,
        },
      })
    );
    const timeStamp = new Date().toISOString();
    let projectDetailsStatus = "nan";
    let projectContextStatus = "nan";
    let analyzeTopicsStatus = "nan";

    // await on all the save functions
    await Promise.all([
      saveProjectDetails(projectDetails),
      saveProjectContext(projectContext),
      saveAnalyzeTopics(analyzeTopics, projectId),
    ]).then((results) => {
      projectDetailsStatus = results[0];
      projectContextStatus = results[1];
      analyzeTopicsStatus = results[2];
    });

    // console.log("Project details status: ", projectDetailsStatus);
    // console.log("Project context status: ", projectContextStatus);
    // console.log("Analyze topics status: ", analyzeTopicsStatus);

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
      dispatch(setLastSaved(timeStamp));
    }
    setSaving(false);
  };

  // code for editing the project title

  // local state variable for project title
  const [title, setTitle] = useState("");

  // set the title from props
  useEffect(() => {
    setTitle(props.title);
  }, [props.title]);

  // // for testing only, print props.title
  // useEffect(() => {
  //   console.log("Title: ", props.title);
  // }, [props.title]);

  // function to edit the project name (using local state)
  const handleEditLocalTitle = (e) => {
    setTitle(e.target.value);
  };

  // function to edit the section name (using only the Redux store)
  const handleEditGlobalTitle = (e) => {
    // console.log("Editing title to: ", e.target.value);
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "editProjectTitle",
        eventDetail: {
          previous_project_title: props.title,
          new_project_title: e.target.value,
        },
      })
    );
    // update project_title in userProjectsSlice
    dispatch(
      editProject({
        project_id: projectId,
        project_title: e.target.value,
      })
    );
    // update project_title in projectDetailsSlice
    dispatch(
      editProjectTitle({
        project_title: e.target.value,
      })
    );
  };

  return (
    <ThemeProvider theme={theme}>
      {props.appBarType === "surveyBuilder" && (
        <Box sx={{ flexGrow: 1 }}>
          <AppBar
            ref={props.appBarRef}
            position="fixed"
            open={props.open}
            topheight={0}
            // set the maximum height of the AppBar
            sx={{
              maxHeight: "64px",
              width: "100%",
            }}
          >
            <Toolbar
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Stack
                direction="row"
                alignItems={"center"}
                justifyContent={"flex-start"}
                sx={{ width: "100%" }}
              >
                <IconButton
                  variant="appBar"
                  aria-label="open drawer"
                  onClick={props.handleToggleDrawer}
                  edge="start"
                  sx={{
                    mr: 1.5,
                  }}
                >
                  <MenuIcon />
                </IconButton>
                {/* <Typography
                  variant={props.title.length > 40 ? "body1" : "h6"}
                  component="div"
                  // wrap title if it is too long but without going beyond the AppBar
                  sx={{
                    flexGrow: 1,
                    maxHeight: "64px",
                    maxWidth: "100%",
                    overflowX: "hidden",
                    overflowY: "scroll",
                    mr: 1.5,
                    // style the scrollbar to make it more subtle
                    "&::-webkit-scrollbar": {
                      width: "0.4em",
                    },
                    "&::-webkit-scrollbar-track": {
                      boxShadow: "inset 0 0 6px rgba(0,0,0,0.00)",
                      webkitBoxShadow: "inset 0 0 6px rgba(0,0,0,0.00)",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "white",
                    },
                  }}
                >
                  {props.title}
                </Typography> */}
                <Input
                  value={title}
                  fullWidth
                  onChange={handleEditLocalTitle}
                  onBlur={handleEditGlobalTitle}
                  margin="dense"
                  disableUnderline
                  multiline={true}
                  maxRows={2}
                  sx={{
                    color: "white",
                    mr: 1.5,
                    typography: title.length > 40 ? "body1" : "h6",
                  }}
                />
              </Stack>
              <Stack
                direction="row"
                alignItems={"center"}
                justifyContent={"flex-end"}
              >
                {!isSmallScreen && (
                  <Stack direction="row" spacing={2} alignItems={"center"}>
                    <Button
                      color="inherit"
                      onClick={handleOpenAnalyzeTopics}
                      sx={{ minWidth: "170px" }}
                      startIcon={<AssessmentIcon />}
                    >
                      Topic Analysis
                    </Button>
                    <Button
                      color="inherit"
                      onClick={handleOpenProjectContext}
                      sx={{ minWidth: "200px" }}
                      startIcon={<SummarizeIcon />}
                    >
                      Project Overview
                    </Button>
                    {/* Add save button */}
                    <Tooltip
                      title={
                        secondsSinceLastSave !== null
                          ? `Last saved ${secondsSinceLastSave} seconds ago`
                          : "Data not saved yet"
                      }
                      placement="bottom"
                    >
                      <span>
                        <LoadingButton
                          onClick={handleSave}
                          loading={saving}
                          loadingPosition="start"
                          startIcon={<SaveIcon />}
                          variant="appBarButton"
                          // override the background color of the button when disabled
                          sx={{
                            ":disabled": {
                              backgroundColor: "transparent",
                              color: "white",
                            },
                            minWidth: "90px",
                          }}
                          onPointerEnter={() =>
                            findSecondsSinceLastSave(lastSaved)
                          }
                        >
                          <span>Save</span>
                        </LoadingButton>
                      </span>
                    </Tooltip>
                    {/* Add end task button */}
                    <Button
                      color="inherit"
                      startIcon={<AssignmentTurnedInIcon />}
                      onClick={handleOpenEndTask}
                      sx={{
                        minWidth: "95px",
                      }}
                    >
                      Finish
                    </Button>
                  </Stack>
                )}
                <Stack
                  direction="row"
                  spacing={0}
                  sx={{ ml: 1 }}
                  alignItems={"center"}
                >
                  {isSmallScreen && (
                    <>
                      <Tooltip title="Topic Analysis">
                        <IconButton
                          variant="appBar"
                          onClick={handleOpenAnalyzeTopics}
                        >
                          <AssessmentIcon fontSize="large" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Project Overview">
                        <IconButton
                          variant="appBar"
                          onClick={handleOpenProjectContext}
                        >
                          <SummarizeIcon fontSize="large" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          secondsSinceLastSave !== null
                            ? `Last saved ${secondsSinceLastSave} seconds ago`
                            : "Data not saved yet"
                        }
                        placement="bottom"
                      >
                        <IconButton
                          variant="appBar"
                          onClick={handleSave}
                          onPointerEnter={() =>
                            findSecondsSinceLastSave(lastSaved)
                          }
                        >
                          <SaveIcon fontSize="large" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Finish Project">
                        <IconButton
                          variant="appBar"
                          onClick={handleOpenEndTask}
                        >
                          <AssignmentTurnedInIcon fontSize="large" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip title="Help Guide">
                    <IconButton variant="appBar" onClick={handleOpenHelpGuide}>
                      <HelpIcon fontSize="large" />
                    </IconButton>
                  </Tooltip>
                  {/* Add profile icon here */}
                  {auth && (
                    <>
                      <IconButton onClick={handleMenu} variant="appBar">
                        <AccountCircle fontSize="large" />
                      </IconButton>
                      <Menu
                        id="menu-appbar"
                        anchorEl={anchorEl}
                        keepMounted
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                      >
                        <MenuItem onClick={handleViewProjectsClick}>
                          My Projects
                        </MenuItem>
                      </Menu>
                    </>
                  )}
                </Stack>
              </Stack>
            </Toolbar>
          </AppBar>
        </Box>
      )}
      {props.appBarType !== "surveyBuilder" && (
        <Box sx={{ flexGrow: 1 }}>
          <AppBar
            ref={props.appBarRef}
            position="fixed"
            topheight={0}
            color={props.appBarType === "home" ? "transparent" : "primary"}
          >
            <Toolbar>
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{ flexGrow: 1, cursor: "pointer" }}
                onClick={handleGoToHome}
              >
                Coalesce
              </Typography>
              {/* Add save button */}
              {props.appBarType !== "home" && (
                <Tooltip
                  title={
                    secondsSinceLastSave !== null
                      ? `Last saved ${secondsSinceLastSave} seconds ago`
                      : "Data not saved yet"
                  }
                  placement="bottom"
                >
                  <span>
                    <LoadingButton
                      onClick={handleSave}
                      loading={saving}
                      loadingPosition="start"
                      startIcon={<SaveIcon />}
                      variant="appBarButton"
                      // override the background color of the button when disabled
                      sx={{
                        ":disabled": {
                          backgroundColor: "transparent",
                          color: "white",
                        },
                      }}
                      onPointerEnter={() => findSecondsSinceLastSave(lastSaved)}
                    >
                      <span>Save</span>
                    </LoadingButton>
                  </span>
                </Tooltip>
              )}
              <Tooltip title="Help Guide">
                <IconButton
                  variant={
                    props.appBarType === "home" ? "appBarHome" : "appBar"
                  }
                  onClick={handleOpenHelpGuide}
                >
                  <HelpIcon fontSize="large" />
                </IconButton>
              </Tooltip>
              {/* Add profile icon here */}
              {auth && (
                <div>
                  <IconButton
                    aria-label="account of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    onClick={handleMenu}
                    variant={
                      props.appBarType === "home" ? "appBarHome" : "appBar"
                    }
                  >
                    <AccountCircle fontSize="large" />
                  </IconButton>
                  <Menu
                    id="menu-appbar"
                    anchorEl={anchorEl}
                    anchorOrigin={{
                      vertical: "top",
                      horizontal: "right",
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: "top",
                      horizontal: "right",
                    }}
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                  >
                    <MenuItem onClick={handleViewProjectsClick}>
                      My Projects
                    </MenuItem>
                  </Menu>
                </div>
              )}
            </Toolbar>
          </AppBar>
        </Box>
      )}
      <ProjectContext
        open={openProjectContext}
        handleClose={handleCloseProjectContext}
      />
      <AnalyzeTopics
        open={openAnalyzeTopics}
        handleClose={handleCloseAnalyzeTopics}
      />
      <EndTaskDialog open={openEndTask} handleClose={handleCloseEndTask} />
      <HelpGuideDialog
        open={openHelpGuide}
        handleClose={handleCloseHelpGuide}
        tab={props.helpGuideTab}
      />
    </ThemeProvider>
  );
}

export default CustomAppBar;
