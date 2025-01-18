import React from "react";

import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
// import { Tooltip } from "@mui/material";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";

function MoreMenu(props) {
  // props include items (list of menu items)
  // and clickHandlers (list of onClick functions for each menu item)
  // and type (add_cell, other, default is "other" )

  // state variable for the anchorEl of the triple dot menu
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleMoreClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseMore = () => {
    setAnchorEl(null);
  };

  return (
    <ThemeProvider theme={theme}>
      {props.type === "add_cell" ? (
        // <Tooltip title="Add Cell">
        <IconButton
          onClick={handleMoreClick}
          disableFocusRipple={true}
          disableRipple={true}
        >
          <Avatar variant="button">
            <AddIcon />
          </Avatar>
        </IconButton>
      ) : (
        // </Tooltip>
        <IconButton
          id="long-button"
          onClick={handleMoreClick}
          variant="secondary"
          sx={{ padding: 0 }}
        >
          <MoreVertIcon fontSize="large" />
        </IconButton>
      )}
      <Menu
        id="long-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMore}
        keepMounted={props.type === "add_cell" ? true : false}
      >
        {props.items.map((item, index) => (
          <MenuItem
            key={item}
            onClick={
              props.clickHandlers[index] == null
                ? () => {
                    console.log("No click handler for: ", item);
                    handleCloseMore();
                  }
                : () => {
                    handleCloseMore();
                    props.clickHandlers[index]();
                  }
            }
          >
            {item}
          </MenuItem>
        ))}
      </Menu>
    </ThemeProvider>
  );
}

export default MoreMenu;
