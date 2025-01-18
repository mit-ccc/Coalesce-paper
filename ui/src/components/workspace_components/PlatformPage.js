import React from "react";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

import SurveyBuilder from "./SurveyBuilder";

function PlatformPage(props) {
  // core page where users iterate on questions
  // props is userCode

  return (
    <ThemeProvider theme={theme}>
      <SurveyBuilder userCode={props.userCode} />
    </ThemeProvider>
  );
}

export default PlatformPage;
