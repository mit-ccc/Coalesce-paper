import React, { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import { Typography } from "@mui/material";
import TextField from "@mui/material/TextField";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import Slider from "@mui/material/Slider";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

import InfoButton from "../common_components/InfoButton";
import ContextQuestionErrors from "./ContextQuestionErrors";
import { timeoutPromise } from "../../utils";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import {
  editResponse,
  editErrors,
  editWarnings,
} from "../../store/projectContextSlice";
import { addEvent } from "../../store/userTrackingSlice";

function ContextQuestion(props) {
  // component for a single context question
  // props takes in the question_id and is_disabled and show_warnings_and_errors
  // and show_check_response_button and question_number

  const dispatch = useDispatch();

  // get the question from the store
  const question = useSelector(
    (state) => state.projectContext.context[props.question_id]
  );

  // get the project_id from the store
  const project_id = useSelector((state) => state.projectContext.project_id);

  // // for testing only, print question
  // useEffect(() => {
  //     console.log(question);
  // }, [question]);

  // state variable to determine if the question has two parts
  const [hasTwoParts, setHasTwoParts] = useState(false);

  useEffect(() => {
    if ("part_2_cell_details" in question) {
      // console.log("Question has two parts");
      setHasTwoParts(true);
    }
  }, [question]);

  // state variable to keep track of whether response was updated since last check
  const [responseUpdated, setResponseUpdated] = useState(false);

  // state variable to keep track of response
  const [response, setResponse] = useState("");

  // update response based on text field
  const handleResponseChange = (event) => {
    setResponse(event.target.value);
    setResponseUpdated(true);
  };

  // state variable to keep track of part 2 response
  const [part2Response, setPart2Response] = useState("");

  // update part 2 response based on text field
  const handlePart2ResponseChange = (event) => {
    setPart2Response(event.target.value);
    setResponseUpdated(true);
  };

  // // for testing only, print response
  // useEffect(() => {
  //     console.log(response);
  // }, [response]);

  // function to update the response in the store
  const handleBlur = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "editQuestionResponse",
        eventDetail: {
          question_id: props.question_id,
          previous_response_text:
            question.response +
            (hasTwoParts ? ": " + question.part_2_response : ""),
          new_response_text:
            response + (hasTwoParts ? ": " + part2Response : ""),
          is_changed:
            question.response !== response ||
            (hasTwoParts && question.part_2_response !== part2Response),
        },
      })
    );
    dispatch(
      editResponse({
        question_id: props.question_id,
        response: response,
        part_2_response: hasTwoParts ? part2Response : undefined,
      })
    );
  };

  // slider value
  const [sliderValue, setSliderValue] = useState(0);

  // get the response to question 4 from the store
  const question4Response = useSelector(
    (state) => state.projectContext.context[4].response
  );

  // default the slider value based on the response to question 4
  useEffect(() => {
    // if user already answered the slider question, then don't change the value
    if (response !== undefined && response !== "") {
      return;
    }
    // if question4Response is "Survey" then set slider value to 20
    if (question4Response === "Survey") {
      setSliderValue(20);
    } else if (
      question4Response === "Interview" ||
      question4Response === "Conversation Guide"
    ) {
      setSliderValue(80);
    } else {
      setSliderValue(50);
    }
  }, [question4Response]);

  // update slider value
  const handleSliderChange = (event, newValue) => {
    setSliderValue(newValue);
    // also update response (string version of slider value)
    setResponse(newValue.toString());
    setResponseUpdated(true);
  };

  // useEffect to update sliderValue and response when question changes
  useEffect(() => {
    if (question.response !== undefined && question.response !== "") {
      if (question.cell_details.response_format === "slider") {
        setSliderValue(parseInt(question.response));
      }
      if ("part_2_response" in question) {
        setPart2Response(question.part_2_response);
      }
      setResponse(question.response);
    }
  }, [question]);

  // state variable to determine whether to show the linear progress bar
  const [showLinearProgress, setShowLinearProgress] = useState(false);

  // state variable for seconds passed while loading
  const [secondsPassed, setSecondsPassed] = useState(0);

  const timerInterval = useRef();

  // state variable to determine if there was a server error
  const [serverError, setServerError] = useState(false);

  // function to start or stop timer based on showLinearProgress
  useEffect(() => {
    if (showLinearProgress) {
      // console.log("Start check response timer");
      timerInterval.current = setInterval(() => {
        setSecondsPassed((prevSeconds) => prevSeconds + 1);
      }, 1000);
    } else {
      // console.log("Stop check response timer");
      clearInterval(timerInterval.current);
      timerInterval.current = null;
      setSecondsPassed(0);
    }
    return () => clearInterval(timerInterval.current);
  }, [showLinearProgress]);

  // check response function
  const handleCheckResponse = () => {
    console.log("Check response for question ", props.question_id);
    setShowLinearProgress(true);
    setServerError(false);
    // if response is empty or only whitespace, set error message
    if (response.trim() === "") {
      dispatch(
        editErrors({
          question_id: props.question_id,
          errors: ["This is a required question. Please provide a response."],
        })
      );
      // add event to userTrackingSlice
      dispatch(
        addEvent({
          projectId: project_id,
          eventType: "clickCheckQuestionResponse",
          eventDetail: {
            question_id: props.question_id,
            response_text: response + (hasTwoParts ? ": " + part2Response : ""),
            errors: ["This is a required question. Please provide a response."],
            warnings: [],
          },
        })
      );
      setResponseUpdated(false);
      setShowLinearProgress(false);
      return;
    } else if (question.errors.length > 0) {
      dispatch(
        editErrors({
          question_id: props.question_id,
          errors: [],
        })
      );
    }
    // Call back-end to check response
    let data = {
      project_id: project_id,
      context_question_id: props.question_id,
      response_text: response + (hasTwoParts ? ": " + part2Response : ""),
      ignored_warnings: question.ignored_warnings,
    };
    timeoutPromise(
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
        // add event to userTrackingSlice
        dispatch(
          addEvent({
            projectId: project_id,
            eventType: "clickCheckQuestionResponse",
            eventDetail: {
              question_id: props.question_id,
              response_text:
                response + (hasTwoParts ? ": " + part2Response : ""),
              errors: [],
              warnings: data.warnings,
            },
          })
        );
        dispatch(
          editWarnings({
            question_id: props.question_id,
            warnings: data.warnings,
          })
        );
        setResponseUpdated(false);
        setShowLinearProgress(false);
      })
      .catch((_error) => {
        console.error("Error checking response.");
        setServerError(true);
        setShowLinearProgress(false);
      });
  };

  return (
    <ThemeProvider theme={theme}>
      <Stack
        direction="column"
        justifyContent="flex-start"
        alignItems="flex-start"
        spacing={3}
        sx={{
          width: "100%",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Create number */}
          <Avatar
            sx={{
              width: 30,
              height: 30,
              fontSize: 16,
            }}
          >
            {props.question_number}
          </Avatar>

          {/* Question text */}
          <Typography variant="body1">
            {question.cell_details.main_text}
          </Typography>

          {/* Add info button if applicable */}
          {question.cell_details.description !== "" && (
            <InfoButton
              iconType={"info"}
              text={question.cell_details.description}
            />
          )}
        </Stack>

        {/* Deal with the different response formats*/}

        {question.cell_details.response_format === "open" && (
          <TextField
            id="outlined-multiline-static"
            placeholder="Answer here"
            disabled={props.is_disabled}
            multiline
            rows={4}
            fullWidth
            value={response}
            onChange={handleResponseChange}
            onBlur={() => {
              // console.log("Text Question ID: ", props.question_id);
              handleBlur();
            }}
          />
        )}

        {question.cell_details.response_format === "closed" && (
          <FormControl>
            <RadioGroup
              row
              value={response}
              onChange={handleResponseChange}
              sx={{ mt: 0 }}
              onBlur={() => {
                // console.log("MC Question ID: ", props.question_id);
                handleBlur();
              }}
            >
              {question.cell_details.response_categories.map(
                (category, index) => {
                  return (
                    <FormControlLabel
                      key={index}
                      value={category}
                      disabled={props.is_disabled}
                      control={<Radio />}
                      label={category}
                    />
                  );
                }
              )}
            </RadioGroup>
          </FormControl>
        )}

        {question.cell_details.response_format === "slider" && (
          <Box
            sx={{
              width: 800,
            }}
            alignSelf={"center"}
          >
            <Slider
              value={sliderValue}
              onChange={handleSliderChange}
              disabled={props.is_disabled}
              marks={question.cell_details.response_categories}
              step={5}
              valueLabelDisplay="auto"
              onBlur={() => {
                // console.log("Slider Question ID: ", props.question_id);
                handleBlur();
              }}
            />
          </Box>
        )}

        {/* Deal with part 2 if applicable */}
        {hasTwoParts && response !== "" && (
          <Stack direction="column" spacing={2} sx={{ width: "100%" }}>
            <Typography variant="body1">
              {question.part_2_cell_details.main_text}
            </Typography>
            {question.part_2_cell_details.response_format === "open" && (
              <TextField
                id="outlined-multiline-static"
                placeholder="Answer here"
                disabled={props.is_disabled}
                multiline
                rows={4}
                fullWidth
                value={part2Response}
                onChange={handlePart2ResponseChange}
                onBlur={() => {
                  handleBlur();
                }}
              />
            )}
          </Stack>
        )}

        {/* Create check response button */}
        {props.show_check_response_button && (
          <Tooltip
            title={`Click to get suggestions on how to improve your response to question ${props.question_number}, so the AI can generate better questions.`}
            placement="right"
          >
            <span>
              <Button
                size="small"
                variant="outlined"
                onClick={handleCheckResponse}
                disabled={!responseUpdated || showLinearProgress}
              >
                Verify question {props.question_number}
              </Button>
            </span>
          </Tooltip>
        )}

        {/* Display errors if any */}
        {props.show_warnings_and_errors &&
          (showLinearProgress ? (
            <Stack
              direction="column"
              alignItems="flex-start"
              justifyContent="center"
              key={`loading_context_response_${props.question_id}`}
              spacing={2}
              sx={{ width: "95%" }}
            >
              <Box sx={{ width: "100%" }}>
                <LinearProgress />
              </Box>
              {secondsPassed <= 15 ? (
                <Typography variant="body1">
                  Estimated time remaining: {15 - secondsPassed} seconds
                </Typography>
              ) : (
                <>
                  <Typography variant="body1" align="center">
                    Total time elapsed: {secondsPassed} seconds
                  </Typography>
                  <Typography
                    variant="body1"
                    color="error"
                    align="center"
                    // sx={{ width: "60%" }}
                  >
                    Checking your response to question {props.question_number}{" "}
                    is taking longer than expected. Waiting for at most 30
                    seconds.
                  </Typography>
                </>
              )}
            </Stack>
          ) : !serverError ? (
            <ContextQuestionErrors
              question_id={props.question_id}
              is_disabled={props.is_disabled}
            />
          ) : (
            <Stack
              direction="column"
              alignItems="center"
              justifyContent="center"
              key={`server_error_context_response_${props.question_id}`}
            >
              <Typography
                variant="body1"
                color="error"
                align="center"
                // sx={{ width: "60%" }}
              >
                An error occurred while checking your response to question{" "}
                {props.question_number}. Please try again. If the problem
                persists, please contact support at ccc-coalesce@media.mit.edu.
              </Typography>
            </Stack>
          ))}
      </Stack>
    </ThemeProvider>
  );
}

export default ContextQuestion;
