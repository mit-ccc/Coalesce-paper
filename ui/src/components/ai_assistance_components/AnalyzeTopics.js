import React, { useState, useEffect, useRef } from "react";

import Dialog from "@mui/material/Dialog";
import Stack from "@mui/material/Stack";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Slide from "@mui/material/Slide";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Avatar from "@mui/material/Avatar";
import { Box } from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import Tooltip from "@mui/material/Tooltip";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled";
import UpdateIcon from "@mui/icons-material/Update";
import SaveIcon from "@mui/icons-material/Save";
import HelpIcon from "@mui/icons-material/Help";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import {
  resetCellHistory,
  resetClassificationList,
  addCell,
  deleteCell,
} from "../../store/projectDetailsSlice";
import {
  resetAddedTopics,
  updateTopics,
  updateTopicClassification,
  removeSuggestionFromTopic,
  deleteCellFromTopic,
  addSuggestionsForTopic,
  resetNeedToSave,
} from "../../store/analyzeTopicsSlice";
import { addEvent } from "../../store/userTrackingSlice";
import { resetEdited } from "../../store/projectContextSlice";
import { setLastSaved } from "../../store/userProjectsSlice";

import HelpGuideDialog from "../common_components/HelpGuideDialog";
import InfoButton from "../common_components/InfoButton";
import SuggestionList from "../common_components/SuggestionList";
import EditTopicsDialog from "./EditTopicsDialog";
import BarGraph from "../common_components/BarGraph";
import TopicCell from "./TopicCell";
import ErrorDialog from "../common_components/ErrorDialog";
import {
  timeoutPromise,
  saveProjectDetails,
  saveProjectContext,
  saveAnalyzeTopics,
} from "../../utils";

import { v4 as uuidv4 } from "uuid";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AnalyzeTopics(props) {
  // page where user can analyze topics
  // props include open and handleClose

  const dispatch = useDispatch();

  // get the topics from Redux store
  const topics = useSelector((state) => state.analyzeTopics.topics);

  // get the summary paragraph from the store
  const summary = useSelector((state) => state.analyzeTopics.summary);

  // get the suggestions from the store
  const topicSuggestions = useSelector(
    (state) => state.analyzeTopics.suggestions
  );

  // // for testing only
  // useEffect(() => {
  //   // console.log("topics", topics);
  //   console.log("topics", Object.keys(topics));
  // }, [topics]);

  // helper function to clean topic titles
  function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  // CODE TO SAVE DATA

  // get all the necessary info from the redux store
  const projectDetails = useSelector((state) => state.projectDetails);
  const projectContext = useSelector((state) => state.projectContext);
  const analyzeTopics = useSelector((state) => state.analyzeTopics);

  // code for the save button
  const [saving, setSaving] = useState(false);

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
    // console.log("Manually save data through analyze topics");
    setSaving(true);
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: "user_level",
        eventType: "saveData",
        eventDetail: {
          app_bar_type: "analyzeTopics",
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
      saveAnalyzeTopics(analyzeTopics, projectDetails.project_id),
    ]).then((results) => {
      projectDetailsStatus = results[0];
      projectContextStatus = results[1];
      analyzeTopicsStatus = results[2];
    });

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

  // CODE TO RUN TOPIC ANALYSIS

  // get the added_topics field in the analyze topics store
  const added_topics = useSelector((state) => state.analyzeTopics.added_topics);

  // get the human_topics from the store
  const humanTopics = useSelector((state) => state.analyzeTopics.human_topics);

  // state variable for loading
  const [loadingTopics, setLoadingTopics] = useState(false);

  // state variable for seconds passed while loading
  const [secondsPassed, setSecondsPassed] = useState(0);

  const timerInterval = useRef();

  // state variable for error message
  const [serverError, setServerError] = useState(false);

  // // for testing only print secondsPassed
  // useEffect(() => {
  //   console.log("secondsPassed", secondsPassed);
  // }, [secondsPassed]);

  // function to close the server error dialog
  const handleCloseServerError = () => {
    setServerError(false);
  };

  // function to determine whether to run topic analysis
  const shouldRunTopicAnalysis = () => {
    // check if there are any edited or added cells for classification
    if (
      projectDetails.project_id &&
      projectDetails.cells_for_classification.length > 0
    ) {
      // console.log("Cells for classification", projectDetails.cells_for_classification);
      return true;
    }
    // check if lastAnalyzed is empty
    // if so, it means we need to run analyze topics for the first time
    if (lastAnalyzed === "") {
      return true;
    }
    // check if added_topics field is not empty
    if (added_topics.length > 0) {
      // console.log("Added topics is not empty", added_topics);
      return true;
    }
    return false;
  };

  // function to run topic analysis
  const runTopicAnalysis = async () => {
    console.log("Running topic analysis");
    // first save the project details
    let saveSuccess = await saveProjectDetails(projectDetails);
    if (saveSuccess === "error") {
      setServerError(true);
      setLoadingTopics(false);
      return;
    } else {
      // reset cell history
      dispatch(resetCellHistory());
    }
    // if a cell_id isn't in topics, then add it to edited_cells
    let edited_cells = [...projectDetails.cells_for_classification];
    // iterate through cells in projectDetails
    Object.keys(projectDetails.cells).forEach((cell_id) => {
      // iterate through topics and see if cell_id is in any of the topics
      let found = false;
      Object.keys(topics).forEach((topic) => {
        if (topics[topic].cells.includes(cell_id)) {
          found = true;
        }
      });
      // if not found, add to edited_cells
      if (
        !found &
        !edited_cells.includes(cell_id) &
        (projectDetails.cells[cell_id].cell_details.cell_type === "question")
      ) {
        edited_cells.push(cell_id);
      }
    });
    // then call the analyze_topics API
    // get current timestamp
    const timestamp = new Date().toISOString();
    let data = {
      project_id: projectDetails.project_id,
      topics: topics,
      added_topics: added_topics,
      edited_cells: edited_cells,
      human_topics: humanTopics,
      last_analyzed: timestamp,
    };
    timeoutPromise(
      58000,
      fetch("/api/analyze_topics", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
    )
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error();
        }
      })
      .then((data) => {
        console.log("Topic analysis completed");
        // console.log(data.topics);
        // sort data.topics so the topics with 0 cells are at the end
        let sortedTopics = {};
        Object.keys(data.topics) // sort the topics
          .sort((a, b) => {
            if (data.topics[a].cells.length === 0) {
              return 1;
            } else if (data.topics[b].cells.length === 0) {
              return -1;
            } else {
              return 0;
            }
          })
          .forEach((key) => {
            sortedTopics[key] = data.topics[key];
          });
        // console.log(sortedTopics);
        // update the topics in the Redux store
        dispatch(
          updateTopics({
            topics: sortedTopics,
            summary: data.summary,
            last_analyzed: timestamp,
            suggestions: data.suggestions,
          })
        );
        // reset edited to false
        dispatch(resetAddedTopics());
        // reset need_to_save to false
        dispatch(resetNeedToSave());
        // reset classification list
        dispatch(resetClassificationList());
        // set selected topic
        setSelectedTopic(Object.keys(sortedTopics)[0]);
        setLoadingTopics(false);
      })
      .catch((_error) => {
        console.error("Error running topic analysis");
        setLoadingTopics(false);
        setServerError(true);
      });
  };

  // useEffect to run topic analysis whenever this component is rendered
  useEffect(() => {
    if (!props.open) {
      setSelectedTopic("Unclassified");
      return;
    }
    setSelectedTopic(Object.keys(topics)[0]);
    if (shouldRunTopicAnalysis()) {
      // console.log("Should run topic analysis");
      setLoadingTopics(true);
      runTopicAnalysis();
    } else {
      console.log("Should not run topic analysis");
    }
  }, [props.open]);

  // CODE FOR BAR GRAPH DATA

  // variable to keep track of data for the bar graph
  const [topicData, setTopicData] = useState({});

  // variable to keep track of mapping between topic name and whether it has suggestions
  // const [topicSuggestions, setTopicSuggestions] = useState({});

  useEffect(() => {
    let data = {};
    Object.keys(topics).forEach((topic) => {
      if (topic !== "Unclassified") {
        data[topic] = topics[topic].cells.length + 0.5;
      }
    });
    // add unclassified topic as last
    data["Unclassified"] = topics["Unclassified"].cells.length + 0.5;
    setTopicData(data);
    // console.log("topicData", data);
    // update topicSuggestions (code removed for now)
  }, [topics]);

  // CODE TO GET THE TOTAL TIME ESTIMATE

  // state variable for total time estimate
  const [totalTime, setTotalTime] = useState(0);

  // calculate the total time estimate from the cell time estimates
  useEffect(() => {
    let total = 0;
    Object.values(projectDetails.cells).forEach((cell) => {
      total += cell.time_estimate;
    });
    // round to 1 decimal place
    total = Math.round(total * 10) / 10;
    setTotalTime(total);
  }, [projectDetails.cells]);

  // CODE FOR SELECTING A TOPIC

  // state variable for selected topic
  // default as the first topic
  const [selectedTopic, setSelectedTopic] = useState("Unclassified");

  // // for testing only print selected topic
  // useEffect(() => {
  //   console.log("selectedTopic", selectedTopic);
  // }, [selectedTopic]);

  const handleSelectTopic = (topic) => {
    setSelectedTopic(topic);
  };

  // CODE TO GENERATING SUGGESTIONS ON DEMAND

  // state variable for loading suggestions
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // function to start or stop timer based on loadingTopics and loadingSuggestions
  useEffect(() => {
    if (loadingTopics) {
      if (loadingSuggestions) {
        async function stopSuggestionTimer() {
          // console.log("Stop generate suggestion timer");
          await setLoadingSuggestions(false);
          await clearInterval(timerInterval.current);
          timerInterval.current = null;
          await setSecondsPassed(0);
        }
        stopSuggestionTimer();
      }
      if (timerInterval.current === null) {
        // console.log("Start analyze topics timer");
        timerInterval.current = setInterval(() => {
          setSecondsPassed((prev) => prev + 1);
        }, 1000);
      }
    } else if (loadingSuggestions) {
      // console.log("Start generate suggestion timer");
      timerInterval.current = setInterval(() => {
        setSecondsPassed((prev) => prev + 1);
      }, 1000);
    } else {
      // console.log("Stop timer");
      clearInterval(timerInterval.current);
      timerInterval.current = null;
      setSecondsPassed(0);
    }
    return () => clearInterval(timerInterval.current);
  }, [loadingTopics, loadingSuggestions]);

  // state variable for topic name being suggested
  const [suggestedTopic, setSuggestedTopic] = useState("");

  // function to generate addition suggestions
  const generateAddSuggestions = () => {
    // set loading to true
    setLoadingSuggestions(true);
    console.log("Generate Add Suggestions for", selectedTopic);
    setSuggestedTopic(selectedTopic);
    var total = 0;
    Object.keys(topicData).forEach((key) => {
      total += topicData[key];
    });
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectDetails.project_id,
        eventType: "suggestAdditionsToTopic",
        eventDetail: {
          topic_name: selectedTopic,
          num_questions: topics[selectedTopic].cells.length,
          percent_of_total: topics[selectedTopic].cells.length / total,
        },
      })
    );
    // call the backend to generate suggestions
    // prepare existing questions as an object mapping cell_ids to cell_details for selectedTopic
    let existingQuestions = {};
    topics[selectedTopic].cells.forEach((cell_id) => {
      existingQuestions[cell_id] = projectDetails.cells[cell_id].cell_details;
    });
    // console.log("Existing questions", existingQuestions);
    let data = {
      project_id: projectDetails.project_id,
      topic: selectedTopic,
      existing_questions: existingQuestions,
      sections: projectDetails.sections,
    };
    timeoutPromise(
      58000,
      fetch("/api/get_add_suggestions", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
    )
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error();
        }
      })
      .then((data) => {
        console.log("Finished generating add suggestions");
        // console.log("Add suggestions", data);
        // update the store with the suggestions
        dispatch(
          addSuggestionsForTopic({
            topic: selectedTopic,
            suggestionObject: data.content,
          })
        );
        setLoadingSuggestions(false);
      })
      .catch((_error) => {
        console.error("Error generating add suggestions");
        setLoadingSuggestions(false);
        setServerError(true);
      });
  };

  // function to generate deletion suggestions
  const generateDeleteSuggestions = () => {
    // set loading to true
    setLoadingSuggestions(true);
    console.log("Generate Delete Suggestions for", selectedTopic);
    setSuggestedTopic(selectedTopic);
    // add event to user tracking
    var total = 0;
    Object.keys(topicData).forEach((key) => {
      total += topicData[key];
    });
    dispatch(
      addEvent({
        projectId: projectDetails.project_id,
        eventType: "suggestDeletionsFromTopic",
        eventDetail: {
          topic_name: selectedTopic,
          num_questions: topics[selectedTopic].cells.length,
          percent_of_total: topics[selectedTopic].cells.length / total,
        },
      })
    );
    // call the backend to generate suggestions
    // prepare existing questions as an object mapping cell_ids to cell_details for selectedTopic
    let existingQuestions = {};
    topics[selectedTopic].cells.forEach((cell_id) => {
      existingQuestions[cell_id] = projectDetails.cells[cell_id].cell_details;
    });
    // console.log("Existing questions", existingQuestions);
    let data = {
      project_id: projectDetails.project_id,
      topic: selectedTopic,
      existing_questions: existingQuestions,
    };
    timeoutPromise(
      58000,
      fetch("/api/get_delete_suggestions", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
    )
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error();
        }
      })
      .then((data) => {
        console.log("Finished generating delete suggestions");
        // console.log("Delete suggestions", data);
        // update the store with the suggestions
        dispatch(
          addSuggestionsForTopic({
            topic: selectedTopic,
            suggestionObject: data.content,
          })
        );
        setLoadingSuggestions(false);
      })
      .catch((_error) => {
        console.error("Error generating delete suggestions");
        setLoadingSuggestions(false);
        setServerError(true);
      });
  };

  // CODE TO DETERMINE WHICH SUGGESTIONS TO DISPLAY

  // state variable for list of suggestions to display
  // default is all of them
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (selectedTopic === "" || !topicSuggestions[selectedTopic]) {
      setSuggestions([]);
    } else {
      let suggestionsList = [];
      // go through each item in the topic's suggestions
      // if the suggestion_type is "delete", get the cell_details from projectDetails
      topicSuggestions[selectedTopic].forEach((suggestion) => {
        if (suggestion.suggestion_type === "delete") {
          let deleteSuggestions = [];
          suggestion.suggestions.forEach((suggestion2) => {
            deleteSuggestions.push({
              ...suggestion2,
              cell_details:
                projectDetails.cells[suggestion2.cell_id].cell_details,
              time_estimate:
                projectDetails.cells[suggestion2.cell_id].time_estimate,
            });
          });
          suggestionsList.push({
            suggestion_type: suggestion.suggestion_type,
            suggestions: deleteSuggestions,
          });
        } else {
          suggestionsList.push(suggestion);
        }
      });
      setSuggestions(suggestionsList);
    }
  }, [topics, selectedTopic, topicSuggestions]);

  // // for testing only, print suggestions
  // useEffect(() => {
  //   console.log("suggestions", suggestions);
  // }, [suggestions]);

  // CODE TO DETERMINE WHICH QUESTIONS TO DISPLAY

  // state variable for list of questions to display
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (selectedTopic === "") {
      setQuestions([]);
    } else {
      setQuestions(topics[selectedTopic].cells);
    }
  }, [topics, selectedTopic]);

  // CODE FOR EDIT TOPICS DIALOG

  // state variable for edit topics dialog
  const [editTopicsOpen, setEditTopicsOpen] = useState(false);

  const handleEditTopicsOpen = () => {
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectDetails.project_id,
        eventType: "openEditTopicsDialog",
        eventDetail: {},
      })
    );
    setEditTopicsOpen(true);
  };

  const handleEditTopicsClose = () => {
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectDetails.project_id,
        eventType: "closeEditTopicsDialog",
        eventDetail: {},
      })
    );
    setEditTopicsOpen(false);
  };

  // function to handle clicking update analysis button
  const handleUpdateAnalysis = () => {
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectDetails.project_id,
        eventType: "runAnalyzeTopicsFromEditTopics",
        eventDetail: {
          last_analyzed: lastAnalyzed,
        },
      })
    );
    handleEditTopicsClose();
    setLoadingTopics(true);
    runTopicAnalysis();
  };

  // CODE FOR DYNAMIC SCREEN WIDTH

  // variable to keep track of the screen width
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  // function to update the screen width
  const updateScreenWidth = () => {
    setScreenWidth(window.innerWidth);
  };

  // add event listener to update the screen width
  useEffect(() => {
    window.addEventListener("resize", updateScreenWidth);
    return () => window.removeEventListener("resize", updateScreenWidth);
  }, []);

  // CODE FOR UPDATE BUTTON
  const [showUpdateButton, setShowUpdateButton] = useState(true);

  // get last_analyzed from the store
  const lastAnalyzed = useSelector(
    (state) => state.analyzeTopics.last_analyzed
  );

  // function to format timestamp
  const formatTimestamp = (timestamp) => {
    if (timestamp === "") {
      return "never";
    }
    let date = new Date(timestamp);
    return date.toLocaleString();
  };

  // function to handle re-running analysis
  const handleReRunAnalysis = () => {
    console.log("Re-run analysis");
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectDetails.project_id,
        eventType: "reRunAnalyzeTopics",
        eventDetail: {
          last_analyzed: lastAnalyzed,
        },
      })
    );
    setLoadingTopics(true);
    runTopicAnalysis();
  };

  // CODE FOR SUGGESTION HANDLERS

  // function to handle adding a cell
  const handleAddCell = (section_id, suggestion) => {
    // console.log("Add cell clicked");
    // get a new cell_id
    const newCellId = uuidv4();
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectDetails.project_id,
        eventType: "acceptTopicAdditionSuggestion",
        eventDetail: {
          topic_name: selectedTopic,
          added_cell_id: newCellId,
          section: projectDetails.sections[section_id],
          addition_suggestion: suggestion,
        },
      })
    );
    // create a new cell object
    const newCell = {
      section_index: section_id,
      cell_details: suggestion.cell_details,
      last_updated: "",
      // is_ai_generated: 1,
      human_ai_status: "ai",
      ai_rationale: suggestion.rationale,
      time_estimate: suggestion.time_estimate,
    };
    // add the new cell to the store
    dispatch(
      addCell({
        cell_id: newCellId,
        cell: newCell,
        section_index: section_id,
      })
    );
    // also update the topic classification
    dispatch(
      updateTopicClassification({
        cell_id: newCellId,
        selected_topics: [selectedTopic],
      })
    );
    // remove the suggestion from the topic
    dispatch(
      removeSuggestionFromTopic({
        topic: selectedTopic,
        suggestion: suggestion,
        type: "add",
      })
    );
  };

  // function to handle deleting a cell
  const handleDeleteCell = (suggestion) => {
    // console.log("Delete cell clicked");
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectDetails.project_id,
        eventType: "acceptTopicDeletionSuggestion",
        eventDetail: {
          topic_name: selectedTopic,
          deleted_cell_id: suggestion.cell_id,
          deletion_suggestion: suggestion,
        },
      })
    );
    // get the section_id from the suggestion.cell_id in projectDetails
    const section_id = projectDetails.cells[suggestion.cell_id].section_index;
    // remove the cell from the topic
    dispatch(deleteCellFromTopic({ cell_id: suggestion.cell_id }));
    // remove the cell from the store
    dispatch(
      deleteCell({ cell_id: suggestion.cell_id, section_index: section_id })
    );
    // remove the suggestion from the topic
    dispatch(
      removeSuggestionFromTopic({
        topic: selectedTopic,
        suggestion: suggestion,
        type: "delete",
      })
    );
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
          app_bar_type: "analyzeTopics",
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
          app_bar_type: "analyzeTopics",
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
              <ArrowBackIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Back
            </Typography>
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
                  }}
                  onPointerEnter={() => findSecondsSinceLastSave(lastSaved)}
                >
                  <span>Save</span>
                </LoadingButton>
              </span>
            </Tooltip>
            <Tooltip title="Help Guide">
              <IconButton variant="appBar" onClick={handleOpenHelpGuide}>
                <HelpIcon fontSize="large" />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        {loadingTopics === true ? (
          <Stack
            direction="column"
            alignItems="center"
            justifyContent="center"
            sx={{ height: "100vh" }}
            spacing={3}
          >
            <Typography variant="h5">Analyzing Topics</Typography>
            <CircularProgress size={60} />
            <Typography variant="body1">
              Estimated time remaining: {60 - secondsPassed} seconds
            </Typography>
            {secondsPassed > 30 && (
              <Typography variant="body1" color="error">
                Analysis is taking longer than expected.
              </Typography>
            )}
          </Stack>
        ) : (
          <Stack
            direction="column"
            justifyContent="flex-start"
            alignItems="flex-start"
            spacing={5}
            style={{
              padding: 50,
            }}
            sx={{ width: "100%" }}
          >
            <Stack
              direction={"column"}
              justifyContent={"flex-start"}
              alignItems={"flex-start"}
              spacing={3}
              sx={{ width: "100%" }}
            >
              <Stack
                direction="row"
                alignItems="flex-end"
                justifyContent={"space-between"}
                sx={{ width: "100%" }}
              >
                <Typography variant="h5">Topic Analysis</Typography>
                {showUpdateButton && (
                  <Stack
                    direction={"column"}
                    justifyContent={"center"}
                    alignItems={"flex-end"}
                    spacing={1}
                  >
                    <Button
                      color="primary"
                      variant="contained"
                      size="small"
                      startIcon={<UpdateIcon />}
                      onClick={handleReRunAnalysis}
                    >
                      Re-run topic analysis
                    </Button>
                    <Typography variant="body1">
                      Last checked at {formatTimestamp(lastAnalyzed)}
                    </Typography>
                  </Stack>
                )}
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                  }}
                >
                  <AccessTimeFilledIcon />
                </Avatar>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: "bold",
                  }}
                >
                  We estimate it would take the average person {totalTime}{" "}
                  minutes to answer all the questions.{" "}
                </Typography>
              </Stack>

              {/* Add summary paragraph */}
              {summary !== "" && (
                <Stack
                  direction={"column"}
                  justifyContent={"flex-start"}
                  alignItems={"flex-start"}
                  spacing={1}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent={"space-between"}
                  >
                    {/* Just disply first sentence of summary */}
                    <Typography variant="body1">
                      {summary.split(".")[0] + "."}
                    </Typography>

                    <InfoButton
                      iconType={"info"}
                      text={
                        "Topics are detected by GPT-4o using information from the project overview \
                    page. Each question is classified into relevant topics using GPT-4o. \
                    Topics that cover either zero or less than a certain percentage of questions (100 divided by the total number of topics) are \
                    flagged as being underrepresented. Topics that have more than 50% of the \
                    questions are flagged as being overrepresented."
                      }
                    />
                  </Stack>
                  {/* Display the rest of the summary paragraph */}
                  <Typography variant="body1">
                    {summary.split(".").slice(1).join(".")}
                  </Typography>
                </Stack>
              )}
              {/* Add a legend for the bar graph */}
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={3}
              >
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  spacing={1}
                >
                  {/* Create a rainbow box */}
                  <Stack
                    direction="row"
                    justifyContent="center"
                    alignItems="center"
                    spacing={0}
                  >
                    <Box
                      sx={{
                        width: 5,
                        height: 20,
                        bgcolor: "#EECAB6",
                      }}
                    ></Box>
                    <Box
                      sx={{
                        width: 5,
                        height: 20,
                        bgcolor: "#C1F39E",
                      }}
                    ></Box>
                    <Box
                      sx={{
                        width: 5,
                        height: 20,
                        bgcolor: "#A4D3F3",
                      }}
                    ></Box>
                    <Box
                      sx={{
                        width: 5,
                        height: 20,
                        bgcolor: "#C6AEED",
                      }}
                    ></Box>
                  </Stack>
                  <Typography component="div" variant="body1" align="center">
                    Topics with questions
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  spacing={1}
                >
                  {/* Create a rainbow box with white stripes diagonally in between */}
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      border: "1px solid #d3d3d3",
                      overflow: "hidden",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="center"
                      alignItems="center"
                      spacing={0.3}
                      sx={{
                        transform: "rotate(45deg)",
                      }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 20,
                          bgcolor: "#EECAB6",
                        }}
                      ></Box>
                      <Box
                        sx={{
                          width: 10,
                          height: 20,
                          bgcolor: "#A4D3F3",
                        }}
                      ></Box>
                      <Box
                        sx={{
                          width: 10,
                          height: 20,
                          bgcolor: "#C6AEED",
                        }}
                      ></Box>
                    </Stack>
                  </Box>
                  <Typography component="div" variant="body1" align="center">
                    Topics without questions
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  spacing={1}
                >
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      bgcolor: "#d3d3d3",
                    }}
                  ></Box>
                  <Typography component="div" variant="body1" align="center">
                    Unclassified
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
            {/* Bar graphs */}
            <Stack
              direction={"column"}
              justifyContent={"flex-start"}
              alignItems={"flex-start"}
              spacing={3}
            >
              <BarGraph
                data={topicData}
                // suggestions={topicSuggestions}
                id={"topic-distribution"}
                is_clickable={true}
                screenWidth={screenWidth}
                handleClick={handleSelectTopic}
                selectedTopic={selectedTopic}
              />

              {/* Edit topics button */}
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => {
                  handleEditTopicsOpen();
                }}
              >
                Edit Topics
              </Button>
            </Stack>
            {/* List of suggestions */}
            {selectedTopic !== "Unclassified" && (
              <Stack
                direction={"column"}
                justifyContent={"flex-start"}
                alignItems={"flex-start"}
                spacing={0}
                sx={{ width: "100%" }}
              >
                <Stack
                  direction={"column"}
                  justifyContent={"flex-start"}
                  alignItems={"flex-start"}
                  spacing={3}
                  sx={{ width: "100%" }}
                >
                  <Typography variant="h6">
                    {selectedTopic === "" ? "All" : toTitleCase(selectedTopic)}{" "}
                    Suggestions
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      paddingBottom: 0,
                    }}
                  >
                    {topics[selectedTopic].suggestion_rationale === ""
                      ? `There are no suggestions for topic "${toTitleCase(
                          selectedTopic
                        )}".`
                      : `${topics[selectedTopic].suggestion_rationale}`}
                  </Typography>
                  <Stack
                    direction={"row"}
                    justifyContent={"flex-start"}
                    alignItems={"center"}
                    spacing={3}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => {
                        generateAddSuggestions();
                      }}
                      disabled={loadingSuggestions ? true : false}
                    >
                      Suggest Additions
                    </Button>

                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => {
                        generateDeleteSuggestions();
                      }}
                      disabled={
                        topics[selectedTopic].cells.length === 0 ||
                        loadingSuggestions
                          ? true
                          : false
                      }
                    >
                      Suggest Deletions
                    </Button>
                  </Stack>
                </Stack>
                {suggestions.length > 0 &&
                  !loadingSuggestions &&
                  // display SuggestionList for each item in suggestions
                  suggestions.map((suggestion, index) => (
                    <SuggestionList
                      key={index}
                      suggestion_type={suggestion.suggestion_type}
                      suggestions={suggestion.suggestions}
                      accordian_id={selectedTopic}
                      handleChooseCell={
                        suggestion.suggestion_type === "add"
                          ? handleAddCell
                          : handleDeleteCell
                      }
                    />
                  ))}
                {loadingSuggestions && selectedTopic === suggestedTopic && (
                  <Stack
                    direction="column"
                    alignItems="center"
                    justifyContent="center"
                    key={`loading_suggestions_analyze_topics`}
                    alignSelf={"center"}
                    sx={{ mt: 5 }}
                    spacing={2}
                  >
                    <CircularProgress />
                    <Typography variant="body1">
                      Estimated time remaining: {60 - secondsPassed} seconds
                    </Typography>
                    {secondsPassed > 30 && (
                      <Typography variant="body1" color="error">
                        Generating suggestions is taking longer than expected.
                      </Typography>
                    )}
                  </Stack>
                )}
              </Stack>
            )}

            {/* List of questions */}
            <Stack
              direction={"column"}
              justifyContent={"flex-start"}
              alignItems={"flex-start"}
              spacing={4}
              sx={{ width: "100%" }}
            >
              <Typography variant="h6">
                {selectedTopic === "" ? "All" : toTitleCase(selectedTopic)}{" "}
                Questions ({questions.length})
              </Typography>
              <Stack direction={"column"} spacing={6} sx={{ width: "100%" }}>
                {questions.map((cell, index) => (
                  <TopicCell key={index} cell_id={cell} />
                ))}
              </Stack>
            </Stack>
          </Stack>
        )}
      </Dialog>
      {/* Edit topics dialog */}
      <EditTopicsDialog
        open={editTopicsOpen}
        handleClose={handleEditTopicsClose}
        handleUpdateAnalysis={handleUpdateAnalysis}
        setSelectedTopic={setSelectedTopic}
      />
      {/* Server error dialog */}
      <ErrorDialog
        key={"serverError"}
        openDialog={serverError}
        handleCloseDialog={handleCloseServerError}
        dialogTitle={"Error in Topic Analysis"}
        dialogContent={
          "An error occurred while running the topic analysis. Please try again. If the problem persists, please contact support at ccc-coalesce@media.mit.edu."
        }
      />
      <HelpGuideDialog
        open={openHelpGuide}
        handleClose={handleCloseHelpGuide}
        tab={"topic_analysis"}
      />
    </ThemeProvider>
  );
}

export default AnalyzeTopics;
