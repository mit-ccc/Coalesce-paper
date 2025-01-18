import React, { useState, useEffect, useRef } from "react";
import Dialog from "@mui/material/Dialog";
import Stack from "@mui/material/Stack";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Slide from "@mui/material/Slide";
import { Button } from "@mui/material";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Link from "@mui/material/Link";
import Avatar from "@mui/material/Avatar";

// import HelpGuideDialog.css
import "./HelpGuideDialog.css";

// video player
import ReactPlayer from "react-player";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SummarizeIcon from "@mui/icons-material/Summarize";
import AssessmentIcon from "@mui/icons-material/Assessment";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import FlagIcon from "@mui/icons-material/Flag";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <>{children}</>
        </Box>
      )}
    </div>
  );
}

function HelpGuideDialog(props) {
  // CODE FOR TABS
  // props includes which tab to show first

  // local state variable for which page to show
  const [tabValue, setTabValue] = useState("welcome");

  // function to handle the change in tabs
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // useEffect to set the tab value to the one passed in props
  useEffect(() => {
    // console.log("props.tab", props.tab);
    setTabValue(props.tab);
  }, [props.tab]);

  // CODE FOR VIDEO

  // state variable for whether to play the video
  const [play, setPlay] = useState(false);

  // function to play the video
  const playVideo = () => {
    setPlay(true);
  };

  // function to pause the video
  const pauseVideo = () => {
    setPlay(false);
  };

  // create a ref for the top of the page
  const topOfPage = useRef(null);

  // create ref for the video player
  const videoPlayer = useRef(null);

  // function to play video from a start time to an end time
  const playParticularTime = (startTime, endTime) => {
    // scroll to the top of the page
    topOfPage.current.scrollIntoView({ behavior: "smooth" });
    videoPlayer.current.seekTo(startTime, "seconds");
    setPlay(true);
    // // pause the video after the end time
    // setTimeout(() => {
    //   setPlay(false);
    // }, (endTime - startTime + 1) * 1000);
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
          </Toolbar>
        </AppBar>
        <Stack
          direction="column"
          justifyContent="flex-start"
          alignItems="flex-start"
          spacing={3}
          style={{
            padding: 50,
          }}
        >
          <Typography variant="h5" ref={topOfPage}>
            Help Guide
          </Typography>
          <Box
            sx={{
              width: "100%",
            }}
          >
            <div className="player-wrapper">
              <ReactPlayer
                className="react-player"
                ref={videoPlayer}
                url="https://youtu.be/03vF_7Heq0s"
                controls={true}
                playing={play}
                onPlay={playVideo}
                onPause={pauseVideo}
                onEnded={pauseVideo}
                width="100%"
                height="100%"
              />
            </div>
          </Box>
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              // height: 224,
            }}
          >
            <Tabs
              orientation="vertical"
              value={tabValue}
              onChange={handleTabChange}
              sx={{
                borderRight: 1,
                borderColor: "divider",
                // don't change the width of the tabs
                minWidth: "230px",
              }}
            >
              <Tab label="Welcome Page" value="welcome" />
              <Tab label="Project Launch Page" value="project_launch" />
              <Tab label="Project Page - AI" value="project_ai" />
              <Tab label="Project Page - General" value="project_general" />
              <Tab label="Topic Analysis Page" value="topic_analysis" />
              <Tab label="User Page" value="user_page" />
            </Tabs>
            <TabPanel value={tabValue} index="welcome">
              <Stack
                direction="column"
                justifyContent="flex-start"
                alignItems="flex-start"
                spacing={3}
              >
                <Typography variant="body1">
                  <b>Input user code</b>: please enter the unique user code you
                  received by email. Reach out to ccc-coalesce@media.mit.edu if
                  you see the
                  <Typography color="error" component={"span"}>
                    {" "}
                    Invalid user code{" "}
                  </Typography>
                  error message.{" "}
                  <Link
                    onClick={() => playParticularTime(10, 15)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 0:10 to 0:15
                  </Link>
                </Typography>
              </Stack>
            </TabPanel>
            <TabPanel value={tabValue} index="project_launch">
              <Stack
                direction="column"
                justifyContent="flex-start"
                alignItems="flex-start"
                spacing={3}
              >
                <Typography variant="body1">
                  <b>Verify question</b>: click on a{" "}
                  <Button variant="outlined" size="small">
                    VERIFY QUESTION
                  </Button>{" "}
                  button to get optional suggestions on how to improve responses
                  to the project launch questions, so the AI can generate a
                  better draft.{" "}
                  <Link
                    onClick={() => playParticularTime(1 * 60, 1 * 60 + 21)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 1:00 to 1:21
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Create project</b>: click on the{" "}
                  <Button variant="contained" size="small">
                    CREATE PROJECT
                  </Button>{" "}
                  button at the bottom of the page to submit your project
                  information and create an initial draft of questions.{" "}
                  <Link
                    onClick={() => playParticularTime(1 * 60 + 27, 1 * 60 + 36)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 1:27 to 1:36
                  </Link>
                </Typography>
              </Stack>
            </TabPanel>
            <TabPanel value={tabValue} index="project_ai">
              <Stack
                direction="column"
                justifyContent="flex-start"
                alignItems="flex-start"
                spacing={3}
              >
                <Typography variant="body1">
                  <b>Check a question for issues</b>: click on the{" "}
                  <IconButton size="small">
                    <SearchIcon fontSize="small" />
                  </IconButton>{" "}
                  icon at the bottom of a question to check a question for any
                  issues in readability, bias, or specificity. Potential issues
                  will be flagged with a red dot. You can navigate through the
                  tab bar to view customized AI-generated explanations for why a
                  question was flagged. Expand the “Improvement Suggestions”
                  accordion to view alternative questions.{" "}
                  <Link
                    onClick={() => playParticularTime(6 * 60 + 3, 6 * 60 + 46)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 6:03 to 6:46
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Generate alternative questions</b>: click on the{" "}
                  <IconButton size="small">
                    <TipsAndUpdatesIcon fontSize="small" />
                  </IconButton>{" "}
                  icon at the bottom of a question to generate alternative
                  wordings. Through this feature, you can also generate
                  rewordings with a specific request.{" "}
                  <Link
                    onClick={() => playParticularTime(6 * 60 + 47, 7 * 60 + 43)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 6:47 to 7:43
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Switch the response format</b>: click on the “Response
                  Format” dropdown at the bottom of a question to switch the
                  response format from open to closed or vice versa.{" "}
                  <Link
                    onClick={() => playParticularTime(8 * 60 + 20, 8 * 60 + 49)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 8:20 to 8:49
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Open topic analysis page</b>: click on the the{" "}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AssessmentIcon />}
                  >
                    TOPIC ANALYSIS
                  </Button>{" "}
                  button in the app bar to open the topic analysis page.{" "}
                  <Link
                    onClick={() => playParticularTime(9 * 60 + 46, 9 * 60 + 54)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 9:46 to 9:54
                  </Link>
                </Typography>
              </Stack>
            </TabPanel>
            <TabPanel value={tabValue} index="project_general">
              <Stack
                direction="column"
                justifyContent="flex-start"
                alignItems="flex-start"
                spacing={3}
              >
                <Typography variant="body1">
                  <b>Open project overview page</b>: click on the{" "}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SummarizeIcon />}
                  >
                    PROJECT OVERVIEW
                  </Button>{" "}
                  button in the app bar to view all information that was
                  submitted when creating a new project.{" "}
                  <Link
                    onClick={() => playParticularTime(2 * 60 + 50, 3 * 60 + 0)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 2:50 to 3:00
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Add sections or cells</b>: click on the{" "}
                  <IconButton size="small">
                    <Avatar
                      variant="button"
                      sx={{
                        height: 25,
                        width: 25,
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </Avatar>
                  </IconButton>{" "}
                  button at the bottom of the left panel to add a section to the
                  bottom.{" "}
                  <Link
                    onClick={() => playParticularTime(4 * 60 + 33, 4 * 60 + 43)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 4:33 to 4:43.
                  </Link>{" "}
                  Click on the{" "}
                  <IconButton size="small">
                    <Avatar
                      variant="button"
                      sx={{
                        height: 25,
                        width: 25,
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </Avatar>
                  </IconButton>{" "}
                  button at the bottom of each section to add a text or question
                  cell to that section.{" "}
                  <Link
                    onClick={() => playParticularTime(5 * 60 + 7, 5 * 60 + 17)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 5:07 to 5:17
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Move sections or cells</b>: click on an{" "}
                  <IconButton size="small" variant="secondary">
                    <DragIndicatorIcon fontSize="small" />
                  </IconButton>{" "}
                  button in the left panel and then drag to move a section.{" "}
                  <Link
                    onClick={() => playParticularTime(4 * 60 + 51, 5 * 60 + 7)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 4:51 to 5:07.
                  </Link>{" "}
                  Click on an{" "}
                  <IconButton size="small" variant="secondary">
                    <DragIndicatorIcon fontSize="small" />
                  </IconButton>{" "}
                  button on the right side of a text or question cell and then
                  drag to move the cell.{" "}
                  <Link
                    onClick={() => playParticularTime(8 * 60 + 50, 9 * 60 + 9)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 8:50 to 9:09
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Duplicate a cell</b>: click on the{" "}
                  <IconButton size="small" variant="secondary">
                    <MoreVertIcon fontSize="small" />
                  </IconButton>{" "}
                  button at the bottom of a text or question cell to duplicate
                  it.{" "}
                  <Link
                    onClick={() => playParticularTime(9 * 60 + 10, 9 * 60 + 21)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 9:10 to 9:21
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Delete a section</b>: click on the{" "}
                  <IconButton size="small" variant="secondary">
                    <MoreVertIcon fontSize="small" />
                  </IconButton>{" "}
                  button to the right of the section header to delete a section.{" "}
                  <Link
                    onClick={() => playParticularTime(9 * 60 + 31, 9 * 60 + 45)}
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 9:31 to 9:45
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Finish project</b>: click on the{" "}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AssignmentTurnedInIcon />}
                  >
                    FINISH
                  </Button>{" "}
                  button in the app bar to view the final set of questions and
                  exit the project page.{" "}
                  <Link
                    onClick={() =>
                      playParticularTime(14 * 60 + 23, 14 * 60 + 40)
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 14:23 to 14:40
                  </Link>
                </Typography>
              </Stack>
            </TabPanel>
            <TabPanel value={tabValue} index="topic_analysis">
              <Stack
                direction="column"
                justifyContent="flex-start"
                alignItems="flex-start"
                spacing={3}
              >
                <Typography variant="body1">
                  <b>Edit topics</b>: click on the{" "}
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      padding: 0,
                      paddingLeft: 1,
                      paddingRight: 1,
                    }}
                  >
                    EDIT TOPICS
                  </Button>{" "}
                  button below the bar graph to delete or add topics to the bar
                  graph. Click on the{" "}
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      padding: 0,
                      paddingLeft: 1,
                      paddingRight: 1,
                    }}
                  >
                    UPDATE TOPIC ANALYSIS
                  </Button>{" "}
                  button to re-classify the questions.{" "}
                  <Link
                    onClick={() =>
                      playParticularTime(10 * 60 + 56, 11 * 60 + 32)
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 10:56 to 11:32
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Navigate to a topic</b>: click on a block of color in the
                  bar graph to view the questions under that topic and also use
                  AI to generate addition or deletion suggestions.{" "}
                  <Link
                    onClick={() =>
                      playParticularTime(11 * 60 + 45, 11 * 60 + 54)
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 11:45 to 11:54
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Generate suggestions for questions to delete</b>: click on
                  the{" "}
                  <Button variant="contained" size="small">
                    SUGGEST DELETIONS
                  </Button>{" "}
                  button to generate possible questions to remove from a
                  particular topic. Expand the “Suggestions for Deletion”
                  accordion to view AI recommendations for questions to delete,
                  along with a customized explanation and estimate for how much
                  time would be saved.{" "}
                  <Link
                    onClick={() =>
                      playParticularTime(11 * 60 + 54, 12 * 60 + 18)
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 11:54 to 12:18
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Generate suggestions for new questions</b>: click on the{" "}
                  <Button variant="contained" size="small">
                    SUGGEST ADDITIONS
                  </Button>{" "}
                  button to generate possible questions to add to a particular
                  topic. Expand the “Suggestions for Addition” accordion to view
                  the AI-generated questions, along with a customized
                  explanation, initial time estimate, and a recommendation for
                  which section to add the question to.{" "}
                  <Link
                    onClick={() =>
                      playParticularTime(12 * 60 + 35, 13 * 60 + 29)
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 12:35 to 13:29
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Edit questions</b>: click on the{" "}
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      padding: 0,
                      paddingLeft: 1,
                      paddingRight: 1,
                    }}
                  >
                    EDIT
                  </Button>{" "}
                  button at the top right corner of a question to edit the
                  question text, description, response categories, and/or time
                  estimate. Save your changes by clicking on the{" "}
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      padding: 0,
                      paddingLeft: 1,
                      paddingRight: 1,
                    }}
                  >
                    SAVE
                  </Button>{" "}
                  button.{" "}
                  <Link
                    onClick={() =>
                      playParticularTime(13 * 60 + 42, 14 * 60 + 1)
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 13:42 to 14:01
                  </Link>
                </Typography>
                <Typography variant="body1">
                  <b>Modify topics for a question</b>: click on the{" "}
                  <IconButton size="small">
                    <FlagIcon fontSize="small" />
                  </IconButton>{" "}
                  icon at the bottom of a question to edit which topics the
                  question is part of.{" "}
                  <Link
                    onClick={() =>
                      playParticularTime(14 * 60 + 1, 14 * 60 + 11)
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 14:01 to 14:11
                  </Link>
                </Typography>
              </Stack>
            </TabPanel>
            <TabPanel value={tabValue} index="user_page">
              <Stack
                direction="column"
                justifyContent="flex-start"
                alignItems="flex-start"
                spacing={3}
              >
                <Typography variant="body1">
                  <b>Delete a project</b>: click on the{" "}
                  <IconButton size="small" variant="secondary">
                    <MoreVertIcon fontSize="small" />
                  </IconButton>{" "}
                  button to the right of a project’s title to delete a project.{" "}
                  <Link
                    onClick={() =>
                      playParticularTime(14 * 60 + 52, 14 * 60 + 56)
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    Watch the tutorial from 14:52 to 14:56
                  </Link>
                </Typography>
              </Stack>
            </TabPanel>
          </Box>
        </Stack>
      </Dialog>
    </ThemeProvider>
  );
}

export default HelpGuideDialog;
