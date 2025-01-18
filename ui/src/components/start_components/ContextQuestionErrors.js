import React, { useState, useEffect } from "react";
import Stack from "@mui/material/Stack";
import { Typography } from "@mui/material";
import Link from "@mui/material/Link";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { addIgnoredWarning } from "../../store/projectContextSlice";
import { addEvent } from "../../store/userTrackingSlice";

function ContextQuestionErrors(props) {
  // component for all the errors and warnings for a context question
  // props takes in the question_id and is_disabled

  const dispatch = useDispatch();

  // get the question from the store
  const question = useSelector(
    (state) => state.projectContext.context[props.question_id]
  );

  // get the project id from the store
  const project_id = useSelector((state) => state.projectContext.project_id);

  // state variable to determine if the question has two parts
  const [hasTwoParts, setHasTwoParts] = useState(false);

  useEffect(() => {
    if ("part_2_cell_details" in question) {
      // console.log("Question has two parts");
      setHasTwoParts(true);
    }
  }, [question]);

  // function to ignore a warning
  const handleIgnoreWarning = (warning) => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "clickIgnoreWarning",
        eventDetail: {
          question_id: props.question_id,
          response_text:
            question.response +
            (hasTwoParts ? ": " + question.part_2_response : ""),
          warning_message: warning,
        },
      })
    );
    dispatch(
      addIgnoredWarning({ question_id: props.question_id, warning: warning })
    );
  };

  // variable for whether to show all warnings
  const [showAllWarnings, setShowAllWarnings] = useState(false);

  // function to show all warnings
  const handleShowAllWarnings = () => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: project_id,
        eventType: "clickShowMoreWarnings",
        eventDetail: {
          question_id: props.question_id,
          response_text:
            question.response +
            (hasTwoParts ? ": " + question.part_2_response : ""),
          warnings: question.warnings,
        },
      })
    );
    setShowAllWarnings(true);
  };

  return (
    <ThemeProvider theme={theme}>
      <Stack
        direction={"column"}
        justifyContent={"flex-start"}
        alignItems={"flex-start"}
        spacing={3}
      >
        {/* If both errors and warnings are empty, display a message */}
        {question.checked_warnings &&
          question.errors.length === 0 &&
          question.warnings.length === 0 && (
            <Typography variant="body1" color={theme.palette.success.main}>
              There are no errors or suggestions for this question.
            </Typography>
          )}

        {question.errors.map((error, index) => (
          <Stack
            direction={"row"}
            justifyContent={"flex-start"}
            alignItems={"center"}
            spacing={1}
            key={index}
          >
            <ErrorIcon color="error" />
            <Typography variant="body1" color="error">
              {error}
            </Typography>
          </Stack>
        ))}

        {/* Display the first three warnings if showAllWarnings is false
                    Display all warnings if showAllWarnings is true*/}
        {showAllWarnings === true
          ? question.warnings.map((warning, index) => (
              <Stack
                direction={"row"}
                justifyContent={"flex-start"}
                alignItems={"flex-start"}
                spacing={1}
                key={index}
              >
                <WarningIcon color="warning" />
                <Stack
                  direction={"column"}
                  justifyContent={"flex-start"}
                  alignItems={"flex-start"}
                  spacing={1}
                >
                  <Typography variant="body1" color="warning">
                    {warning}
                  </Typography>
                  <Link
                    // color="inherit"
                    sx={{
                      cursor: props.is_disabled ? "not-allowed" : "pointer",
                    }}
                    onClick={() => {
                      if (props.is_disabled) {
                        return;
                      }
                      //   console.log("Ignore warning: ", warning);
                      handleIgnoreWarning(warning);
                    }}
                  >
                    Ignore
                  </Link>
                </Stack>
              </Stack>
            ))
          : question.warnings.slice(0, 3).map((warning, index) => (
              <Stack
                direction={"row"}
                justifyContent={"flex-start"}
                alignItems={"flex-start"}
                spacing={1}
                key={index}
              >
                <WarningIcon color="warning" />
                <Stack
                  direction={"column"}
                  justifyContent={"flex-start"}
                  alignItems={"flex-start"}
                  spacing={1}
                >
                  <Typography variant="body1" color="warning">
                    {warning}
                  </Typography>
                  <Link
                    // color="inherit"
                    sx={{
                      cursor: props.is_disabled ? "not-allowed" : "pointer",
                    }}
                    onClick={() => {
                      if (props.is_disabled) {
                        return;
                      }
                      //   console.log("Ignore warning: ", warning);
                      handleIgnoreWarning(warning);
                    }}
                  >
                    Ignore
                  </Link>
                </Stack>
              </Stack>
            ))}

        {question.warnings.length > 3 && showAllWarnings === false && (
          <Link
            sx={{
              cursor: props.is_disabled ? "not-allowed" : "pointer",
            }}
            onClick={() => {
              if (props.is_disabled) {
                return;
              }
              // console.log("View all warnings");
              handleShowAllWarnings();
            }}
          >
            Show more warnings
          </Link>
        )}
      </Stack>
    </ThemeProvider>
  );
}

export default ContextQuestionErrors;
