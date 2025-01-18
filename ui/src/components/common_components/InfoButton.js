import React, { useState, useEffect } from "react";
import { Typography } from "@mui/material";
import Tooltip, { tooltipClasses } from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import InfoIcon from "@mui/icons-material/Info";
import HelpIcon from "@mui/icons-material/Help";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

// redux stuff
import { useSelector, useDispatch } from "react-redux";
import { addEvent } from "../../store/userTrackingSlice";

const LightTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.common.white,
    color: "rgba(0, 0, 0, 0.87)",
    boxShadow: theme.shadows[1],
    fontSize: 11,
  },
}));

function InfoButton(props) {
  // icon that users can hover to view text box with more information
  // props include the iconType (info or help) and text

  const dispatch = useDispatch();

  // get the project id from the Redux store
  const projectId = useSelector((state) => state.projectDetails.project_id);

  // function to add event to user tracking
  const handleAddEvent = () => {
    // console.log("Add event for info button");
    dispatch(
      addEvent({
        projectId: projectId,
        eventType: "viewInfoButton",
        eventDetail: {
          info_content: props.text,
        },
      })
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <LightTooltip
        arrow
        placement="right"
        title={
          <React.Fragment>
            <Typography variant="body2" sx={{ color: "black" }}>
              {props.text}
            </Typography>
          </React.Fragment>
        }
      >
        <IconButton
          disableFocusRipple={true}
          disableRipple={true}
          onPointerEnter={handleAddEvent}
          variant="info"
        >
          {props.iconType === "info" ? <InfoIcon /> : <HelpIcon />}
        </IconButton>
      </LightTooltip>
    </ThemeProvider>
  );
}

export default InfoButton;
