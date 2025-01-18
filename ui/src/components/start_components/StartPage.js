import React, { useState, useEffect } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { Typography } from "@mui/material";
import TextField from "@mui/material/TextField";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";
import background from "../../images/welcome_page_background.svg";

// routing
import { useNavigate } from "react-router-dom";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { setProjects, addProject } from "../../store/userProjectsSlice";
import { initProjectContext } from "../../store/projectContextSlice";
import { setProjectDetails } from "../../store/projectDetailsSlice";
import { addEvent } from "../../store/userTrackingSlice";

import CustomAppBar from "../common_components/CustomAppBar";
import { timeoutPromise } from "../../utils";
import ErrorDialog from "../common_components/ErrorDialog";

function StartPage(props) {
  // welcome and log-in page

  const navigate = useNavigate();

  const dispatch = useDispatch();

  // state variable to keep track of the user code input
  const [userCode, setUserCode] = React.useState("");

  // set userCode to the global user code if it exists
  useEffect(() => {
    if (props.userCode) {
      setUserCode(props.userCode);
    }
  }, [props.userCode]);

  // state variable to keep track of whether there is an error with the user code input
  const [userCodeError, setUserCodeError] = React.useState(false);

  // start variable to determine whether to show the view projects or create new project buttons
  const [loggedIn, setLoggedIn] = React.useState(false);

  // get the list of user projects from the store
  const projects = useSelector((state) => state.userProjects.projects);

  // set loggIn to true if the user code is already in the global state
  useEffect(() => {
    if (props.userCode) {
      setLoggedIn(true);
      // if projects in userProjectsSlice is empty, get the projects for the user
      if (projects.length === 0) {
        handleLogIn(props.userCode);
      }
    }
  }, [props.userCode]);

  // function to remove leading and trailing whitespace from user code input
  const trimUserCode = (userCode) => {
    return userCode.trim();
  };

  // log-in button click handler
  const handleLogIn = (userCodeInput) => {
    const trimmedUserCode = trimUserCode(userCodeInput);
    // verify user code and get the projects for the user
    let data = {
      user_code: trimmedUserCode,
    };

    timeoutPromise(
      5000,
      fetch("/api/log_in", {
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
        setUserCodeError(false);
        // set the global user code
        props.setUserCode(trimmedUserCode);
        // update the userProjects store
        dispatch(setProjects(data["projects"]));
      })
      .catch((_error) => {
        console.error("Invalid user code");
        // display error message
        setUserCodeError(true);
      });
  };

  const handleViewProjectsClick = () => {
    // console.log("View projects button clicked");
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: "user_level",
        eventType: "viewProjectsFromStartPage",
        eventDetail: {},
      })
    );
    navigate(`/projects`);
  };

  // state variable for error message
  const [serverError, setServerError] = useState(false);

  // function to close the server error dialog
  const handleCloseServerError = () => {
    setServerError(false);
  };

  const handleCreateProjectClick = () => {
    // console.log("Create project button clicked");
    // call the create_project API
    timeoutPromise(
      5000,
      fetch("/api/create_project", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_code: props.userCode }),
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
        // add event to userTrackingSlice
        dispatch(
          addEvent({
            projectId: "user_level",
            eventType: "createProjectFromStartPage",
            eventDetail: {
              project_id: data.project_id,
            },
          })
        );
        // update the projects field in userProjectsSlice
        dispatch(
          addProject({
            project_id: data.project_id,
            project_title: data.project_title,
          })
        );
        // update the project_id field in projectContextSlice
        dispatch(
          initProjectContext({
            project_id: data.project_id,
            context_questions: data.questions,
          })
        );
        // update projectDetailsSlice
        dispatch(
          setProjectDetails({
            project_id: data.project_id,
            project_title: data.project_title,
            sections: [],
            cells: {},
          })
        );
        navigate(`/newProject/${data.project_id}`);
      })
      .catch((_error) => {
        console.error("Error creating project");
        setServerError(true);
      });
  };

  return (
    <ThemeProvider theme={theme}>
      <CustomAppBar
        appBarType={"home"}
        userCode={props.userCode}
        helpGuideTab={"welcome"}
      />
      <Stack
        direction="column"
        justifyContent="center"
        alignItems="center"
        spacing={5}
        sx={{ height: "100vh", width: "100vw" }}
        style={{
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
        }}
      >
        <Typography variant="h2">Welcome</Typography>
        {loggedIn ? (
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={2}
          >
            <Button
              onClick={handleViewProjectsClick}
              variant="contained"
              size="large"
            >
              View Projects
            </Button>
            <Button
              onClick={handleCreateProjectClick}
              variant="contained"
              size="large"
            >
              Create Project
            </Button>
          </Stack>
        ) : (
          <>
            <Typography variant="h5">
              Please input your user code to get started
            </Typography>
            {/* Input text field */}
            <TextField
              error={userCodeError}
              value={userCode}
              helperText={userCodeError ? "Invalid user code" : ""}
              variant="outlined"
              type="password"
              sx={{ width: "50vw" }}
              onChange={(event) => setUserCode(event.target.value)}
            />
            {/* Submit button */}
            <Button
              onClick={() => handleLogIn(userCode)}
              variant="bigButtons"
              size="large"
            >
              Submit
            </Button>
          </>
        )}
      </Stack>
      {/* Server error dialog */}
      <ErrorDialog
        key={"serverError"}
        openDialog={serverError}
        handleCloseDialog={handleCloseServerError}
        dialogTitle={"Error when creating new project"}
        dialogContent={
          "An error occurred when creating a new project. Please try again. If the problem persists, please contact support at ccc-coalesce@media.mit.edu."
        }
      />
    </ThemeProvider>
  );
}

export default StartPage;
