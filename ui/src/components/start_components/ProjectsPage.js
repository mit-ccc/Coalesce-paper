import React, { useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { Typography } from "@mui/material";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// routing
import { useNavigate } from "react-router-dom";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { addProject, deleteProject } from "../../store/userProjectsSlice";
import {
  initProjectContext,
  setProjectContext,
  resetEdited,
} from "../../store/projectContextSlice";
import {
  setProjectDetails,
  resetCellHistory,
  resetClassificationList,
} from "../../store/projectDetailsSlice";
import {
  setTopics,
  resetTopicSlice,
  resetNeedToSave,
} from "../../store/analyzeTopicsSlice";
import { addEvent } from "../../store/userTrackingSlice";
import { resetGenerateOptions } from "../../store/generateOptionsSlice";
import { resetChecks } from "../../store/questionChecksSlice";
import { setLastSaved } from "../../store/userProjectsSlice";

import CustomAppBar from "../common_components/CustomAppBar";
import MoreMenu from "../common_components/MoreMenu";
import ConfirmationDialog from "../common_components/ConfirmationDialog";
import {
  timeoutPromise,
  saveProjectDetails,
  saveProjectContext,
  saveAnalyzeTopics,
} from "../../utils";
import ErrorDialog from "../common_components/ErrorDialog";

function ProjectsPage(props) {
  // page with list of user's projects

  const navigate = useNavigate();

  const dispatch = useDispatch();

  // get the list of user projects from the store
  const projects = useSelector((state) => state.userProjects.projects);

  // // for testing only. print out projects
  // useEffect(() => {
  //     console.log(projects);
  // }, [projects]);

  // CODE TO SAVE THE DATA

  // get all the necessary info from the redux store
  const projectDetails = useSelector((state) => state.projectDetails);
  const projectContext = useSelector((state) => state.projectContext);
  const analyzeTopics = useSelector((state) => state.analyzeTopics);

  const handleSave = async () => {
    // console.log("Auto save from the projects page");
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
  };

  // state variable for error message
  const [serverErrorOpenProject, setServerErrorOpenProject] = useState(false);

  // function to close the server error dialog
  const handleCloseServerErrorOpenProject = () => {
    setServerErrorOpenProject(false);
  };

  const handleOpenProjectClick = async (project_id) => {
    // console.log("Open project button clicked");
    // first save the data
    await handleSave();
    // console.log(project_id);
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: "user_level",
        eventType: "openProject",
        eventDetail: {
          project_id: project_id,
        },
      })
    );
    // call load_project API to get the project details
    let data = {
      project_id: project_id,
    };
    timeoutPromise(
      10000,
      fetch("/api/load_project", {
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
        // update the projectContextSlice
        dispatch(
          setProjectContext({
            project_id: project_id,
            context: data.project.context_response,
          })
        );
        // if data.project.analyze_topics_info is empty object then reset the analyzeTopicsSlice
        if (
          Object.keys(data.project.analyze_topics_info).length === 0 ||
          Object.keys(data.project.analyze_topics_info.topics).length === 0
        ) {
          // console.log("No topics found");
          dispatch(resetTopicSlice());
        } else {
          // update the analyzeTopicsSlice
          // console.log(data.project.analyze_topics_info);
          // sort the topics so the topics with 0 cells are at the end
          let sortedTopics = {};
          Object.keys(data.project.analyze_topics_info.topics)
            .sort((a, b) => {
              if (
                data.project.analyze_topics_info.topics[a].cells.length === 0
              ) {
                return 1;
              } else if (
                data.project.analyze_topics_info.topics[b].cells.length === 0
              ) {
                return -1;
              } else {
                return 0;
              }
            })
            .forEach((key) => {
              sortedTopics[key] = data.project.analyze_topics_info.topics[key];
            });

          // console.log(sortedTopics);

          dispatch(
            setTopics({
              topics: sortedTopics,
              human_topics: data.project.human_topics,
              summary: data.project.analyze_topics_info.summary,
              last_analyzed: data.project.analyze_topics_info.last_analyzed,
              suggestions: data.project.analyze_topics_info.suggestions,
            })
          );
        }
        // update projectDetailsSlice
        dispatch(
          setProjectDetails({
            project_id: project_id,
            project_title: data.project.project_title,
            sections: data.project.sections,
            cells: data.cells,
          })
        );
        // reset cell history
        dispatch(resetCellHistory());
        // reset classificationList
        dispatch(resetClassificationList());
        // reset generateOptionsSlice
        dispatch(resetGenerateOptions());
        // reset questionChecksSlice
        dispatch(resetChecks());
        // if the project has no sections, navigate to the newProject page
        if (data.project.sections.length === 0) {
          navigate(`/newProject/${project_id}`);
        } else {
          navigate(`/project/${project_id}`);
        }
      })
      .catch((_error) => {
        console.error("Project not found");
        setServerErrorOpenProject(true);
      });
  };

  // state variable for error message
  const [serverErrorCreateProject, setServerErrorCreateProject] =
    useState(false);

  // function to close the server error dialog
  const handleCloseServerErrorCreateProject = () => {
    setServerErrorCreateProject(false);
  };

  const handleCreateProjectClick = async () => {
    // console.log("Create project button clicked");
    // first save the data
    await handleSave();
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
            eventType: "createProjectFromProjectsPage",
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
        // reset cell history
        dispatch(resetCellHistory());
        // reset classificationList
        dispatch(resetClassificationList());
        // reset analyzeTopicsSlice
        dispatch(resetTopicSlice());
        // reset generateOptionsSlice
        dispatch(resetGenerateOptions());
        // reset questionChecksSlice
        dispatch(resetChecks());
        navigate(`/newProject/${data.project_id}`);
      })
      .catch((_error) => {
        console.error("Error creating project");
        setServerErrorCreateProject(true);
      });
  };

  // CODE FOR DELETE DIALOG

  // state variable for the project to be deleted
  const [projectForDelete, setProjectForDelete] = useState({});

  // state variable for the dialog box
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const handleOpenDeleteDialog = (project) => {
    setProjectForDelete(project);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setProjectForDelete({});
  };

  // state variable for error message
  const [serverErrorDeleteProject, setServerErrorDeleteProject] =
    useState(false);

  // function to close the server error dialog
  const handleCloseServerErrorDeleteProject = () => {
    setServerErrorDeleteProject(false);
  };

  // function to handle the delete project click
  const handleDeleteProjectClick = async (project_id) => {
    // add event to userTrackingSlice
    dispatch(
      addEvent({
        projectId: "user_level",
        eventType: "deleteProject",
        eventDetail: {
          project_id: project_id,
        },
      })
    );
    // call the delete_project API
    let data = {
      project_id: project_id,
    };
    timeoutPromise(
      5000,
      fetch("/api/delete_project", {
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
        // update the projects field in userProjectsSlice
        dispatch(deleteProject(project_id));
      })
      .catch((_error) => {
        console.error("Error deleting project");
        setServerErrorDeleteProject(true);
      });
  };

  return (
    <ThemeProvider theme={theme}>
      <CustomAppBar
        appBarType={"projects"}
        userCode={props.userCode}
        helpGuideTab={"user_page"}
      />
      <Stack
        direction="column"
        justifyContent="flex-start"
        alignItems="flex-start"
        spacing={5}
        style={{
          paddingLeft: 50,
          paddingRight: 50,
          marginTop: 100,
          paddingBottom: 30,
        }}
      >
        <Typography variant="h5">Your Projects</Typography>
        {/* Display the list of project titles */}
        <Stack
          direction="column"
          spacing={3}
          sx={{
            width: "100%",
          }}
        >
          {projects.map((project, index) => {
            return (
              <Stack
                key={index}
                direction={"row"}
                justifyContent={"space-between"}
                alignItems={"center"}
                sx={{
                  width: "100%",
                  ":hover": {
                    backgroundColor: "#f5f5f5",
                  },
                  padding: 1,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    cursor: "default",
                    paddingRight: 2,
                  }}
                >
                  {project.project_title}
                </Typography>
                <Stack direction={"row"} spacing={1}>
                  <Button
                    onClick={() => handleOpenProjectClick(project.project_id)}
                    variant="contained"
                    size="small"
                  >
                    Open
                  </Button>
                  <MoreMenu
                    items={["Delete"]}
                    clickHandlers={[() => handleOpenDeleteDialog(project)]}
                  />
                </Stack>
              </Stack>
            );
          })}
        </Stack>
        <Button
          onClick={handleCreateProjectClick}
          variant="contained"
          size="large"
        >
          Create Project
        </Button>
      </Stack>
      {/* Delete Dialog */}
      <ConfirmationDialog
        openDialog={openDeleteDialog}
        handleCloseDialog={handleCloseDeleteDialog}
        handleConfirm={() => {
          handleDeleteProjectClick(projectForDelete.project_id);
          handleCloseDeleteDialog();
        }}
        dialogTitle={"Confirm Project Deletion"}
        dialogContent={`The ${projectForDelete.project_title} project will be permanently deleted.`}
        confirmText="Delete Project"
        cancelText="Cancel"
      />
      {/* Server error dialog for create project */}
      <ErrorDialog
        key={"serverErrorCreateProject"}
        openDialog={serverErrorCreateProject}
        handleCloseDialog={handleCloseServerErrorCreateProject}
        dialogTitle={"Error when creating new project"}
        dialogContent={
          "An error occurred when creating a new project. Please try again. If the problem persists, please contact support at ccc-coalesce@media.mit.edu."
        }
      />
      {/* Server error dialog for load project */}
      <ErrorDialog
        key={"serverErrorOpenProject"}
        openDialog={serverErrorOpenProject}
        handleCloseDialog={handleCloseServerErrorOpenProject}
        dialogTitle={"Error when loading project"}
        dialogContent={
          "An error occurred when loading in an existing project. Please try again. If the problem persists, please contact support at ccc-coalesce@media.mit.edu."
        }
      />
      {/* Server error dialog for delete project */}
      <ErrorDialog
        key={"serverErrorDeleteProject"}
        openDialog={serverErrorDeleteProject}
        handleCloseDialog={handleCloseServerErrorDeleteProject}
        dialogTitle={"Error when deleting project"}
        dialogContent={
          "An error occurred when deleting a project. Please try again. If the problem persists, please contact support at ccc-coalesce@media.mit.edu."
        }
      />
    </ThemeProvider>
  );
}

export default ProjectsPage;
