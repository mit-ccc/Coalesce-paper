import React, { useState, useEffect, useRef } from "react";

import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import { styled } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import { IconButton } from "@mui/material";
import { Stack } from "@mui/system";

import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import AddIcon from "@mui/icons-material/Add";
import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

import { Container, Draggable } from "@edorivai/react-smooth-dnd";
import { arrayMoveImmutable } from "array-move";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import {
  addSection,
  moveSection,
  updateEngagementType,
} from "../../store/projectDetailsSlice";
import { addEvent } from "../../store/userTrackingSlice";

import { engagementTypeName } from "../../utils";

const drawerWidth = 300;

//   Set style for DrawerHeader component
const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

function SectionList(props) {
  // content in left drawer of SurveyBuilder

  const dispatch = useDispatch();

  // get the sections from the store
  const sections = useSelector((state) => state.projectDetails.sections);

  // get the project_id from the store
  const projectId = useSelector((state) => state.projectDetails.project_id);

  // get the response to question # 4 from the store
  const projectContext = useSelector((state) => state.projectContext.context);

  // get the cells from the store (for user tracking)
  const cells = useSelector((state) => state.projectDetails.cells);

  // state variable for the engagementType
  const [engagementType, setEngagementType] = useState("");

  useEffect(() => {
    if (!projectContext || !projectContext["4"]) {
      return;
    }
    const q4Response = projectContext["4"].response;
    if (q4Response in engagementTypeName) {
      setEngagementType(engagementTypeName[q4Response]);
    } else {
      // project is in the old structure where the engagement type question had an id of 6
      const q6Response = projectContext["6"].response;
      if (q6Response in engagementTypeName) {
        setEngagementType(engagementTypeName[q6Response]);
      }
    }
  }, [projectContext]);

  // call updateEngagementType when engagementType changes
  useEffect(() => {
    // console.log("Engagement Type: " + engagementType);
    dispatch(updateEngagementType({ engagement_type: engagementType }));
  }, [engagementType]);

  // state variable for total time estimate
  const [totalTime, setTotalTime] = useState(0);

  // calculate the total time estimate from the cell time estimates
  useEffect(() => {
    let total = 0;
    Object.values(cells).forEach((cell) => {
      total += cell.time_estimate;
    });
    // round to 1 decimal place
    total = Math.round(total * 10) / 10;
    setTotalTime(total);
  }, [cells]);

  // function to calculate the time estimate for a section
  const calculateSectionTimeEstimate = (sectionIndex) => {
    let timeEstimate = 0;
    Object.values(cells).forEach((cell) => {
      if (cell.section_index === sectionIndex) {
        timeEstimate += cell.time_estimate;
      }
    });
    // round to 1 decimal place
    timeEstimate = Math.round(timeEstimate * 10) / 10;
    return timeEstimate;
  };

  // // for testing only, print sections
  // useEffect(() => {
  //     console.log(sections);
  // }, [sections]);

  // handles the scrolling when the user clicks on one of
  // the sections in the drawer
  const handleScroll = (index) => {
    // console.log("Scrolling to section " + index);
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "scrollToSection",
        eventDetail: {
          section: sections[index],
        },
      })
    );
    // setActiveIndex(index);
    const item = props.sectionRefs.current[index].current;
    const appBarHeight =
      props.sectionRefs.current[props.sectionRefs.current.length - 1].current
        .clientHeight;
    // console.log(item);
    if (item) {
      window.scrollTo({
        behavior: "smooth",
        top: item.offsetTop - appBarHeight - 30,
      });
    }
  };

  // onClick for the add section button
  const handleAddSection = () => {
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "addSectionToBottom",
        eventDetail: {},
      })
    );
    // console.log("Add Section");
    dispatch(addSection());
    // wait till the new section is added to the store before scrolling
    setTimeout(() => {
      handleScroll(sections.length);
    }, 100);
  };

  // function to handle the drag and drop of sections
  const onDrop = ({ removedIndex, addedIndex }) => {
    // console.log(removedIndex, addedIndex);
    if (removedIndex !== null && addedIndex !== null) {
      let newSectionList = arrayMoveImmutable(
        sections,
        removedIndex,
        addedIndex
      );
      // update the section.id field in the newSectionList to be the index
      newSectionList = newSectionList.map((section, index) => {
        return { ...section, id: index };
      });
      // add event to user tracking
      dispatch(
        addEvent({
          projectId: projectId,
          eventType: "moveSection",
          eventDetail: {
            previous_sections: sections,
            new_sections: newSectionList,
          },
        })
      );
      dispatch(moveSection({ new_sections: newSectionList }));
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Drawer
        variant="persistent"
        anchor="left"
        open={props.open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <DrawerHeader />
        <Stack
          direction="column"
          alignItems="center"
          spacing={0.5}
          sx={{
            paddingBottom: 2,
          }}
        >
          <List dense={false} sx={{ width: "100%" }}>
            <ListItem key="header">
              <ListItemText
                primary="Sections"
                primaryTypographyProps={{ fontSize: 20, marginBottom: -1 }}
              />
            </ListItem>
            {/* Insert total time estimate with time icon in front */}
            <ListItem key="total-time">
              <ListItemAvatar sx={{ mr: -2 }}>
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                  }}
                >
                  <AccessTimeFilledIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`Takes around ${totalTime} minutes to complete the ${engagementType}`}
                primaryTypographyProps={{ fontSize: 14 }}
              />
            </ListItem>
            <Container lockAxis="y" onDrop={onDrop}>
              {sections.map((section, index) => {
                return (
                  <Draggable key={index}>
                    <ListItem
                      button
                      onClick={() => handleScroll(index)}
                      key={index}
                    >
                      <ListItemAvatar sx={{ mr: -2 }}>
                        <Avatar
                          sx={{
                            width: 24,
                            height: 24,
                            fontSize: 14,
                          }}
                        >
                          {index + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={section.title}
                        primaryTypographyProps={{ mb: 0.25, fontSize: 14 }}
                        secondary={
                          calculateSectionTimeEstimate(section.id) + " min"
                        }
                        secondaryTypographyProps={{ fontSize: 12 }}
                      />
                      <Tooltip title="Move Section">
                        <IconButton
                          disableFocusRipple={true}
                          disableRipple={true}
                          variant="secondary"
                        >
                          <DragIndicatorIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItem>
                  </Draggable>
                );
              })}
            </Container>
          </List>
          {/* Create the add section button */}
          <Tooltip title="Add Section">
            <IconButton
              onClick={handleAddSection}
              disableFocusRipple={true}
              disableRipple={true}
            >
              <Avatar variant="button">
                <AddIcon />
              </Avatar>
            </IconButton>
          </Tooltip>
        </Stack>
      </Drawer>
    </ThemeProvider>
  );
}

export default SectionList;
