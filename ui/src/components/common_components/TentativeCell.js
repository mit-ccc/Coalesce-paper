import React, { useState, useEffect } from "react";
import { Stack } from "@mui/system";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { Typography } from "@mui/material";
import TextField from "@mui/material/TextField";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Avatar from "@mui/material/Avatar";

import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled";

import ResponseCategories from "./ResponseCategories";

import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { updateSectionIdForSuggestion } from "../../store/analyzeTopicsSlice";
import { addEvent } from "../../store/userTrackingSlice";

function TentativeCell(props) {
  // view only cells that are suggested by LLMs

  // props includes the cellInfo, handleChooseCell
  // and the type (check_question, choose_question, plain, add_question, delete_question)
  // and the topic_name (optional) and letter (optional)
  // suggestion_id

  const dispatch = useDispatch();

  // local state for the response categories
  const [responseCategories, setResponseCategories] = useState(
    props.cellInfo.cell_details.response_categories
  );

  // get the sections from the Redux store
  const sections = useSelector((state) => state.projectDetails.sections);

  // get the project id from the Redux store
  const projectId = useSelector((state) => state.projectDetails.project_id);

  // update responseCategories from props
  useEffect(() => {
    setResponseCategories(props.cellInfo.cell_details.response_categories);
  }, [props.cellInfo.cell_details.response_categories]);

  // // for testing only, print props.cellInfo
  // useEffect(() => {
  //   console.log(props.cellInfo);
  // }, [props.cellInfo]);

  // // for testing only, print props.type
  // useEffect(() => {
  //   console.log("Type: ", props.type);
  // }, [props.type]);

  // CODE FOR SECTION MENU FOR ADDING QUESTIONS

  const [localSectionId, setLocalSectionId] = useState(0);

  useEffect(() => {
    if (
      props.type === "add_question" &&
      props.cellInfo.section_id !== undefined
    ) {
      setLocalSectionId(props.cellInfo.section_id);
    }
  }, [props.cellInfo]);

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleSectionClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseSection = () => {
    setAnchorEl(null);
  };

  // function to handle change in section
  const handleSectionChange = (sectionId) => {
    console.log("Changing section to: ", sectionId);
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "changeSectionForSuggestion",
        eventDetail: {
          topic_name: props.topic_name,
          suggested_cell: props.cellInfo,
          previous_section: sections[localSectionId],
          new_section: sections[sectionId],
        },
      })
    );
    dispatch(
      updateSectionIdForSuggestion({
        topic: props.topic_name,
        main_text: props.cellInfo.cell_details.main_text,
        section_id: sectionId,
      })
    );
    handleCloseSection();
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          flexGrow: 1,
          padding: 2,
          border: `2px solid #e0e0e0`, // or #bdbdbd
          bgcolor: `#FFFFFF`,
          mb: 2,
          // round corners
          borderRadius: 3,
          width: { xs: "95%", sm: "80%" },
          // maxHeight: "400px",
          // overflow: "auto",
        }}
      >
        {props.letter ? (
          <Stack
            direction="row"
            spacing={2}
            alignItems="flex-start"
            justifyContent="flex-start"
          >
            <Avatar>{props.letter.toUpperCase()}</Avatar>
            <Stack
              direction="column"
              alignItems={"flex-start"}
              justifyContent={"center"}
              sx={{ width: "100%" }}
              spacing={0}
            >
              <Typography key="0" variant="body1" component="div">
                {props.cellInfo.cell_details.main_text}
              </Typography>

              {props.cellInfo.cell_details.description !== "" && (
                <Typography
                  key="1"
                  variant="caption"
                  component="div"
                  sx={{ paddingTop: 3 }}
                >
                  {props.cellInfo.cell_details.description}
                </Typography>
              )}

              {props.cellInfo.cell_details.cell_type === "question" && [
                props.cellInfo.cell_details.response_format === "closed" ? (
                  <ResponseCategories
                    key="2"
                    editable={false}
                    responseCategories={responseCategories}
                    updateResponseCategories={setResponseCategories}
                  />
                ) : (
                  <TextField
                    key="1"
                    placeholder="Answer goes here..."
                    disabled={true}
                    fullWidth
                    sx={{ marginTop: 3 }}
                  />
                ),
              ]}
            </Stack>
          </Stack>
        ) : (
          <Stack
            direction="column"
            alignItems={"flex-start"}
            justifyContent={"center"}
            sx={{ width: "100%" }}
            spacing={0}
          >
            <Typography key="0" variant="body1" component="div">
              {props.cellInfo.cell_details.main_text}
            </Typography>

            {props.cellInfo.cell_details.description !== "" && (
              <Typography
                key="1"
                variant="caption"
                component="div"
                sx={{ paddingTop: 3 }}
              >
                {props.cellInfo.cell_details.description}
              </Typography>
            )}

            {props.cellInfo.cell_details.cell_type === "question" && [
              props.cellInfo.cell_details.response_format === "closed" ? (
                <ResponseCategories
                  key="2"
                  editable={false}
                  responseCategories={responseCategories}
                  updateResponseCategories={setResponseCategories}
                />
              ) : (
                <TextField
                  key="1"
                  placeholder="Answer goes here..."
                  disabled={true}
                  fullWidth
                  sx={{ marginTop: 3 }}
                />
              ),
            ]}
          </Stack>
        )}
      </Box>
      {props.type !== "plain" && (
        <Box
          sx={{
            flexGrow: 1,
            width: { xs: "95%", sm: "80%" },
          }}
        >
          <Stack
            direction="column"
            alignItems={"flex-start"}
            justifyContent={"center"}
            spacing={2}
          >
            {/* If cellInfo has the time_estimate field, display it */}
            {props.cellInfo.time_estimate && props.type === "add_question" && (
              <>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                    }}
                  >
                    <AccessTimeFilledIcon />
                  </Avatar>
                  <Typography variant="body1" component="div" align="center">
                    This question would add {props.cellInfo.time_estimate}{" "}
                    minute(s) to the total time estimate.
                  </Typography>
                </Stack>
                <Typography
                  variant="body1"
                  component="div"
                  align="center"
                  sx={{ paddingBottom: 1 }}
                >
                  Add this question to{"  "}
                  <Button
                    size="medium"
                    sx={{
                      padding: 0,
                      paddingLeft: 0.5,
                      paddingRight: 0.5,
                      textTransform: "none",
                    }}
                    onClick={handleSectionClick}
                    variant={"text"}
                  >
                    Section {localSectionId + 1}:{" "}
                    {sections[localSectionId]["title"]}
                  </Button>
                </Typography>
              </>
            )}
            {props.cellInfo.time_estimate &&
              props.type === "delete_question" && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                    }}
                  >
                    <AccessTimeFilledIcon />
                  </Avatar>
                  <Typography variant="body1" component="div">
                    Deleting this question would save{" "}
                    {props.cellInfo.time_estimate} minute(s).
                  </Typography>
                </Stack>
              )}
          </Stack>
          <Stack
            direction="column"
            alignItems={"center"}
            justifyContent={"center"}
          >
            <Button
              variant="contained"
              sx={{
                mt: 1,
              }}
              onClick={() => {
                if (props.type === "add_question") {
                  props.handleChooseCell(localSectionId, props.cellInfo);
                } else if (props.type === "check_question") {
                  props.handleChooseCell(props.cellInfo, props.suggestion_id);
                } else {
                  props.handleChooseCell(props.cellInfo);
                }
              }}
            >
              {(props.type === "choose_question" ||
                props.type === "check_question") &&
                "Choose question"}
              {props.type === "add_question" && "Add question"}
              {props.type === "delete_question" && "Delete question"}
            </Button>
          </Stack>
        </Box>
      )}
      <Menu
        id="long-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseSection}
        keepMounted
      >
        {sections.map((section, _index) => (
          <MenuItem
            key={section.id}
            onClick={() => handleSectionChange(section.id)}
          >
            Section {section.id + 1}: {section.title}
          </MenuItem>
        ))}
      </Menu>
    </ThemeProvider>
  );
}

export default TentativeCell;
