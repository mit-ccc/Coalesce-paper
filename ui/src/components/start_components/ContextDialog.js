import React from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { Typography } from "@mui/material";
import TrapFocus from "@mui/material/Unstable_TrapFocus";
import Paper from "@mui/material/Paper";
import Fade from "@mui/material/Fade";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

function ContextDialog(props) {
  // props takes in displayType ("check", "notify", "create"), open,
  // handleClose (for notify), num_errors (for notify) and num_warnings (for notify)
  return (
    <ThemeProvider theme={theme}>
      <TrapFocus open disableAutoFocus disableEnforceFocus>
        <Fade appear={false} in={props.open}>
          <Paper
            role="dialog"
            aria-modal="false"
            aria-label="Context page banner"
            square
            variant="outlined"
            tabIndex={-1}
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              mt: 50,
              borderWidth: 0,
              borderTopWidth: 1,
            }}
          >
            {props.displayType === "check" && (
              <>
                <Typography variant="body1">
                  Checking responses for errors...
                </Typography>
                <Box sx={{ width: "100%", mt: 2 }}>
                  <LinearProgress />
                </Box>
              </>
            )}

            {props.displayType === "create" && (
              <>
                <Typography variant="body1">Creating project...</Typography>
                <Typography variant="body2">
                  We are in the process of generating an initial draft of
                  questions, which should take 30-60 seconds to complete. 
                  You will be able to access the information you
                  inputted through the "Project Overview" button in the project
                  workspace
                </Typography>
                <Box sx={{ width: "100%", mt: 2 }}>
                  <LinearProgress />
                </Box>
              </>
            )}

            {props.displayType === "notify" && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                gap={2}
              >
                <Box
                  sx={{
                    flexShrink: 1,
                    alignSelf: { xs: "flex-start", sm: "center" },
                  }}
                >
                  <Typography variant="body1">
                    {props.num_errors} error(s) and {props.num_warnings}{" "}
                    suggestion(s) found.
                  </Typography>
                  <Typography variant="body2">
                    Please review the questions with errors and suggestions
                    before continuing.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={props.handleClose}
                  variant="contained"
                >
                  Dismiss
                </Button>
              </Stack>
            )}
          </Paper>
        </Fade>
      </TrapFocus>
    </ThemeProvider>
  );
}

export default ContextDialog;
