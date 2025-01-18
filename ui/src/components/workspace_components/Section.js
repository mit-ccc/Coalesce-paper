import React from "react";

import { Stack } from "@mui/material";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

import { Container, Draggable } from "@edorivai/react-smooth-dnd";

// helper components
import MoreMenu from "../common_components/MoreMenu";
import SectionHeader from "./SectionHeader";
import Cell from "./Cell";

// redux stuff
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { addCell, deleteCell } from "../../store/projectDetailsSlice";
import { deleteCellFromTopic } from "../../store/analyzeTopicsSlice";
import { addEvent } from "../../store/userTrackingSlice";

import { v4 as uuidv4 } from "uuid";

function Section(props) {
  // content for one section in QuestionList

  // props provides the section_id
  // props also includes the sectionRef for scrolling

  const dispatch = useDispatch();

  // get the section from the store
  const section = useSelector(
    (state) => state.projectDetails.sections[props.section_id]
  );

  // get the project_id from the store
  const projectId = useSelector((state) => state.projectDetails.project_id);

  // get the cells from the store (for user tracking)
  const cells = useSelector((state) => state.projectDetails.cells);

  // function to add a cell to the section
  const handleAddCell = (cell_type) => {
    // console.log("Add Cell");
    // get a new cell_id
    const newCellId = uuidv4();
    // create a new cell object
    let newCell = {};
    if (cell_type === "text") {
      newCell = {
        section_index: props.section_id,
        cell_details: {
          cell_type: "text",
          response_format: "",
          description: "",
          main_text: "",
          response_categories: [],
        },
        last_updated: "",
        // is_ai_generated: 0,
        human_ai_status: "human",
        ai_rationale: "",
        time_estimate: 0,
      };
    } else {
      newCell = {
        section_index: props.section_id,
        cell_details: {
          cell_type: "question",
          response_format: "open",
          description: "",
          main_text: "",
          response_categories: [],
        },
        last_updated: "",
        // is_ai_generated: 0,
        human_ai_status: "human",
        ai_rationale: "",
        time_estimate: 0,
      };
    }
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "addCellToSection",
        eventDetail: {
          new_cell_id: newCellId,
          new_cell_section: section,
          new_cell_type: cell_type,
        },
      })
    );
    // add the new cell to the store
    dispatch(
      addCell({
        cell_id: newCellId,
        cell: newCell,
        section_index: props.section_id,
      })
    );
  };

  // function to delete a cell
  const handleDeleteCell = (cell_id) => {
    // add event to user tracking
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "deleteCellFromBuilder",
        eventDetail: {
          deleted_cell_id: cell_id,
          deleted_cell: cells[cell_id],
        },
      })
    );
    // console.log("Delete Cell");
    // remove the cell from the store
    dispatch(deleteCell({ cell_id: cell_id, section_index: props.section_id }));
    // also remove the cell from the analyzeTopicsSlice
    dispatch(deleteCellFromTopic({ cell_id: cell_id }));
  };

  // // for testing only: print the cells
  // const cells = useSelector((state) => state.projectDetails.cells);
  // useEffect(() => {
  //     console.log(cells);
  // }, [cells]);

  // // for testing only
  // // get the deleted_cells from the store
  // const deleted_cells = useSelector((state) => state.projectDetails.deleted_cells);
  // useEffect(() => {
  //     console.log("Deleted cells: ", deleted_cells);
  // }, [deleted_cells]);
  // // get the edited_cells from the store
  // const edited_cells = useSelector((state) => state.projectDetails.edited_cells);
  // useEffect(() => {
  //     console.log("Edited cells: ", edited_cells);
  // }, [edited_cells]);
  // // get the added_cells from the store
  // const added_cells = useSelector((state) => state.projectDetails.added_cells);
  // useEffect(() => {
  //     console.log("Added cells: ", added_cells);
  // }, [added_cells]);

  return (
    <ThemeProvider theme={theme}>
      <Stack direction="column" spacing={1} style={{ padding: 20 }}>
        <SectionHeader
          number={props.section_id}
          sectionRef={props.sectionRef}
        />
        <Container
          lockAxis="y"
          orientation="vertical"
          onDrop={(e) => props.onDrop(props.section_id, e)}
          dragHandleSelector=".draggy"
          groupName="moveCell"
          // onDragEnter={() => {
          //     console.log("drag enter:", props.section_id);
          // }}
          // onDragLeave={() => {
          //     console.log("drag leave:", props.section_id);
          // }}
          dropPlaceholder={{
            animationDuration: 150,
            showOnTop: true,
          }}
        >
          {section.cells.map((cell, index) => {
            return (
              <Draggable key={index}>
                <Cell
                  key={index}
                  cell_id={cell}
                  letter={String.fromCharCode(97 + index)}
                  handleDeleteCell={handleDeleteCell}
                />
              </Draggable>
            );
          })}
        </Container>
        {/* Create the add cell button */}
        <Stack direction="column" justifyContent="center" alignItems="center">
          <MoreMenu
            items={["Add text cell", "Add question cell"]}
            clickHandlers={[
              () => handleAddCell("text"),
              () => handleAddCell("question"),
            ]}
            type="add_cell"
          />
        </Stack>
      </Stack>
    </ThemeProvider>
  );
}

export default Section;
