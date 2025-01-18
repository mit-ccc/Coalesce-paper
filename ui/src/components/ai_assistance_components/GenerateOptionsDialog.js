import React, { useState, useEffect, useRef } from "react";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import UpdateIcon from "@mui/icons-material/Update";
import HelpIcon from "@mui/icons-material/Help";
import Slide from "@mui/material/Slide";
import { Stack } from "@mui/system";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { editCell } from "../../store/projectDetailsSlice";
import {
  updateSpecificOptionsId,
  updateGeneralOptions,
  updateSpecificOptions,
} from "../../store/generateOptionsSlice";
import { addEvent } from "../../store/userTrackingSlice";

import TentativeCell from "../common_components/TentativeCell";
import HelpGuideDialog from "../common_components/HelpGuideDialog";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";
import { timeoutPromise } from "../../utils";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function GenerateOptionsDialog(props) {
  // props includes the cell_id, open state variable, and handleClose

  // dialog box for the generate multiple option feature

  const dispatch = useDispatch();

  // GET STUFF FROM REDUX STORE

  // get general_options from the store
  const general_options = useSelector(
    (state) => state.generateOptions.general_options
  );

  // get the specific_options from the store
  const specific_options = useSelector(
    (state) => state.generateOptions.specific_options
  );

  // get the cell details from the store using the cell_id
  const cellInfo = useSelector(
    (state) => state.projectDetails.cells[props.cell_id]
  );

  // get the projectDetails from the store
  const projectDetails = useSelector((state) => state.projectDetails);

  // GETTING REWORDINGS

  // state variable to determine if there is an error
  const [serverError, setServerError] = useState(false);

  const [rewordings, setRewordings] = useState([]);

  const [loadingRewordings, setLoadingRewordings] = useState(false);

  // state variable for seconds passed while loading
  const [secondsPassed, setSecondsPassed] = useState(0);

  const timerInterval = useRef();

  // function to start or stop timer based on loadingRewordings
  useEffect(() => {
    if (loadingRewordings) {
      // console.log("Start generate options timer");
      timerInterval.current = setInterval(() => {
        setSecondsPassed((prevSeconds) => prevSeconds + 1);
      }, 1000);
    } else {
      // console.log("Stop generate options timer");
      clearInterval(timerInterval.current);
      timerInterval.current = null;
      setSecondsPassed(0);
    }
    return () => clearInterval(timerInterval.current);
  }, [loadingRewordings]);

  // function that gets rewordings from back-end by calling the reword_question endpoint
  const getRewordings = () => {
    console.log("Get rewordings from back-end");
    // prepare existing questions as an object mapping cell_ids to cell_details
    // for all cells in the section that the current question is in
    let existingQuestions = {};
    projectDetails.sections[cellInfo.section_index].cells.forEach((cell_id) => {
      if (cell_id === props.cell_id) return;
      existingQuestions[cell_id] = projectDetails.cells[cell_id].cell_details;
    });
    // console.log("Existing questions", existingQuestions);
    let data = {
      project_id: projectDetails.project_id,
      cell_id: props.cell_id,
      cell_details: cellInfo.cell_details,
      existing_questions: existingQuestions,
    };
    timeoutPromise(
      58000,
      fetch("/api/reword_question", {
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
        // update the general_options in the Redux store
        dispatch(
          updateGeneralOptions({
            cell_id: props.cell_id,
            content: data.content,
          })
        );
        // set rewordings
        setRewordings(data.content);
        // set loadingRewordings to false
        setLoadingRewordings(false);
      })
      .catch((_error) => {
        console.error("Error getting rewordings");
        setServerError(true);
        setLoadingRewordings(false);
      });
  };

  // useEffect that calls getRewordings when the dialog box is opened and when the cell_id changes
  // used to set the rewordings
  useEffect(() => {
    if (props.open) {
      // check if props.cell_id exists in general_options
      if (props.cell_id in general_options) {
        // check if the timestamp is before the last_updated field in cellInfo
        if (general_options[props.cell_id].timestamp < cellInfo.last_updated) {
          // set loadingRewordings to true
          setLoadingRewordings(true);
          setServerError(false);
          // get rewordings from back-end
          getRewordings();
        } else {
          // setting rewordings from general_options
          setRewordings(general_options[props.cell_id]["content"]);
        }
      } else {
        // set loadingRewordings to true
        setLoadingRewordings(true);
        setServerError(false);
        // get rewordings from back-end
        getRewordings();
      }
    }
  }, [props.open, props.cell_id]);

  // function to generate rewordings on click
  const handleGenerateOptions = () => {
    // set loadingRewordings to true
    setLoadingRewordings(true);
    setServerError(false);
    // get rewordings from back-end
    getRewordings();
  };

  // // for testing only
  // useEffect(() => {
  //     console.log("GenerateOptionsDialog: ", rewordings);
  // }, [rewordings]);

  // CODE FOR CHOOSING A TENTATIVE CELL

  const handleChooseCell = (newCellInfo) => {
    console.log("Choose Cell");
    // find the new human_ai_status
    let newHumanAiStatus = "ai";
    if (
      cellInfo.human_ai_status === "human" ||
      cellInfo.human_ai_status === "human_ai"
    ) {
      newHumanAiStatus = "human_ai";
    }
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectDetails.project_id,
        eventType: "chooseRewordingFromGenerateOptions",
        eventDetail: {
          cell_id: props.cell_id,
          previous_cell: cellInfo,
          new_cell: newCellInfo,
        },
      })
    );
    // update the cell_details in the Redux store
    dispatch(
      editCell({
        cell_id: props.cell_id,
        edit_main_text: true,
        cellInfo: {
          ...cellInfo,
          cell_details: newCellInfo.cell_details,
          human_ai_status: newHumanAiStatus,
          time_estimate: newCellInfo.time_estimate,
          checks_to_ignore: [],
        },
      })
    );
    props.handleClose();
  };

  // CODE FOR SPECIFIC REQUEST

  // state variable for specific request
  const [specificRequest, setSpecificRequest] = useState("");

  const [loadingSpecificRewordings, setLoadingSpecificRewordings] =
    useState(false);

  // state variable to determine if there is an error
  const [serverErrorSpecific, setServerErrorSpecific] = useState(false);

  // state variable for seconds passed while loading
  const [secondsPassedSpecific, setSecondsPassedSpecific] = useState(0);

  const timerIntervalSpecific = useRef();

  // function to start or stop timer based on loadingSpecificRewordings
  useEffect(() => {
    if (loadingSpecificRewordings) {
      // console.log("Start generate specific options timer");
      timerIntervalSpecific.current = setInterval(() => {
        setSecondsPassedSpecific((prevSeconds) => prevSeconds + 1);
      }, 1000);
    } else {
      // console.log("Stop generate specific options timer");
      clearInterval(timerIntervalSpecific.current);
      timerIntervalSpecific.current = null;
      setSecondsPassedSpecific(0);
    }
    return () => clearInterval(timerIntervalSpecific.current);
  }, [loadingSpecificRewordings]);

  // function to edit text
  const handleEditSpecificRequest = (e) => {
    setSpecificRequest(e.target.value);
  };

  // create ref for question generated by specific request
  const specificRequestRef = useRef(null);

  // state variable for current_id
  const [specificRequestId, setSpecificRequestId] = useState(null);

  // reset specificRequestId when the dialog box is closed
  useEffect(() => {
    if (!props.open) {
      setSpecificRequestId(null);
    }
  }, [props.open]);

  // function that gets rewording with specific request from back-end
  const getSpecificRewordings = () => {
    console.log("Get specific rewordings from back-end");
    // prepare existing questions as an object mapping cell_ids to cell_details
    // for all cells in the section that the current question is in
    let existingQuestions = {};
    projectDetails.sections[cellInfo.section_index].cells.forEach((cell_id) => {
      if (cell_id === props.cell_id) return;
      existingQuestions[cell_id] = projectDetails.cells[cell_id].cell_details;
    });
    // console.log("Existing questions", existingQuestions);
    let data = {
      project_id: projectDetails.project_id,
      cell_id: props.cell_id,
      cell_details: cellInfo.cell_details,
      specific_request: specificRequest,
      existing_questions: existingQuestions,
    };
    timeoutPromise(
      58000,
      fetch("/api/generate_specific_rewording", {
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
        // update the specific_options in the Redux store
        dispatch(
          updateSpecificOptions({
            cell_id: props.cell_id,
            content: data.content,
            request_text: specificRequest,
          })
        );
        // set specificRequestId to 0
        setSpecificRequestId(0);
        // update current_id to the next one
        dispatch(updateSpecificOptionsId({ cell_id: props.cell_id }));
        // set loadingSpecificRewordings to false
        setLoadingSpecificRewordings(false);
        // scroll to bottom of window after creating question
        setTimeout(() => {
          specificRequestRef.current.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        }, 100);
      })
      .catch((_error) => {
        console.error("Error getting specific rewordings");
        setServerErrorSpecific(true);
        setLoadingSpecificRewordings(false);
      });
  };

  // function when click "create question" in the generate options dialog
  const handleCreateQuestion = () => {
    // console.log(specificRequest);
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectDetails.project_id,
        eventType: "submitSpecificRequest",
        eventDetail: {
          cell_id: props.cell_id,
          cell: cellInfo,
          specific_request: specificRequest,
        },
      })
    );
    // check if props.cell_id exists in specific_options
    if (props.cell_id in specific_options) {
      // console.log("Specific Options Exists")
      // check if specificRequest is the same as request_text in specific_options
      if (specific_options[props.cell_id].request_text === specificRequest) {
        // console.log("Specific Request Exists")
        // check if current_id is less than the length of the content
        // and timestamp is before the last_updated field in cellInfo
        if (
          specific_options[props.cell_id].current_id <
            specific_options[props.cell_id].content.length &&
          specific_options[props.cell_id].timestamp >= cellInfo.last_updated
        ) {
          // console.log("Current ID is less than length of content and the timestamp is before the last_updated field in cellInfo")
          // question is in redux store
          setSpecificRequestId(specific_options[props.cell_id].current_id);
          // update current_id to the next one
          dispatch(updateSpecificOptionsId({ cell_id: props.cell_id }));
          // scroll to bottom of window after creating question
          setTimeout(() => {
            specificRequestRef.current.scrollIntoView({
              behavior: "smooth",
              block: "end",
            });
          }, 100);
        } else {
          // set loadingSpecificRewordings to true
          setLoadingSpecificRewordings(true);
          setServerErrorSpecific(false);
          getSpecificRewordings();
        }
      } else {
        // set loadingSpecificRewordings to true
        setLoadingSpecificRewordings(true);
        setServerErrorSpecific(false);
        getSpecificRewordings();
      }
    } else {
      // set loadingSpecificRewordings to true
      setLoadingSpecificRewordings(true);
      setServerErrorSpecific(false);
      getSpecificRewordings();
    }
  };

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
          app_bar_type: "generateRewordings",
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
          app_bar_type: "generateRewordings",
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
              variant="appBar"
              onClick={props.handleClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Generate Alternative Questions
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
          justifyContent="center"
          alignItems="flex-start"
          spacing={3}
          style={{
            padding: 50,
          }}
        >
          {/* Display the original question */}
          <Stack
            direction="column"
            justifyContent="center"
            alignItems="flex-start"
            sx={{ width: "100%" }}
          >
            <TentativeCell type={"plain"} cellInfo={cellInfo} />
          </Stack>
          <Typography variant="h6" sx={{ paddingTop: 2 }}>
            Explore automatically generated questions or create your own. The
            alternative you choose will replace the current question.
          </Typography>
          {loadingRewordings === true && (
            <Stack
              direction="column"
              alignItems="flex-start"
              justifyContent="center"
              key={`loading_general_rewordings_${props.cell_id}`}
              spacing={2}
            >
              <CircularProgress />
              {secondsPassed <= 15 ? (
                <Typography variant="body1">
                  Estimated time remaining: {15 - secondsPassed} seconds
                </Typography>
              ) : (
                <>
                  <Typography variant="body1">
                    Total time elapsed: {secondsPassed} seconds
                  </Typography>
                  <Typography variant="body1" color="error">
                    Generating alternative questions is taking longer than
                    expected. Waiting for at most 60 seconds.
                  </Typography>
                </>
              )}
            </Stack>
          )}
          {loadingRewordings === false && serverError === true && (
            <Stack
              direction="column"
              alignItems="flex-start"
              justifyContent="center"
              key={`error_loading_general_rewordings_${props.cell_id}`}
              spacing={2}
              sx={{ width: { xs: "95%", sm: "80%" } }}
            >
              <Typography variant="body1" color="error">
                An error occurred while generating alternative questions. Please
                try again. If the problem persists, please contact support at
                ccc-coalesce@media.mit.edu.
              </Typography>
              <Button
                variant="contained"
                onClick={handleGenerateOptions}
                size="small"
                startIcon={<UpdateIcon />}
              >
                Re-generate alternative questions
              </Button>
            </Stack>
          )}
          {rewordings.length > 0 &&
            loadingRewordings === false &&
            serverError === false && (
              <Stack
                direction="column"
                justifyContent="center"
                alignItems="flex-start"
                spacing={7}
                sx={{ width: "100%" }}
              >
                {rewordings.map((rewording, index) => (
                  <Stack
                    key={index}
                    direction="column"
                    alignItems={"flex-start"}
                    justifyContent={"center"}
                    sx={{ width: "100%" }}
                  >
                    <TentativeCell
                      key={index}
                      type={"choose_question"}
                      cellInfo={rewording}
                      handleChooseCell={handleChooseCell}
                    />
                  </Stack>
                ))}
              </Stack>
            )}
          <Typography variant="h6" sx={{ paddingTop: 5 }}>
            Generate your own question with a specific request.
          </Typography>
          <TextField
            hiddenLabel
            value={specificRequest}
            variant="outlined"
            multiline={true}
            minRows={4}
            placeholder="Enter text here"
            onChange={handleEditSpecificRequest}
            sx={{ width: { xs: "95%", sm: "80%" } }}
          />
          {specificRequestId !== null ? (
            <Button
              variant="contained"
              onClick={handleCreateQuestion}
              disabled={loadingSpecificRewordings}
            >
              Recreate Question
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleCreateQuestion}
              disabled={loadingSpecificRewordings}
            >
              Create Question
            </Button>
          )}
          {loadingSpecificRewordings === true && (
            <Stack
              direction="column"
              alignItems="flex-start"
              justifyContent="center"
              key={`loading_specific_rewordings_${props.cell_id}`}
              spacing={2}
              sx={{ width: { xs: "95%", sm: "80%" } }}
            >
              <CircularProgress />
              {secondsPassedSpecific <= 15 ? (
                <Typography variant="body1">
                  Estimated time remaining: {15 - secondsPassedSpecific} seconds
                </Typography>
              ) : (
                <>
                  <Typography variant="body1">
                    Total time elapsed: {secondsPassedSpecific} seconds
                  </Typography>
                  <Typography variant="body1" color="error">
                    Generating alternative questions based on a specific request
                    is taking longer than expected. Waiting for at most 60
                    seconds.
                  </Typography>
                </>
              )}
            </Stack>
          )}
          {loadingSpecificRewordings === false &&
            serverErrorSpecific === true && (
              <Stack
                direction="column"
                alignItems="flex-start"
                justifyContent="center"
                key={`error_loading_specific_rewordings_${props.cell_id}`}
                spacing={2}
                sx={{ width: { xs: "95%", sm: "80%" } }}
              >
                <Typography variant="body1" color="error">
                  An error occurred while generating alternative questions based
                  on a specific request. Please try again. If the problem
                  persists, please contact support at
                  ccc-coalesce@media.mit.edu.
                </Typography>
              </Stack>
            )}
          {specificRequestId !== null &&
            loadingSpecificRewordings === false &&
            serverErrorSpecific === false && (
              <Stack
                direction="column"
                justifyContent="center"
                alignItems="flex-start"
                sx={{
                  width: "100%",
                  paddingTop: 3,
                }}
              >
                <TentativeCell
                  key={rewordings.length}
                  type={"choose_question"}
                  cellInfo={
                    specific_options[props.cell_id].content[specificRequestId]
                  }
                  handleChooseCell={handleChooseCell}
                />
              </Stack>
            )}
          <div ref={specificRequestRef}></div>
        </Stack>
        <HelpGuideDialog
          open={openHelpGuide}
          handleClose={handleCloseHelpGuide}
          tab={"project_ai"}
        />
      </Dialog>
    </ThemeProvider>
  );
}

export default GenerateOptionsDialog;
