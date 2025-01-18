import React from "react";
// import { useEffect } from "react";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

import { ThemeProvider } from "@mui/material/styles";
import theme from "../common_components/theme";

function ConfirmationDialog(props) {
  // props include openDialog, handleCloseDialog, handleConfirm
  //  dialogTitle, dialogContent, confirmText, cancelText

  // small dialog box to confirm important user actions (e.g. deleting a question)

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
          <Button onClick={props.handleCloseDialog} variant="outlined">
            {props.cancelText}
          </Button>
          <Button onClick={props.handleConfirm} autoFocus variant="contained">
            {props.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default ConfirmationDialog;
