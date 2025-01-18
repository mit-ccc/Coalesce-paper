import React, { useState, useEffect, useRef } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { Typography } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// routing
import { useNavigate } from "react-router-dom";

import { v4 as uuidv4 } from "uuid";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { editErrors, editWarnings } from "../../store/projectContextSlice";
import { setProjectDetails, addCell } from "../../store/projectDetailsSlice";
import { editProject } from "../../store/userProjectsSlice";
import { addTopic } from "../../store/analyzeTopicsSlice";
import { resetTopicSlice } from "../../store/analyzeTopicsSlice";
import { addEvent } from "../../store/userTrackingSlice";

import CustomAppBar from "../common_components/CustomAppBar";
import ContextQuestion from "./ContextQuestion";
import ContextDialog from "./ContextDialog";
import { timeoutPromise } from "../../utils";
import ErrorDialog from "../common_components/ErrorDialog";

function ContextPage(props) {
  // page when people create a new project
  // props is userCode

  // DECLARING SOME VARIABLES

  const navigate = useNavigate();

  const dispatch = useDispatch();

  // get the project_id from the projectContextSlice
  const project_id = useSelector((state) => state.projectContext.project_id);

  // get the context from the projectContextSlice
  const context = useSelector((state) => state.projectContext.context);

  // // get the edited from the projectContextSlice
  // const edited = useSelector((state) => state.projectContext.edited);

  // // for testing only, print edited
  // useEffect(() => {
  //   console.log("edited", edited);
  // }, [edited]);

  // create ref for top of page
  const topOfPage = useRef(null);

  // state variable for num_errors and num_warnings
  const [num_errors, setNumErrors] = useState(0);
  const [num_warnings, setNumWarnings] = useState(0);

  // CODE FOR STATUS UPDATE DIALOGS

  // state variable for when to show the checking responses dialog
  const [showCheckingResponses, setShowCheckingResponses] = useState(false);

  // state variable for when to show the notify errors/ warnings dialog
  const [showNotify, setShowNotify] = useState(false);

  // function to handle the closing of the notify dialog
  const handleNotifyClose = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "clickDismiss",
        eventDetail: {
          num_errors: num_errors,
          num_warnings: num_warnings,
        },
      })
    );
    setShowNotify(false);
  };

  // state variable for when to show the create project dialog
  const [showCreateProject, setShowCreateProject] = useState(false);

  // state variable for seconds passed while generating the initial questions
  const [secondsPassed, setSecondsPassed] = useState(0);

  const timerInterval = useRef();

  // function to start or stop timer based on showCreateProject
  useEffect(() => {
    if (showCreateProject) {
      // console.log("Start create project timer");
      timerInterval.current = setInterval(() => {
        setSecondsPassed((prevSeconds) => prevSeconds + 1);
      }, 1000);
    } else {
      // console.log("Stop create project timer");
      clearInterval(timerInterval.current);
      timerInterval.current = null;
      setSecondsPassed(0);
    }
    return () => clearInterval(timerInterval.current);
  }, [showCreateProject]);

  // state variable for error message
  const [serverError, setServerError] = useState(false);

  // function to close the server error dialog
  const handleCloseServerError = () => {
    setServerError(false);
  };

  // // for testing only print secondsPassed
  // useEffect(() => {
  //   console.log("secondsPassed", secondsPassed);
  // }, [secondsPassed]);

  // CODE FOR CHECKING RESPONSES

  // helper function to check all the responses for errors
  const checkErrors = () => {
    let num_errors = 0;
    Object.keys(context).forEach((question_id) => {
      // if response is empty or only whitespace, set error message
      if (
        context[question_id].response.toString().trim() === "" &&
        question_id !== "7"
      ) {
        num_errors += 1;
        dispatch(
          editErrors({
            question_id: question_id,
            errors: ["This is a required question. Please provide a response."],
          })
        );
      } else if (context[question_id].errors.length > 0) {
        // reset errors if there are any
        // console.log("Resetting errors for question ", question_id);
        dispatch(
          editErrors({
            question_id: question_id,
            errors: [],
          })
        );
      }
    });
    return num_errors;
  };

  // helper function to check all the responses for warnings
  const checkWarnings = async () => {
    let num_warnings = 0;
    // await on all the fetch requests
    await Promise.all(
      Object.keys(context).map(async (question_id) => {
        // If checked_warnings is true or response is empty, skip this question
        if (
          context[question_id].checked_warnings ||
          context[question_id].response.toString().trim() === "" ||
          question_id == 5 ||
          question_id == 6 ||
          question_id == 7
        ) {
          return;
        }
        // Call back-end to check response
        let data = {
          project_id: project_id,
          context_question_id: question_id,
          response_text:
            context[question_id].response +
            ("part_2_response" in context[question_id]
              ? ": " + context[question_id].part_2_response
              : ""),
          ignored_warnings: context[question_id].ignored_warnings,
        };
        await timeoutPromise(
          31000,
          fetch("/api/check_question_response", {
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
            num_warnings = num_warnings + data.warnings.length;
            // console.log("Number of warnings: ", num_warnings);
            dispatch(
              editWarnings({
                question_id: question_id,
                warnings: data.warnings,
              })
            );
          })
          .catch((_error) => {
            // console.error(_error);
            console.error(
              "Error checking response for question " + question_id
            );
            num_warnings += 1;
            dispatch(
              editWarnings({
                question_id: question_id,
                warnings: [
                  `An error occurred while checking your response to the above question. Please try again. If the problem persists, please contact support at ccc-coalesce@media.mit.edu.`,
                ],
              })
            );
          });
      })
    );
    // console.log("Total number of warnings: ", num_warnings);
    return num_warnings;
  };

  // CODE FOR CREATING PROJECT

  // state variable for task_id
  const [taskId, setTaskId] = useState("");

  // // for testing only print taskId
  // useEffect(() => {
  //   console.log("taskId", taskId);
  // }, [taskId]);

  // useEffect to call getResult every 5 seconds based on secondsPassed and taskId
  useEffect(() => {
    if (taskId !== "" && showCreateProject) {
      if (secondsPassed <= 120) {
        if (secondsPassed % 5 === 0) {
          getResult(taskId);
        }
      } else {
        console.error("getResult API failed after waiting 2 minutes.");
        setShowCreateProject(false);
        setServerError(true);
      }
    }
  }, [taskId, secondsPassed]);

  // function to call the get_result API endpoint every second until the result is available
  const getResult = (taskId) => {
    console.log("get result for task: ", taskId);
    // create a timestamp
    const timeStamp = Date.now();

    fetch(`/api/get_result/${taskId}/${timeStamp}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error();
        }
      })
      .then((data) => {
        // console.log(data);
        if (data.ready) {
          if (data.successful) {
            // console.log("Success:", data);
            // reset the topic slice
            dispatch(resetTopicSlice());
            // update the projects field in userProjectsSlice
            dispatch(
              editProject({
                project_id: project_id,
                project_title: data.value.project_details.project.project_title,
              })
            );
            // update projectDetailsSlice
            dispatch(
              setProjectDetails({
                project_id: project_id,
                project_title: data.value.project_details.project.project_title,
                sections: data.value.project_details.project.sections,
                cells: {},
              })
            );
            // go through data.cells and call addCell for each cell
            data.value.project_details.cells.forEach((cell) => {
              // get a new cell_id
              const newCellId = uuidv4();
              dispatch(
                addCell({
                  cell_id: newCellId,
                  cell: cell,
                  section_index: cell["section_index"],
                })
              );
            });
            // add the topics to the store
            // iterate through each topic in data.topics
            data.value.topics.forEach((topic) => {
              dispatch(
                addTopic({
                  topic_name: topic,
                })
              );
            });
            setShowCreateProject(false);
            navigate(`/project/${project_id}`);
          } else {
            console.error("Generating initial questions failed");
            setShowCreateProject(false);
            setServerError(true);
          }
        } else {
          console.log("Task not ready yet. Trying again in 5 seconds.");
        }
      })
      .catch((_error) => {
        console.error("Error in getting results");
      });
  };

  // function that calls back-end to create the project
  const createProject = () => {
    let data = {
      project_id: project_id,
      context: context,
    };
    timeoutPromise(
      10000,
      fetch("/api/submit_context", {
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
        // set the task_id
        setTaskId(data.task_id);
      })
      .catch((_error) => {
        console.error(
          "Error submitting context to start process of creating project"
        );
        setShowCreateProject(false);
        setServerError(true);
      });
  };

  // CODE TO HANDLE CREATE PROJECT CLICK

  const handleCreateProjectClick = async () => {
    // console.log("Create project button clicked");
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "clickCreateProject",
        eventDetail: {},
      })
    );
    setShowNotify(false);
    setShowCheckingResponses(true);
    setShowCreateProject(false);
    // check for errors
    let num_errors = checkErrors();
    setNumErrors(num_errors);
    let num_warnings = 0;
    num_warnings = await checkWarnings();
    setNumWarnings(num_warnings);

    if (num_errors > 0 || num_warnings > 0) {
      setShowCheckingResponses(false);
      setShowNotify(true);
      // scroll to top of page
      topOfPage.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    } else {
      console.log("Ready to create project");
      setShowNotify(false);
      setShowCheckingResponses(false);
      setShowCreateProject(true);
      createProject();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CustomAppBar
        appBarType={"context"}
        userCode={props.userCode}
        helpGuideTab={"project_launch"}
      />
      {showCreateProject ? (
        <Stack
          direction="column"
          alignItems="center"
          justifyContent="center"
          sx={{ height: "100vh" }}
          spacing={3}
        >
          <Typography variant="h5">
            Using AI to Generate an Initial Draft
          </Typography>
          <CircularProgress size={60} />
          {secondsPassed <= 60 ? (
            <Typography variant="body1">
              Estimated time remaining: {60 - secondsPassed} seconds
            </Typography>
          ) : (
            <Typography variant="body1" align="center">
              Total time elapsed: {secondsPassed} seconds
            </Typography>
          )}
          {secondsPassed > 30 && (
            <Typography variant="body1" color="error">
              Creating questions is taking longer than expected. Waiting for at
              most 2 minutes.
            </Typography>
          )}
        </Stack>
      ) : (
        <Stack
          direction="column"
          justifyContent="flex-start"
          alignItems="flex-start"
          spacing={7}
          style={{
            paddingLeft: 50,
            paddingRight: 50,
            marginTop: 100,
            paddingBottom: 30,
          }}
        >
          <Stack
            direction={"column"}
            justifyContent={"flex-start"}
            alignItems={"flex-start"}
            spacing={3}
          >
            <Typography variant="h5" ref={topOfPage}>
              Project Launch
            </Typography>

            <Typography variant="body1">
              To generate the most relevant questions for you, we need some
              initial context on the project. Please answer the following
              questions. The more detailed your answers, the more relevant the
              initial questions will be.
            </Typography>
          </Stack>

          {Object.keys(context).map((question_id, index) => {
            return (
              <ContextQuestion
                key={index}
                question_number={index + 1}
                question_id={Number(question_id)}
                is_disabled={showCheckingResponses || showCreateProject}
                show_warnings_and_errors={true}
                show_check_response_button={
                  Number(question_id) == 5 ||
                  Number(question_id) == 6 ||
                  Number(question_id) == 7
                    ? false
                    : true
                }
              />
            );
          })}

          <Button
            onClick={handleCreateProjectClick}
            size="large"
            sx={{
              alignSelf: "flex-end",
            }}
            variant="contained"
          >
            Create Project
          </Button>

          <Stack
            sx={{
              paddingTop: 3,
            }}
          >
            {/* Check response dialog */}
            <ContextDialog displayType={"check"} open={showCheckingResponses} />

            {/* Create project dialog */}
            {/* <ContextDialog displayType={"create"} open={showCreateProject} /> */}

            {/* Notify dialog */}
            <ContextDialog
              displayType={"notify"}
              open={showNotify}
              handleClose={handleNotifyClose}
              num_errors={num_errors}
              num_warnings={num_warnings}
            />
          </Stack>
        </Stack>
      )}
      {/* Server error dialog */}
      <ErrorDialog
        key={"serverError"}
        openDialog={serverError}
        handleCloseDialog={handleCloseServerError}
        dialogTitle={"Error when generating initial questions"}
        dialogContent={
          "An error occurred while generating the initial draft for the project. Please try again. If the problem persists, please contact support at ccc-coalesce@media.mit.edu."
        }
      />
    </ThemeProvider>
  );
}

export default ContextPage;
