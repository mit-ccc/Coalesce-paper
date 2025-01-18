import React from "react";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

function ErrorDialog(props) {
  // props include openDialog, handleCloseDialog
  //  dialogTitle, dialogContent

  // small dialog box to display error messages to the user

  return (
    <ThemeProvider theme={theme}>
      <Dialog
        open={props.openDialog}
        onClose={props.handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{props.dialogTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {props.dialogContent}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.handleCloseDialog} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default ErrorDialog;
