import React, { useState, useEffect } from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Input from "@mui/material/Input";
import Link from "@mui/material/Link";

import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ClearIcon from "@mui/icons-material/Clear";

import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";

import { Container, Draggable } from "@edorivai/react-smooth-dnd";
import { arrayMoveImmutable } from "array-move";

function ResponseCategories(props) {
  // props contains the editable (true or false)
  // and responseCategories and updateResponseCategories

  // local state for the response categories
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    // set the response categories from the props
    setCategories(props.responseCategories);
  }, [props.responseCategories]);

  // function to handle text changes to the response categories (using local state)
  const handleEditLocalResponseCategory = (e, index) => {
    setCategories([
      ...categories.slice(0, index),
      { ...categories[index], text: e.target.value },
      ...categories.slice(index + 1),
    ]);
  };

  // function to handle text changes to the response categories (using local state)
  const handleEditGlobalResponseCategory = (e, index) => {
    // only edit the global state if the text changes
    if (props.responseCategories[index].text === e.target.value) {
      // console.log("No change in response category text");
      return;
    }
    props.updateResponseCategories([
      ...categories.slice(0, index),
      { ...categories[index], text: e.target.value },
      ...categories.slice(index + 1),
    ]);
  };

  // function to add a response category
  const handleAddResponseCategory = () => {
    const newCategories = [
      ...categories,
      {
        id: categories.length,
        text: "",
      },
    ];
    // update the local state
    setCategories(newCategories);
    // update the Redux store
    props.updateResponseCategories(newCategories);
  };

  // function to delete a response category
  const handleDeleteResponseCategory = (index) => {
    const newCategories = [
      ...categories.slice(0, index),
      ...categories.slice(index + 1),
    ];
    // update the local state
    setCategories(newCategories);
    // update the Redux store
    props.updateResponseCategories(newCategories);
  };

  // function to handle drag and drop of response categories
  const onDrop = ({ removedIndex, addedIndex }) => {
    // console.log(removedIndex, addedIndex);
    // get the new array of categories
    const newCategories = arrayMoveImmutable(
      categories,
      removedIndex,
      addedIndex
    );
    // update the local state
    setCategories(newCategories);
    // update the Redux store
    props.updateResponseCategories(newCategories);
  };

  // // for testing only
  // useEffect(() => {
  //     console.log(categories);
  // }, [categories]);

  return (
    <ThemeProvider theme={theme}>
      <List
        sx={{
          marginTop: 2,
        }}
      >
        <Container
          lockAxis="y"
          onDrop={onDrop}
          // nonDragAreaSelector=".non-draggy"
          dragHandleSelector=".draggy"
        >
          {categories.map((category, index) => {
            return (
              <Draggable key={index}>
                <ListItem
                  disablePadding
                  key={index}
                  sx={{
                    mt: index === 0 ? 0 : props.editable ? 2 : 1,
                  }}
                >
                  {/* Add the drag indicator icon to the left of the list item */}
                  {props.editable && (
                    <ListItemIcon
                      sx={{ mr: -3, cursor: "pointer" }}
                      className="draggy"
                    >
                      <DragIndicatorIcon />
                    </ListItemIcon>
                  )}
                  <ListItemIcon sx={{ mr: -2 }}>
                    <RadioButtonUncheckedIcon />
                  </ListItemIcon>
                  {/* Convert list item text to input field */}
                  {props.editable ? (
                    <Input
                      // defaultValue={category.text}
                      value={category.text}
                      autoFocus={category.text === "" ? true : false}
                      fullWidth
                      placeholder="Enter text here"
                      margin="dense"
                      multiline={true}
                      sx={{ typography: "body1" }}
                      onChange={(e) =>
                        handleEditLocalResponseCategory(e, index)
                      }
                      onBlur={(e) => handleEditGlobalResponseCategory(e, index)}
                    />
                  ) : (
                    <ListItemText primary={category.text} />
                  )}
                  {/* Add clear icon to the right of the list item */}
                  {props.editable && (
                    <ListItemIcon
                      sx={{
                        cursor: "pointer",
                      }}
                      onClick={() => handleDeleteResponseCategory(index)}
                    >
                      <ClearIcon />
                    </ListItemIcon>
                  )}
                </ListItem>
              </Draggable>
            );
          })}
        </Container>
        {/* Add option button */}
        {props.editable && (
          <ListItem disablePadding key={"add"} sx={{ paddingTop: 2.5 }}>
            <ListItemIcon sx={{ mr: -3, visibility: "hidden" }}>
              <DragIndicatorIcon />
            </ListItemIcon>
            <ListItemIcon sx={{ mr: -2 }}>
              <RadioButtonUncheckedIcon />
            </ListItemIcon>
            <Link
              onClick={handleAddResponseCategory}
              sx={{
                cursor: "pointer",
                color: "primary.main",
              }}
            >
              Add Option
            </Link>
          </ListItem>
        )}
      </List>
    </ThemeProvider>
  );
}

export default ResponseCategories;
