import React, { useState, useEffect } from "react";

import Section from "./Section";

import { Stack } from "@mui/material";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

import { Container, Draggable } from "@edorivai/react-smooth-dnd";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { moveCell } from "../../store/projectDetailsSlice";
import { addEvent } from "../../store/userTrackingSlice";

function QuestionList(props) {
  // content in right panel of SurveyBuilder

  const dispatch = useDispatch();

  // get the sections from the store
  const sections = useSelector((state) => state.projectDetails.sections);

  // get the project_id from the store
  const projectId = useSelector((state) => state.projectDetails.project_id);

  // get the cells from the store (for user tracking)
  const cells = useSelector((state) => state.projectDetails.cells);

  // local state variables to keep track of potential drag and drop of cells
  const [startDrag, setStartDrag] = useState({
    prev_section_index: null,
    prev_cell_index: null,
  });
  const [endDrag, setEndDrag] = useState({
    new_section_index: null,
    new_cell_index: null,
  });

  // // for testing only
  // useEffect(() => {
  //     console.log(startDrag);
  // }, [startDrag]);

  // // for testing only
  // useEffect(() => {
  //     console.log(endDrag);
  // }, [endDrag]);

  // function to handle the drag and drop of cells
  const onDrop = (section_id, dropResult) => {
    // console.log(dropResult);
    // if dropResult.removedIndex and dropResult.addedIndex is not null,
    // then cell is being moved within a section
    // set dragInfo
    if (dropResult.removedIndex !== null && dropResult.addedIndex !== null) {
      setStartDrag({
        prev_section_index: section_id,
        prev_cell_index: dropResult.removedIndex,
      });
      setEndDrag({
        new_section_index: section_id,
        new_cell_index: dropResult.addedIndex,
      });
    }
    // if dropResult.removedIndex is not null, then a cell is being dragged
    // set dragInfo
    else if (dropResult.removedIndex !== null) {
      setStartDrag({
        prev_section_index: section_id,
        prev_cell_index: dropResult.removedIndex,
      });
    }
    // else if dropResult.addedIndex is not null, then a cell is being dropped
    // update dragInfo, dispatch movement, and reset dragInfo
    else if (dropResult.addedIndex !== null) {
      setEndDrag({
        new_section_index: section_id,
        new_cell_index: dropResult.addedIndex,
      });
    }
  };

  // when both startDrag and endDrag are set, dispatch the movement
  useEffect(() => {
    if (
      startDrag.prev_section_index !== null &&
      endDrag.new_section_index !== null
    ) {
      // console.log("Previous Section Index: ", startDrag.prev_section_index, "at Cell Index: ", startDrag.prev_cell_index);
      // console.log("New Section Index: ", endDrag.new_section_index, "at Cell Index: ", endDrag.new_cell_index);
      // prepare some variables for event tracking
      const previous_section = { ...sections[startDrag.prev_section_index] };
      const previous_section_cells = Object.values(cells).filter(
        (cell) => cell.section_index === startDrag.prev_section_index
      );
      const moved_within_section =
        startDrag.prev_section_index === endDrag.new_section_index;
      // create new_section
      // get the cell_id
      const cell_id =
        sections[startDrag.prev_section_index].cells[startDrag.prev_cell_index];
      let new_section = { ...sections[endDrag.new_section_index] };
      // if moved within section, remove cell_id from new_section.cells
      if (moved_within_section) {
        new_section.cells = new_section.cells.filter(
          (cell) => cell !== cell_id
        );
      }
      // add cell_id to new_section at new_cell_index
      new_section.cells = [
        ...new_section.cells.slice(0, endDrag.new_cell_index),
        cell_id,
        ...new_section.cells.slice(endDrag.new_cell_index),
      ];
      // get the new_section_cells
      let new_section_cells = Object.values(cells).filter(
        (cell) => cell.section_index === endDrag.new_section_index
      );
      // if not moved within section, add cell to new_section_cells
      if (!moved_within_section) {
        new_section_cells.push(cells[cell_id]);
      }
      // add event to user tracking
      dispatch(
        addEvent({
          projectId: projectId,
          eventType: moved_within_section
            ? "moveCellWithinSection"
            : "moveCellToDifferentSection",
          eventDetail: {
            previous_section: previous_section,
            previous_section_cells: previous_section_cells,
            new_section: new_section,
            new_section_cells: new_section_cells,
          },
        })
      );
      // dispatch movement
      dispatch(
        moveCell({
          prev_section_index: startDrag.prev_section_index,
          prev_cell_index: startDrag.prev_cell_index,
          new_section_index: endDrag.new_section_index,
          new_cell_index: endDrag.new_cell_index,
        })
      );
      // reset dragInfo
      setStartDrag({
        prev_section_index: null,
        prev_cell_index: null,
      });
      setEndDrag({
        new_section_index: null,
        new_cell_index: null,
      });
    }
  }, [startDrag, endDrag]);

  // // for testing only: print the sections
  // useEffect(() => {
  //     console.log(sections);
  // }, [sections]);

  return (
    <ThemeProvider theme={theme}>
      <Stack direction="column" spacing={2} style={{ padding: 20 }}>
        <Container
          lockAxis="y"
          orientation="vertical"
          onDrop={(e) => {}}
          // nonDragAreaSelector=".non-draggy"
          dragHandleSelector=".draggy"
          groupName="moveCell"
          shouldAnimateDrop={() => false}
          shouldAcceptDrop={() => false}
        >
          {sections.map((_section, index) => {
            return (
              <Draggable key={index}>
                <Section
                  key={index}
                  sectionRef={props.sectionRefs.current[index]}
                  section_id={index}
                  onDrop={onDrop}
                />
              </Draggable>
            );
          })}
        </Container>
      </Stack>
    </ThemeProvider>
  );
}

export default QuestionList;
