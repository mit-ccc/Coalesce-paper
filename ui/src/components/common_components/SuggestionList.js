import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Carousel from "react-material-ui-carousel";
// import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";

// helper components
import TentativeCell from "./TentativeCell";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import CancelIcon from "@mui/icons-material/Cancel";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// redux stuff
import { useSelector, useDispatch } from "react-redux";
import { addEvent } from "../../store/userTrackingSlice";

function SuggestionList(props) {
  // accordian with suggestions and the ability to navigate between suggestions

  // props includes the list of suggestions (list of JSONs), suggestion_type
  // accordian_id (topic_name or something for check_question)
  // and handleChooseCell function

  // // for testing only, print suggestion_type
  // useEffect(() => {
  //   console.log("Suggestion Type: ", props.suggestion_type);
  // }, [props.suggestion_type]);

  const dispatch = useDispatch();

  // get the project_id from the Redux store
  const projectId = useSelector((state) => state.projectDetails.project_id);

  // local state for whether the accordian is expanded
  const [expanded, setExpanded] = useState(false);

  const handleAccordionClick = () => {
    // add event to user tracking
    if (!expanded) {
      if (props.suggestion_type === "check_question") {
        dispatch(
          addEvent({
            projectId: projectId,
            eventType: "expandCheckQuestionSuggestions",
            eventDetail: {
              cell_id: props.accordian_id,
            },
          })
        );
      } else if (props.suggestion_type === "add") {
        dispatch(
          addEvent({
            projectId: projectId,
            eventType: "expandTopicAdditionSuggestions",
            eventDetail: {
              topic_name: props.accordian_id,
            },
          })
        );
      } else if (props.suggestion_type === "delete") {
        dispatch(
          addEvent({
            projectId: projectId,
            eventType: "expandTopicDeletionSuggestions",
            eventDetail: {
              topic_name: props.accordian_id,
            },
          })
        );
      }
    } else {
      if (props.suggestion_type === "check_question") {
        dispatch(
          addEvent({
            projectId: projectId,
            eventType: "collapseCheckQuestionSuggestions",
            eventDetail: {
              cell_id: props.accordian_id,
            },
          })
        );
      } else if (props.suggestion_type === "add") {
        dispatch(
          addEvent({
            projectId: projectId,
            eventType: "collapseTopicAdditionSuggestions",
            eventDetail: {
              topic_name: props.accordian_id,
            },
          })
        );
      } else if (props.suggestion_type === "delete") {
        dispatch(
          addEvent({
            projectId: projectId,
            eventType: "collapseTopicDeletionSuggestions",
            eventDetail: {
              topic_name: props.accordian_id,
            },
          })
        );
      }
    }
    // if we are collapsing the accordion, reset the current suggestion index
    if (expanded) {
      setCurrentSuggestionIndex(0);
    }
    setExpanded(!expanded);
  };

  // local state variable for the index of the current suggestion
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);

  // when props.accordian_id changes, reset the expanded state
  useEffect(() => {
    setExpanded(false);
    // reset the carousel to the first suggestion
    setCurrentSuggestionIndex(0);
  }, [props.accordian_id]);

  // function to handle the change in the current suggestion index
  const handleChangeIndex = (index) => {
    // add event to user tracking
    if (props.suggestion_type === "check_question") {
      dispatch(
        addEvent({
          projectId: projectId,
          eventType: "moveToDifferentCheckQuestionSuggestion",
          eventDetail: {
            cell_id: props.accordian_id,
            previous_suggestion_index: currentSuggestionIndex,
            new_suggestion_index: index,
            previous_suggestion: props.suggestions[currentSuggestionIndex],
            new_suggestion: props.suggestions[index],
          },
        })
      );
    } else if (props.suggestion_type === "add") {
      dispatch(
        addEvent({
          projectId: projectId,
          eventType: "moveToDifferentTopicAdditionSuggestion",
          eventDetail: {
            topic_name: props.accordian_id,
            previous_suggestion_index: currentSuggestionIndex,
            new_suggestion_index: index,
            previous_suggestion: props.suggestions[currentSuggestionIndex],
            new_suggestion: props.suggestions[index],
          },
        })
      );
    } else if (props.suggestion_type === "delete") {
      dispatch(
        addEvent({
          projectId: projectId,
          eventType: "moveToDifferentTopicDeletionSuggestion",
          eventDetail: {
            topic_name: props.accordian_id,
            previous_suggestion_index: currentSuggestionIndex,
            new_suggestion_index: index,
            previous_suggestion: props.suggestions[currentSuggestionIndex],
            new_suggestion: props.suggestions[index],
          },
        })
      );
    }
    setCurrentSuggestionIndex(index);
  };

  // local state variable for the suggestions
  const [suggestions, setSuggestions] = useState(props.suggestions);

  // function to order the suggestions by length
  const orderSuggestions = (suggestions) => {
    if (!suggestions) {
      return [];
    }
    // sort the suggestions by the number of response categories
    // where larger number of response categories come first
    return suggestions.sort((a, b) => {
      if (
        a.cell_details.response_categories.length ==
        b.cell_details.response_categories.length
      ) {
        // compare the length of the sum of the main_text and description fields
        // where longer length comes first
        return (
          b.cell_details.main_text.length +
          b.cell_details.description.length -
          (a.cell_details.main_text.length + a.cell_details.description.length)
        );
      } else {
        return (
          b.cell_details.response_categories.length -
          a.cell_details.response_categories.length
        );
      }
    });
  };

  // when props.suggestions changes, update the local state variable
  useEffect(() => {
    // make copy of props.suggestions
    let suggestionCopy = [...props.suggestions];
    // console.log("Original Suggestions: ", suggestionCopy);
    // order the suggestions by length
    const orderedSuggestions = orderSuggestions(suggestionCopy);
    // console.log("Ordered Suggestions: ", orderedSuggestions);
    setSuggestions(orderedSuggestions);
    // if the current suggestion index is no longer valid, reset it
    if (currentSuggestionIndex >= orderedSuggestions.length) {
      setCurrentSuggestionIndex(0);
    }
  }, [props.suggestions]);

  // FINDING MAX HEIGHT FOR CAROUSEL
  // Check if it works after connecting with LLM --> this one seems to work!
  // (the generate multiple options maxHeight code doesn't work)
  // Reference GenerateOptionsDialog for a temp fix

  // state variable for max height of Box containing suggestions
  const [maxHeight, setMaxHeight] = useState(0);

  // set maxHeight by going through the height of each suggestion
  useEffect(() => {
    if (!expanded) {
      return;
    }
    let max = 0;
    suggestions.forEach((_suggestion, index) => {
      // check if the element exists
      if (
        document.getElementById(`suggestion_${index}_${props.accordian_id}`)
      ) {
        let height = document.getElementById(
          `suggestion_${index}_${props.accordian_id}`
        ).clientHeight;
        // console.log(props.suggestion_type, props.accordian_id);
        // console.log("Height", index, height);
        if (height > max) {
          max = height;
        }
      }
    });
    setMaxHeight(max);
  }, [props.accordian_id, expanded]);

  // // for testing only, print maxHeight
  // useEffect(() => {
  //   console.log("Max Height: ", maxHeight);
  // }, [maxHeight]);

  return (
    <ThemeProvider theme={theme}>
      <Accordion
        expanded={expanded}
        onChange={handleAccordionClick}
        sx={{
          width: "100%",
          overflow: "hidden",
          border: `2px solid #bdbdbd`,
          mt: props.suggestion_type === "check_question" ? 2 : 4,
          backgroundColor: "#f5f5f5",
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Typography variant="body1" component="div">
            {/* {expanded ? "Collapse" : "Expand"}  */}
            {props.suggestion_type === "check_question" &&
              "Improvement Suggestions"}
            {props.suggestion_type === "add" && "Suggestions for Addition"}
            {props.suggestion_type === "delete" && "Suggestions for Deletion"}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* If there are no suggestions, display a message */}
          {suggestions.length === 0 ? (
            <Typography variant="body1" component="div">
              No more suggestions
            </Typography>
          ) : (
            // If there are suggestions, display them
            <Carousel
              indicators={suggestions.length > 1 ? true : false}
              navButtonsAlwaysInvisible={suggestions.length === 1}
              navButtonsAlwaysVisible={suggestions.length > 1}
              autoPlay={false}
              animation="slide"
              fullHeightHover={false}
              duration={500}
              height={maxHeight + 10}
              index={currentSuggestionIndex}
              onChange={(index) => handleChangeIndex(index)}
              swipe={false}
            >
              {suggestions.map((suggestion, suggestion_index) => (
                <Box
                  sx={{ flexGrow: 1 }}
                  key={suggestion_index}
                  id={`suggestion_${suggestion_index}_${props.accordian_id}`}
                >
                  <Stack
                    direction="column"
                    alignItems={"center"}
                    justifyContent={"center"}
                    spacing={2}
                  >
                    {/* If suggestion has the rationale field, display it */}
                    {suggestion.rationale && (
                      <Box
                        sx={{
                          flexGrow: 1,
                          width: { xs: "95%", sm: "80%" },
                        }}
                      >
                        <Typography variant="body1" component="div">
                          {suggestion.rationale}
                        </Typography>
                      </Box>
                    )}
                    {props.suggestion_type === "check_question" && (
                      <Box
                        sx={{
                          flexGrow: 1,
                          width: { xs: "95%", sm: "80%" },
                        }}
                      >
                        {suggestion.flagged_checks.length > 0 ? (
                          <Typography variant="body1" component="div">
                            {
                              <div>
                                This question improves on{" "}
                                {suggestion.fixed_checks.map(
                                  (check, check_index) => {
                                    return (
                                      <span key={check_index}>
                                        <b key={check_index}>
                                          {check}
                                          {check_index <
                                          suggestion.fixed_checks.length - 1
                                            ? ", "
                                            : ""}
                                        </b>
                                        <span>
                                          {suggestion.fixed_checks.length >=
                                            2 &&
                                          check_index ===
                                            suggestion.fixed_checks.length - 2
                                            ? "and "
                                            : ""}
                                        </span>
                                      </span>
                                    );
                                  }
                                )}{" "}
                                but not on{" "}
                                {suggestion.flagged_checks.map(
                                  (check, check_index) => {
                                    return (
                                      <span key={check_index}>
                                        <b key={check_index}>
                                          {check}
                                          {check_index <
                                          suggestion.flagged_checks.length - 1
                                            ? ", "
                                            : ""}
                                        </b>
                                        <span>
                                          {suggestion.flagged_checks.length >=
                                            2 &&
                                          check_index ===
                                            suggestion.flagged_checks.length - 2
                                            ? "and "
                                            : ""}
                                        </span>
                                      </span>
                                    );
                                  }
                                )}
                                .
                              </div>
                            }
                          </Typography>
                        ) : (
                          <Typography variant="body1" component="div">
                            {
                              <div>
                                This question improves on{" "}
                                {suggestion.fixed_checks.map(
                                  (check, check_index) => {
                                    return (
                                      <span key={check_index}>
                                        <b key={check_index}>
                                          {check}
                                          {check_index <
                                          suggestion.fixed_checks.length - 1
                                            ? ", "
                                            : ""}
                                        </b>
                                        <span>
                                          {suggestion.fixed_checks.length >=
                                            2 &&
                                          check_index ===
                                            suggestion.fixed_checks.length - 2
                                            ? "and "
                                            : ""}
                                        </span>
                                      </span>
                                    );
                                  }
                                )}
                                .
                              </div>
                            }
                          </Typography>
                        )}
                      </Box>
                    )}
                    <TentativeCell
                      type={
                        props.suggestion_type === "add"
                          ? "add_question"
                          : props.suggestion_type === "delete"
                          ? "delete_question"
                          : "check_question"
                      }
                      topic_name={props.accordian_id}
                      cellInfo={suggestion}
                      handleChooseCell={props.handleChooseCell}
                      suggestion_id={suggestion_index}
                    />
                  </Stack>
                </Box>
              ))}
            </Carousel>
          )}
        </AccordionDetails>
      </Accordion>
    </ThemeProvider>
  );
}

export default SuggestionList;
